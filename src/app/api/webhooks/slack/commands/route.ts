import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import {
  createHelpBlocks,
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
    console.error('Slack slash command signature verification failed')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const params = new URLSearchParams(body)
  const command = params.get('command')
  const text = params.get('text')?.trim() || ''
  const userId = params.get('user_id')
  const channelId = params.get('channel_id')

  // Handle /dropletter command
  if (command === '/dropletter') {
    const subCommand = text.toLowerCase()

    if (subCommand === 'help' || subCommand === 'ヘルプ') {
      return NextResponse.json({
        response_type: 'ephemeral',
        blocks: createHelpBlocks(),
      })
    }

    if (subCommand === 'check' || subCommand === 'チェック' || subCommand === '') {
      return NextResponse.json({
        response_type: 'ephemeral',
        blocks: createWelcomeBlocks(),
      })
    }

    if (subCommand === 'history' || subCommand === '履歴') {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dropletter.app'
      return NextResponse.json({
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:clock3: *チェック履歴*\n\n過去のチェック履歴はWebサイトでご確認いただけます。\n\n<${baseUrl}/history|履歴を見る>`,
            },
          },
        ],
      })
    }

    // Unknown subcommand
    return NextResponse.json({
      response_type: 'ephemeral',
      text: `不明なコマンドです: ${text}\n\`/dropletter help\` でヘルプを表示できます。`,
    })
  }

  return NextResponse.json({
    response_type: 'ephemeral',
    text: '不明なコマンドです。',
  })
}
