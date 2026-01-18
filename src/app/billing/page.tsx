import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingView } from '@/components/billing-view'

export const metadata: Metadata = {
  title: 'プラン・お支払い - DropLetter',
  description: 'プランの確認とお支払い管理',
}

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/billing')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">プラン・お支払い</h1>
          <p className="text-muted-foreground mt-2">
            現在のプランの確認とお支払い管理ができます
          </p>
        </div>

        <BillingView userId={user.id} email={user.email || ''} />
      </div>
    </main>
  )
}
