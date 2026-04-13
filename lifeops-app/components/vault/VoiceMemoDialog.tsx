'use client'

// Phase 15.A: Voice Brain Dump dialog.
// Records a short voice memo (up to 60s), sends it to /api/transcribe (Whisper),
// and saves the transcript as a Note so it enters the Phase 13.C embedding pipeline.
//
// States: idle → requesting → recording → processing → done | error

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { saveTranscriptAsNote } from '@/lib/actions/notes'

type RecordState = 'idle' | 'requesting' | 'recording' | 'processing' | 'done' | 'error'

const MAX_SECONDS = 60

interface VoiceMemoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VoiceMemoDialog({ open, onOpenChange }: VoiceMemoDialogProps) {
  const [state, setState]           = useState<RecordState>('idle')
  const [elapsed, setElapsed]       = useState(0)
  const [transcript, setTranscript] = useState('')
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg]     = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef        = useRef<Blob[]>([])
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef        = useRef<MediaStream | null>(null)

  // Clean up microphone stream and timer
  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    mediaRecorderRef.current = null
    chunksRef.current = []
  }, [])

  // Stop recording when dialog closes mid-recording
  useEffect(() => {
    if (!open) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      cleanup()
      // Reset state after brief delay so close animation plays cleanly
      const t = setTimeout(() => {
        setState('idle')
        setElapsed(0)
        setTranscript('')
        setSavedNoteId(null)
        setErrorMsg(null)
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open, cleanup])

  async function handleStartRecording() {
    setState('requesting')
    setErrorMsg(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        // Capture chunks and mimeType BEFORE cleanup resets chunksRef.current
        const chunks   = chunksRef.current.slice()
        const mimeType = recorder.mimeType || 'audio/webm'
        cleanup()
        setState('processing')

        const blob = new Blob(chunks, { type: mimeType })

        if (blob.size === 0) {
          setState('error')
          setErrorMsg('No audio was recorded. Please try again.')
          return
        }

        try {
          // Send to Whisper
          const fd = new FormData()
          fd.append('audio', blob, 'recording')
          const res  = await fetch('/api/transcribe', { method: 'POST', body: fd })
          const data = await res.json()

          if (!res.ok || data.error) {
            setState('error')
            setErrorMsg(data.error ?? 'Transcription failed. Please try again.')
            return
          }

          const text = (data.transcript as string).trim()
          if (!text) {
            setState('error')
            setErrorMsg('No speech detected. Try speaking closer to the microphone.')
            return
          }

          setTranscript(text)

          // Save transcript as a Note — enters Phase 13.C embedding pipeline automatically
          const result = await saveTranscriptAsNote(text)
          if (result.error) {
            setState('error')
            setErrorMsg(result.error)
            return
          }

          setSavedNoteId(result.noteId ?? null)
          setState('done')
        } catch {
          setState('error')
          setErrorMsg('Something went wrong. Please try again.')
        }
      }

      recorder.start(250) // collect data in 250ms chunks
      setState('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev >= MAX_SECONDS - 1) {
            handleStopRecording()
            return MAX_SECONDS
          }
          return prev + 1
        })
      }, 1000)
    } catch {
      setState('error')
      setErrorMsg('Microphone access was denied. Please allow microphone access in your browser settings.')
    }
  }

  function handleStopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
  }

  function handleReset() {
    setState('idle')
    setElapsed(0)
    setTranscript('')
    setSavedNoteId(null)
    setErrorMsg(null)
  }

  const progressPct = Math.min((elapsed / MAX_SECONDS) * 100, 100)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            Voice Brain Dump
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 space-y-5">

          {/* ── Idle ── */}
          {state === 'idle' && (
            <div className="flex flex-col items-center gap-4 py-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Mic className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">Record a voice note</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Speak your thoughts — LifeOPS will transcribe and save them to Notes automatically.
                </p>
              </div>
              <Button onClick={handleStartRecording} className="w-full gap-2">
                <Mic className="h-4 w-4" />
                Start Recording
              </Button>
            </div>
          )}

          {/* ── Requesting mic permission ── */}
          {state === 'requesting' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Requesting microphone access…</p>
            </div>
          )}

          {/* ── Recording ── */}
          {state === 'recording' && (
            <div className="flex flex-col items-center gap-4 py-2">
              {/* Animated recording indicator */}
              <div className="relative flex h-14 w-14 items-center justify-center">
                <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500/20 animate-ping" />
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/30">
                  <Mic className="h-5 w-5 text-rose-500" />
                </span>
              </div>

              <div className="text-center space-y-0.5">
                <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Recording…</p>
                <p className="text-xs text-muted-foreground">
                  {elapsed}s / {MAX_SECONDS}s
                </p>
              </div>

              {/* Progress bar */}
              <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <Button
                onClick={handleStopRecording}
                variant="outline"
                className="w-full gap-2 border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                Stop &amp; Transcribe
              </Button>
            </div>
          )}

          {/* ── Processing ── */}
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-7 w-7 text-primary animate-spin" />
              <div className="text-center space-y-0.5">
                <p className="text-sm font-medium">Transcribing…</p>
                <p className="text-xs text-muted-foreground">Whisper is converting your audio to text</p>
              </div>
            </div>
          )}

          {/* ── Done ── */}
          {state === 'done' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <p className="text-sm font-semibold">Saved to Notes</p>
              </div>

              {/* Transcript preview */}
              {transcript && (
                <div className="rounded-lg border bg-muted/30 px-3 py-2.5 max-h-32 overflow-y-auto">
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {transcript.length > 300 ? transcript.slice(0, 300) + '…' : transcript}
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                {savedNoteId && (
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => onOpenChange(false)}
                  >
                    <Link href="/notes">Open in Notes</Link>
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn('gap-1.5', savedNoteId ? '' : 'flex-1')}
                  onClick={handleReset}
                >
                  <RotateCcw className="h-3 w-3" />
                  Record Another
                </Button>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {state === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">
                  {errorMsg ?? 'Something went wrong. Please try again.'}
                </p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={handleReset}>
                <MicOff className="h-3.5 w-3.5" />
                Try Again
              </Button>
            </div>
          )}

          {/* Footer note — shown in idle state only */}
          {state === 'idle' && (
            <p className="text-[11px] text-muted-foreground/50 text-center">
              Max 60 seconds · transcript saved as a searchable Note
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
