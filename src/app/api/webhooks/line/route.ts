import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { inngest } from '@/inngest/client'
import {
  replyMessage,
  pushMessage,
  getContent,
  textMessage,
  processingFlexMessage,
  reportResultFlexMessage,
} from '@/lib/line/client'

const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET

// Verify LINE webhook signature
function verifySignature(body: string, signature: string): boolean {
  if (!LINE_CHANNEL_SECRET) return false

  const hash = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64')

  return hash === signature
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('x-line-signature')

  // Verify signature
  if (!signature || !verifySignature(body, signature)) {
    console.error('LINE webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(body)
  const events = data.events || []

  // Process events
  for (const event of events) {
    try {
      await handleEvent(event)
    } catch (error) {
      console.error('LINE event handling error:', error)
    }
  }

  return NextResponse.json({ success: true })
}

async function handleEvent(event: {
  type: string
  replyToken?: string
  source: { userId: string }
  message?: {
    id: string
    type: string
    text?: string
    fileName?: string
  }
  postback?: {
    data: string
  }
}) {
  const { type, replyToken, source, message, postback } = event
  const userId = source.userId

  switch (type) {
    case 'follow':
      // New user followed the bot
      await handleFollow(replyToken!, userId)
      break

    case 'message':
      if (message?.type === 'file') {
        // File message (PDF)
        await handleFileMessage(replyToken!, userId, message)
      } else if (message?.type === 'text') {
        // Text message
        await handleTextMessage(replyToken!, userId, message.text!)
      }
      break

    case 'postback':
      // Postback action (buttons, etc.)
      await handlePostback(replyToken!, userId, postback!.data)
      break
  }
}

async function handleFollow(replyToken: string, userId: string) {
  await replyMessage(replyToken, [
    textMessage(
      '📄 DropLetterへようこそ！\n\n' +
      'PDFファイルを送信すると、AIが詐欺・不審点をチェックします。\n\n' +
      '【使い方】\n' +
      '1. チェックしたいPDFを送信\n' +
      '2. AIが解析（約1分）\n' +
      '3. 結果をお知らせ\n\n' +
      '早速PDFを送ってみてください！'
    ),
  ])
}

async function handleFileMessage(
  replyToken: string,
  userId: string,
  message: { id: string; fileName?: string }
) {
  const fileName = message.fileName || `file_${message.id}.pdf`

  // Check if it's a PDF
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    await replyMessage(replyToken, [
      textMessage('現在はPDFファイルのみ対応しています。\nPDFファイルを送信してください。'),
    ])
    return
  }

  // Send processing message
  await replyMessage(replyToken, [processingFlexMessage(fileName)])

  try {
    // Download file from LINE
    const fileContent = await getContent(message.id)
    const fileBuffer = new Uint8Array(fileContent)

    // Upload to Supabase Storage
    const supabase = createServiceClient()
    const fileId = crypto.randomUUID()
    const filePath = `uploads/${fileId}.pdf`

    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Create report record
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        file_name: fileName,
        file_path: filePath,
        file_id: fileId,
        result_json: {},
        status: 'processing',
        processing_status: 'pending',
        progress: 0,
      })
      .select()
      .single()

    if (reportError) {
      throw new Error(`Report creation failed: ${reportError.message}`)
    }

    // Store LINE user ID for notification
    await supabase.from('line_notifications').upsert({
      report_id: report.id,
      line_user_id: userId,
    }, {
      onConflict: 'report_id',
    }).catch(() => {
      // Table might not exist yet, that's OK
    })

    // Trigger processing
    await inngest.send({
      name: 'document/process',
      data: {
        reportId: report.id,
        filePath,
        fileName,
        lineUserId: userId, // Pass LINE user ID for notification
      },
    })

    console.log(`LINE: Started processing ${fileName} for user ${userId}`)
  } catch (error) {
    console.error('LINE file processing error:', error)
    await pushMessage(userId, [
      textMessage(
        '申し訳ありません、ファイルの処理中にエラーが発生しました。\n' +
        'しばらく待ってから再度お試しください。'
      ),
    ])
  }
}

async function handleTextMessage(replyToken: string, userId: string, text: string) {
  const lowerText = text.toLowerCase().trim()

  if (lowerText === 'ヘルプ' || lowerText === 'help' || lowerText === '使い方') {
    await replyMessage(replyToken, [
      textMessage(
        '📄 DropLetter ヘルプ\n\n' +
        '【基本的な使い方】\n' +
        'PDFファイルを送信すると、AIが以下をチェックします：\n' +
        '・詐欺の兆候\n' +
        '・不審な文言\n' +
        '・個人情報の検出\n' +
        '・法的リスク\n\n' +
        '【コマンド】\n' +
        '・「ヘルプ」- この説明を表示\n' +
        '・「履歴」- 過去のチェック履歴\n\n' +
        '【料金】\n' +
        '・初回1回無料\n' +
        '・月額9,800円で無制限'
      ),
    ])
  } else if (lowerText === '履歴' || lowerText === 'history') {
    await replyMessage(replyToken, [
      textMessage(
        '過去のチェック履歴はWebサイトでご確認いただけます。\n\n' +
        'https://dropletter.app/history'
      ),
    ])
  } else {
    await replyMessage(replyToken, [
      textMessage(
        'PDFファイルを送信してください。\n' +
        'AIが詐欺・不審点をチェックします。\n\n' +
        '「ヘルプ」と入力すると使い方を確認できます。'
      ),
    ])
  }
}

async function handlePostback(replyToken: string, userId: string, data: string) {
  const params = new URLSearchParams(data)
  const action = params.get('action')

  if (action === 'view_report') {
    const reportId = params.get('report_id')
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dropletter.app'

    await replyMessage(replyToken, [
      textMessage(`詳細はこちらでご確認ください:\n${baseUrl}/share/${reportId}`),
    ])
  }
}

/**
 * Notify LINE user about completed report
 * Called from Inngest function when processing completes
 */
export async function notifyLineUser(
  lineUserId: string,
  reportId: string,
  fileName: string,
  riskLevel: string,
  summary: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dropletter.app'
  const shareUrl = `${baseUrl}/share/${reportId}`

  await pushMessage(lineUserId, [
    reportResultFlexMessage(fileName, riskLevel, summary, shareUrl),
  ])
}
