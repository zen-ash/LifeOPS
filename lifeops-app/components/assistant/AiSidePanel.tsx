'use client'

import { useState, useRef, useEffect } from 'react'
import { useChat } from 'ai/react'
import type { Message } from 'ai'
import {
  Bot,
  Send,
  User,
  Loader2,
  Plus,
  AlertCircle,
  Clock,
  X,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  createChatSession,
  saveChatMessage,
  listChatSessions,
  loadChatMessages,
  type ChatSessionRecord,
  type ChatMessageRecord,
} from '@/lib/actions/chat'

// ── Chat Interface ─────────────────────────────────────────────────────────
// Remounts via key when switching sessions; preserves state across panel open/close.

interface ChatInterfaceProps {
  sessionId: string | null
  initialMessages: ChatMessageRecord[]
  onSessionCreated: (id: string, title: string) => void
}

function ChatInterface({ sessionId: initSessionId, initialMessages, onSessionCreated }: ChatInterfaceProps) {
  const sessionIdRef  = useRef<string | null>(initSessionId)
  const savedCountRef = useRef(initialMessages.length)
  const bottomRef     = useRef<HTMLDivElement>(null)

  const aiInitialMessages: Message[] = initialMessages.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }))

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    initialMessages: aiInitialMessages,
    onFinish: async (assistantMsg) => {
      // messages at this point: all previous + current user msg (assistant not yet appended)
      const newMsgs = messages.slice(savedCountRef.current)

      let sid = sessionIdRef.current
      if (!sid && newMsgs.length > 0) {
        const firstUser = newMsgs.find((m) => m.role === 'user')
        const title = (firstUser?.content || 'New chat').slice(0, 60)
        const result = await createChatSession(title)
        if (result.sessionId) {
          sid = result.sessionId
          sessionIdRef.current = sid
          onSessionCreated(sid, title)
        }
      }

      if (sid) {
        for (const msg of newMsgs) {
          if (msg.content && msg.role === 'user') {
            await saveChatMessage(sid, 'user', msg.content)
          }
        }
        if (assistantMsg.content) {
          await saveChatMessage(sid, 'assistant', assistantMsg.content)
        }
        savedCountRef.current = messages.length + 1
      }
    },
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const SUGGESTIONS = [
    'What should I focus on today?',
    'How am I doing with my habits?',
    'Create a task: Review lecture notes tomorrow',
  ]

  function fillSuggestion(text: string) {
    handleInputChange({ target: { value: text } } as React.ChangeEvent<HTMLInputElement>)
  }

  const errorMessage = error
    ? error.message?.toLowerCase().includes('api key') || error.message?.toLowerCase().includes('500')
      ? 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local.'
      : `Error: ${error.message}`
    : null

  return (
    <>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-2 py-8">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">How can I help you today?</p>
              <p className="text-xs text-muted-foreground mt-1">
                I can see your tasks, habits, and goals — ask me anything.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 justify-center mt-1">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => fillSuggestion(s)}
                  className="text-xs border rounded-full px-2.5 py-1 hover:bg-accent transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex gap-2.5 items-start',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {message.role === 'assistant' && (
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
            )}

            <div
              className={cn(
                'max-w-[82%] rounded-lg px-3 py-2 text-sm',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              )}
            >
              {message.content && (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}
              {message.toolInvocations?.map((inv) => {
                if (inv.toolName !== 'create_task') return null
                if (inv.state === 'result') {
                  const r = inv.result as {
                    success: boolean
                    task?: { title: string; due_date: string | null }
                    error?: string
                  }
                  return r.success ? (
                    <div
                      key={inv.toolCallId}
                      className="flex items-center gap-1.5 mt-2 text-xs text-green-600 dark:text-green-400 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30 rounded-md px-2 py-1.5"
                    >
                      <Plus className="h-3 w-3 shrink-0" />
                      Task created:{' '}
                      <span className="font-medium">{r.task?.title}</span>
                    </div>
                  ) : (
                    <div
                      key={inv.toolCallId}
                      className="flex items-center gap-1.5 mt-2 text-xs text-destructive"
                    >
                      <AlertCircle className="h-3 w-3 shrink-0" />
                      Failed: {r.error}
                    </div>
                  )
                }
                return (
                  <div
                    key={inv.toolCallId}
                    className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground"
                  >
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Creating task...
                  </div>
                )
              })}
            </div>

            {message.role === 'user' && (
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                <User className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading &&
          (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
            <div className="flex gap-2.5 items-start">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}

        {errorMessage && (
          <div className="flex gap-2 items-start rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t px-4 py-3 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Ask about your tasks, habits…"
            disabled={isLoading}
            className="flex-1 h-9 text-sm"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0"
            disabled={isLoading || !input.trim()}
            aria-label="Send message"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </form>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          AI may make mistakes. Verify important details before acting on them.
        </p>
      </div>
    </>
  )
}

// ── History View ───────────────────────────────────────────────────────────

function HistoryView({
  sessions,
  loading,
  onSelectSession,
  onNewChat,
}: {
  sessions: ChatSessionRecord[]
  loading: boolean
  onSelectSession: (session: ChatSessionRecord) => void
  onNewChat: () => void
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
      <Button
        onClick={onNewChat}
        variant="outline"
        className="w-full gap-2 mb-2"
        size="sm"
      >
        <Plus className="h-3.5 w-3.5" />
        New Chat
      </Button>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
          <Clock className="h-8 w-8 opacity-20" />
          <p className="text-sm">No chat history yet.</p>
          <p className="text-xs text-muted-foreground/60">Start a conversation to save it here.</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectSession(s)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors"
            >
              <p className="text-sm font-medium truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(s.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────

interface AiSidePanelProps {
  open: boolean
  onClose: () => void
}

export function AiSidePanel({ open, onClose }: AiSidePanelProps) {
  type PanelView = 'chat' | 'history'

  const [view,             setView]           = useState<PanelView>('chat')
  const [sessions,         setSessions]       = useState<ChatSessionRecord[]>([])
  const [loadingSessions,  setLoadingSessions] = useState(false)
  const [initialMessages,  setInitialMessages] = useState<ChatMessageRecord[]>([])
  const [activeSessionId,  setActiveSessionId] = useState<string | null>(null)
  // Increment to remount ChatInterface when switching sessions
  const [chatKey,          setChatKey]        = useState(0)

  async function openHistory() {
    setLoadingSessions(true)
    setView('history')
    const result = await listChatSessions()
    setSessions(result)
    setLoadingSessions(false)
  }

  async function handleSelectSession(session: ChatSessionRecord) {
    const msgs = await loadChatMessages(session.id)
    setActiveSessionId(session.id)
    setInitialMessages(msgs)
    setChatKey((k) => k + 1)
    setView('chat')
  }

  function handleNewChat() {
    setActiveSessionId(null)
    setInitialMessages([])
    setChatKey((k) => k + 1)
    setView('chat')
  }

  function handleSessionCreated(id: string, title: string) {
    setActiveSessionId(id)
    // Prepend to local session list so history view is up-to-date without refetch
    setSessions((prev) => [
      { id, title, created_at: new Date().toISOString() },
      ...prev,
    ])
  }

  return (
    <>
      {/* Backdrop — only when open */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Panel — always mounted to preserve chat state; slides in/out */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 w-full sm:w-[420px] bg-background border-l border-border shadow-2xl z-50 flex flex-col',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-hidden={!open}
      >
        {/* Panel header */}
        <div className="flex items-center gap-2 px-4 h-14 border-b border-border shrink-0">
          {view === 'history' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => setView('chat')}
              aria-label="Back to chat"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}

          <Bot className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm flex-1 truncate">
            {view === 'history' ? 'Chat History' : 'AI Assistant'}
          </span>

          {view === 'chat' && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleNewChat}
                title="New chat"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={openHistory}
                title="Chat history"
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close AI Assistant"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Panel body */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Chat view — always mounted, hidden behind history via display */}
          <div className={cn('flex-1 flex flex-col min-h-0', view !== 'chat' && 'hidden')}>
            <ChatInterface
              key={chatKey}
              sessionId={activeSessionId}
              initialMessages={initialMessages}
              onSessionCreated={handleSessionCreated}
            />
          </div>

          {/* History view */}
          {view === 'history' && (
            <HistoryView
              sessions={sessions}
              loading={loadingSessions}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
            />
          )}
        </div>
      </div>
    </>
  )
}
