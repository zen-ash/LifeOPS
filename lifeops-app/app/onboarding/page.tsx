import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from './OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Must be logged in
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_onboarded, timezone')
    .eq('id', user.id)
    .single()

  // Already done onboarding — send to dashboard
  if (profile?.is_onboarded) redirect('/dashboard')

  return (
    <OnboardingWizard defaultTimezone={profile?.timezone ?? 'UTC'} />
  )
}
