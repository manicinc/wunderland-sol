// File: backend/src/features/chat/language.routes.ts
/**
 * @file language.routes.ts
 * @description Provides helpers to detect the predominant language of a conversation snippet.
 */

import type { Request, Response } from 'express';
import { callLlm } from '../../core/llm/llm.factory.js';
import type { IChatMessage } from '../../core/llm/llm.interfaces.js';

interface LanguageDetectionRequest {
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

interface LanguageDetectionResult {
  languageCode?: string;
  confidence?: number;
}

const LANGUAGE_DETECTION_SYSTEM_PROMPT = `
You are a language identification service.
Given short excerpts from a conversation, identify the primary language the user is speaking.
Respond with a compact JSON object:
{
  "languageCode": "<BCP47 code like en-US or es-ES>",
  "confidence": <number between 0 and 1>
}
If you are uncertain, pick the closest match and set confidence below 0.5.
Only respond with JSON, no additional commentary.
`;

export const postDetectLanguage = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as LanguageDetectionRequest;
  if (!body?.messages || body.messages.length === 0) {
    res.status(400).json({ message: 'messages array is required for language detection.' });
    return;
  }

  const excerpt = body.messages
    .slice(-4)
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n')
    .slice(0, 2000);

  const llmMessages: IChatMessage[] = [
    { role: 'system', content: LANGUAGE_DETECTION_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Conversation excerpt:\n${excerpt}\n\nReturn JSON with languageCode and confidence.`,
    },
  ];

  try {
    const response = await callLlm(llmMessages, 'openai/gpt-4o-mini', {
      providerId: 'openai',
      temperature: 0,
      max_tokens: 128,
    });

    const raw = (response?.text ?? '').trim() || '{}';
    let parsed: LanguageDetectionResult = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      // attempt to extract JSON substring
      const match = raw.match(/\{[^}]+\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    }

    const languageCode =
      typeof parsed.languageCode === 'string' && parsed.languageCode.trim().length > 0
        ? parsed.languageCode.trim()
        : null;
    const confidence =
      typeof parsed.confidence === 'number' && Number.isFinite(parsed.confidence)
        ? Math.max(0, Math.min(1, parsed.confidence))
        : null;

    res.status(200).json({
      language: languageCode,
      confidence,
      raw,
    });
  } catch (error: any) {
    console.error('[LanguageRoutes] Failed to detect language:', error);
    res.status(500).json({
      message: 'Failed to detect language',
      error: process.env.NODE_ENV === 'development' ? error?.message ?? 'UNKNOWN_ERROR' : 'LANGUAGE_DETECTION_FAILED',
    });
  }
};
