'use client'

import { useState } from 'react'
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
} from '@/components/ui/dialog'
import { editHabit } from '@/lib/actions/habits'
import { WeekdayPicker } from './WeekdayPicker'

interface Project {
  id: string
  name: string
}

interface HabitForEdit {
  id: string
  title: string
  description: string | null
  frequency: 'daily' | 'weekly'
  target_days_per_week: number | null
  selected_weekdays: string[]
  linked_project_id: string | null
  is_active: boolean
}

interface EditHabitDialogProps {
  habit: HabitForEdit
  projects: Project[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditHabitDialog({
  habit,
  projects,
  open,
  onOpenChange,
}: EditHabitDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>(habit.frequency)
  const [selectedDays, setSelectedDays] = useState<string[]>(habit.selected_weekdays ?? [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await editHabit(habit.id, new FormData(e.currentTarget))

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    onOpenChange(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit habit</DialogTitle>
          <DialogDescription>Update your habit settings.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-habit-title">Title *</Label>
              <Input
                id="edit-habit-title"
                name="title"
                defaultValue={habit.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-habit-description">Description (optional)</Label>
              <Input
                id="edit-habit-description"
                name="description"
                defaultValue={habit.description ?? ''}
                placeholder="Any details?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-habit-frequency">Frequency</Label>
                <select
                  id="edit-habit-frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as 'daily' | 'weekly')
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              {frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label htmlFor="edit-habit-target">Days per week</Label>
                  <Input
                    id="edit-habit-target"
                    name="target_days_per_week"
                    type="number"
                    min="1"
                    max="7"
                    defaultValue={habit.target_days_per_week ?? ''}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-habit-project">Link to project</Label>
                <select
                  id="edit-habit-project"
                  name="linked_project_id"
                  defaultValue={habit.linked_project_id ?? ''}
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

              <div className="space-y-2">
                <Label htmlFor="edit-habit-active">Status</Label>
                <select
                  id="edit-habit-active"
                  name="is_active"
                  defaultValue={String(habit.is_active)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
