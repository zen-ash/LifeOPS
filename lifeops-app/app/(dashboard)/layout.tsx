import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email, is_onboarded')
    .eq('id', user.id)
    .single()

  // If the user hasn't completed onboarding yet, send them there
  if (!profile?.is_onboarded) {
    redirect('/onboarding')
  }

  return <AppShell profile={profile}>{children}</AppShell>
}
