import { audioService } from './audio.service.js';
import { ttsCacheService } from './ttsCache.service.js';

type PredictivePattern = {
  triggers: string[];
  response: string;
};

const DEFAULT_PREDICTIVE_PATTERNS: PredictivePattern[] = [
  {
    triggers: ['hello', 'hi', 'hey'],
    response: 'Hello! How can I help you today?',
  },
  {
    triggers: ['thank you', 'thanks'],
    response: "You're welcome! Let me know if there is anything else.",
  },
  {
    triggers: ['what', 'sorry'],
    response: 'Let me clarify that for you.',
  },
  {
    triggers: ['goodbye', 'see you'],
    response: 'Talk soon! Have a great rest of your day.',
  },
  {
    triggers: ['hold on', 'one sec', 'wait'],
    response: 'No problem, I will be right here when you are ready.',
  },
];

const PREDICTIVE_PREWARM_USER_ID = 'tts-predictive-prewarm';

/**
 * Schedules predictive TTS pre-generation after the server starts.
 */
export function schedulePredictiveTtsPrewarm(): void {
  if (process.env.DISABLE_TTS_PREDICTIVE_PREWARM === 'true') {
    console.log('[TTS Prewarm] Predictive pre-generation disabled via environment variable.');
    return;
  }

  if (!process.env.OPENAI_API_KEY) {
    console.warn('[TTS Prewarm] Skipping predictive pre-generation because OPENAI_API_KEY is not set.');
    return;
  }

  // Delay the prewarm to avoid blocking startup and to ensure providers are ready.
  setTimeout(() => {
    prewarmPredictiveResponses()
      .then(() => {
        console.log('[TTS Prewarm] Predictive pre-generation complete.');
      })
      .catch((error) => {
        console.error('[TTS Prewarm] Predictive pre-generation failed:', error);
      });
  }, Number(process.env.TTS_PREWARM_DELAY_MS ?? 5000));
}

async function prewarmPredictiveResponses(): Promise<void> {
  const model = process.env.OPENAI_TTS_DEFAULT_MODEL || 'tts-1';
  const voice = process.env.OPENAI_TTS_DEFAULT_VOICE || 'nova';
  const format = (process.env.OPENAI_TTS_DEFAULT_FORMAT || 'opus') as any;
  const speed = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED || '1.15');

  const extraPhrases = (process.env.TTS_PREDICTIVE_PHRASES || '')
    .split('|')
    .map((phrase) => phrase.trim())
    .filter(Boolean);

  const baseResponses = DEFAULT_PREDICTIVE_PATTERNS.map((pattern) => pattern.response);
  const predictiveResponses = Array.from(new Set([...baseResponses, ...extraPhrases]));

  if (predictiveResponses.length === 0) {
    console.log('[TTS Prewarm] No predictive responses defined; skipping.');
    return;
  }

  console.log(`[TTS Prewarm] Pre-generating ${predictiveResponses.length} predictive responses...`);

  for (const text of predictiveResponses) {
    const alreadyCached = ttsCacheService.hasCache(text, voice, model, speed, 'openai_tts');
    if (alreadyCached) {
      continue;
    }

    try {
      await audioService.synthesizeSpeech(
        text,
        {
          providerId: 'openai_tts',
          voice,
          model,
          outputFormat: format,
          speed,
        },
        PREDICTIVE_PREWARM_USER_ID,
      );
    } catch (error: any) {
      console.warn(`[TTS Prewarm] Failed to cache predictive response "${text.substring(0, 40)}..."`, error?.message || error);
    }
  }
}
