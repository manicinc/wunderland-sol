import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function POST(req: NextRequest) {
  if (!OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured' },
      { status: 503 }
    );
  }

  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: 'Expected multipart form data with an "audio" field' },
      { status: 400 }
    );
  }

  const audioFile = formData.get('audio');
  if (!audioFile || !(audioFile instanceof Blob)) {
    return NextResponse.json(
      { error: 'Missing "audio" field in form data' },
      { status: 400 }
    );
  }

  // Forward to OpenAI Whisper
  const whisperForm = new FormData();
  whisperForm.append('file', audioFile, 'recording.webm');
  whisperForm.append('model', 'whisper-1');
  whisperForm.append('response_format', 'json');

  try {
    const res = await fetch(
      'https://api.openai.com/v1/audio/transcriptions',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: whisperForm,
      }
    );

    if (!res.ok) {
      const errBody = await res.text();
      console.error('[voice/transcribe] Whisper error:', res.status, errBody);
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text });
  } catch (err) {
    console.error('[voice/transcribe] Network error:', err);
    return NextResponse.json(
      { error: 'Failed to reach OpenAI' },
      { status: 502 }
    );
  }
}
