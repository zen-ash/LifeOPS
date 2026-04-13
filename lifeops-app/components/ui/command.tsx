'use client'

import * as React from 'react'
import { type DialogProps } from '@radix-ui/react-dialog'
import {
  Command as CommandRoot,
  CommandInput as CommandInputPrimitive,
  CommandList as CommandListPrimitive,
  CommandGroup as CommandGroupPrimitive,
  CommandItem as CommandItemPrimitive,
  CommandEmpty as CommandEmptyPrimitive,
  CommandSeparator as CommandSeparatorPrimitive,
} from 'cmdk'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// ── Root ──────────────────────────────────────────────────────────────────
const Command = React.forwardRef<
  React.ElementRef<typeof CommandRoot>,
  React.ComponentPropsWithoutRef<typeof CommandRoot>
>(({ className, ...props }, ref) => (
  <CommandRoot
    ref={ref}
    className={cn(
      'flex h-full w-full flex-col overflow-hidden rounded-xl bg-popover text-popover-foreground',
      className
    )}
    {...props}
  />
))
Command.displayName = 'Command'

// ── Dialog wrapper ────────────────────────────────────────────────────────
interface CommandDialogProps extends DialogProps {}

function CommandDialog({ children, ...props }: CommandDialogProps) {
  return (
    <Dialog {...props}>
      {/*
        [&>button:last-child]:hidden — hides the X close button rendered by DialogContent.
        The palette is dismissed via Escape / clicking the overlay instead.
        max-w-xl — wider than the default dialog for comfortable palette width.
      */}
      <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-xl [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <Command>{children}</Command>
      </DialogContent>
    </Dialog>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandInputPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandInputPrimitive>
>(({ className, ...props }, ref) => (
  <div className="flex items-center border-b border-border/60 px-3" cmdk-input-wrapper="">
    <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground/60" />
    <CommandInputPrimitive
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
))
CommandInput.displayName = 'CommandInput'

// ── List ──────────────────────────────────────────────────────────────────
const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandListPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandListPrimitive>
>(({ className, ...props }, ref) => (
  <CommandListPrimitive
    ref={ref}
    className={cn('max-h-[320px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
CommandList.displayName = 'CommandList'

// ── Empty ─────────────────────────────────────────────────────────────────
const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandEmptyPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandEmptyPrimitive>
>((props, ref) => (
  <CommandEmptyPrimitive
    ref={ref}
    className="py-6 text-center text-sm text-muted-foreground"
    {...props}
  />
))
CommandEmpty.displayName = 'CommandEmpty'

// ── Group ─────────────────────────────────────────────────────────────────
const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandGroupPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandGroupPrimitive>
>(({ className, ...props }, ref) => (
  <CommandGroupPrimitive
    ref={ref}
    className={cn(
      'overflow-hidden p-1 text-foreground',
      '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
      '[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold',
      '[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider',
      '[&_[cmdk-group-heading]]:text-muted-foreground/60',
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = 'CommandGroup'

// ── Separator ─────────────────────────────────────────────────────────────
const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandSeparatorPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandSeparatorPrimitive>
>(({ className, ...props }, ref) => (
  <CommandSeparatorPrimitive
    ref={ref}
    className={cn('-mx-1 h-px bg-border/40', className)}
    {...props}
  />
))
CommandSeparator.displayName = 'CommandSeparator'

// ── Item ──────────────────────────────────────────────────────────────────
const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandItemPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandItemPrimitive>
>(({ className, ...props }, ref) => (
  <CommandItemPrimitive
    ref={ref}
    className={cn(
      'relative flex cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none',
      'data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
      'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className
    )}
    {...props}
  />
))
CommandItem.displayName = 'CommandItem'

// ── Shortcut label ────────────────────────────────────────────────────────
function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('ml-auto text-[10px] tracking-widest text-muted-foreground/50', className)}
      {...props}
    />
  )
}
CommandShortcut.displayName = 'CommandShortcut'

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
}
