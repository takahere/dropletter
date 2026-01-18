import { serve } from "inngest/next"
import { inngest } from "../../../../inngest/client"
import { processDocument } from "../../../../inngest/functions/process-document"
import { processDocumentV2 } from "../../../../inngest/functions/process-document-v2"

// Vercel Function設定
export const maxDuration = 300 // 5分（画像処理に時間がかかる場合があるため）

// Inngest Dev Serverと通信するためのエンドポイント
const handler = serve({
  client: inngest,
  functions: [processDocument, processDocumentV2],
})

export const GET = handler.GET
export const POST = handler.POST
export const PUT = handler.PUT
