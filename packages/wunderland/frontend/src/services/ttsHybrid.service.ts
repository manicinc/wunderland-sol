// cSpell:ignore flac AITTS
/**
 * @file ttsHybrid.service.ts
 * @description Hybrid TTS service that intelligently chooses between browser and OpenAI TTS
 * @version 1.0.0
 */

import { ttsService as browserTtsService } from './tts.service';
import { ttsAPI } from '../utils/api';
import { voiceSettingsManager } from './voice.settings.service';

export interface HybridTTSOptions {
  /** Force a specific provider */
  forceProvider?: 'browser' | 'openai';
  /** Maximum text length for browser TTS */
  browserMaxLength?: number;
  /** Minimum text length for OpenAI TTS */
  openaiMinLength?: number;
  /** Enable chunked processing */
  enableChunking?: boolean;
  /** Chunk size for processing */
  chunkSize?: number;
  /** Voice settings override */
  voice?: string;
  /** Speed override */
  speed?: number;
  /** Format for OpenAI TTS */
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
  /** Priority level */
  priority?: 'high' | 'normal' | 'low';
}

interface TTSQueueItem {
  text: string;
  options: HybridTTSOptions;
  resolve: (value: void) => void;
  reject: (error: any) => void;
  priority: number;
}

/**
 * Hybrid TTS Service that optimizes between browser and API TTS
 */
class HybridTTSService {
  private queue: TTSQueueItem[] = [];
  private isProcessing = false;
  private abortController: AbortController | null = null;

  // Default thresholds
  private readonly DEFAULT_BROWSER_MAX_LENGTH = 150;
  private readonly DEFAULT_OPENAI_MIN_LENGTH = 100;
  private readonly DEFAULT_CHUNK_SIZE = 300;

  // Performance metrics
  private metrics = {
    browserCalls: 0,
    openaiCalls: 0,
    totalCharacters: 0,
    totalDuration: 0,
    averageResponseTime: 0,
    cacheHits: 0,
  };

  constructor() {
    console.log('[HybridTTSService] Initialized with intelligent provider selection');
  }

  /**
   * Main entry point for TTS synthesis
   */
  public async speak(text: string, options: HybridTTSOptions = {}): Promise<void> {
    // Skip empty text
    if (!text || text.trim().length === 0) {
      return Promise.resolve();
    }

    // Check if auto-play is enabled
    if (!voiceSettingsManager.settings.autoPlayTts && !options.forceProvider) {
      console.log('[HybridTTSService] Auto-play disabled, skipping TTS');
      return Promise.resolve();
    }

    // Add to queue with priority
    return this.addToQueue(text, options);
  }

  /**
   * Add text to processing queue
   */
  private async addToQueue(text: string, options: HybridTTSOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const priority = this.calculatePriority(text, options);

      const queueItem: TTSQueueItem = {
        text,
        options,
        resolve,
        reject,
        priority,
      };

      // Insert based on priority
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(queueItem);
      } else {
        this.queue.splice(insertIndex, 0, queueItem);
      }

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the TTS queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      try {
        await this.processTTS(item.text, item.options);
        item.resolve();
      } catch (error) {
        console.error('[HybridTTSService] Error processing TTS:', error);
        item.reject(error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process TTS for a single text item
   */
  private async processTTS(text: string, options: HybridTTSOptions): Promise<void> {
    const startTime = Date.now();

    try {
      // Determine which provider to use
      const provider = this.selectProvider(text, options);

      console.log(`[HybridTTSService] Using ${provider} for ${text.length} chars`);

      if (provider === 'browser') {
        await this.useBrowserTTS(text, options);
        this.metrics.browserCalls++;
      } else {
        // Check if we should chunk the text
        if (options.enableChunking && text.length > (options.chunkSize || this.DEFAULT_CHUNK_SIZE)) {
          await this.useChunkedTTS(text, options);
        } else {
          await this.useOpenAITTS(text, options);
        }
        this.metrics.openaiCalls++;
      }

      // Update metrics
      const duration = Date.now() - startTime;
      this.metrics.totalCharacters += text.length;
      this.metrics.totalDuration += duration;
      this.metrics.averageResponseTime = this.metrics.totalDuration / (this.metrics.browserCalls + this.metrics.openaiCalls);

      console.log(`[HybridTTSService] TTS completed in ${duration}ms`);
    } catch (error) {
      console.error('[HybridTTSService] TTS processing error:', error);
      throw error;
    }
  }

  /**
   * Intelligently select TTS provider based on text and options
   */
  private selectProvider(text: string, options: HybridTTSOptions): 'browser' | 'openai' {
    // Force provider if specified
    if (options.forceProvider) {
      return options.forceProvider;
    }

    const textLength = text.length;
    const browserMax = options.browserMaxLength || this.DEFAULT_BROWSER_MAX_LENGTH;
    const openaiMin = options.openaiMinLength || this.DEFAULT_OPENAI_MIN_LENGTH;

    // Get user's preferred provider
    const preferredProvider = voiceSettingsManager.settings.ttsProvider;

    // Short text: prefer browser for speed
    if (textLength <= browserMax) {
      // Check if browser TTS is available
      if (browserTtsService.getAvailableVoices().length > 0) {
        return 'browser';
      }
    }

    // Long text: prefer OpenAI for quality
    if (textLength >= openaiMin) {
      return 'openai';
    }

    // Medium text: use preferred provider
    if (preferredProvider === 'browser_tts' && browserTtsService.getAvailableVoices().length > 0) {
      return 'browser';
    }

    return 'openai';
  }

  /**
   * Use browser TTS
   */
  private async useBrowserTTS(text: string, options: HybridTTSOptions): Promise<void> {
    const selectedVoiceId = options.voice || voiceSettingsManager.settings.selectedTtsVoiceId;
    const rate = options.speed || voiceSettingsManager.settings.ttsRate;
    const volume = voiceSettingsManager.settings.ttsVolume;
    const pitch = voiceSettingsManager.settings.ttsPitch;

    let selectedVoice = voiceSettingsManager.availableTtsVoices.value.find(
      (voice) => voice.id === selectedVoiceId && voice.provider === 'browser',
    );
    if (!selectedVoice) {
      selectedVoice = voiceSettingsManager.availableTtsVoices.value.find((voice) => voice.provider === 'browser' && voice.isDefault)
        ?? voiceSettingsManager.availableTtsVoices.value.find((voice) => voice.provider === 'browser');
    }

    await browserTtsService.speak(text, {
      voiceURI: selectedVoice?.providerVoiceId,
      rate,
      pitch,
      volume,
    });
  }

  /**
   * Use OpenAI TTS API
   */
  private async useOpenAITTS(text: string, options: HybridTTSOptions): Promise<void> {
    const voice = options.voice || voiceSettingsManager.settings.selectedTtsVoiceId || 'nova';
    const speed = options.speed || voiceSettingsManager.settings.ttsRate || 1.15;
    const format = options.format || 'opus'; // Opus for smaller, faster downloads

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    try {
      const response = await ttsAPI.synthesize({
        text,
        voice,
        speed,
        outputFormat: format,
        model: 'tts-1', // Use faster model
      }, this.abortController.signal);

      // Play the audio
      if (response.data) {
        await this.playAudioBuffer(response.data, format);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[HybridTTSService] OpenAI TTS aborted');
      } else {
        throw error;
      }
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Use chunked TTS processing for long text
   */
  private async useChunkedTTS(text: string, options: HybridTTSOptions): Promise<void> {
    const chunkSize = options.chunkSize || this.DEFAULT_CHUNK_SIZE;
    const chunks = this.splitTextIntoChunks(text, chunkSize);

    console.log(`[HybridTTSService] Processing ${chunks.length} chunks`);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`[HybridTTSService] Processing chunk ${i + 1}/${chunks.length}`);

      // Use browser for first chunk (immediate playback), OpenAI for rest
      if (i === 0 && chunk.length < this.DEFAULT_BROWSER_MAX_LENGTH) {
        await this.useBrowserTTS(chunk, options);
      } else {
        await this.useOpenAITTS(chunk, options);
      }

      // Small delay between chunks for natural pacing
      if (i < chunks.length - 1) {
        await this.delay(100);
      }
    }
  }

  /**
   * Split text into chunks at sentence boundaries
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Play audio buffer
   */
  private async playAudioBuffer(audioData: ArrayBuffer | Blob, format: string): Promise<void> {
    const audio = new Audio();

    // Convert ArrayBuffer to Blob if needed
    const audioBlob = audioData instanceof Blob
      ? audioData
      : new Blob([audioData], { type: `audio/${format}` });

    const audioUrl = URL.createObjectURL(audioBlob);
    audio.src = audioUrl;
    audio.volume = voiceSettingsManager.settings.ttsVolume;
    audio.playbackRate = 1.0; // Don't adjust playback rate for pre-generated audio

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        reject(error);
      };

      audio.play().catch(reject);
    });
  }

  /**
   * Calculate priority for queue item
   */
  private calculatePriority(text: string, options: HybridTTSOptions): number {
    let priority = 0;

    // Priority from options
    if (options.priority === 'high') priority += 100;
    else if (options.priority === 'low') priority -= 100;

    // Shorter text gets higher priority for quicker response
    priority += Math.max(0, 100 - text.length / 10);

    return priority;
  }

  /**
   * Cancel current TTS playback
   */
  public cancel(): void {
    // Cancel browser TTS
    browserTtsService.cancel();

    // Cancel OpenAI request if in progress
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    // Clear queue
    this.queue = [];
    this.isProcessing = false;

    console.log('[HybridTTSService] TTS cancelled');
  }

  /**
   * Get current metrics
   */
  public getMetrics() {
    return {
      ...this.metrics,
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      browserCalls: 0,
      openaiCalls: 0,
      totalCharacters: 0,
      totalDuration: 0,
      averageResponseTime: 0,
      cacheHits: 0,
    };
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Pre-warm cache with common phrases
   */
  public async prewarmCache(phrases: string[]): Promise<void> {
    console.log(`[HybridTTSService] Pre-warming cache with ${phrases.length} phrases`);

    for (const phrase of phrases) {
      // Only cache short, common phrases
      if (phrase.length <= this.DEFAULT_BROWSER_MAX_LENGTH) {
        try {
          // Use browser TTS to "warm up" the voice
          await this.useBrowserTTS(phrase, { forceProvider: 'browser' });
        } catch (error) {
          console.warn(`[HybridTTSService] Failed to pre-warm phrase: ${phrase}`);
        }
      }
    }
  }
}

// Singleton instance
export const hybridTTSService = new HybridTTSService();

// Common phrases for pre-warming
const commonPhrases = [
  "Hello! How can I help you today?",
  "Sure, I can help with that.",
  "Let me think about that.",
  "Here's what I found:",
  "Is there anything else?",
  "Thank you!",
  "You're welcome!",
  "Processing your request...",
  "One moment please.",
];

// Pre-warm cache on initialization (optional)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    hybridTTSService.prewarmCache(commonPhrases).catch(console.warn);
  }, 5000); // Delay to avoid blocking initial load
}
