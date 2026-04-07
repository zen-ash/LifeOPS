'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { addHabit } from '@/lib/actions/habits'
import { WeekdayPicker } from './WeekdayPicker'

interface Project {
  id: string
  name: string
}

interface AddHabitDialogProps {
  projects: Project[]
}

export function AddHabitDialog({ projects }: AddHabitDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState('daily')
  const [selectedDays, setSelectedDays] = useState<string[]>([])
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await addHabit(new FormData(e.currentTarget))

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    setOpen(false)
    setLoading(false)
    setFrequency('daily')
    setSelectedDays([])
    formRef.current?.reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New habit
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create habit</DialogTitle>
          <DialogDescription>
            Add a new daily or weekly habit to track.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="habit-title">Title *</Label>
              <Input
                id="habit-title"
                name="title"
                placeholder="e.g. Morning run, Read 20 pages..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="habit-description">Description (optional)</Label>
              <Input
                id="habit-description"
                name="description"
                placeholder="Any details?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="habit-frequency">Frequency</Label>
                <select
                  id="habit-frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="habit-target">Days per week</Label>
                  <Input
                    id="habit-target"
                    name="target_days_per_week"
                    type="number"
                    min="1"
                    max="7"
                    placeholder="e.g. 3"
                  />
                </div>
              )}
            </div>

            {frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Schedule (optional)</Label>
                <WeekdayPicker selected={selectedDays} onChange={setSelectedDays} />
                <p className="text-[11px] text-muted-foreground">
                  Select which days this habit should be done.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="habit-project">Link to project (optional)</Label>
              <select
                id="habit-project"
                name="linked_project_id"
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">None</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create habit'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
