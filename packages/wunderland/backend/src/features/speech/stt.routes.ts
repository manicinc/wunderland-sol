// File: backend/src/features/speech/stt.routes.ts
/**
 * @file Speech-to-Text (STT) API Route Handlers
 * @version 1.0.1 - Added file type filtering and refined error handling.
 * @description Handles requests to the /api/stt endpoint for transcribing audio
 * using the configured STT provider (e.g., OpenAI Whisper via AudioService).
 * It uses multer for parsing multipart/form-data containing the audio file.
 * @dependencies express, multer, ../../core/audio/audio.service, ../../core/audio/stt.interfaces, ../../core/cost/cost.service, dotenv, path, url
 */

import { Request, Response } from 'express';
import multer, { MulterError } from 'multer';
import { audioService } from '../../core/audio/audio.service.js';
import { ISttRequestOptions, ISttOptions, ITranscriptionResult, SttResponseFormat } from '../../core/audio/stt.interfaces.js';
import { CostService } from '../../core/cost/cost.service.js';
import { creditAllocationService, type CreditContext } from '../../core/cost/creditAllocation.service.js';
import { resolveSessionUserId } from '../../utils/session.utils.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __projectRoot = path.resolve(path.dirname(__filename), '../../../../'); // Adjusted path to project root
dotenv.config({ path: path.join(__projectRoot, '.env') });

// Configure multer for file uploads
// Store files in memory for processing.
const storage = multer.memoryStorage();
const MAX_FILE_SIZE_MB = 25; // OpenAI Whisper limit is 25MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    // Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, and webm.
    const allowedMimeTypes = [
      'audio/mpeg', // mp3, mpga
      'audio/mp4',  // mp4 (typically m4a audio is in mp4 container)
      'audio/x-m4a',// m4a
      'audio/wav',  // wav
      'audio/webm', // webm
      'audio/ogg',  // ogg (Opus in ogg is common)
      'video/mp4',  // mp4 video with audio track
      'video/webm'  // webm video with audio track
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      console.warn(`[stt.routes] Attempted upload of unsupported file type: ${file.mimetype} from user ${req.ip}`);
      cb(new Error(`Unsupported file type: ${file.mimetype}. Supported types include MP3, WAV, M4A, WebM.`));
    }
  },
});

/**
 * Validates and maps a client-provided responseFormat string to the SttResponseFormat type.
 * @param {string | undefined} formatString - The response format string from the client request.
 * @returns {SttResponseFormat | undefined} The validated SttResponseFormat, or undefined if invalid or not provided.
 */
function validateAndMapResponseFormat(formatString: string | undefined): SttResponseFormat | undefined {
  if (!formatString) return undefined; // Default to provider's choice if not specified
  const validFormats: ReadonlyArray<SttResponseFormat> = ['json', 'text', 'srt', 'verbose_json', 'vtt'];
  if (validFormats.includes(formatString as SttResponseFormat)) {
    return formatString as SttResponseFormat;
  }
  console.warn(`[stt.routes] Invalid responseFormat requested: "${formatString}". Provider will use its default or 'verbose_json'.`);
  return undefined; // Let the provider handle default if client sends invalid format
}


/**
 * @route POST /api/stt
 * @description Handles audio transcription requests.
 * Expects an 'audio' file in a multipart/form-data request.
 * Optional fields in the body: language, prompt, model, responseFormat, temperature.
 * @param {Request} req - Express request object, potentially augmented by auth middleware with `req.user`.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 * @throws Will send appropriate HTTP error responses for various failure conditions.
 */
export async function POST(req: Request, res: Response): Promise<void> {
  await new Promise<void>((resolve) => {
    upload.single('audio')(req, res, async (err: any) => {
      const effectiveUserId = resolveSessionUserId(req, (req.body as any)?.userId);

      if (err instanceof MulterError) {
        console.error(`[stt.routes] Multer error for user ${effectiveUserId} (IP: ${req.ip}): ${err.message} (Code: ${err.code})`);
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ message: `Audio file is too large. Maximum size is ${MAX_FILE_SIZE_MB}MB.`, error: 'FILE_TOO_LARGE' });
        } else {
          res.status(400).json({ message: `File upload error: ${err.message}`, error: 'FILE_UPLOAD_ERROR' });
        }
        return resolve();
      } else if (err) {
        console.error(`[stt.routes] Non-multer error during upload for user ${effectiveUserId} (IP: ${req.ip}): ${err.message}`);
        res.status(415).json({ message: err.message || 'Invalid audio file type.', error: 'INVALID_AUDIO_FILE_TYPE' });
        return resolve();
      }

      if (!req.file) {
        console.warn(`[stt.routes] No audio file uploaded by user ${effectiveUserId} (IP: ${req.ip})`);
        res.status(400).json({ message: 'No audio file was provided in the request.', error: 'NO_AUDIO_FILE' });
        return resolve();
      }

      const audioBuffer: Buffer = req.file.buffer;
      const originalFileName: string = req.file.originalname || `audio-${Date.now()}.${req.file.mimetype.split('/')[1] || 'bin'}`;
      const requestOptions: ISttRequestOptions = req.body;

      const userContext = (req as any)?.user;
      const creditContext: CreditContext = {
        isAuthenticated: Boolean(userContext),
        tier: userContext?.tier,
        mode: userContext?.mode,
      };
      creditAllocationService.syncProfile(effectiveUserId, creditContext);

      if (!creditAllocationService.hasSpeechCredits(effectiveUserId, creditContext)) {
        const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
        res.status(429).json({
          message: 'Speech recognition credits have been exhausted for today. Falling back to browser speech recognition.',
          error: 'SPEECH_CREDITS_EXHAUSTED',
          fallbackProvider: 'browser_webspeech_api',
          credits,
        });
        return resolve();
      }

      const costThresholdString = process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00';
      const effectiveCostThreshold = parseFloat(costThresholdString);
      const disableCostLimits = process.env.DISABLE_COST_LIMITS === 'true';

      if (!disableCostLimits && CostService.isSessionCostThresholdReached(effectiveUserId, effectiveCostThreshold)) {
        const currentCost = CostService.getSessionCost(effectiveUserId);
        console.warn(`[stt.routes] User ${effectiveUserId} attempted STT transcription after exceeding session cost threshold.`);
        res.status(403).json({
          message: `Session cost threshold of $${effectiveCostThreshold.toFixed(2)} reached. Further requests are blocked for this session.`,
          error: 'COST_THRESHOLD_EXCEEDED',
          currentCost: currentCost.totalCost,
          threshold: effectiveCostThreshold,
        });
        return resolve();
      }

      const sttServiceOptions: ISttOptions = {
        language: requestOptions.language,
        prompt: requestOptions.prompt,
        model: requestOptions.model,
        temperature: requestOptions.temperature !== undefined
          ? (typeof requestOptions.temperature === 'string'
              ? Number.parseFloat(requestOptions.temperature)
              : Number(requestOptions.temperature))
          : undefined,
        responseFormat: validateAndMapResponseFormat(requestOptions.responseFormat),
        providerId: requestOptions.providerId || process.env.DEFAULT_SPEECH_PREFERENCE_STT_PROVIDER || 'whisper_api',
        stream: requestOptions.stream === 'true' || requestOptions.stream === true,
      };

      try {
        if (typeof sttServiceOptions.temperature === 'number' && (
          Number.isNaN(sttServiceOptions.temperature) ||
          sttServiceOptions.temperature < 0 ||
          sttServiceOptions.temperature > 1
        )) {
          res.status(400).json({ message: 'Temperature must be between 0 and 1.', error: 'INVALID_TEMPERATURE' });
          return resolve();
        }

        if (!sttServiceOptions.providerId) {
          sttServiceOptions.providerId = 'whisper_api';
        }

        console.log(`[stt.routes] User [${effectiveUserId}] (IP: ${req.ip}) Requesting STT - Model: ${sttServiceOptions.model || 'default'}, Lang: ${sttServiceOptions.language || 'auto'}, Filename: ${originalFileName}, Size: ${(req.file.size / 1024).toFixed(2)}KB`);

        const transcriptionResult: ITranscriptionResult = await audioService.transcribeAudio(
          audioBuffer,
          originalFileName,
          sttServiceOptions,
          effectiveUserId
        );

        const providerNameForResult = transcriptionResult.usage?.modelUsed || 'UnknownProvider';
        console.log(`[stt.routes] User [${effectiveUserId}] (IP: ${req.ip}) Audio transcribed. Cost: $${transcriptionResult.cost.toFixed(6)}, Duration: ${transcriptionResult.durationSeconds?.toFixed(2)}s, Provider/Model: ${providerNameForResult}`);

        const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);
        res.status(200).json({
          transcription: transcriptionResult.text,
          durationSeconds: transcriptionResult.durationSeconds,
          cost: transcriptionResult.cost,
          language: transcriptionResult.language,
          segments: transcriptionResult.segments,
          message: 'Transcription successful.',
          metadata: {
            modelUsed: transcriptionResult.usage?.modelUsed,
            detectedLanguage: transcriptionResult.language,
          },
          credits,
        });

      } catch (sttError: any) {
        console.error(`[stt.routes] STT transcription error for user ${effectiveUserId} (IP: ${req.ip}), File: ${originalFileName}: ${sttError.message}`, sttError.stack);
        if (res.headersSent) {
          return resolve();
        }
        let errorMessage = 'Error transcribing audio.';
        let errorCode = 'STT_TRANSCRIPTION_ERROR';
        let statusCode = sttError.status || 500;

        if (sttError.message?.includes('API key') || sttError.message?.includes('authentication')) {
          errorMessage = 'STT service API key issue or authentication failure. Please check server configuration.';
          errorCode = 'STT_API_AUTH_ERROR';
          statusCode = 503;
        } else if (sttError.message?.includes('insufficient_quota') || sttError.message?.includes('limit reached')) {
          errorMessage = 'STT service quota exceeded or rate limit reached.';
          errorCode = 'STT_QUOTA_OR_RATE_LIMIT_EXCEEDED';
          statusCode = 429;
        } else if (sttError.message?.includes('Unsupported file type') || sttError.message?.includes('Invalid audio file')) {
          errorMessage = sttError.message;
          errorCode = 'INVALID_AUDIO_FILE_FORMAT';
          statusCode = 415;
        } else if (sttError.message?.toLowerCase().includes('timeout')) {
          errorMessage = 'Transcription request timed out.';
          errorCode = 'STT_TIMEOUT';
          statusCode = 504;
        }

        res.status(statusCode).json({
          message: errorMessage,
          error: errorCode,
          details: process.env.NODE_ENV === 'development' ? {
            originalErrorName: sttError.name,
            originalErrorMessage: sttError.message,
          } : undefined,
          credits: creditAllocationService.getSnapshot(effectiveUserId, creditContext),
        });
      }
      resolve();
    });
  });
}
/**
 * @route GET /api/stt/stats
 * @description Retrieves statistics related to STT and TTS services from the backend.
 * This can include provider information, cost details, and default configurations.
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @returns {Promise<void>}
 */
export async function GET(req: Request, res: Response): Promise<void> {
  try {
    const effectiveUserId = resolveSessionUserId(req);
    const userContext = (req as any)?.user;
    const creditContext: CreditContext = {
      isAuthenticated: Boolean(userContext),
      tier: userContext?.tier,
      mode: userContext?.mode,
    };
    creditAllocationService.syncProfile(effectiveUserId, creditContext);
    const stats = await audioService.getSpeechProcessingStats(effectiveUserId);
    const sessionCost = CostService.getSessionCost(effectiveUserId);
    const credits = creditAllocationService.getSnapshot(effectiveUserId, creditContext);

    console.log(`[stt.routes] User ${effectiveUserId} (IP: ${req.ip}) requested STT/TTS stats.`);

    res.status(200).json({
      ...stats,
      currentSessionCost: sessionCost.totalCost,
      costsByService: sessionCost.costsByService,
      sessionCostThreshold: parseFloat(process.env.COST_THRESHOLD_USD_PER_SESSION || '2.00'),
      credits,
    });
  } catch (error: any) {
    console.error(`[stt.routes] Error fetching STT/TTS stats for user at IP ${req.ip}: ${error.message}`, error.stack);
    if (res.headersSent) {
      return;
    }
    res.status(500).json({
      message: "Failed to fetch speech processing statistics.",
      error: "STATS_FETCH_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}


