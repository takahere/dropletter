/**
 * LINE Messaging API Client
 */

const LINE_API_BASE = 'https://api.line.me/v2/bot'

if (!process.env.LINE_CHANNEL_ACCESS_TOKEN) {
  console.warn('LINE_CHANNEL_ACCESS_TOKEN is not set')
}

interface LineMessage {
  type: 'text' | 'image' | 'flex'
  text?: string
  altText?: string
  contents?: unknown
}

interface LineUser {
  userId: string
  displayName?: string
  pictureUrl?: string
}

/**
 * Send a reply message to LINE
 */
export async function replyMessage(replyToken: string, messages: LineMessage[]): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('LINE reply error:', error)
    throw new Error(`LINE API error: ${response.status}`)
  }
}

/**
 * Send a push message to LINE user
 */
export async function pushMessage(userId: string, messages: LineMessage[]): Promise<void> {
  const response = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('LINE push error:', error)
    throw new Error(`LINE API error: ${response.status}`)
  }
}

/**
 * Get content (file) from LINE
 */
export async function getContent(messageId: string): Promise<ArrayBuffer> {
  const response = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: {
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`LINE content API error: ${response.status}`)
  }

  return response.arrayBuffer()
}

/**
 * Get user profile
 */
export async function getProfile(userId: string): Promise<LineUser> {
  const response = await fetch(`${LINE_API_BASE}/profile/${userId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`LINE profile API error: ${response.status}`)
  }

  return response.json()
}

/**
 * Create a text message
 */
export function textMessage(text: string): LineMessage {
  return { type: 'text', text }
}

/**
 * Create a flex message for report result
 */
export function reportResultFlexMessage(
  fileName: string,
  riskLevel: string,
  summary: string,
  shareUrl: string
): LineMessage {
  const riskColors: Record<string, string> = {
    none: '#22c55e',
    low: '#3b82f6',
    medium: '#f59e0b',
    high: '#f97316',
    critical: '#ef4444',
  }

  const riskLabels: Record<string, string> = {
    none: '問題なし',
    low: '低リスク',
    medium: '中リスク',
    high: '高リスク',
    critical: '危険',
  }

  return {
    type: 'flex',
    altText: `${fileName} の解析結果`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'DropLetter 解析結果',
            weight: 'bold',
            color: '#FF3300',
            size: 'sm',
          },
        ],
        paddingBottom: 'none',
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: fileName,
            weight: 'bold',
            size: 'lg',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'リスクレベル',
                size: 'sm',
                color: '#666666',
                flex: 0,
              },
              {
                type: 'text',
                text: riskLabels[riskLevel] || '不明',
                size: 'sm',
                color: riskColors[riskLevel] || '#666666',
                weight: 'bold',
                align: 'end',
              },
            ],
            margin: 'lg',
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'text',
            text: summary.slice(0, 200) + (summary.length > 200 ? '...' : ''),
            size: 'sm',
            color: '#666666',
            wrap: true,
            margin: 'lg',
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: '詳細を見る',
              uri: shareUrl,
            },
            style: 'primary',
            color: '#FF3300',
          },
        ],
      },
    },
  }
}

/**
 * Notify LINE user about completed report
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

/**
 * Create a processing message
 */
export function processingFlexMessage(fileName: string): LineMessage {
  return {
    type: 'flex',
    altText: `${fileName} を解析中...`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: '🔄',
                size: 'xxl',
                flex: 0,
              },
              {
                type: 'box',
                layout: 'vertical',
                contents: [
                  {
                    type: 'text',
                    text: '解析中...',
                    weight: 'bold',
                    size: 'lg',
                  },
                  {
                    type: 'text',
                    text: fileName,
                    size: 'sm',
                    color: '#666666',
                    wrap: true,
                  },
                ],
                margin: 'lg',
              },
            ],
          },
          {
            type: 'text',
            text: 'AIによる解析が完了したらお知らせします',
            size: 'xs',
            color: '#999999',
            margin: 'lg',
          },
        ],
      },
    },
  }
}
