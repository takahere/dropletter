import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { tmpdir } from "os"
import path from "path"
import { randomUUID } from "crypto"

// API Route設定
export const maxDuration = 60 // 最大実行時間（秒）
export const dynamic = "force-dynamic" // 動的ルート

/**
 * PDFファイルアップロードAPI
 * FormDataでファイルを受け取り、一時ディレクトリに保存
 */
export async function POST(req: NextRequest) {
  console.log("[Upload] リクエスト受信")

  try {
    // FormDataの解析
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error("[Upload] FormData解析エラー:", formError)
      return NextResponse.json(
        { success: false, error: "リクエストの解析に失敗しました" },
        { status: 400 }
      )
    }

    const file = formData.get("file") as File | null

    if (!file) {
      console.error("[Upload] ファイルが見つかりません")
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 400 }
      )
    }

    console.log(`[Upload] ファイル受信: ${file.name}, サイズ: ${file.size}, タイプ: ${file.type}`)

    // ファイルタイプのバリデーション
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "text/markdown",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "サポートされていないファイル形式です" },
        { status: 400 }
      )
    }

    // 一時ディレクトリにDropletter用のサブディレクトリを作成
    const uploadDir = path.join(tmpdir(), "dropletter-uploads")
    await mkdir(uploadDir, { recursive: true })

    // ユニークなファイル名を生成
    const ext = path.extname(file.name) || ".pdf"
    const uniqueId = randomUUID()
    const fileName = `${uniqueId}${ext}`
    const filePath = path.join(uploadDir, fileName)

    // ファイルをバッファとして読み込み、保存
    let bytes: ArrayBuffer
    try {
      bytes = await file.arrayBuffer()
    } catch (bufferError) {
      console.error("[Upload] ArrayBuffer変換エラー:", bufferError)
      return NextResponse.json(
        { success: false, error: "ファイルの読み込みに失敗しました" },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(bytes)

    try {
      await writeFile(filePath, buffer)
    } catch (writeError) {
      console.error("[Upload] ファイル書き込みエラー:", writeError)
      return NextResponse.json(
        { success: false, error: "ファイルの保存に失敗しました" },
        { status: 500 }
      )
    }

    console.log(`[Upload] ファイル保存完了: ${filePath}`)

    return NextResponse.json({
      success: true,
      filePath,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    })
  } catch (error) {
    console.error("[Upload] 予期せぬエラー:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "アップロードに失敗しました",
      },
      { status: 500 }
    )
  }
}
