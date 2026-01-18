import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createServiceClient } from "@/lib/supabase/server"

// API Route設定
export const maxDuration = 60 // 最大実行時間（秒）
export const dynamic = "force-dynamic" // 動的ルート

const BUCKET_NAME = "uploads"

/**
 * PDFファイルアップロードAPI
 * FormDataでファイルを受け取り、Supabase Storageに保存
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
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "サポートされていないファイル形式です" },
        { status: 400 }
      )
    }

    // ユニークなファイル名を生成
    const ext = file.name.split('.').pop() || "pdf"
    const uniqueId = randomUUID()
    const storagePath = `${uniqueId}.${ext}`

    // ファイルをバッファとして読み込み
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

    // Supabase Storageにアップロード
    const supabase = createServiceClient()

    const { data, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[Upload] Supabase Storage エラー:", uploadError)
      return NextResponse.json(
        { success: false, error: `ストレージエラー: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log(`[Upload] ファイル保存完了: ${data.path}`)

    // filePath はストレージパスとして返す（bucket/path形式）
    const filePath = `${BUCKET_NAME}/${storagePath}`

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
