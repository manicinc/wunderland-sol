// File: backend/src/features/speech/tts.routes.ts
/**
 * @file Text-to-Speech (TTS) API route handlers.
 * @version 1.3.1 - Corrected ITtsOptions usage and scope for outputFormat.
 * @description Handles requests to the /api/tts endpoint for synthesizing speech from text
 * using the configured TTS provider (e.g., OpenAI TTS via AudioService).
 */

import { Request, Response } from 'express';
import { audioService } from '../../core/audio/audio.service.js';
// Ensure ITtsOptions is imported correctly and matches the definition in tts.interfaces.ts
import { ITtsOptions, ITtsResult, IAvailableVoice } from '../../core/audio/tts.interfaces.js';
import { CostService } from '../../core/cost/cost.service.js';
import { creditAllocationService, type CreditContext } from '../../core/cost/creditAllocation.service.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SpeechCreateParams } from 'openai/resources/audio/speech';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../..');
dotenv.config({ path: path.join(__projectRoot, '.env') });

interface ITtsRequestBody {
  text: string;
  voice?: string;
  model?: SpeechCreateParams['model'];
  outputFormat?: SpeechCreateParams['response_format'];
  speed?: number;
  pitch?: number;
  volume?: number;
  languageCode?: string;
  userId?: string;
  providerId?: string;
}

export async function POST(req: Request, res: Response): Promise<void> {
  const body: ITtsRequestBody = req.body;
  const {
    text,
    voice,
    model,
    outputFormat,
    speed,
    pitch,
    volume,
    languageCode,
    providerId,
  } = body;

  const effectiveUserId = resolveSessionUserId(req, body.userId);

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    res.status(400).json({ message: 'Text for speech synthesis is required.', error: 'MISSING_TEXT_INPUT' });
    return;
  }

  const effectiveProviderId = providerId || process.env.DEFAULT_SPEECH_PREFERENCE_TTS_PROVIDER || 'openai_tts';
  if (effectiveProviderId === 'openai_tts' && text.length > 4096) {
    res.status(400).json({ message: 'Text input is too long for OpenAI TTS. Maximum 4096 characters.', error: 'TEXT_TOO_LONG' });
    return;
  }

  const userContext = (req as any)?.user;
  const creditContext: CreditContext = {
    isAuthenticated: Boolean(userContext),
    tier: userContext?.tier,
    mode: userContext?.mode,
  };
  creditAllocationService.syncProfile(effectiveUserId, creditContext);

  if (effectiveProviderId === 'openai_tts' && !creditAllocationService.hasSpeechCredits(effectiveUserId, creditContext)) {
    const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
    res.status(429).json({
      message: 'Speech synthesis credits have been exhausted for today. Audio playback will use the browser engine instead.',
      error: 'SPEECH_CREDITS_EXHAUSTED',
      fallbackProvider: 'browser_tts',
      credits,
    });
    return;
  }
  try {
    const costThresholdString = process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00';
    const effectiveCostThreshold = parseFloat(costThresholdString);
    const disableCostLimits = process.env.DISABLE_COST_LIMITS === 'true';

    if (!disableCostLimits && CostService.isSessionCostThresholdReached(effectiveUserId, effectiveCostThreshold)) {
      const currentCostDetail = CostService.getSessionCost(effectiveUserId);
      const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
      res.status(403).json({
        message: `Session cost threshold of $${effectiveCostThreshold.toFixed(2)} reached. TTS synthesis blocked.`,
        error: 'COST_THRESHOLD_EXCEEDED',
        currentCost: currentCostDetail.totalCost,
        threshold: effectiveCostThreshold,
        credits,
      });
      return;
    }

    const ttsServiceOptions: ITtsOptions = {
      voice: voice,
      model: model,
      outputFormat: outputFormat,
      speed: speed,
      pitch: pitch,
      volume: volume,
      languageCode: languageCode,
      providerId: effectiveProviderId,
    };
    
    console.log(`TTS Routes: User [${effectiveUserId}] Requesting TTS - Provider: ${effectiveProviderId}, Model: ${model || 'default'}, Voice: ${voice || 'default'}, Speed: ${speed}, Pitch: ${pitch}, Volume: ${volume}`);

    const ttsResult: ITtsResult = await audioService.synthesizeSpeech(
      text,
      ttsServiceOptions,
      effectiveUserId
    );
    
    const providerNameForResult = ttsResult.providerName || ttsServiceOptions.providerId || 'UnknownProvider';
    console.log(`TTS Routes: User [${effectiveUserId}] Synthesized audio. Cost: $${ttsResult.cost.toFixed(6)}, Format: ${ttsResult.mimeType}, Provider: ${providerNameForResult}, Voice: ${ttsResult.voiceUsed}`);

    res.setHeader('Content-Type', ttsResult.mimeType);
    const actualOutputFormatHeader = ttsServiceOptions.outputFormat || ttsResult.mimeType.split('/')[1] || 'mp3';
    res.setHeader('Content-Disposition', `inline; filename="speech.${actualOutputFormatHeader}"`);
    res.setHeader('X-TTS-Cost', ttsResult.cost.toFixed(6));
    res.setHeader('X-TTS-Voice', ttsResult.voiceUsed || 'default');
    res.setHeader('X-TTS-Provider', providerNameForResult);
    res.setHeader('X-Session-Cost', CostService.getSessionCost(effectiveUserId).totalCost.toFixed(6));
    if (ttsResult.durationSeconds) {
      res.setHeader('X-TTS-Duration-Seconds', ttsResult.durationSeconds.toFixed(3));
    }
    if (ttsResult.usage) {
        res.setHeader('X-TTS-Model-Used', ttsResult.usage.modelUsed);
        res.setHeader('X-TTS-Characters', ttsResult.usage.characters.toString());
    }
    const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
    if (credits.speech.remainingUsd != null) {
      res.setHeader('X-Speech-Credits-Remaining-Usd', credits.speech.remainingUsd.toFixed(6));
    } else {
      res.setHeader('X-Speech-Credits-Remaining-Usd', 'unlimited');
    }
    if (credits.speech.totalUsd != null) {
      res.setHeader('X-Speech-Credits-Total-Usd', credits.speech.totalUsd.toFixed(6));
    } else {
      res.setHeader('X-Speech-Credits-Total-Usd', 'unlimited');
    }
    
    res.status(200).send(ttsResult.audioBuffer);

  } catch (ttsError: any) {
    console.error(`TTS Routes: TTS synthesis error for user ${effectiveUserId}:`, ttsError.message, ttsError.originalError || ttsError.stack);
    if (res.headersSent) {
      return;
    }
    let errorMessage = 'Error synthesizing speech.';
    let errorCode = 'TTS_SYNTHESIS_ERROR';
    let statusCode = ttsError.status || 500;

    if (ttsError.message?.includes('API key') || ttsError.message?.includes('authentication')) {
      errorMessage = 'TTS service API key not configured properly, is invalid, or authentication failed.';
      errorCode = 'TTS_API_AUTH_ERROR';
      statusCode = 503;
    } else if (ttsError.message?.includes('model_not_found') || ttsError.message?.includes('Invalid voice')) {
      errorMessage = `Invalid TTS model or voice specified: ${ttsError.message}`;
      errorCode = 'INVALID_TTS_PARAMS';
      statusCode = 400;
    } else if (ttsError.message?.includes('insufficient_quota') || ttsError.message?.includes('limit reached')) {
        errorMessage = 'TTS service quota exceeded or rate limit reached.';
        errorCode = 'TTS_QUOTA_OR_RATE_LIMIT_EXCEEDED';
        statusCode = 429; 
    } else if (ttsError.message?.includes('Text input is too long')) {
        errorMessage = ttsError.message;
        errorCode = 'TEXT_TOO_LONG';
        statusCode = 400;
    } else if (ttsError.message?.includes("Browser TTS cannot be directly used by the backend")) {
        errorMessage = "The selected TTS provider (Browser TTS) cannot be used by the backend. Please choose a different provider.";
        errorCode = "INVALID_TTS_PROVIDER_FOR_BACKEND";
        statusCode = 400;
    }
    
    const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
    res.status(statusCode).json({
      message: errorMessage,
      error: errorCode,
      details: process.env.NODE_ENV === 'development' ? {
        originalError: ttsError.message,
      } : undefined,
      credits,
    });
  }
}

export async function GET(req: Request, res: Response): Promise<void> {
    try {
        const effectiveUserId = resolveSessionUserId(req);
        const providerFilter = req.query.providerId as string | undefined;

        const voices: IAvailableVoice[] = await audioService.listAvailableTtsVoices(providerFilter);
        
        console.log(`TTS Routes: User ${effectiveUserId} requested available voices. Provider filter: ${providerFilter || 'all'}. Found: ${voices.length}`);
        
        res.status(200).json({
            message: "Available TTS voices fetched successfully.",
            voices: voices,
            count: voices.length,
        });
    } catch (error: any) {
        console.error("TTS Routes: Error fetching available voices:", error.message, error.stack);
        if (res.headersSent) {
          return;
        }
        res.status(500).json({
            message: "Failed to fetch available TTS voices.",
            error: "VOICE_LISTING_ERROR",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        });
    }
}
