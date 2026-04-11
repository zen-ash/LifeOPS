'use client'

import { useState, KeyboardEvent } from 'react'
import type { Tag } from '@/types'

// ── TagInput ────────────────────────────────────────────────────────────────
// Controlled chip-style tag input.
// Press Enter or comma to add a tag; Backspace to remove the last chip.
// Tags are stored as lowercase strings.

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
}

export function TagInput({ value, onChange, placeholder = 'Add tag…' }: TagInputProps) {
  const [input, setInput] = useState('')

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/,/g, '')
    if (!tag || value.includes(tag)) {
      setInput('')
      return
    }
    onChange([...value, tag])
    setInput('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag))
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-2.5 py-2 rounded-md border border-input bg-background min-h-10 cursor-text focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-0.5 rounded-full hover:bg-primary/20 w-3.5 h-3.5 flex items-center justify-center leading-none"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input) }}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-20 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
      />
    </div>
  )
}

// ── TagBadge ────────────────────────────────────────────────────────────────
// Read-only tag chip using the tag's stored color.

export function TagBadge({ tag }: { tag: Tag }) {
  return (
    <span
      className="inline-flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full"
      style={{
        backgroundColor: `${tag.color}20`,
        color: tag.color,
        border: `1px solid ${tag.color}40`,
      }}
    >
      {tag.name}
    </span>
  )
}

// ── TagFilterBar ─────────────────────────────────────────────────────────────
// Horizontal strip of tag filter pills for list pages.
// "All" deselects; clicking an active tag also deselects.

interface TagFilterBarProps {
  tags: Tag[]                          // all unique tags visible in the current list
  selected: string | null              // currently selected tag name, or null for "all"
  onSelect: (name: string | null) => void
}

export function TagFilterBar({ tags, selected, onSelect }: TagFilterBarProps) {
  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
          selected === null
            ? 'bg-primary text-primary-foreground border-primary'
            : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
        }`}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          onClick={() => onSelect(selected === tag.name ? null : tag.name)}
          className="text-xs font-medium px-2.5 py-1 rounded-full border transition-colors"
          style={
            selected === tag.name
              ? {
                  backgroundColor: tag.color,
                  color: '#fff',
                  borderColor: tag.color,
                }
              : {
                  backgroundColor: `${tag.color}15`,
                  color: tag.color,
                  borderColor: `${tag.color}40`,
                }
          }
        >
          {tag.name}
        </button>
      ))}
    </div>
  )
}
