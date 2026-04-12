'use client'

import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { CommandPalette } from '@/components/command-palette/CommandPalette'
import { FeedbackDialog } from '@/components/feedback/FeedbackDialog'

interface AppShellProps {
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
  children: React.ReactNode
}

export function AppShell({ profile, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)
  // Phase 12.A: command palette open state — lifted here so Header can trigger it
  const [palOpen, setPalOpen] = useState(false)
  // Phase 12.C: feedback dialog open state — shared between Sidebar trigger and CommandPalette
  const [feedbackOpen, setFeedbackOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile backdrop — taps outside sidebar to close it */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        profile={profile}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        onOpenFeedback={() => setFeedbackOpen(true)}
      />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header
          profile={profile}
          onMenuClick={() => setMobileOpen(true)}
          onOpenPalette={() => setPalOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Phase 12.A: global command palette — mounted once in the shell */}
      <CommandPalette open={palOpen} onOpenChange={setPalOpen} onOpenFeedback={() => setFeedbackOpen(true)} />

      {/* Phase 12.C: global feedback dialog — shared between sidebar trigger and command palette */}
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </div>
  )
}
