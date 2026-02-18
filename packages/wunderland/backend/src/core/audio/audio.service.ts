// File: backend/src/core/audio/audio.service.ts
/**
 * @file Audio Service
 * @description Handles audio processing tasks including Speech-to-Text (STT) and Text-to-Speech (TTS)
 * using various providers like OpenAI Whisper and OpenAI TTS.
 * @version 1.3.3 - Standardized temp directory usage, refined JSDoc, and confirmed CostService integration.
 * @dependencies fs, fs/promises, path, os, url, openai, ./stt.interfaces, ./tts.interfaces, ../cost/cost.service, dotenv
 */

import fsPromises from 'fs/promises';
import fsSync from 'fs'; // For createReadStream, as fs/promises doesn't have it directly
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import type { SpeechCreateParams } from 'openai/resources/audio/speech';

import { ISttOptions, ITranscriptionResult as ISttTranscriptionResult, ISttProvider as ISttProviderDefinition, SttResponseFormat, ITranscriptionSegment } from './stt.interfaces.js';
import { ITtsOptions, IAvailableVoice, ITtsResult, ITtsProvider as ITtsProviderDefinition } from './tts.interfaces.js';

import { CostService } from '../cost/cost.service.js';
import { ttsCacheService } from './ttsCache.service.js';
import { textChunkerService } from './textChunker.service.js';
import dotenv from 'dotenv';

// Determine project root for .env loading
const __moduleDirname = path.dirname(fileURLToPath(import.meta.url));
const __projectRoot = path.resolve(__moduleDirname, '../../../../'); // Navigates up from backend/src/core/audio to project root
dotenv.config({ path: path.join(__projectRoot, '.env') });

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const WHISPER_MODEL_DEFAULT = process.env.WHISPER_MODEL_DEFAULT || 'whisper-1';
const OPENAI_TTS_MODEL_DEFAULT : SpeechCreateParams['model'] = (process.env.OPENAI_TTS_DEFAULT_MODEL as SpeechCreateParams['model']) || 'tts-1';
const OPENAI_TTS_VOICE_DEFAULT : SpeechCreateParams['voice'] = (process.env.OPENAI_TTS_DEFAULT_VOICE as SpeechCreateParams['voice']) || 'nova'; // Changed to 'nova' for better clarity
const OPENAI_TTS_DEFAULT_SPEED = parseFloat(process.env.OPENAI_TTS_DEFAULT_SPEED || "1.15"); // Slightly faster default
const OPENAI_TTS_DEFAULT_FORMAT = (process.env.OPENAI_TTS_DEFAULT_FORMAT || 'opus') as SpeechCreateParams['response_format']; // Opus for smaller files

/**
 * @constant {string} TMP_DIR - Path to the temporary directory for storing transient audio files.
 * Located within the system's temporary directory, under a 'vca-audio-tmp' subfolder.
 */
const TMP_DIR = path.join(os.tmpdir(), 'vca-audio-tmp');

/**
 * Ensures the temporary directory for audio files exists.
 * Creates the directory if it doesn't exist.
 * @async
 * @throws {Error} If directory creation fails, an error is logged but not re-thrown to avoid hard crashes on startup for this utility function.
 */
async function ensureTmpDirExists(): Promise<void> {
  try {
    await fsPromises.mkdir(TMP_DIR, { recursive: true });
    console.log(`[AudioService] Ensured temporary directory exists: ${TMP_DIR}`);
  } catch (error) {
    console.error(`[AudioService] CRITICAL: Failed to create or access temporary directory ${TMP_DIR}:`, error);
    // Consider the implications if this directory is not writable/creatable.
    // For now, logging the error. Critical operations might need to handle this failure.
  }
}
// Initialize temporary directory on module load.
ensureTmpDirExists();

if (!OPENAI_API_KEY) {
  console.warn('[AudioService] OPENAI_API_KEY is not set in environment variables. OpenAI dependent services (Whisper STT, OpenAI TTS) will fail if an attempt is made to use them.');
}

/**
 * OpenAI API client instance. Initialized if OPENAI_API_KEY is available.
 * @type {OpenAI | null}
 */
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// --- STT Providers ---

/**
 * @class WhisperApiSttProvider
 * @implements {ISttProviderDefinition}
 * @description Implements the STT provider contract for OpenAI's Whisper API.
 * Handles audio transcription by saving the buffer to a temporary file and sending it to OpenAI.
 */
class WhisperApiSttProvider implements ISttProviderDefinition {
  private readonly providerName = "OpenAI Whisper API";

  /**
   * Gets the user-friendly name of the STT provider.
   * @returns {string} The provider's name.
   */
  public getProviderName(): string {
    return this.providerName;
  }
  
  /**
   * Transcribes an audio buffer using the OpenAI Whisper API.
   * @param {Buffer} audioBuffer - The audio data to transcribe.
   * @param {string} originalFileName - The original name of the audio file, used for format hinting and logging.
   * @param {ISttOptions} options - Configuration options for the transcription, such as language, model, and response format.
   * @returns {Promise<ISttTranscriptionResult>} A promise that resolves with the transcription result.
   * @throws {Error} If the OpenAI API key is not configured, or if any step in the transcription process fails (e.g., file operations, API call).
   */
  async transcribe(audioBuffer: Buffer, originalFileName: string, options: ISttOptions): Promise<ISttTranscriptionResult> {
    if (!openai) {
      console.error("[AudioService/Whisper] Attempted to use Whisper STT but OpenAI API key is not configured.");
      throw new Error('OpenAI API key not configured. Whisper STT unavailable.');
    }

    let effectiveFileName = originalFileName;
    const fileExtension = path.extname(originalFileName);
    const mimeTypeFromOptions = options.providerSpecificOptions?.mimeType as string | undefined;

    if (!fileExtension && mimeTypeFromOptions) {
        // Attempt to derive extension from MIME type if filename lacks one
        const derivedExtension = mimeTypeFromOptions.split('/')[1];
        if (derivedExtension) {
            effectiveFileName = `${path.parse(originalFileName).name}.${derivedExtension}`;
        }
    } else if (!fileExtension) {
        // Fallback if no extension and no MIME type hint
        effectiveFileName = `${path.parse(originalFileName).name}.webm`; // Default to .webm as it's common for web audio
        console.warn(`[AudioService/Whisper] Original filename "${originalFileName}" lacks an extension. Using default ".webm". Consider providing MIME type in options.`);
    }

    const tempFileNameWithPrefix = `whisper-audio-${Date.now()}-${path.basename(effectiveFileName)}`;
    const tempFilePath = path.join(TMP_DIR, tempFileNameWithPrefix);
    
    try {
      await fsPromises.writeFile(tempFilePath, audioBuffer);
    } catch (writeError: any) {
      console.error(`[AudioService/Whisper] Failed to write temporary audio file to ${tempFilePath}:`, writeError.message);
      throw new Error(`Failed to process audio for transcription (file write error): ${writeError.message}`);
    }
    
    try {
      const fileStream = fsSync.createReadStream(tempFilePath);
      
      const sttModel = options.model || WHISPER_MODEL_DEFAULT;
      // Default to 'verbose_json' to get detailed segment and duration information.
      const responseFormat = options.responseFormat || 'verbose_json'; 

      console.log(`[AudioService/Whisper] STT Request - Model: ${sttModel}, Lang: ${options.language || 'auto-detect'}, File: ${effectiveFileName}, TargetFormat: ${responseFormat}, Prompt: ${options.prompt ? 'Yes' : 'No'}`);

      // Type assertion for Whisper's verbose_json response
      type WhisperVerboseTranscription = OpenAI.Audio.Transcriptions.Transcription & {
        text: string;
        duration?: number; // Seconds
        language?: string; // Detected language code
        segments?: ITranscriptionSegment[]; // Our detailed segment interface
      };
      
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: sttModel,
        language: options.language, // ISO 639-1 code, e.g., 'en', 'es'
        prompt: options.prompt,
        response_format: responseFormat as OpenAI.Audio.Transcriptions.TranscriptionCreateParams['response_format'],
        temperature: options.temperature,
        // Enable timestamp granularities if detailed segment/word timestamps are needed and supported by chosen format
        // timestamp_granularities: responseFormat === 'verbose_json' ? ['segment'] : undefined, // 'word' can also be added
      }) as WhisperVerboseTranscription; // Cast to our expected verbose structure

      const textOutput = transcription.text || ''; 
      
      let durationSecondsValue = 0;
      if (typeof transcription.duration === 'number') {
        durationSecondsValue = transcription.duration;
      } else {
        const bytesPerSecondEstimate = 12 * 1024; // Rough estimate for compressed audio like Opus/WebM ~96kbps
        durationSecondsValue = audioBuffer.length / bytesPerSecondEstimate; 
        console.warn(`[AudioService/Whisper] Duration not directly available from API response (format: ${responseFormat}). Estimated duration: ${durationSecondsValue.toFixed(2)}s for ${audioBuffer.length} bytes.`);
      }
      
      const costPerMinute = parseFloat(process.env.WHISPER_API_COST_PER_MINUTE || "0.006"); // e.g., $0.006/minute
      const costOfTranscription = (durationSecondsValue / 60) * costPerMinute;

      const result: ISttTranscriptionResult = {
        text: textOutput,
        language: transcription.language || options.language, // Detected language or specified one
        durationSeconds: durationSecondsValue,
        cost: costOfTranscription,
        segments: transcription.segments, // Directly use if structure matches ITranscriptionSegment
        providerResponse: transcription, 
        usage: {
            durationMinutes: durationSecondsValue / 60,
            modelUsed: sttModel,
            providerSpecific: { inputBytes: audioBuffer.length }
        }
      };
      return result;
    } catch (apiError: any) {
        console.error(`[AudioService/Whisper] OpenAI API error during transcription for file ${effectiveFileName}:`, apiError.message);
        if (apiError.response?.data) { // Axios-style error
            console.error("[AudioService/Whisper] OpenAI API Error Details:", JSON.stringify(apiError.response.data, null, 2));
        } else if (apiError.error?.message) { // OpenAI SDK style error
             console.error("[AudioService/Whisper] OpenAI SDK Error Details:", JSON.stringify(apiError.error, null, 2));
        }
        throw new Error(`Whisper API transcription failed: ${apiError.message || 'Unknown API error'}`);
    } finally {
      // Ensure temporary file is always deleted
      await fsPromises.unlink(tempFilePath).catch(unlinkError => 
        console.error(`[AudioService/Whisper] CRITICAL: Failed to delete temporary audio file ${tempFilePath}:`, unlinkError.message)
      );
    }
  }
}


// --- TTS Providers ---
// Assuming BrowserTtsProvider and OpenAiTtsProvider from your previous input are largely unchanged and correct.
// For brevity, I'll include their class definitions as they were, assuming they are functional.

/**
 * @class BrowserTtsProvider
 * @implements {ITtsProviderDefinition}
 * @description Conceptual TTS provider for browser's Web Speech API. Synthesize and listAvailableVoices
 * are placeholders as these actions are client-side.
 */
class BrowserTtsProvider implements ITtsProviderDefinition {
    private readonly providerName = "Browser Web Speech API (Conceptual Backend Placeholder)";
 
    public getProviderName(): string {
      return this.providerName;
    }
 
    async synthesize(text: string, options: ITtsOptions): Promise<ITtsResult> {
      console.warn(`[AudioService/BrowserTTS] Synthesize called on backend for 'browser_tts'. This provider is client-side only for actual speech synthesis.`);
      throw new Error("Browser TTS is client-side only and cannot synthesize speech on the backend.");
    }
 
    async listAvailableVoices(): Promise<IAvailableVoice[]> {
      console.warn(`[AudioService/BrowserTTS] listAvailableVoices called on backend for 'browser_tts'. Voices are determined client-side.`);
      return []; // Voices are client-dependent
    }
}

/**
 * @class OpenAiTtsProvider
 * @implements {ITtsProviderDefinition}
 * @description Implements the TTS provider contract for OpenAI's TTS API.
 */
class OpenAiTtsProvider implements ITtsProviderDefinition {
  private readonly providerName = "OpenAI TTS API";
  // OpenAI charges per 1 million characters. $15.00 / 1,000,000 characters for tts-1
  public readonly costPer1KChars = (parseFloat(process.env.OPENAI_TTS_COST_PER_1M_CHARS_TTS1 || "15.0") / 1000000) * 1000;

  public getProviderName(): string {
    return this.providerName;
  }

  async synthesize(text: string, options: ITtsOptions): Promise<ITtsResult> {
    if (!openai) {
      console.error("[AudioService/OpenAI_TTS] Attempted to use OpenAI TTS but API key is not configured.");
      throw new Error('OpenAI API key not configured. OpenAI TTS unavailable.');
    }
    if (text.length > 4096) { // OpenAI limit
        console.warn(`[AudioService/OpenAI_TTS] Text input length (${text.length}) exceeds OpenAI TTS maximum of 4096 characters.`);
        throw new Error('Text input for OpenAI TTS exceeds maximum length of 4096 characters.');
    }

    try {
      const ttsModel: SpeechCreateParams['model'] = options.model || OPENAI_TTS_MODEL_DEFAULT;
      const ttsVoice: SpeechCreateParams['voice'] = (options.voice as SpeechCreateParams['voice']) || OPENAI_TTS_VOICE_DEFAULT;
      const ttsSpeed: number = typeof options.speed === 'number' && options.speed >= 0.25 && options.speed <= 4.0
                                ? options.speed
                                : OPENAI_TTS_DEFAULT_SPEED;
      const ttsFormat: SpeechCreateParams['response_format'] = options.outputFormat || OPENAI_TTS_DEFAULT_FORMAT;

      // Check cache first
      const cachedAudio = ttsCacheService.getCachedAudio(
        text,
        String(ttsVoice),
        String(ttsModel),
        ttsSpeed,
        'openai_tts'
      );

      if (cachedAudio) {
        console.log(`[AudioService/OpenAI_TTS] Cache HIT - Returning cached audio for ${text.length} chars`);
        return {
          audioBuffer: cachedAudio.audioBuffer,
          mimeType: cachedAudio.mimeType,
          cost: 0, // No API cost for cached audio
          voiceUsed: cachedAudio.voice,
          providerName: this.providerName,
          durationSeconds: cachedAudio.audioBuffer.length / 16384, // Estimate
          usage: {
            characters: text.length,
            modelUsed: String(ttsModel),
          }
        };
      }

      // Log if unsupported options are passed, as OpenAI TTS has a limited set
      if (options.pitch !== undefined && options.pitch !== 1.0) {
          console.warn(`[AudioService/OpenAI_TTS] 'pitch' parameter (value: ${options.pitch}) is ignored by OpenAI TTS API.`);
      }
      if (options.volume !== undefined && options.volume !== 1.0) {
          console.warn(`[AudioService/OpenAI_TTS] 'volume' parameter (value: ${options.volume}) is ignored by OpenAI TTS API.`);
      }

      const ttsPayload: SpeechCreateParams = {
        model: ttsModel,
        voice: ttsVoice,
        input: text,
        response_format: ttsFormat,
        speed: ttsSpeed,
      };

      console.log(`[AudioService/OpenAI_TTS] TTS Request - Model: ${ttsModel}, Voice: ${ttsVoice}, Speed: ${ttsSpeed}, Format: ${ttsFormat}, Chars: ${text.length}`);
      const speechResponse = await openai.audio.speech.create(ttsPayload);

      const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
      const charactersBilled = text.length; // OpenAI bills per input character
      const cost = (charactersBilled / 1000) * this.costPer1KChars;

      let mimeType = 'audio/mpeg'; // Default for mp3
      if (ttsFormat === 'opus') mimeType = 'audio/opus';
      else if (ttsFormat === 'aac') mimeType = 'audio/aac';
      else if (ttsFormat === 'flac') mimeType = 'audio/flac';
      else if (ttsFormat === 'pcm') mimeType = 'audio/L24; rate=24000'; // Example for pcm, check exact from OpenAI

      // Cache the generated audio for future use
      ttsCacheService.cacheAudio(
        text,
        audioBuffer,
        mimeType,
        String(ttsVoice),
        String(ttsModel),
        ttsSpeed,
        'openai_tts'
      );

      // Better duration estimation based on format
      const estimatedBytesPerSecond = (ttsFormat === 'pcm') ? (24000 * (24/8)) :
                                      (ttsFormat === 'opus') ? (8 * 1024) : // Opus is more efficient
                                      (16 * 1024); // 16KB/s for ~128kbps compressed
      const estimatedDurationSeconds = audioBuffer.length / estimatedBytesPerSecond;

      const result: ITtsResult = {
        audioBuffer,
        mimeType,
        cost,
        voiceUsed: String(ttsPayload.voice),
        providerName: this.providerName,
        durationSeconds: estimatedDurationSeconds,
        usage: {
            characters: text.length,
            modelUsed: String(ttsPayload.model),
        }
      };
      return result;
    } catch (error: any) {
      console.error(`[AudioService/OpenAI_TTS] OpenAI TTS synthesis error for text starting with "${text.substring(0,30)}...":`, error.message);
      if (error.response?.data) {
        console.error("[AudioService/OpenAI_TTS] API Error Details:", JSON.stringify(error.response.data, null, 2));
      } else if (error.error?.message) {
        console.error("[AudioService/OpenAI_TTS] SDK Error Details:", JSON.stringify(error.error, null, 2));
      }
      throw new Error(`OpenAI TTS synthesis failed: ${error.message || 'Unknown API error'}`);
    }
  }

  async listAvailableVoices(): Promise<IAvailableVoice[]> {
    const voices: ReadonlyArray<SpeechCreateParams['voice']> = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    return voices.map(voice => ({
      id: `openai_${voice}`, // Prefix with provider for uniqueness if combined with other providers client-side
      providerVoiceId: voice, // The actual ID used with the API
      name: voice.charAt(0).toUpperCase() + voice.slice(1),
      lang: 'various', // OpenAI TTS voices support multiple languages auto-detected from input text
      gender: 'neutral', // OpenAI voices are generally neutral or not explicitly gendered
      provider: 'openai_tts', // Specific provider identifier
      isDefault: voice === OPENAI_TTS_VOICE_DEFAULT,
      description: `OpenAI TTS voice: ${voice}. High quality, supports multiple languages.`,
    }));
  }
}

/**
 * @class AudioService
 * @description Main service for handling STT and TTS operations.
 * It manages different STT/TTS providers and routes requests accordingly.
 */
class AudioService {
  private sttProvider: ISttProviderDefinition;
  private ttsProviders: Map<string, ITtsProviderDefinition>;
  private defaultTtsProviderId: string;

  constructor() {
    this.sttProvider = new WhisperApiSttProvider(); 

    this.ttsProviders = new Map();
    this.ttsProviders.set('browser_tts', new BrowserTtsProvider()); 
    
    if (openai) {
        this.ttsProviders.set('openai_tts', new OpenAiTtsProvider());
        const preferredProvider = process.env.DEFAULT_SPEECH_PREFERENCE_TTS_PROVIDER;
        if (preferredProvider === 'openai_tts' && this.ttsProviders.has('openai_tts')) {
            this.defaultTtsProviderId = 'openai_tts';
        } else if (preferredProvider === 'browser_tts') {
            this.defaultTtsProviderId = 'browser_tts';
        } else {
            // Fallback: prefer OpenAI if available, otherwise browser
            this.defaultTtsProviderId = this.ttsProviders.has('openai_tts') ? 'openai_tts' : 'browser_tts';
        }
    } else {
        this.defaultTtsProviderId = 'browser_tts'; 
        console.warn("[AudioService] OpenAI API key not configured. OpenAI TTS provider not initialized. Defaulting TTS to 'browser_tts'.");
    }
    console.log(`[AudioService] Initialized. Default STT: ${this.sttProvider.getProviderName()}. Default TTS: ${this.defaultTtsProviderId}`);
  }

  /**
   * Sets the active STT provider for the service.
   * Currently only supports 'whisper_api'.
   * @param {string} providerId - The ID of the STT provider to use.
   * @throws {Error} If an unknown or unsupported provider ID is given.
   */
  public setSttProvider(providerId: 'whisper_api' | string): void {
    if (providerId === 'whisper_api') {
      this.sttProvider = new WhisperApiSttProvider();
    } else {
      throw new Error(`[AudioService] Unknown or unsupported STT provider ID: ${providerId}`);
    }
    console.log(`[AudioService] STT provider dynamically set to: ${this.sttProvider.getProviderName()}`);
  }

  /**
   * Transcribes audio using the currently configured STT provider.
   * @param {Buffer} audioBuffer - The audio data (Buffer) to be transcribed.
   * @param {string} originalFileName - The original filename, used for logging and potential format hinting.
   * @param {ISttOptions} options - Transcription options (language, model, prompt, etc.).
   * @param {string} userId - The ID of the user initiating the request, for accurate cost tracking.
   * @returns {Promise<ISttTranscriptionResult>} The result of the transcription.
   * @throws {Error} Propagates errors from the STT provider or internal processing.
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    originalFileName: string,
    options: ISttOptions,
    userId: string,
  ): Promise<ISttTranscriptionResult> {
    console.log(`[AudioService] TranscribeAudio called for user: ${userId}, file: ${originalFileName}, options: ${JSON.stringify(options)}`);
    try {
      const result = await this.sttProvider.transcribe(audioBuffer, originalFileName, options);
      CostService.trackCost(
        userId,
        'stt', 
        result.cost, 
        result.usage?.modelUsed || this.sttProvider.getProviderName(), 
        audioBuffer.length, 'bytes_in', // Input unit
        result.text?.length || 0, 'chars_out', // Output unit
        { 
          provider: this.sttProvider.getProviderName(), 
          durationSeconds: result.durationSeconds,
          language: result.language,
          responseFormat: options.responseFormat,
          segmentsCount: result.segments?.length
        }
      );
      return result;
    } catch (error: any) {
        console.error(`[AudioService] STT Error for user ${userId}, file ${originalFileName}:`, error.message, error.stack);
        throw new Error(`STT process failed for ${originalFileName}: ${error.message}`);
    }
  }

  /**
   * Synthesizes speech from text using the configured or specified TTS provider.
   * @param {string} text - The text to be converted to speech.
   * @param {ITtsOptions} options - TTS synthesis options, including voice, model, speed, and optional providerId.
   * @param {string} userId - The ID of the user initiating the request, for cost tracking.
   * @returns {Promise<ITtsResult>} The result of the TTS synthesis, including audio buffer and metadata.
   * @throws {Error} If the TTS provider is not found, not configured, or if synthesis fails.
   */
  async synthesizeSpeech(text: string, options: ITtsOptions, userId: string): Promise<ITtsResult> {
    const providerIdToUse = options.providerId || this.defaultTtsProviderId;
    const ttsProvider = this.ttsProviders.get(providerIdToUse);

    if (!ttsProvider) {
      console.error(`[AudioService] TTS provider '${providerIdToUse}' not found for user ${userId}. Available: ${Array.from(this.ttsProviders.keys()).join(', ')}`);
      throw new Error(`TTS provider '${providerIdToUse}' not found or not configured.`);
    }
    
    const finalOptions: ITtsOptions = { ...options }; 
    if (providerIdToUse === 'openai_tts') {
        finalOptions.model = (options.model as SpeechCreateParams['model']) || OPENAI_TTS_MODEL_DEFAULT;
        finalOptions.voice = (options.voice as SpeechCreateParams['voice']) || OPENAI_TTS_VOICE_DEFAULT;
        finalOptions.outputFormat = options.outputFormat || 'mp3';
        finalOptions.speed = options.speed ?? OPENAI_TTS_DEFAULT_SPEED; 
    }

    console.log(`[AudioService] SynthesizeSpeech called for user: ${userId}, provider: ${ttsProvider.getProviderName()}, options: ${JSON.stringify(finalOptions)}`);
    try {
      const result = await ttsProvider.synthesize(text, finalOptions);
      CostService.trackCost(
        userId,
        'tts', 
        result.cost, 
        result.usage?.modelUsed || ttsProvider.getProviderName(), 
        result.usage?.characters || text.length, 'characters_in', 
        result.audioBuffer.length,  'bytes_out',
        { 
          provider: ttsProvider.getProviderName(), 
          voice: result.voiceUsed,
          format: result.mimeType.split('/')[1],
          durationSeconds: result.durationSeconds,
          speed: finalOptions.speed,
        }
      );
      return result;
    } catch (error: any) {
        console.error(`[AudioService] TTS Error for user ${userId}, provider ${ttsProvider.getProviderName()}:`, error.message, error.stack);
        throw new Error(`TTS process failed with ${ttsProvider.getProviderName()}: ${error.message}`);
    }
  }

  /**
   * Lists available TTS voices. If a providerId is specified, lists voices for that provider.
   * Otherwise, attempts to list voices from all configured and available providers.
   * @param {string} [providerId] - Optional ID of a specific TTS provider (e.g., 'openai_tts', 'browser_tts').
   * @returns {Promise<IAvailableVoice[]>} A promise resolving to an array of available voice options.
   */
  async listAvailableTtsVoices(providerId?: string): Promise<IAvailableVoice[]> {
    if (providerId) {
      const ttsProvider = this.ttsProviders.get(providerId);
      if (!ttsProvider) {
        console.warn(`[AudioService] Requested TTS provider '${providerId}' for voice listing not found.`);
        return [];
      }
      if (!ttsProvider.listAvailableVoices) {
        console.warn(`[AudioService] TTS provider '${providerId}' does not implement listAvailableVoices.`);
        return [];
      }
      try {
        return await ttsProvider.listAvailableVoices();
      } catch (error: any) {
        console.error(`[AudioService] Error listing voices for provider '${providerId}': ${error.message}`);
        return [];
      }
    } else {
      let allVoices: IAvailableVoice[] = [];
      for (const [id, provider] of this.ttsProviders) {
        if (provider.listAvailableVoices) {
          try {
            const voices = await provider.listAvailableVoices();
            allVoices = allVoices.concat(voices);
          } catch (error: any) {
            console.warn(`[AudioService] Could not list voices for provider '${id}': ${error.message}`);
          }
        }
      }
      return allVoices;
    }
  }

  /**
   * Performs a basic analysis of an audio buffer. This is a placeholder and should be
   * expanded with more sophisticated analysis if needed (e.g., using an audio library).
   * @param {Buffer} audioBuffer - The audio data to analyze.
   * @returns {Promise<object>} An object containing basic analysis like duration, size, and estimated STT cost.
   */
  async analyzeAudio(audioBuffer: Buffer): Promise<{duration: number, fileSize: number, estimatedCost: number, isOptimal: boolean, recommendations: string[], mimeType?: string}> {
    const fileSize = audioBuffer.length;
    // Rough estimation: 1 minute of Whisper-대상 audio is ~1-2MB for common web formats.
    // OpenAI bills per minute, rounded up.
    const typicalBytesPerMinute = 1.5 * 1024 * 1024; // Assuming ~1.5MB per minute average
    const durationMinutes = Math.max(1/60, fileSize / typicalBytesPerMinute); // Ensure at least 1 second for cost calc if very small
    
    const costPerMinute = parseFloat(process.env.WHISPER_API_COST_PER_MINUTE || "0.006");
    const estimatedCost = Math.ceil(durationMinutes) * (costPerMinute / 1); // OpenAI rounds to nearest second, but bills per minute block. For simplicity, ceil duration to minute.
                                                                             // More accurately, cost is per minute of audio processed, rounded up to the nearest second by OpenAI, but price is per minute.
                                                                             // So, if audio is 0-60s -> 1 min cost. 61-120s -> 2 min cost for some models.
                                                                             // Whisper docs state $0.006 / minute (rounded to the nearest second).
                                                                             // So, (durationSeconds / 60) * 0.006 is more accurate.
    const durationSeconds = durationMinutes * 60;
    const actualEstimatedCost = (durationSeconds / 60) * costPerMinute;


    return {
        duration: durationSeconds,
        fileSize,
        estimatedCost: actualEstimatedCost,
        isOptimal: true, // Placeholder
        recommendations: [], // Placeholder
        mimeType: 'audio/webm' // Placeholder, should be dynamic
    };
  }

  /**
   * Retrieves statistics about configured speech processing services.
   * @param {string} [userId] - Optional user ID for context (currently not used in stat generation itself but good practice).
   * @returns {Promise<object>} An object containing STT/TTS provider information and default cost/model details.
   */
  async getSpeechProcessingStats(userId?: string): Promise<object> {
    const openAITtsProviderInstance = this.ttsProviders.get('openai_tts') as OpenAiTtsProvider | undefined;
    let openAITTSCostDisplayInfo = 'N/A (OpenAI TTS provider not available or not configured)';
    if (openAITtsProviderInstance) {
        // Format to something like "$15.00 per 1 million characters"
        const costPerMillion = openAITtsProviderInstance.costPer1KChars * 1000;
        openAITTSCostDisplayInfo = `$${costPerMillion.toFixed(2)} per 1 million characters (for tts-1 model family)`;
    }

    return {
        sttProvider: this.sttProvider.getProviderName(),
        defaultTtsProvider: this.defaultTtsProviderId,
        availableTtsProviders: Array.from(this.ttsProviders.keys()),
        whisperCostPerMinute: `$${parseFloat(process.env.WHISPER_API_COST_PER_MINUTE || "0.006").toFixed(3)} / minute (rounded to nearest second)`,
        openAITTSCostInfo: openAITTSCostDisplayInfo,
        openaiTtsDefaultModel: OPENAI_TTS_MODEL_DEFAULT,
        openaiTtsDefaultVoice: OPENAI_TTS_VOICE_DEFAULT,
        openaiTtsDefaultSpeed: OPENAI_TTS_DEFAULT_SPEED,
    };
  }
}

/**
 * Singleton instance of the AudioService.
 * This instance is exported and used throughout the backend for audio operations.
 * @type {AudioService}
 */
export const audioService = new AudioService();