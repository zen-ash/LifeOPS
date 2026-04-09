'use client'

import { useState, useEffect } from 'react'
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
import { TagInput } from '@/components/ui/tag-input'
import { editTask } from '@/lib/actions/tasks'
import { setTaskTags } from '@/lib/actions/tags'
import type { Tag, Task } from '@/types'

interface Project {
  id: string
  name: string
}

interface EditTaskDialogProps {
  task: Task
  projects: Project[]
  taskTags: Tag[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTaskDialog({
  task,
  projects,
  taskTags,
  open,
  onOpenChange,
}: EditTaskDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagNames, setTagNames] = useState<string[]>([])

  // Reset tag names whenever the dialog opens with a (potentially different) task
  useEffect(() => {
    if (open) {
      setTagNames(taskTags.map((t) => t.name))
      setError(null)
    }
  }, [open, taskTags])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await editTask(task.id, new FormData(e.currentTarget))

    if (result?.error) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Always sync tags (also clears tags when tagNames is empty)
    await setTaskTags(task.id, tagNames)

    onOpenChange(false)
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
          <DialogDescription>
            Update the task details, status, or priority.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-2">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Title *</Label>
              <Input
                id="edit-task-title"
                name="title"
                defaultValue={task.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Input
                id="edit-task-description"
                name="description"
                defaultValue={task.description ?? ''}
                placeholder="Any extra details?"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-task-priority">Priority</Label>
                <select
                  id="edit-task-priority"
                  name="priority"
                  defaultValue={task.priority}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-status">Status</Label>
                <select
                  id="edit-task-status"
                  name="status"
                  defaultValue={task.status}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="edit-task-due">Due date</Label>
                <Input
                  id="edit-task-due"
                  name="due_date"
                  type="date"
                  defaultValue={task.due_date ?? ''}
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-est">Est. minutes</Label>
                <Input
                  id="edit-task-est"
                  name="estimated_minutes"
                  type="number"
                  min="1"
                  defaultValue={task.estimated_minutes ?? ''}
                  placeholder="e.g. 30"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-project">Project (optional)</Label>
              <select
                id="edit-task-project"
                name="project_id"
                defaultValue={task.project_id ?? ''}
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
              <Label>Tags</Label>
              <TagInput value={tagNames} onChange={setTagNames} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
