'use client'

import Link from 'next/link'

export function ShareExpired() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center">
      <div className="max-w-md mx-auto px-6">
        <div className="bg-card border rounded-2xl p-8 shadow-lg text-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-[#FF3300] flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">✨</span>
          </div>

          {/* Expired icon */}
          <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-950/30 flex items-center justify-center mx-auto mb-6">
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
              className="text-orange-500"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2">リンクの有効期限が切れました</h1>
          <p className="text-muted-foreground mb-8">
            この共有リンクは有効期限（7日間）を<br />
            過ぎたため、表示できません。
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-muted-foreground">
              共有元の方に、新しいリンクの発行を依頼してください。
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-[#FF3300] text-white rounded-lg font-medium hover:bg-[#FF3300]/90 transition-colors"
            >
              DropLetterで書類をチェックする
            </Link>

            <Link
              href="/login"
              className="block w-full py-3 px-4 bg-muted text-muted-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              ログイン
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            無料でアカウント登録して、自分の書類もAIチェックしましょう
          </p>
        </div>
      </div>
    </main>
  )
}
