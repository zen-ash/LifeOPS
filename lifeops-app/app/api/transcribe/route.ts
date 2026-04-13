// Phase 15.A: Voice Brain Dump transcription endpoint.
// Receives a recorded audio blob (WebM/M4A/OGG), sends it to OpenAI Whisper (whisper-1),
// and returns the transcript text.
//
// Audio is NOT stored — it is discarded after transcription.
// The caller (VoiceMemoDialog) saves the transcript as a Note via a server action.
//
// Body: multipart/form-data with one field:
//   audio  File  The recorded audio blob with correct MIME type
//
// Response: { transcript: string } | { error: string }

import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30 // Whisper is fast; 30s is generous

// Map MIME type → file extension Whisper recognises for format detection
function audioExtension(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg'))  return 'ogg'
  if (mimeType.includes('wav'))  return 'wav'
  if (mimeType.includes('flac')) return 'flac'
  return 'webm'  // default — Chrome/Firefox
}

export async function POST(req: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: 'OPENAI_API_KEY is not configured on this server.' },
      { status: 500 }
    )
  }

  // Verify the user is authenticated — never transcribe for anonymous callers
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const audioField = formData.get('audio')
  if (!audioField || !(audioField instanceof Blob)) {
    return Response.json({ error: 'No audio file provided.' }, { status: 400 })
  }

  // Whisper needs a named File so it can detect the audio format from the extension.
  const ext  = audioExtension(audioField.type || '')
  const file = new File([audioField], `recording.${ext}`, { type: audioField.type || 'audio/webm' })

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    })

    return Response.json({ transcript: transcription.text })
  } catch (err) {
    console.error('[transcribe] Whisper API error:', err)
    return Response.json(
      { error: 'Transcription failed. Please try again.' },
      { status: 500 }
    )
  }
}
