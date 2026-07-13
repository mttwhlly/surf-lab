import { NextRequest } from 'next/server';

// Pick a voice from elevenlabs.io/voice-library — search "California Surfer"
// or set ELEVENLABS_VOICE_ID in your environment to override.
// Default: "Liam" (casual, younger voice — free tier compatible)
// Swap via ELEVENLABS_VOICE_ID env var; paid plans unlock library voices at elevenlabs.io/voice-library
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID ?? 'TX3LPaxmHKxFdv7VOQHJ';
const MODEL_ID = 'eleven_flash_v2_5';

function preprocessText(text: string): string {
  return text
    // Wind/swell directions — longest first to avoid partial matches
    .replace(/\bWSW\b/g, 'west-southwest')
    .replace(/\bWNW\b/g, 'west-northwest')
    .replace(/\bSSW\b/g, 'south-southwest')
    .replace(/\bSSE\b/g, 'south-southeast')
    .replace(/\bNNW\b/g, 'north-northwest')
    .replace(/\bNNE\b/g, 'north-northeast')
    .replace(/\bENE\b/g, 'east-northeast')
    .replace(/\bESE\b/g, 'east-southeast')
    .replace(/\bNW\b/g, 'northwest')
    .replace(/\bSW\b/g, 'southwest')
    .replace(/\bSE\b/g, 'southeast')
    .replace(/\bNE\b/g, 'northeast')
    // Units
    .replace(/(\d)\s*ft\b/g, '$1 feet')
    .replace(/\bkts\b/gi, 'knots')
    .replace(/\bkt\b/gi, 'knot')
    .replace(/°F/g, ' degrees Fahrenheit')
    .replace(/°C/g, ' degrees Celsius')
    .replace(/\bSST\b/g, 'sea surface temperature')
    .replace(/\bm\/s\b/g, 'meters per second');
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return new Response('Audio service not configured', { status: 503 });
  }

  let text: string;
  try {
    const body = await request.json();
    text = body?.text;
  } catch {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!text || typeof text !== 'string') {
    return new Response('Missing text', { status: 400 });
  }

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}/stream`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: preprocessText(text),
        model_id: MODEL_ID,
        voice_settings: {
          stability: 0.45,
          similarity_boost: 0.75,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    console.error('ElevenLabs TTS error:', res.status, error);
    return new Response('Audio generation failed', { status: 502 });
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  });
}
