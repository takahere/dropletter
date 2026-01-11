/**
 * PDFテキスト検索ユーティリティ
 * PDF.jsを使用してPDF内のテキスト位置を検索する
 */

import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist"
import type { HighlightPosition, HighlightRect } from "@/types/highlights"

interface TextItem {
  str: string
  transform: number[]
  width: number
  height: number
  fontName?: string
}

/**
 * PDF内で指定されたテキストを検索し、その位置を返す
 */
export async function findTextPositions(
  pdfDocument: PDFDocumentProxy,
  searchText: string
): Promise<HighlightPosition[]> {
  const positions: HighlightPosition[] = []

  if (!searchText || searchText.trim() === "") {
    return positions
  }

  const normalizedSearchText = normalizeText(searchText)

  for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
    try {
      const page = await pdfDocument.getPage(pageNum)
      const pagePositions = await findTextOnPage(page, pageNum, normalizedSearchText)
      positions.push(...pagePositions)
    } catch (error) {
      console.warn(`Error searching page ${pageNum}:`, error)
    }
  }

  return positions
}

/**
 * 特定のページ内でテキストを検索
 */
async function findTextOnPage(
  page: PDFPageProxy,
  pageNumber: number,
  searchText: string
): Promise<HighlightPosition[]> {
  const positions: HighlightPosition[] = []
  const textContent = await page.getTextContent()
  const viewport = page.getViewport({ scale: 1 })

  console.log(`[TextSearch] ページ${pageNumber} - viewport: ${viewport.width}x${viewport.height}`)

  // テキストアイテムを収集
  const items: TextItem[] = []
  let fullText = ""
  const charToItemMap: number[] = [] // 各文字がどのitemに属するかのマッピング
  const normalizedToOriginalMap: number[] = [] // 正規化後のインデックス→元のインデックス

  for (const item of textContent.items) {
    if ("str" in item && item.str) {
      const textItem: TextItem = {
        str: item.str,
        transform: item.transform as number[],
        width: item.width as number,
        height: item.height as number,
        fontName: (item as { fontName?: string }).fontName,
      }
      items.push(textItem)

      // 各文字とitemのマッピングを作成
      for (let i = 0; i < item.str.length; i++) {
        charToItemMap.push(items.length - 1)
      }
      fullText += item.str
    }
  }

  // 正規化したテキストを作成し、元のインデックスへのマッピングを構築
  let normalizedFullText = ""
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i]
    // 空白や特殊文字をスキップ
    if (!/\s|\u00A0|\u3000|[\u200B-\u200D\uFEFF]/.test(char)) {
      normalizedToOriginalMap.push(i)
      normalizedFullText += char.toLowerCase()
    }
  }

  // 検索テキストも正規化
  const normalizedSearchText = normalizeText(searchText)

  console.log(`[TextSearch] ページ${pageNumber} - PDFテキスト長: ${fullText.length}文字, 正規化後: ${normalizedFullText.length}文字`)
  console.log(`[TextSearch] 検索テキスト: "${searchText}" → 正規化: "${normalizedSearchText}"`)

  // 検索テキストの全ての出現位置を探す
  let searchIndex = 0
  let matchCount = 0
  while ((searchIndex = normalizedFullText.indexOf(normalizedSearchText, searchIndex)) !== -1) {
    matchCount++
    // 正規化後のインデックスを元のインデックスに変換
    const originalStartIndex = normalizedToOriginalMap[searchIndex]
    const originalEndIndex = normalizedToOriginalMap[searchIndex + normalizedSearchText.length - 1]

    if (originalStartIndex !== undefined && originalEndIndex !== undefined) {
      // 見つかった位置から矩形を計算
      const rects = calculateRectsForRange(
        items,
        charToItemMap,
        originalStartIndex,
        originalEndIndex - originalStartIndex + 1,
        viewport
      )

      console.log(`[TextSearch] マッチ${matchCount}: インデックス ${searchIndex}, rects: ${rects.length}件`)

      if (rects.length > 0) {
        const boundingRect = calculateBoundingRect(rects, viewport)
        console.log(`[TextSearch] → boundingRect: (${boundingRect.x1.toFixed(1)}, ${boundingRect.y1.toFixed(1)}) - (${boundingRect.x2.toFixed(1)}, ${boundingRect.y2.toFixed(1)})`)
        positions.push({
          pageNumber,
          boundingRect,
          rects,
        })
      }
    }

    searchIndex += 1
  }

  console.log(`[TextSearch] ページ${pageNumber} - "${searchText}" の検索結果: ${matchCount}件のマッチ, ${positions.length}件の位置`)

  return positions
}

/**
 * 指定された文字範囲から矩形を計算
 */
function calculateRectsForRange(
  items: TextItem[],
  charToItemMap: number[],
  startCharIndex: number,
  length: number,
  viewport: { width: number; height: number }
): HighlightRect[] {
  const rects: HighlightRect[] = []
  const endCharIndex = startCharIndex + length

  // 該当する文字範囲のitemを特定
  const startItemIndex = charToItemMap[startCharIndex]
  const endItemIndex = charToItemMap[Math.min(endCharIndex - 1, charToItemMap.length - 1)]

  if (startItemIndex === undefined || endItemIndex === undefined) {
    return rects
  }

  // 各itemから矩形を作成
  for (let i = startItemIndex; i <= endItemIndex; i++) {
    const item = items[i]
    if (!item) continue

    const rect = calculateItemRect(item, viewport)
    if (rect) {
      rects.push(rect)
    }
  }

  return rects
}

/**
 * テキストアイテムから矩形座標を計算
 */
function calculateItemRect(
  item: TextItem,
  viewport: { width: number; height: number }
): HighlightRect | null {
  if (!item.transform || item.transform.length < 6) {
    return null
  }

  // PDF transform matrix: [a, b, c, d, e, f]
  // a: horizontal scale, d: vertical scale
  // e: x position, f: y position
  const [scaleX, , , scaleY, x, y] = item.transform

  // テキストの幅と高さを計算
  const width = item.width * Math.abs(scaleX)
  const height = Math.abs(item.height || scaleY || 12) // フォールバック高さ

  // PDF座標系をビューポート座標系に変換
  // PDFは左下原点、ビューポートは左上原点
  const x1 = x
  const y1 = viewport.height - y - height
  const x2 = x + width
  const y2 = viewport.height - y

  return {
    x1: Math.min(x1, x2),
    y1: Math.min(y1, y2),
    x2: Math.max(x1, x2),
    y2: Math.max(y1, y2),
    width: viewport.width,
    height: viewport.height,
  }
}

/**
 * 複数の矩形から外接矩形を計算
 */
function calculateBoundingRect(
  rects: HighlightRect[],
  viewport: { width: number; height: number }
): HighlightRect {
  if (rects.length === 0) {
    return { x1: 0, y1: 0, x2: 0, y2: 0, width: viewport.width, height: viewport.height }
  }

  let minX1 = Infinity
  let minY1 = Infinity
  let maxX2 = -Infinity
  let maxY2 = -Infinity

  for (const rect of rects) {
    minX1 = Math.min(minX1, rect.x1)
    minY1 = Math.min(minY1, rect.y1)
    maxX2 = Math.max(maxX2, rect.x2)
    maxY2 = Math.max(maxY2, rect.y2)
  }

  return {
    x1: minX1,
    y1: minY1,
    x2: maxX2,
    y2: maxY2,
    width: viewport.width,
    height: viewport.height,
  }
}

/**
 * テキストを正規化（スペースや改行を統一）
 * 日本語PDFでは文字間にスペースが入ることがあるため、柔軟に対応
 */
function normalizeText(text: string): string {
  return text
    .replace(/\s+/g, "") // すべての空白を削除（日本語PDF対応）
    .replace(/[\u00A0\u3000]/g, "") // ノーブレークスペース、全角スペースを削除
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // ゼロ幅文字を削除
    .toLowerCase() // 小文字に統一
    .trim()
}

/**
 * react-pdf-highlighter用のスケーリングされた位置を返す
 */
export function toScaledPosition(position: HighlightPosition): {
  boundingRect: {
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber: number
  }
  rects: Array<{
    x1: number
    y1: number
    x2: number
    y2: number
    width: number
    height: number
    pageNumber: number
  }>
  pageNumber: number
} {
  return {
    boundingRect: {
      ...position.boundingRect,
      pageNumber: position.pageNumber,
    },
    rects: position.rects.map((rect) => ({
      ...rect,
      pageNumber: position.pageNumber,
    })),
    pageNumber: position.pageNumber,
  }
}
