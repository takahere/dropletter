import { NextRequest, NextResponse } from "next/server"
import { GoogleGenAI } from "@google/genai"

export const maxDuration = 60

/**
 * Test endpoint for Gemini API connectivity
 * This helps debug image processing issues in Vercel environment
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

    // Try to initialize Gemini client
    const genai = new GoogleGenAI({ apiKey })

    // Simple text test (no image)
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
