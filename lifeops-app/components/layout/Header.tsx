'use client'

import { useRouter, usePathname } from 'next/navigation'
import { Menu, LogOut, Settings, User, Search, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const pageLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/focus': 'Focus Mode',
  '/habits': 'Habits',
  '/calendar': 'Calendar',
  '/notes': 'Notes',
  '/journal': 'Journal',
  '/documents': 'Documents',
  '/study-buddy': 'Study Buddy',
  '/leaderboard': 'Leaderboard',
  '/assistant': 'AI Assistant',
  '/planner': 'AI Planner',
}

interface HeaderProps {
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
  onMenuClick: () => void
  onOpenPalette?: () => void
  onOpenAI?: () => void
}

export function Header({ profile, onMenuClick, onOpenPalette, onOpenAI }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const pageTitle = pageLabels[pathname] ?? 'LifeOPS'

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <header className="h-14 border-b border-border/60 bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      {/* Left: mobile menu button + page title */}
      <div className="flex items-center gap-3">
        <button
          className="md:hidden rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="text-sm font-semibold tracking-tight">{pageTitle}</h1>
      </div>

      {/* Right: ⌘K hint + theme toggle + user menu */}
      <div className="flex items-center gap-1">
        {/* Phase 12.A: command palette trigger — hidden on mobile (no keyboard shortcut on touch) */}
        <button
          onClick={onOpenPalette}
          className="hidden md:flex items-center gap-2 h-8 px-3 rounded-md border border-border/50 bg-muted/40 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-xs mr-1"
          aria-label="Open command palette"
        >
          <Search className="h-3 w-3 shrink-0" />
          <span>Search…</span>
          <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border/50 bg-background px-1 font-mono text-[9px] font-medium text-muted-foreground/70 opacity-90">
            <span className="text-[10px]">⌘</span>K
          </kbd>
        </button>

        {/* Phase 16.D: AI side panel trigger */}
        <button
          onClick={onOpenAI}
          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open AI Assistant"
          title="AI Assistant"
        >
          <Bot className="h-4 w-4" />
        </button>

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 ml-1">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary text-primary-foreground font-medium">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{profile?.full_name ?? 'User'}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {profile?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
