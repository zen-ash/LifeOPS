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
  Settings,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// Navigation structure — mirrors the phase roadmap
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
  { label: 'Study Buddy', href: '/study-buddy', icon: Users },
  { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
  { label: 'AI Assistant', href: '/assistant', icon: Bot },
]

interface SidebarProps {
  profile: {
    full_name: string | null
    avatar_url: string | null
    email: string | null
  } | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()

  // Generate initials from full name for the avatar fallback
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
    <aside className="hidden md:flex flex-col w-60 border-r bg-card h-full shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-14 border-b shrink-0">
        <Zap className="h-5 w-5 text-primary" />
        <span className="font-bold text-lg">LifeOPS</span>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="text-[10px] font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-widest">
          Workspace
        </p>
        {workspaceNav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}

        <Separator className="my-3" />

        <p className="text-[10px] font-semibold text-muted-foreground px-2 mb-2 uppercase tracking-widest">
          Tools
        </p>
        {toolsNav.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              isActive(href)
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* User profile at the bottom */}
      <div className="border-t p-3 shrink-0">
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-accent transition-colors"
        >
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium leading-none truncate">
              {profile?.full_name ?? 'User'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {profile?.email ?? ''}
            </p>
          </div>
          <Settings className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </Link>
      </div>
    </aside>
  )
}
