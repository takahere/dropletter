'use client'

import Link from 'next/link'

interface ShareAuthGateProps {
  token: string
}

export function ShareAuthGate({ token }: ShareAuthGateProps) {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6">
        <div className="bg-card border rounded-2xl p-8 shadow-lg text-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#FF3300] flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">✨</span>
          </div>

          {/* Lock icon */}
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">ログインが必要です</h1>
          <p className="text-muted-foreground mb-8">
            この解析結果を表示するには、<br />
            アカウントへのログインが必要です。
          </p>

          <div className="space-y-3">
            <Link
              href={`/login?redirect=/s/${token}`}
              className="block w-full py-3 px-4 bg-[#FF3300] text-white rounded-lg font-medium hover:bg-[#FF3300]/90 transition-colors"
            >
              ログイン / 新規登録
            </Link>

            <Link
              href="/"
              className="block w-full py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              トップページへ戻る
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            アカウント登録は無料で、1回のAIチェックが無料で利用できます
          </p>
        </div>
      </div>
    </main>
  )
}
