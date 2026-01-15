import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Price IDs (configure in Stripe Dashboard)
export const PRICES = {
  // サブスク 9,800円/月
  PRO_MONTHLY: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
  // 有人スポット 3,000円/回
  HUMAN_REVIEW_SPOT: process.env.STRIPE_PRICE_HUMAN_REVIEW || 'price_human_review',
} as const

// Plan configuration
export const PLANS = {
  free: {
    name: 'Free',
    description: '1回無料チェック',
    price: 0,
    features: [
      'AI書類チェック 1回',
      '基本的なリスク検出',
      '7日間の結果保存',
    ],
    limits: {
      checksPerMonth: 1,
      historyDays: 7,
      shareLinks: 1,
    },
  },
  pro: {
    name: 'Pro',
    description: '9,800円/月',
    price: 9800,
    priceId: PRICES.PRO_MONTHLY,
    features: [
      'AI書類チェック 無制限',
      '高度なリスク分析',
      '無期限の履歴保存',
      'チーム共有機能',
      '優先サポート',
    ],
    limits: {
      checksPerMonth: -1, // unlimited
      historyDays: -1, // unlimited
      shareLinks: -1, // unlimited
    },
  },
} as const

export type PlanType = keyof typeof PLANS

// Human review pricing
export const HUMAN_REVIEW_PRICE = {
  amount: 3000, // JPY
  amountCents: 300000, // for Stripe (JPY uses 1 unit = 1 yen, but stored as cents for consistency)
  currency: 'jpy',
  description: '専門家による有人チェック',
} as const
