"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  Check,
  CreditCard,
  Zap,
  Shield,
  ExternalLink,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BillingViewSkeleton } from "@/components/ui/skeleton"

interface BillingInfo {
  plan: 'free' | 'pro'
  plan_details: {
    name: string
    description: string
    price: number
    features: string[]
  }
  subscription: {
    status: string
    current_period_end: string
    cancel_at_period_end: boolean
  } | null
  usage: {
    free_checks_used: number
    can_perform_check: boolean
    check_blocked_reason?: string
  }
}

interface BillingViewProps {
  userId: string
  email: string
}

export function BillingView({ userId, email }: BillingViewProps) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [isManaging, setIsManaging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch billing info
  useEffect(() => {
    async function fetchBillingInfo() {
      try {
        const response = await fetch('/api/billing')
        if (response.ok) {
          const data = await response.json()
          setBillingInfo(data.billing)
        } else {
          // If billing API fails, show default free plan
          setBillingInfo({
            plan: 'free',
            plan_details: {
              name: 'Free',
              description: '1回無料チェック',
              price: 0,
              features: [
                'AI書類チェック 1回',
                '基本的なリスク検出',
                '7日間の結果保存',
              ],
            },
            subscription: null,
            usage: {
              free_checks_used: 0,
              can_perform_check: true,
            },
          })
        }
      } catch {
        setError('課金情報の取得に失敗しました')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBillingInfo()
  }, [])

  // Handle upgrade to Pro
  const handleUpgrade = async () => {
    setIsUpgrading(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price_type: 'subscription',
        }),
      })

      if (!response.ok) {
        throw new Error('チェックアウトセッションの作成に失敗しました')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsUpgrading(false)
    }
  }

  // Handle manage subscription (Stripe Customer Portal)
  const handleManageSubscription = async () => {
    setIsManaging(true)
    setError(null)

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('カスタマーポータルの作成に失敗しました')
      }

      const data = await response.json()
      if (data.url) {
        window.location.href = data.url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsManaging(false)
    }
  }

  if (isLoading) {
    return <BillingViewSkeleton />
  }

  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">現在のプラン</h2>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "text-2xl font-bold",
                  billingInfo?.plan === 'pro' && "text-[#FF3300]"
                )}
              >
                {billingInfo?.plan_details.name}
              </span>
              {billingInfo?.plan === 'pro' && (
                <span className="px-2 py-0.5 bg-[#FF3300]/10 text-[#FF3300] text-xs rounded-full font-medium">
                  アクティブ
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {billingInfo?.plan_details.description}
            </p>
          </div>

          {billingInfo?.plan === 'pro' && billingInfo.subscription && (
            <div className="text-right text-sm text-muted-foreground">
              <p>次回請求日</p>
              <p className="font-medium text-foreground">
                {new Date(billingInfo.subscription.current_period_end).toLocaleDateString('ja-JP')}
              </p>
              {billingInfo.subscription.cancel_at_period_end && (
                <p className="text-amber-500 mt-1">期間終了後に解約</p>
              )}
            </div>
          )}
        </div>

        {/* Usage Info */}
        {billingInfo?.plan === 'free' && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">無料チェック使用回数</span>
              <span className="font-medium">
                {billingInfo.usage.free_checks_used} / 1 回
              </span>
            </div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FF3300] transition-all"
                style={{
                  width: `${Math.min(billingInfo.usage.free_checks_used * 100, 100)}%`,
                }}
              />
            </div>
            {!billingInfo.usage.can_perform_check && (
              <p className="mt-2 text-sm text-amber-500">
                {billingInfo.usage.check_blocked_reason}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {billingInfo?.plan === 'free' ? (
            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              {isUpgrading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              Proにアップグレード
            </button>
          ) : (
            <button
              onClick={handleManageSubscription}
              disabled={isManaging}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
            >
              {isManaging ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              <span className="hidden sm:inline">サブスクリプションを管理</span>
              <span className="sm:hidden">管理</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Plan Comparison */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">プラン比較</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Plan */}
          <div
            className={cn(
              "bg-card border rounded-xl p-6",
              billingInfo?.plan === 'free' && "ring-2 ring-[#FF3300]"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Free</h3>
              {billingInfo?.plan === 'free' && (
                <span className="px-2 py-0.5 bg-[#FF3300]/10 text-[#FF3300] text-xs rounded-full font-medium">
                  現在のプラン
                </span>
              )}
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold">¥0</span>
            </div>
            <ul className="space-y-3">
              {[
                'AI書類チェック 1回',
                '基本的なリスク検出',
                '7日間の結果保存',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Plan */}
          <div
            className={cn(
              "bg-card border rounded-xl p-6 relative overflow-hidden",
              billingInfo?.plan === 'pro' && "ring-2 ring-[#FF3300]"
            )}
          >
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#FF3300] text-white text-xs font-medium rounded-bl-lg">
              おすすめ
            </div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">Pro</h3>
              {billingInfo?.plan === 'pro' && (
                <span className="px-2 py-0.5 bg-[#FF3300]/10 text-[#FF3300] text-xs rounded-full font-medium">
                  現在のプラン
                </span>
              )}
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold">¥9,800</span>
              <span className="text-muted-foreground">/月</span>
            </div>
            <ul className="space-y-3">
              {[
                'AI書類チェック 無制限',
                '高度なリスク分析',
                '無期限の履歴保存',
                'チーム共有機能',
                '優先サポート',
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            {billingInfo?.plan === 'free' && (
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full mt-6 flex items-center justify-center gap-2 px-6 py-3 bg-[#FF3300] text-white rounded-lg hover:bg-[#FF3300]/90 transition-colors disabled:opacity-50"
              >
                {isUpgrading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
                アップグレード
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Human Review Add-on */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <Shield className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold">有人判定オプション</h3>
            <p className="text-muted-foreground mt-1">
              専門家による詳細な書類チェック。24時間以内に結果をお届けします。
            </p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">¥3,000</span>
                <span className="text-muted-foreground">/回</span>
              </div>
              <span className="text-sm text-muted-foreground">
                レポート画面から依頼できます
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">よくある質問</h2>
        <div className="space-y-3">
          {[
            {
              q: 'いつでも解約できますか？',
              a: 'はい、いつでも解約できます。解約後も現在の請求期間終了までサービスをご利用いただけます。',
            },
            {
              q: '支払い方法は？',
              a: 'クレジットカード（Visa, Mastercard, American Express, JCB）に対応しています。',
            },
            {
              q: 'チーム共有機能とは？',
              a: 'Proプランでは、チェック結果を期限なく共有リンクで共有できます。',
            },
          ].map((faq) => (
            <div key={faq.q} className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium">{faq.q}</h4>
              <p className="text-sm text-muted-foreground mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
