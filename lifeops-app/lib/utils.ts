import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility to merge Tailwind classes safely (used by shadcn/ui components)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
