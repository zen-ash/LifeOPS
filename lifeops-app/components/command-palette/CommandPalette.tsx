'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  Plus,
  Play,
  MessageSquarePlus,
  Brain,
  Mic,
  Sparkles,
} from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenFeedback?: () => void
  // Phase 13.C: ask-vault dialog trigger
  onOpenVault?: () => void
  // Phase 15.A: voice brain dump dialog trigger
  onOpenVoice?: () => void
  // Phase 15.C: co-pilot NL command dialog trigger
  onOpenCopilot?: () => void
}

// ── Command definitions ────────────────────────────────────────────────────
// Groups: Navigation | Actions | Review & Recovery
// Each command has a label (shown + filtered on), icon, and target href.

const NAV_COMMANDS = [
  { label: 'Dashboard',    href: '/dashboard',    icon: LayoutDashboard },
  { label: 'Tasks',        href: '/tasks',         icon: CheckSquare },
  { label: 'AI Planner',   href: '/planner',       icon: BrainCircuit },
  { label: 'Focus Mode',   href: '/focus',         icon: Timer },
  { label: 'Habits',       href: '/habits',        icon: Activity },
  { label: 'Notes',        href: '/notes',         icon: FileText },
  { label: 'Journal',      href: '/journal',       icon: BookOpen },
  { label: 'Documents',    href: '/documents',     icon: Archive },
  { label: 'Calendar',     href: '/calendar',      icon: Calendar },
  { label: 'Projects',     href: '/projects',      icon: FolderOpen },
  { label: 'Leaderboard',  href: '/leaderboard',   icon: Trophy },
  { label: 'Study Buddy',  href: '/study-buddy',   icon: Users },
  { label: 'AI Assistant', href: '/assistant',     icon: Bot },
]

const ACTION_COMMANDS = [
  { label: 'Create Task',          href: '/tasks',   icon: Plus,  hint: 'Opens Tasks' },
  { label: 'Start Focus Session',  href: '/focus',   icon: Play,  hint: 'Opens Focus Mode' },
]

const RECOVERY_COMMANDS = [
  { label: 'Daily Shutdown',  href: '/shutdown', icon: Moon },
  { label: 'Weekly Review',   href: '/review',   icon: TrendingUp },
]

export function CommandPalette({ open, onOpenChange, onOpenFeedback, onOpenVault, onOpenVoice, onOpenCopilot }: CommandPaletteProps) {
  const router = useRouter()

  // Global keyboard shortcut: Cmd+K (Mac) / Ctrl+K (Win/Linux)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpenChange(!open)
      }
    },
    [open, onOpenChange]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  function run(href: string) {
    router.push(href)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search commands and pages…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          {NAV_COMMANDS.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              value={label}
              onSelect={() => run(href)}
            >
              <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        {/* Actions */}
        <CommandGroup heading="Actions">
          {/* Phase 15.C: co-pilot — natural-language command entry */}
          {onOpenCopilot && (
            <CommandItem
              value="Ask Co-Pilot Natural Language Command AI Execute"
              onSelect={() => { onOpenChange(false); onOpenCopilot() }}
            >
              <Sparkles className="mr-2.5 h-4 w-4 shrink-0 text-primary" />
              Ask Co-Pilot
              <CommandShortcut>NL Command</CommandShortcut>
            </CommandItem>
          )}
          {ACTION_COMMANDS.map(({ label, href, icon: Icon, hint }) => (
            <CommandItem
              key={label}
              value={label}
              onSelect={() => run(href)}
            >
              <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {label}
              {hint && <CommandShortcut>{hint}</CommandShortcut>}
            </CommandItem>
          ))}
          {/* Phase 13.C: ask vault — callback command, not a navigation */}
          {onOpenVault && (
            <CommandItem
              value="Ask Second Brain Ask Vault Search Notes"
              onSelect={() => { onOpenChange(false); onOpenVault() }}
            >
              <Brain className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              Ask Second Brain
              <CommandShortcut>Vault</CommandShortcut>
            </CommandItem>
          )}
          {/* Phase 15.A: voice brain dump — callback command, not a navigation */}
          {onOpenVoice && (
            <CommandItem
              value="Voice Brain Dump Record Voice Memo Transcribe"
              onSelect={() => { onOpenChange(false); onOpenVoice() }}
            >
              <Mic className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              Voice Brain Dump
              <CommandShortcut>Record</CommandShortcut>
            </CommandItem>
          )}
          {/* Phase 12.C: feedback — callback command, not a navigation */}
          {onOpenFeedback && (
            <CommandItem
              value="Submit Feedback"
              onSelect={() => { onOpenChange(false); onOpenFeedback() }}
            >
              <MessageSquarePlus className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              Submit Feedback
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Review & Recovery */}
        <CommandGroup heading="Review & Recovery">
          {RECOVERY_COMMANDS.map(({ label, href, icon: Icon }) => (
            <CommandItem
              key={href}
              value={label}
              onSelect={() => run(href)}
            >
              <Icon className="mr-2.5 h-4 w-4 shrink-0 text-muted-foreground" />
              {label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
