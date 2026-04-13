'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FolderOpen,
  CheckSquare,
  FileText,
  BookOpen,
  Archive,
  Timer,
  Activity,
  Calendar,
  Users,
  Trophy,
  Bot,
  BrainCircuit,
  Moon,
  TrendingUp,
  Zap,
  X,
  MessageSquarePlus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const workspaceNav = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Tasks', href: '/tasks', icon: CheckSquare },
  { label: 'Notes', href: '/notes', icon: FileText },
  { label: 'Journal', href: '/journal', icon: BookOpen },
  { label: 'Documents', href: '/documents', icon: Archive },
]

const toolsNav = [
  { label: 'Focus Mode', href: '/focus', icon: Timer },
  { label: 'Habits', href: '/habits', icon: Activity },
  { label: 'Calendar', href: '/calendar', icon: Calendar },
  { label: 'Daily Shutdown', href: '/shutdown', icon: Moon },
  { label: 'Weekly Review', href: '/review', icon: TrendingUp },
  { label: 'Study Buddy', href: '/study-buddy', icon: Users },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'AI Assistant', href: '/assistant', icon: Bot },
  { label: 'AI Planner', href: '/planner', icon: BrainCircuit },
]

interface SidebarProps {
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
  mobileOpen: boolean
  onClose: () => void
  onOpenFeedback?: () => void
  onOpenAI?: () => void
}

export function Sidebar({ profile, mobileOpen, onClose, onOpenFeedback, onOpenAI }: SidebarProps) {
  const pathname = usePathname()

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) ?? '?'

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <aside
      className={cn(
        // Positioning: fixed overlay on mobile, static in the flex row on md+
        'fixed md:static inset-y-0 left-0 z-30',
        'flex flex-col w-60 shrink-0 h-full',
        'bg-sidebar border-r border-border/60',
        // Slide in/out on mobile
        'transition-transform duration-300 ease-in-out',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
            <Zap className="h-4 w-4 text-primary" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-[15px] tracking-tight">LifeOPS</span>
        </div>

        {/* Close button — mobile only */}
        <button
          className="md:hidden rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          onClick={onClose}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground/60 px-2.5 mb-1.5 uppercase tracking-widest">
          Workspace
        </p>

        {workspaceNav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors duration-150',
              isActive(href)
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <div className="my-3 border-t border-border/50" />

        <p className="text-[10px] font-semibold text-muted-foreground/60 px-2.5 mb-1.5 uppercase tracking-widest">
          Tools
        </p>

        {toolsNav.map(({ label, href, icon: Icon }) => {
          // Phase 16.D: AI Assistant opens the side panel instead of navigating
          if (href === '/assistant') {
            return (
              <button
                key={href}
                onClick={() => { onClose(); onOpenAI?.() }}
                className={cn(
                  'w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors duration-150',
                  'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            )
          }
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors duration-150',
                isActive(href)
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:bg-accent/70 hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Phase 12.C: feedback trigger — subtle button above user footer */}
      <div className="px-2 pb-1 shrink-0">
        <button
          onClick={onOpenFeedback}
          className="flex w-full items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent/70 hover:text-foreground transition-colors duration-150"
        >
          <MessageSquarePlus className="h-3.5 w-3.5 shrink-0" />
          Share feedback
        </button>
      </div>

      {/* User footer */}
      <div className="border-t border-border/60 p-2 shrink-0">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent/70 transition-colors cursor-default">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate leading-snug">
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-[10px] text-muted-foreground truncate leading-snug">
              {profile?.email ?? ''}
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
