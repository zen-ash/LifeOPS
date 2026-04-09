'use client'

import { useChat } from 'ai/react'
import { useEffect, useRef } from 'react'
import { Bot, Send, User, Loader2, Plus, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const SUGGESTIONS = [
  'What should I focus on today?',
  "How am I doing with my habits?",
  'Create a task: Review lecture notes tomorrow',
]

export default function AssistantPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, error } =
    useChat({ api: '/api/chat' })

  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function fillSuggestion(text: string) {
    handleInputChange({
      target: { value: text },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  // Determine if the error is about a missing API key for a friendlier message
  const errorMessage = error
    ? error.message?.toLowerCase().includes('api key') ||
      error.message?.toLowerCase().includes('openai_api_key') ||
      error.message?.toLowerCase().includes('500')
      ? 'The OpenAI API key is not configured. Add OPENAI_API_KEY to your .env.local file.'
      : `Something went wrong: ${error.message}`
    : null

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b px-6 py-4 shrink-0">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">AI Assistant</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your productivity coach — knows your tasks, habits, and goals
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Empty state with prompt suggestions */}
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="font-medium">How can I help you today?</p>
              <p className="text-sm text-muted-foreground mt-1">
                I can see your tasks, habits, and goals — ask me anything.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => fillSuggestion(s)}
                  className="text-xs border rounded-full px-3 py-1.5 hover:bg-accent hover:text-foreground transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-3 items-start',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {/* Assistant avatar */}
            {message.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-4 w-4 text-primary" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[78%] rounded-lg px-4 py-2.5 text-sm',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {/* Text content */}
              {message.content && (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>
              )}

              {/* Tool invocation status (create_task) */}
              {message.toolInvocations?.map((inv) => {
                if (inv.toolName !== 'create_task') return null

                if (inv.state === 'result') {
                  const result = inv.result as {
                    success: boolean
                    task?: { title: string; priority: string; due_date: string | null }
                    error?: string
                  }
                  return result.success ? (
                    <div
                      key={inv.toolCallId}
                      className="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-md px-2.5 py-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Task created:{' '}
                        <span className="font-medium">{result.task?.title}</span>
                        {result.task?.due_date && ` · due ${result.task.due_date}`}
                      </span>
                    </div>
                  ) : (
                    <div
                      key={inv.toolCallId}
                      className="flex items-center gap-1.5 mt-2 text-xs text-destructive"
                    >
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Failed to create task: {result.error}
                    </div>
                  )
                }

                // state === 'call' or 'partial-call' — in progress
                return (
                  <div
                    key={inv.toolCallId}
                    className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground"
                  >
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating task...
                  </div>
                )
              })}
            </div>

            {/* User avatar */}
            {message.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator — shown when AI is streaming and last message was from user */}
        {isLoading &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role === 'user') && (
            <div className="flex gap-3 items-start">
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-2.5 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}

        {/* Error state */}
        {errorMessage && (
          <div className="flex gap-2 items-start rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t px-6 py-4 shrink-0">
        <form
          onSubmit={handleSubmit}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your tasks, habits, or say 'create a task for…'"
            disabled={isLoading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
              }
            }}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          AI may make mistakes. Verify important details before acting on them.
        </p>
      </div>
    </div>
  )
}
