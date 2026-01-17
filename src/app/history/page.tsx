import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { HistoryView } from '@/components/history-view'
import type { OrganizationMembershipResult } from '@/types/database'

export const metadata: Metadata = {
  title: '履歴 - DropLetter',
  description: '過去のチェック履歴を確認',
}

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/history')
  }

  // Get user's organizations (table may not exist yet)
  let organizations: Array<{ id: string; name: string; slug: string }> = []
  try {
    const { data: memberships } = await supabase
      .from('organization_members')
      .select('organization:organizations(id, name, slug)')
      .eq('user_id', user.id)

    if (memberships) {
      for (const m of memberships) {
        const membership = m as unknown as OrganizationMembershipResult
        if (membership.organization) {
          organizations.push({
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
          })
        }
      }
    }
  } catch {
    // Table may not exist yet
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">履歴</h1>
          <p className="text-muted-foreground mt-2">
            過去のチェック履歴とアクティビティを確認できます
          </p>
        </div>

        <HistoryView userId={user.id} organizations={organizations} />
      </div>
    </main>
  )
}
