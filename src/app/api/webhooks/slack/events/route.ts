import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/server'
import { inngest } from '../../../../../../inngest/client'
import {
  postMessage,
  downloadFile,
  getFileInfo,
  createProcessingBlocks,
  createWelcomeBlocks,
} from '@/lib/slack/client'

const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET

// Verify Slack request signature
function verifySignature(timestamp: string, body: string, signature: string): boolean {
  if (!SLACK_SIGNING_SECRET) return false

  const baseString = `v0:${timestamp}:${body}`
  const hash = 'v0=' + crypto
    .createHmac('sha256', SLACK_SIGNING_SECRET)
    .update(baseString)
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature))
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const timestamp = request.headers.get('x-slack-request-timestamp') || ''
  const signature = request.headers.get('x-slack-signature') || ''

  // Verify signature
  if (!verifySignature(timestamp, body, signature)) {
    console.error('Slack webhook signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const data = JSON.parse(body)

  // URL verification challenge
  if (data.type === 'url_verification') {
    return NextResponse.json({ challenge: data.challenge })
  }

  // Handle events
  if (data.type === 'event_callback') {
    const event = data.event

    // Ignore bot messages to prevent loops
    if (event.bot_id) {
      return NextResponse.json({ ok: true })
    }

    try {
      switch (event.type) {
        case 'app_mention':
          await handleAppMention(event)
          break

        case 'message':
          if (event.subtype === 'file_share' && event.files) {
            await handleFileShare(event)
          }
          break

        case 'app_home_opened':
          await handleAppHomeOpened(event)
          break
      }
    } catch (error) {
      console.error('Slack event handling error:', error)
    }
  }

  return NextResponse.json({ ok: true })
}

async function handleAppMention(event: {
  channel: string
  text: string
  ts: string
  user: string
}) {
  const { channel, text, ts } = event
  const lowerText = text.toLowerCase()

  if (lowerText.includes('help') || lowerText.includes('ヘルプ')) {
    await postMessage(
      channel,
      'DropLetterのヘルプです',
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*DropLetter* :page_facing_up:\n\n' +
              'PDFファイルをこのチャンネルに投稿すると、AIが詐欺・不審点をチェックします。\n\n' +
              '*対応コマンド:*\n' +
              '• `@DropLetter help` - ヘルプ表示\n' +
              '• PDFファイルをドロップ - AIチェック開始',
          },
        },
      ],
      ts
    )
  } else {
    await postMessage(
      channel,
      'PDFファイルを送信してください',
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: 'PDFファイルをこのチャンネルに投稿すると、AIが詐欺・不審点をチェックします。\n`@DropLetter help` でヘルプを表示できます。',
          },
        },
      ],
      ts
    )
  }
}

async function handleFileShare(event: {
  channel: string
  ts: string
  user: string
  files: Array<{
    id: string
    name: string
    mimetype: string
    url_private_download: string
    size: number
  }>
}) {
  const { channel, ts, user, files } = event

  for (const file of files) {
    // Only process PDF files
    if (file.mimetype !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      continue
    }

    const fileName = file.name

    // Send processing message
    const processingResult = await postMessage(
      channel,
      `${fileName} を解析中...`,
      createProcessingBlocks(fileName),
      ts
    )

    try {
      // Download file from Slack
      const fileContent = await downloadFile(file.url_private_download)
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

      // Trigger processing
      await inngest.send({
        name: 'document/process',
        data: {
          reportId: report.id,
          filePath,
          fileName,
          slackChannel: channel,
          slackTs: processingResult.ts,
          slackUserId: user,
        },
      })

      console.log(`Slack: Started processing ${fileName} in channel ${channel}`)
    } catch (error) {
      console.error('Slack file processing error:', error)
      await postMessage(
        channel,
        'エラーが発生しました',
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:x: *エラー*\n\`${fileName}\` の処理中にエラーが発生しました。しばらく待ってから再度お試しください。`,
            },
          },
        ],
        ts
      )
    }
  }
}

async function handleAppHomeOpened(event: { user: string }) {
  // App home is handled by the slack/home endpoint
  console.log(`Slack: App home opened by user ${event.user}`)
}

