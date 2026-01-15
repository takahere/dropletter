import { Metadata } from 'next'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ReportView } from '@/components/report-view'
import { Footer } from '@/components/footer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ShareAuthGate } from '@/components/share-auth-gate'
import { ShareExpired } from '@/components/share-expired'

type Props = {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  const serviceClient = createServiceClient()

  const { data: shareLink } = await serviceClient
    .from('share_links')
    .select('report:reports(id, file_name)')
    .eq('token', token)
    .single()

  const report = shareLink?.report as { id: string; file_name: string } | null
  const title = report
    ? `${report.file_name} - DropLetter解析結果`
    : 'DropLetter - ドキュメント解析結果'

  return {
    title,
    description: 'AIによるドキュメント解析・法的チェック結果',
    openGraph: {
      title,
      description: 'AIによるドキュメント解析・法的チェック結果を確認できます',
      images: report ? [`${baseUrl}/api/og?id=${report.id}`] : [],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: 'AIによるドキュメント解析・法的チェック結果',
      images: report ? [`${baseUrl}/api/og?id=${report.id}`] : [],
    },
  }
}

export default async function ShareTokenPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()
  const serviceClient = createServiceClient()

  // Get share link
  const { data: shareLink, error: shareLinkError } = await serviceClient
    .from('share_links')
    .select('*, report:reports(*)')
    .eq('token', token)
    .single()

  if (shareLinkError || !shareLink) {
    notFound()
  }

  // Check expiration
  const isExpired = new Date(shareLink.expires_at) < new Date()
  if (isExpired) {
    return <ShareExpired />
  }

  // Check auth requirement
  const { data: { user } } = await supabase.auth.getUser()
  const requiresAuth = shareLink.require_auth && !user

  if (requiresAuth) {
    return <ShareAuthGate token={token} />
  }

  // Increment view count
  await serviceClient
    .from('share_links')
    .update({ view_count: (shareLink.view_count || 0) + 1 })
    .eq('id', shareLink.id)

  // Log activity if user is authenticated
  if (user) {
    await serviceClient.rpc('log_activity', {
      p_user_id: user.id,
      p_org_id: null,
      p_action_type: 'report.viewed',
      p_target_type: 'report',
      p_target_id: shareLink.report_id,
      p_metadata: { via: 'share_link', share_link_id: shareLink.id },
    })
  }

  const report = shareLink.report as {
    id: string
    file_name: string
    status: string
    result_json: Record<string, unknown>
    human_edits: unknown[]
  }

  // Calculate days remaining
  const daysRemaining = Math.ceil(
    (new Date(shareLink.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF3300] flex items-center justify-center">
              <span className="text-white text-lg">✨</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">DropLetter</h1>
              <p className="text-xs text-muted-foreground">AI Document Processor</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="text-sm text-muted-foreground">
              <span className="text-xs bg-muted px-2 py-0.5 rounded">
                {report.status === 'edited' ? '編集済み' : '完了'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground border-l pl-3">
              <span className="text-orange-500">残り{daysRemaining}日</span>で期限切れ
            </div>
          </div>
        </div>
      </header>

      {/* Shared content banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border-b">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" x2="12" y1="2" y2="15" />
            </svg>
            <span>この解析結果は共有リンクで表示されています</span>
          </div>
          {!user && (
            <Link
              href={`/login?redirect=/s/${token}`}
              className="text-sm text-blue-700 dark:text-blue-300 hover:underline"
            >
              ログインして自分の書類もチェック
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <ReportView report={report} editable={false} />
      </div>

      <Footer />
    </main>
  )
}
