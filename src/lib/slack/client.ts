/**
 * Slack API Client
 */

const SLACK_API_BASE = 'https://slack.com/api'

if (!process.env.SLACK_BOT_TOKEN) {
  console.warn('SLACK_BOT_TOKEN is not set')
}

interface SlackBlock {
  type: string
  text?: { type: string; text: string; emoji?: boolean }
  elements?: unknown[]
  accessory?: unknown
  fields?: unknown[]
  block_id?: string
}

/**
 * Post a message to a Slack channel
 */
export async function postMessage(
  channel: string,
  text: string,
  blocks?: SlackBlock[],
  threadTs?: string
): Promise<{ ok: boolean; ts?: string; error?: string }> {
  const response = await fetch(`${SLACK_API_BASE}/chat.postMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      text,
      blocks,
      thread_ts: threadTs,
    }),
  })

  return response.json()
}

/**
 * Update a message
 */
export async function updateMessage(
  channel: string,
  ts: string,
  text: string,
  blocks?: SlackBlock[]
): Promise<{ ok: boolean; error?: string }> {
  const response = await fetch(`${SLACK_API_BASE}/chat.update`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel,
      ts,
      text,
      blocks,
    }),
  })

  return response.json()
}

/**
 * Download a file from Slack
 */
export async function downloadFile(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Slack file download error: ${response.status}`)
  }

  return response.arrayBuffer()
}

/**
 * Get file info
 */
export async function getFileInfo(fileId: string): Promise<{
  ok: boolean
  file?: {
    id: string
    name: string
    mimetype: string
    url_private_download: string
    size: number
  }
  error?: string
}> {
  const response = await fetch(`${SLACK_API_BASE}/files.info?file=${fileId}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
  })

  return response.json()
}

/**
 * Create report result blocks
 */
export function createReportResultBlocks(
  fileName: string,
  riskLevel: string,
  summary: string,
  shareUrl: string
): SlackBlock[] {
  const riskEmoji: Record<string, string> = {
    none: ':white_check_mark:',
    low: ':large_blue_circle:',
    medium: ':warning:',
    high: ':orange_circle:',
    critical: ':red_circle:',
  }

  const riskLabels: Record<string, string> = {
    none: '問題なし',
    low: '低リスク',
    medium: '中リスク',
    high: '高リスク',
    critical: '危険',
  }

  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':page_facing_up: DropLetter 解析結果',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*ファイル名:*\n${fileName}`,
        },
        {
          type: 'mrkdwn',
          text: `*リスクレベル:*\n${riskEmoji[riskLevel] || ':grey_question:'} ${riskLabels[riskLevel] || '不明'}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*概要:*\n${summary.slice(0, 500)}${summary.length > 500 ? '...' : ''}`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '詳細を見る',
            emoji: true,
          },
          url: shareUrl,
          style: 'primary',
        },
      ],
    },
    {
      type: 'divider',
    },
  ]
}

/**
 * Create processing blocks
 */
export function createProcessingBlocks(fileName: string): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:hourglass_flowing_sand: *解析中...*\n\`${fileName}\` を解析しています。完了したらお知らせします。`,
      },
    },
  ]
}

/**
 * Create error blocks
 */
export function createErrorBlocks(fileName: string, error: string): SlackBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:x: *エラー*\n\`${fileName}\` の解析中にエラーが発生しました。\n\`\`\`${error}\`\`\``,
      },
    },
  ]
}

/**
 * Create welcome blocks
 */
export function createWelcomeBlocks(): SlackBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':sparkles: DropLetter へようこそ！',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'PDFファイルをこのチャンネルに投稿すると、AIが詐欺・不審点をチェックします。',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*使い方:*\n' +
          '• `/dropletter check` - このチャンネルでDropLetterを有効化\n' +
          '• `/dropletter help` - ヘルプを表示\n' +
          '• PDFファイルをドロップ - AIがチェック',
      },
    },
  ]
}

/**
 * Create help blocks
 */
export function createHelpBlocks(): SlackBlock[] {
  return [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: ':question: DropLetter ヘルプ',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*コマンド:*\n' +
          '• `/dropletter check` - PDFチェック機能を有効化\n' +
          '• `/dropletter help` - このヘルプを表示\n' +
          '• `/dropletter history` - 過去のチェック履歴',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*チェック項目:*\n' +
          '• :warning: 詐欺の兆候\n' +
          '• :no_entry: NGワード検出\n' +
          '• :lock: 個人情報検出\n' +
          '• :scales: 法的リスク',
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*料金:*\n' +
          '• 初回1回無料\n' +
          '• 月額9,800円で無制限\n' +
          '• 有人判定オプション 3,000円/回',
      },
    },
  ]
}
