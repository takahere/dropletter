"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import {
  PdfLoader,
  PdfHighlighter,
  Highlight,
} from "react-pdf-highlighter"
import type { IHighlight, ScaledPosition } from "react-pdf-highlighter"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { Loader2, FileText, AlertCircle, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { findTextPositions, toScaledPosition } from "@/lib/pdf-text-search"
import { HighlightPopup } from "./highlight-popup"
import { useAuth } from "@/hooks/use-auth"
import { useLiveComments } from "@/hooks/use-live-comments"
import type {
  ProblemHighlight,
  ProblemData,
  HighlightType,
  Severity,
} from "@/types/highlights"

// react-pdf-highlighter用の拡張ハイライト型
interface ExtendedHighlight extends IHighlight {
  highlightType: HighlightType
  severity: Severity
  suggestedFix?: string
}

// サーバーから受け取る事前計算済みハイライト
interface ServerHighlight {
  id: string
  type: string
  text: string
  severity: string
  reason?: string
  suggestedFix?: string
  positions: Array<{
    pageNumber: number
    x0: number
    y0: number
    x1: number
    y1: number
  }>
}

interface PdfHighlighterViewerProps {
  reportId: string
  problems: ProblemData
  serverHighlights?: ServerHighlight[]  // サーバーから事前計算されたハイライト
  className?: string
}

// PDF.js設定（react-pdf-highlighterが使用するpdfjs-dist@4.4.168に対応）
const PDFJS_VERSION = "4.4.168"
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`
const CMAP_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`

export function PdfHighlighterViewer({
  reportId,
  problems,
  serverHighlights,
  className,
}: PdfHighlighterViewerProps) {
  const [highlights, setHighlights] = useState<ExtendedHighlight[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [isViewerReady, setIsViewerReady] = useState(false)  // ビューア準備完了フラグ
  const [activeHighlight, setActiveHighlight] = useState<ExtendedHighlight | null>(null)  // ホバー中のハイライト
  const [scale, setScale] = useState<number | "page-fit">("page-fit")  // ズームスケール
  const scrollViewerTo = useRef<(highlight: ExtendedHighlight) => void>(() => {})
  const pdfDocumentRef = useRef<PDFDocumentProxy | null>(null)
  const hasGeneratedHighlights = useRef(false)
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)  // タイムアウト参照

  // 認証・コメント関連
  const { user } = useAuth()
  const {
    comments,
    addComment,
    updateComment,
    deleteComment,
    getCommentsForHighlight,
  } = useLiveComments({
    reportId,
    userId: user?.id,
    userEmail: user?.email,
  })

  const pdfUrl = `/api/files/${reportId}`

  // コメント操作ハンドラー
  const handleAddComment = useCallback(async (highlightId: string, content: string) => {
    const result = await addComment({
      highlight_id: highlightId,
      content,
    })
    return !!result
  }, [addComment])

  const handleUpdateComment = useCallback(async (commentId: string, content: string) => {
    const result = await updateComment(commentId, { content })
    return !!result
  }, [updateComment])

  const handleDeleteComment = useCallback(async (commentId: string) => {
    return await deleteComment(commentId)
  }, [deleteComment])

  const handleResolveComment = useCallback(async (commentId: string, isResolved: boolean) => {
    const result = await updateComment(commentId, { is_resolved: isResolved })
    return !!result
  }, [updateComment])

  // ズーム操作
  const handleZoomIn = useCallback(() => {
    setScale((prev) => {
      const currentScale = prev === "page-fit" ? 1 : prev
      return Math.min(3, currentScale + 0.25)
    })
  }, [])

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const currentScale = prev === "page-fit" ? 1 : prev
      return Math.max(0.5, currentScale - 0.25)
    })
  }, [])

  const handleZoomReset = useCallback(() => {
    setScale("page-fit")
  }, [])

  // デバッグ: コンポーネントのレンダリング時にpropsを確認
  console.log("[PdfHighlighter] レンダリング:", {
    reportId,
    ngWordsCount: problems.ngWords.length,
    piiCount: problems.piiEntities.length,
    legalCount: problems.legalIssues.length,
    serverHighlightsCount: serverHighlights?.length || 0,
    highlightsCount: highlights.length,
    hasPdfDoc: !!pdfDocumentRef.current,
    hasGenerated: hasGeneratedHighlights.current,
  })

  // サーバーハイライトをreact-pdf-highlighter形式に変換
  // 重要: width/heightはrectのサイズではなく、ページ（ビューポート）のサイズ
  const convertServerHighlights = useCallback((
    serverH: ServerHighlight[],
    pageWidth: number = 612,
    pageHeight: number = 792
  ): ExtendedHighlight[] => {
    console.log("[PdfHighlighter] convertServerHighlights called:", {
      highlightCount: serverH.length,
      pageWidth,
      pageHeight,
    })

    return serverH.flatMap((h) =>
      h.positions.map((pos, i) => {
        // 正規化座標（0-1）をピクセル座標に変換
        const x1 = pos.x0 * pageWidth
        const y1 = pos.y0 * pageHeight
        const x2 = pos.x1 * pageWidth
        const y2 = pos.y1 * pageHeight

        console.log(`[PdfHighlighter] Highlight ${h.id}-${i}:`, {
          normalized: { x0: pos.x0, y0: pos.y0, x1: pos.x1, y1: pos.y1 },
          pixel: { x1, y1, x2, y2 },
          page: pos.pageNumber,
        })

        return {
          id: `${h.id}-${i}`,
          position: {
            pageNumber: pos.pageNumber,
            boundingRect: {
              x1, y1, x2, y2,
              width: pageWidth,   // ビューポート幅（rectの幅ではない）
              height: pageHeight  // ビューポート高さ（rectの高さではない）
            },
            rects: [{
              x1, y1, x2, y2,
              width: pageWidth,   // ビューポート幅
              height: pageHeight  // ビューポート高さ
            }],
          },
          content: { text: h.text },
          comment: {
            emoji: h.type === "ng_word" ? "🚫" : h.type === "pii" ? "🔒" : "⚠️",
            text: h.reason || h.text,
          },
          highlightType: h.type as HighlightType,
          severity: h.severity as Severity,
          suggestedFix: h.suggestedFix,
        } as ExtendedHighlight
      })
    )
  }, [])

  // 問題データからハイライトを生成
  const generateHighlights = useCallback(
    async (pdfDocument: PDFDocumentProxy) => {
      setIsSearching(true)
      setSearchProgress(0)
      setError(null)

      console.log("[PdfHighlighter] 問題データ:", {
        ngWords: problems.ngWords,
        piiEntities: problems.piiEntities,
        legalIssues: problems.legalIssues,
      })

      const allHighlights: ExtendedHighlight[] = []
      const totalItems =
        problems.ngWords.length +
        problems.piiEntities.length +
        problems.legalIssues.length

      console.log(`[PdfHighlighter] 検索対象: ${totalItems}件`)

      if (totalItems === 0) {
        console.log("[PdfHighlighter] 問題がないためハイライトなし")
        setIsSearching(false)
        return
      }

      let processedItems = 0

      try {
        // NG Words のハイライト
        for (const ngWord of problems.ngWords) {
          console.log(`[PdfHighlighter] NGワード検索: "${ngWord.word}"`)
          const positions = await findTextPositions(pdfDocument, ngWord.word)
          console.log(`[PdfHighlighter] → ${positions.length}件の位置を発見`)
          positions.forEach((pos, i) => {
            const scaledPos = toScaledPosition(pos)
            allHighlights.push({
              id: `ng-${ngWord.word}-${i}`,
              position: scaledPos as ScaledPosition,
              content: { text: ngWord.word },
              comment: {
                emoji: "🚫",
                text: ngWord.reason,
              },
              highlightType: "ng_word",
              severity: (ngWord.severity as Severity) || "medium",
            })
          })
          processedItems++
          setSearchProgress(Math.round((processedItems / totalItems) * 100))
        }

        // PII のハイライト
        for (const pii of problems.piiEntities) {
          if (pii.text && pii.text.length > 1) {
            const positions = await findTextPositions(pdfDocument, pii.text)
            positions.forEach((pos, i) => {
              const scaledPos = toScaledPosition(pos)
              allHighlights.push({
                id: `pii-${pii.type}-${pii.text}-${i}`,
                position: scaledPos as ScaledPosition,
                content: { text: pii.text },
                comment: {
                  emoji: "🔒",
                  text: `個人情報検出: ${pii.type}`,
                },
                highlightType: "pii",
                severity: "medium",
              })
            })
          }
          processedItems++
          setSearchProgress(Math.round((processedItems / totalItems) * 100))
        }

        // Legal Issues のハイライト
        for (const issue of problems.legalIssues) {
          if (issue.location && issue.location.length > 2) {
            const positions = await findTextPositions(pdfDocument, issue.location)
            positions.forEach((pos, i) => {
              const scaledPos = toScaledPosition(pos)
              allHighlights.push({
                id: `legal-${issue.type}-${i}`,
                position: scaledPos as ScaledPosition,
                content: { text: issue.location || "" },
                comment: {
                  emoji: "⚠️",
                  text: issue.description,
                },
                highlightType: "legal_issue",
                severity: "high",
                suggestedFix: issue.suggestedFix,
              })
            })
          }
          processedItems++
          setSearchProgress(Math.round((processedItems / totalItems) * 100))
        }

        console.log(`[PdfHighlighter] 合計 ${allHighlights.length}件のハイライトを生成`)
        setHighlights(allHighlights)
        hasGeneratedHighlights.current = true
      } catch (err) {
        console.error("[PdfHighlighter] ハイライト生成エラー:", err)
        setError("問題箇所の検索中にエラーが発生しました")
      } finally {
        setIsSearching(false)
      }
    },
    [problems]
  )

  // サーバーハイライトまたは問題データが変更されたらハイライトを更新
  // 重要: ビューアが準備完了するまでハイライトを設定しない（タイミング問題の回避）
  useEffect(() => {
    // クリーンアップ関数
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    // ビューアが準備できていない場合は待機
    if (!isViewerReady) {
      console.log("[PdfHighlighter] ビューア準備待ち - ハイライト設定をスキップ")
      return
    }

    // サーバーハイライトがある場合は優先的に使用
    if (serverHighlights && serverHighlights.length > 0) {
      console.log("[PdfHighlighter] サーバーハイライトを使用:", serverHighlights.length, "件")
      // 遅延してハイライトを設定（ビューア初期化の完了を待つ）
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
      highlightTimeoutRef.current = setTimeout(() => {
        const converted = convertServerHighlights(serverHighlights)
        setHighlights(converted)
        hasGeneratedHighlights.current = true
        console.log("[PdfHighlighter] ハイライト設定完了:", converted.length, "件")
      }, 500)  // 500ms遅延でビューア初期化完了を確実に待つ
      return
    }

    const totalItems =
      problems.ngWords.length +
      problems.piiEntities.length +
      problems.legalIssues.length

    console.log("[PdfHighlighter] useEffect triggered:", {
      totalItems,
      hasPdfDoc: !!pdfDocumentRef.current,
      hasGenerated: hasGeneratedHighlights.current,
      highlightsLength: highlights.length,
      isViewerReady,
    })

    // PDF documentがあり、問題データがある場合にクライアント側で検索
    if (pdfDocumentRef.current && totalItems > 0) {
      // 問題データが到着したら再生成
      if (!hasGeneratedHighlights.current || highlights.length === 0) {
        console.log("[PdfHighlighter] サーバーハイライトなし。クライアント側で検索します。")
        hasGeneratedHighlights.current = false
        // 遅延して検索を実行
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current)
        }
        highlightTimeoutRef.current = setTimeout(() => {
          if (pdfDocumentRef.current) {
            generateHighlights(pdfDocumentRef.current)
          }
        }, 500)
      } else {
        console.log("[PdfHighlighter] ハイライト生成済みのためスキップ")
      }
    } else {
      console.log("[PdfHighlighter] 条件未満: pdfDoc=", !!pdfDocumentRef.current, "totalItems=", totalItems)
    }
  }, [serverHighlights, problems.ngWords.length, problems.piiEntities.length, problems.legalIssues.length, generateHighlights, highlights.length, convertServerHighlights, isViewerReady])

  // ハイライトをProblemHighlight形式に変換（ポップアップ用）
  const toProblemHighlight = (highlight: ExtendedHighlight): ProblemHighlight => ({
    id: highlight.id,
    type: highlight.highlightType,
    position: {
      pageNumber: highlight.position.pageNumber,
      boundingRect: {
        x1: highlight.position.boundingRect.x1,
        y1: highlight.position.boundingRect.y1,
        x2: highlight.position.boundingRect.x2,
        y2: highlight.position.boundingRect.y2,
        width: highlight.position.boundingRect.width,
        height: highlight.position.boundingRect.height,
      },
      rects: highlight.position.rects.map((r) => ({
        x1: r.x1,
        y1: r.y1,
        x2: r.x2,
        y2: r.y2,
        width: r.width,
        height: r.height,
      })),
    },
    content: { text: highlight.content.text || "" },
    comment: {
      emoji: highlight.comment.emoji,
      text: highlight.comment.text,
      severity: highlight.severity,
      suggestedFix: highlight.suggestedFix,
    },
  })

  return (
    <div
      className={cn(
        "relative w-full h-[700px] bg-slate-100 dark:bg-slate-900 rounded-2xl",
        className
      )}
    >
      {/* 検索中のオーバーレイ */}
      {isSearching && (
        <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              問題箇所を検索中...
            </p>
            <p className="text-xs text-slate-500 mt-1">{searchProgress}%</p>
          </div>
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${searchProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 右上固定パネル: ハイライト詳細表示 */}
      <div className="absolute top-4 right-4 z-20 w-80">
        {/* アクティブなハイライトの詳細 */}
        {activeHighlight ? (
          <HighlightPopup
            highlight={toProblemHighlight(activeHighlight)}
            comments={getCommentsForHighlight(activeHighlight.id)}
            currentUserId={user?.id}
            onAddComment={user ? (content) => handleAddComment(activeHighlight.id, content) : undefined}
            onUpdateComment={handleUpdateComment}
            onDeleteComment={handleDeleteComment}
            onResolveComment={handleResolveComment}
          />
        ) : (
          /* ハイライト数の表示（デフォルト） */
          !isSearching && (highlights.length > 0 || problems.ngWords.length > 0) && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                {highlights.length > 0
                  ? `${highlights.length}件の問題箇所`
                  : `${problems.ngWords.length}件のNGワード検出`}
              </span>
            </div>
          )
        )}
      </div>

      {/* NGワードリスト（ハイライトが見つからない場合の代替表示） */}
      {!isSearching && highlights.length === 0 && problems.ngWords.length > 0 && (
        <div className="absolute bottom-4 left-4 right-4 z-10 p-3 bg-red-50/95 dark:bg-red-900/50 backdrop-blur-sm border border-red-200 dark:border-red-800 rounded-xl max-h-32 overflow-y-auto">
          <p className="text-xs font-medium text-red-700 dark:text-red-300 mb-2">
            🚫 検出されたNGワード（PDF上で位置を特定できませんでした）:
          </p>
          <div className="flex flex-wrap gap-2">
            {problems.ngWords.map((ngWord, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-red-100 dark:bg-red-800/50 text-red-700 dark:text-red-200 text-xs rounded-lg"
                title={ngWord.reason}
              >
                {ngWord.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="absolute top-4 left-4 right-4 z-10 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ズームツールバー */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm rounded-full px-2 py-1.5 shadow-lg border border-slate-200 dark:border-slate-700">
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          title="縮小"
          disabled={scale !== "page-fit" && scale <= 0.5}
        >
          <ZoomOut className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <span className="px-2 text-xs font-medium text-slate-600 dark:text-slate-300 min-w-[50px] text-center">
          {scale === "page-fit" ? "フィット" : `${Math.round(scale * 100)}%`}
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          title="拡大"
          disabled={scale !== "page-fit" && scale >= 3}
        >
          <ZoomIn className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />
        <button
          onClick={handleZoomReset}
          className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          title="リセット"
        >
          <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
      </div>

      {/* PDFビューア */}
      <PdfLoader
        url={pdfUrl}
        workerSrc={WORKER_SRC}
        cMapUrl={CMAP_URL}
        cMapPacked={true}
        beforeLoad={
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center">
                <FileText className="w-10 h-10 text-slate-400" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              PDFを読み込み中...
            </p>
          </div>
        }
        onError={(error) => {
          console.error("[PdfHighlighter] PDF load error:", error)
          console.error("[PdfHighlighter] PDF URL was:", pdfUrl)
          setError("PDFの読み込みに失敗しました")
        }}
      >
        {(pdfDocument) => {
          console.log("[PdfHighlighter] PDF document loaded successfully!", {
            numPages: pdfDocument.numPages,
          })

          // PDF documentの参照を保存（scrollRefが呼ばれない場合のフォールバック）
          if (!pdfDocumentRef.current) {
            pdfDocumentRef.current = pdfDocument as unknown as PDFDocumentProxy
            console.log("[PdfHighlighter] pdfDocumentRef set via children render")

            // scrollRefが呼ばれないバグの回避策：PDFロード後に遅延でisViewerReadyを設定
            // refを使って一度だけ実行されるようにする
            setTimeout(() => {
              console.log("[PdfHighlighter] フォールバック: ビューア準備完了 (children render)")
              setIsViewerReady(true)
            }, 800)  // 800ms遅延でビューア初期化を待つ
          }

          return (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            highlights={highlights}
            pdfScaleValue={scale === "page-fit" ? "page-fit" : String(scale)}
            onScrollChange={() => {}}
            scrollRef={(scrollTo) => {
              console.log("[PdfHighlighter] scrollRef called - PDF document ready")
              scrollViewerTo.current = scrollTo
              // PDF documentの参照を保存
              pdfDocumentRef.current = pdfDocument as unknown as PDFDocumentProxy
              console.log("[PdfHighlighter] pdfDocumentRef set:", !!pdfDocumentRef.current)

              // ビューアが準備完了したことを通知（遅延を入れて確実に初期化完了を待つ）
              // 重要: この遅延がreact-pdf-highlighterのタイミング問題を回避する
              setTimeout(() => {
                console.log("[PdfHighlighter] ビューア準備完了 - isViewerReady = true")
                setIsViewerReady(true)
              }, 300)  // 300ms後にビューア準備完了を通知

              // ハイライト生成はuseEffectで処理するため、ここでは実行しない
              const totalItems =
                problems.ngWords.length +
                problems.piiEntities.length +
                problems.legalIssues.length
              console.log("[PdfHighlighter] scrollRef - totalItems:", totalItems, "（useEffectでハイライト生成）")
            }}
            enableAreaSelection={() => false}
            onSelectionFinished={() => null}
            highlightTransform={(
              highlight,
              index,
              setTip,
              hideTip,
              viewportToScaled,
              screenshot,
              isScrolledTo
            ) => {
              const extendedHighlight = highlight as unknown as ExtendedHighlight
              const highlightTypeClass = `highlight-${extendedHighlight.highlightType?.replace("_", "-") || "ng-word"}`

              return (
                <div
                  key={highlight.id}
                  className={highlightTypeClass}
                  onMouseEnter={() => setActiveHighlight(extendedHighlight)}
                  onMouseLeave={() => setActiveHighlight(null)}
                >
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                </div>
              )
            }}
          />
        )}}
      </PdfLoader>
    </div>
  )
}

// ローディングスケルトン
export function PdfHighlighterViewerSkeleton() {
  return (
    <div className="w-full h-[700px] bg-slate-100 dark:bg-slate-900 rounded-2xl flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-white dark:bg-slate-700 shadow-xl flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center shadow-lg">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          PDFビューアを読み込み中...
        </p>
      </div>
    </div>
  )
}
