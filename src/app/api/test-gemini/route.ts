import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"
import { createServiceClient } from "@/lib/supabase/server"

export const maxDuration = 60

/**
 * Test endpoint for Gemini API connectivity
 * This helps debug image processing issues in Vercel environment
 *
 * GET /api/test-gemini - Basic API test
 * GET /api/test-gemini?image=uploads/xxx.jpg - Test with specific image from Supabase
 */
export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    // Check environment variables
    const envCheck = {
      GEMINI_API_KEY: !!apiKey,
      GEMINI_API_KEY_LENGTH: apiKey?.length || 0,
      GROQ_API_KEY: !!process.env.GROQ_API_KEY,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
      LLAMA_CLOUD_API_KEY: !!process.env.LLAMA_CLOUD_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }

    console.log("[Test] Environment check:", envCheck)

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "GEMINI_API_KEY is not set",
        envCheck,
      }, { status: 500 })
    }

    // Check if we should test with an image
    const imagePath = req.nextUrl.searchParams.get("image")

    if (imagePath) {
      // Test with image from Supabase Storage
      console.log("[Test] Testing with image:", imagePath)

      // Download from Supabase
      const [bucket, ...pathParts] = imagePath.split("/")
      const filePath = pathParts.join("/")

      console.log(`[Test] Downloading from bucket=${bucket}, path=${filePath}`)

      const supabase = createServiceClient()
      const { data, error: downloadError } = await supabase.storage
        .from(bucket)
        .download(filePath)

      if (downloadError) {
        return NextResponse.json({
          success: false,
          error: `Storage download failed: ${downloadError.message}`,
          envCheck,
        }, { status: 500 })
      }

      console.log(`[Test] Downloaded blob size: ${data.size}, type: ${data.type}`)

      // Convert to base64
      const buffer = Buffer.from(await data.arrayBuffer())
      const base64 = buffer.toString("base64")

      console.log(`[Test] Base64 length: ${base64.length}`)

      // Determine MIME type from file extension
      const ext = filePath.split(".").pop()?.toLowerCase() || ""
      let mimeType = "image/jpeg"
      if (ext === "png") mimeType = "image/png"
      else if (ext === "webp") mimeType = "image/webp"
      else if (ext === "gif") mimeType = "image/gif"

      console.log(`[Test] MIME type: ${mimeType}`)

      // Test Gemini with image
      const genai = new GoogleGenAI({ apiKey })

      console.log("[Test] Calling Gemini API with image...")
      const response = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            inlineData: {
              mimeType,
              data: base64,
            },
          },
          {
            text: "この画像に含まれるテキストを抽出してください。Markdown形式で出力してください。",
          },
        ],
      })

      const result = response.text || ""
      console.log(`[Test] Gemini response length: ${result.length}`)

      return NextResponse.json({
        success: true,
        message: "Image processing test successful",
        imageInfo: {
          path: imagePath,
          size: data.size,
          type: data.type,
          mimeType,
          base64Length: base64.length,
        },
        responseLength: result.length,
        responsePreview: result.substring(0, 500),
        envCheck,
      })
    }

    // Simple text test (no image)
    const genai = new GoogleGenAI({ apiKey })

    console.log("[Test] Testing Gemini API with simple text request...")
    const response = await genai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          text: "Say 'Hello' in Japanese",
        },
      ],
    })

    const result = response.text || ""
    console.log("[Test] Gemini response:", result)

    return NextResponse.json({
      success: true,
      message: "Gemini API is working",
      response: result,
      envCheck,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined

    console.error("[Test] Error:", {
      message: errorMessage,
      stack: errorStack,
    })

    return NextResponse.json({
      success: false,
      error: errorMessage,
      stack: errorStack,
    }, { status: 500 })
  }
}
