import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

// This layout wraps all protected pages.
// It checks auth server-side — if no user, redirects to login.
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch the user's profile for the sidebar and header
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email, is_onboarded')
    .eq('id', user.id)
    .single()

  // If the user hasn't completed onboarding yet, send them there
  if (!profile?.is_onboarded) {
    redirect('/onboarding')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar profile={profile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header profile={profile} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
