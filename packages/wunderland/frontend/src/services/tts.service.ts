// File: frontend/src/services/tts.service.ts
/**
 * @file Text-to-Speech (TTS) Service
 * @description Manages TTS operations using the browser's Web Speech API.
 * Provides functionalities to speak text, manage a queue, and handle interruptions.
 * If a new speak request comes while another is playing or queued, the existing
 * speech is cancelled, the queue is cleared, and the new request is spoken immediately.
 * @version 1.2.0 - Enhanced voice loading and error handling. Added JSDoc for all public methods.
 */

/**
 * Options for configuring a speech synthesis utterance.
 */
export interface SpeakOptions {
  /** Language code (e.g., 'en-US'). Defaults to browser's default or document lang. */
  lang?: string;
  /** Speech rate (0.1 to 10). Defaults to 1. */
  rate?: number;
  /** Speech pitch (0 to 2). Defaults to 1. */
  pitch?: number;
  /** Volume (0 to 1). Defaults to 1. */
  volume?: number;
  /** Specific voice URI to use. If provided, this will be prioritized. */
  voiceURI?: string;
  /** Callback function invoked when speech synthesis starts for this utterance. */
  onStart?: () => void;
  /** Callback function invoked when speech synthesis finishes for this utterance. */
  onEnd?: () => void;
  /** Callback function invoked if an error occurs during speech synthesis for this utterance. */
  onError?: (event: SpeechSynthesisErrorEvent) => void;
}

/**
 * Represents an utterance that is waiting in the queue to be spoken.
 * @internal
 */
interface QueuedUtterance {
  /** The text content to be synthesized. */
  text: string;
  /** Optional configuration for this specific utterance. */
  options?: SpeakOptions;
  /** Promise resolve function, called when the utterance is successfully spoken. */
  resolve: () => void;
  /** Promise reject function, called if an error occurs or if the utterance is cancelled. */
  reject: (reason?: any) => void;
}

class TtsService {
  private synthesis: SpeechSynthesis | null = null;
  private availableVoices: SpeechSynthesisVoice[] = [];
  private utteranceQueue: QueuedUtterance[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isProcessingQueue = false;
  private voicesLoadedPromise: Promise<void>;
  private resolveVoicesLoaded!: () => void; // Definite assignment assertion

  /**
   * Initializes the TTS Service.
   * Attempts to load voices and checks for browser support for SpeechSynthesis.
   */
  constructor() {
    this.voicesLoadedPromise = new Promise((resolve) => {
      this.resolveVoicesLoaded = resolve;
    });

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      // Ensure voices are loaded before resolving the promise.
      // Some browsers populate voices list synchronously, others asynchronously via 'voiceschanged'.
      if (this.synthesis.getVoices().length > 0) {
        this.loadVoices();
        this.resolveVoicesLoaded();
      } else if (this.synthesis.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = () => {
          this.loadVoices();
          this.resolveVoicesLoaded(); // Resolve promise once voices are confirmed loaded
          // It's good practice to remove the event listener after it has served its purpose
          // if voices are not expected to change further, or manage it carefully.
          // For now, keeping it to handle dynamic voice changes if the browser supports it.
        };
      } else {
        // Fallback for browsers that don't support onvoiceschanged and load voices late.
        setTimeout(() => {
          this.loadVoices();
          this.resolveVoicesLoaded();
        }, 250); // Increased delay slightly for robustness
      }
      this.loadVoices(); // Attempt an initial synchronous load
    } else {
      console.warn(
        'TTS Service: Text-to-Speech (SpeechSynthesis) not supported by this browser.'
      );
      this.resolveVoicesLoaded(); // Resolve immediately if not supported, so `getVoices` doesn't hang.
    }
  }

  /**
   * Loads available voices from the SpeechSynthesis API.
   * This method is called internally and by the voiceschanged event.
   * It updates the `availableVoices` array.
   * @private
   */
  private loadVoices(): void {
    if (!this.synthesis) return;
    this.availableVoices = this.synthesis.getVoices();
    if (this.availableVoices.length > 0) {
      console.log(
        `TTS Service: Voices loaded. Count: ${this.availableVoices.length}.`,
        // Example of logging a few voice details for debugging
        this.availableVoices.slice(0, 5).map((v) => ({
          name: v.name,
          lang: v.lang,
          uri: v.voiceURI,
          default: v.default,
        }))
      );
    } else {
      console.log('TTS Service: No voices available yet or failed to load on this attempt.');
    }
  }

  /**
   * Returns a snapshot of currently loaded voices.
   */
  public getAvailableVoices(): ReadonlyArray<SpeechSynthesisVoice> {
    return this.availableVoices.slice();
  }

  /**
   * Checks if TTS is supported by the browser.
   * @public
   * @returns {boolean} True if SpeechSynthesis is supported, false otherwise.
   */
  public isSupported(): boolean {
    return !!this.synthesis;
  }

  /**
   * Gets a list of available voices. Waits for voices to be loaded.
   * @public
   * @param {string} [lang] - Optional BCP 47 language code to filter voices (e.g., "en-US", "es").
   * If provided, returns voices matching that language or language family (e.g., "en" for "en-US", "en-GB").
   * @returns {Promise<SpeechSynthesisVoice[]>} A promise that resolves with an array of available voices.
   */
  public async getVoices(lang?: string): Promise<SpeechSynthesisVoice[]> {
    await this.voicesLoadedPromise; // Ensure voices are loaded
    if (!this.isSupported()) return []; // Return empty if not supported

    if (lang) {
      const langLower = lang.toLowerCase();
      const langShort = langLower.split('-')[0]; // For matching "en" to "en-US"
      return this.availableVoices.filter(
        (voice) =>
          voice.lang.toLowerCase() === langLower ||
          voice.lang.toLowerCase().startsWith(langShort + '-')
      );
    }
    return [...this.availableVoices]; // Return a copy to prevent external modification
  }

  /**
   * Speaks the given text immediately.
   * If speech is already in progress or items are queued, it cancels all current
   * and pending speech operations and then speaks the new text.
   * @public
   * @param {string} text - The text to speak. Must not be empty.
   * @param {SpeakOptions} [options] - Optional configuration for speech synthesis.
   * @returns {Promise<void>} A promise that resolves when speech finishes or rejects on error/cancellation.
   * @throws {Error} if SpeechSynthesis is not supported or text is empty.
   */
  public async speak(text: string, options?: SpeakOptions): Promise<void> {
    if (!this.isSupported()) { // Use isSupported() for clarity
      const notSupportedMsg = 'Speech synthesis not supported by this browser.';
      console.warn(`TTS Service: ${notSupportedMsg}`);
      return Promise.reject(new Error(notSupportedMsg));
    }

    if (!text || text.trim() === '') {
      console.log('TTS Service: Attempted to speak empty text. Resolving immediately.');
      // Optionally, call options.onEnd() if it exists, though typically not for empty text.
      options?.onEnd?.();
      return Promise.resolve();
    }

    this.cancel(); // Cancel any ongoing or queued speech
    // Wait a tick to ensure cancellation has propagated through the SpeechSynthesis API events
    await new Promise(r => setTimeout(r, 0)); // Small delay for robustness

    return new Promise<void>(async (resolve, reject) => {
      await this.voicesLoadedPromise; // Ensure voices are available for selection

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance; // Track the current utterance

      // Apply options
      utterance.lang = options?.lang || (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en-US';
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      let voiceFound = false;
      if (options?.voiceURI) {
        const selectedVoice = this.availableVoices.find(
          (v) => v.voiceURI === options.voiceURI
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          voiceFound = true;
        } else {
          console.warn(
            `TTS Service: Voice URI "${options.voiceURI}" not found. Using default for lang ${utterance.lang}.`
          );
        }
      }

      if (!voiceFound && utterance.lang) {
        const langVoices = await this.getVoices(utterance.lang); // getVoices is already async and awaits promise
        const defaultVoiceForLang = langVoices.find(v => v.default);
        utterance.voice = defaultVoiceForLang || langVoices[0] || null; // Fallback to first voice for the lang
        if (!utterance.voice && this.availableVoices.length > 0) {
          console.warn(`TTS Service: No specific voice found for lang ${utterance.lang}. Using browser default if available, or first overall voice.`);
          // As a final fallback, pick the first available voice if no language match
          if(!utterance.voice && this.availableVoices.length > 0) utterance.voice = this.availableVoices[0];
        } else if (utterance.voice) {
          console.log(`TTS Service: Selected voice "${utterance.voice.name}" (URI: ${utterance.voice.voiceURI}) for lang ${utterance.lang}.`);
        }
      }

      if (!utterance.voice && this.availableVoices.length > 0) {
        console.warn(`TTS Service: No voice could be explicitly selected. Speech will use the browser's absolute default.`);
      } else if (!utterance.voice && this.availableVoices.length === 0) {
         console.error(`TTS Service: No voices available at all. Cannot speak.`);
         reject(new Error('No TTS voices available in the browser.'));
         return;
      }


      utterance.onstart = () => {
        console.log(`TTS Service: Speech started for "${text.substring(0, 30)}..."`);
        options?.onStart?.();
      };

      utterance.onend = () => {
        console.log(`TTS Service: Speech ended for "${text.substring(0, 30)}..."`);
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        options?.onEnd?.();
        resolve();
        this.processQueue(); // Check queue after direct speech
      };

      utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
        console.error('TTS Service: Speech error.', event.error, event.utterance?.text.substring(0,50));
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null;
        }
        options?.onError?.(event);
        reject(new Error(`SpeechSynthesis error: ${event.error || 'Unknown error'}`));
        this.processQueue(); // Check queue even on error
      };

      this.synthesis!.speak(utterance);
    });
  }

  /**
   * Adds text to a queue to be spoken sequentially.
   * If TTS is idle and no direct speak call is active, it starts processing the queue.
   * @public
   * @param {string} text - The text to queue for speech.
   * @param {SpeakOptions} [options] - Optional configuration for this specific utterance.
   * @returns {Promise<void>} A promise that resolves when this specific utterance finishes,
   * or rejects if an error occurs or it's cancelled.
   */
  public async speakQueued(text: string, options?: SpeakOptions): Promise<void> {
    if (!this.isSupported()) {
      const notSupportedMsg = 'Speech synthesis not supported.';
      console.warn(`TTS Service: ${notSupportedMsg}`);
      return Promise.reject(new Error(notSupportedMsg));
    }
    if (!text || text.trim() === "") {
      options?.onEnd?.(); // Call onEnd if provided for empty text in queue context
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      this.utteranceQueue.push({ text, options, resolve, reject });
      console.log(
        `TTS Service: Queued "${text.substring(0, 30)}...". Queue size: ${
          this.utteranceQueue.length
        }`
      );
      // Only start processing queue if not already speaking (either direct or from queue)
      // and not currently in the middle of processing an item from the queue.
      if (this.synthesis && !this.synthesis.speaking && !this.isProcessingQueue) {
        this.processQueue();
      }
    });
  }

  /**
   * Processes the next utterance in the queue if TTS is not currently busy.
   * This is called internally when speech ends or the queue is initiated.
   * @private
   */
  private async processQueue(): Promise<void> {
    // Guard conditions: no synthesis, already speaking, queue empty, or already processing the queue.
    if (!this.synthesis || this.synthesis.speaking || this.utteranceQueue.length === 0 || this.isProcessingQueue) {
      if (this.utteranceQueue.length === 0 && this.isProcessingQueue) {
        // If queue became empty while we thought we were processing, reset flag.
        this.isProcessingQueue = false;
      }
      return;
    }

    this.isProcessingQueue = true; // Mark that we are starting to process an item.
    const nextUtteranceData = this.utteranceQueue.shift(); // Dequeue
    if (!nextUtteranceData) { // Should not happen if length > 0, but good for safety
      this.isProcessingQueue = false;
      return;
    }

    const { text, options, resolve, reject } = nextUtteranceData;

    // Use the same logic as `speak` method for creating and configuring the utterance
    try {
        // Encapsulate the actual speaking logic in a promise to await its completion or error.
        // This reuses the `speak` method's robust setup, but ensures it's part of queue flow.
        // We pass our queued item's resolve/reject to the options so they get called.
        const speakOptionsWithCallbacks: SpeakOptions = {
            ...options,
            onStart: () => {
                console.log(`TTS Service (Queue): Speech started for "${text.substring(0, 30)}..."`);
                options?.onStart?.();
            },
            onEnd: () => {
                options?.onEnd?.();
                resolve(); // Resolve the promise for this specific queued item
            },
            onError: (event) => {
                options?.onError?.(event);
                reject(new Error(`SpeechSynthesis error (queued): ${event.error || 'Unknown error'}`));
            },
        };

        // We are directly calling the browser's speak method here, after setting currentUtterance
        // Re-using the core utterance setup logic without calling the public `this.speak` which would cancel queue.
        await this.voicesLoadedPromise;
        const utterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance = utterance; // Track current

        utterance.lang = speakOptionsWithCallbacks?.lang || (typeof document !== 'undefined' ? document.documentElement.lang : '') || 'en-US';
        utterance.rate = speakOptionsWithCallbacks?.rate ?? 1;
        utterance.pitch = speakOptionsWithCallbacks?.pitch ?? 1;
        utterance.volume = speakOptionsWithCallbacks?.volume ?? 1;

        let voiceFound = false;
        if (speakOptionsWithCallbacks?.voiceURI) {
            const selectedVoice = this.availableVoices.find(v => v.voiceURI === speakOptionsWithCallbacks.voiceURI);
            if (selectedVoice) { utterance.voice = selectedVoice; voiceFound = true; }
            else { console.warn(`TTS Service (Queue): Voice URI "${speakOptionsWithCallbacks.voiceURI}" not found. Using default.`); }
        }
        if (!voiceFound && utterance.lang) {
            const langVoices = await this.getVoices(utterance.lang);
            const defaultVoiceForLang = langVoices.find(v => v.default);
            utterance.voice = defaultVoiceForLang || langVoices[0] || null;
             if (!utterance.voice && this.availableVoices.length > 0) {
                console.warn(`TTS Service (Queue): No voice for lang ${utterance.lang}. Using browser default or first available.`);
                if(!utterance.voice && this.availableVoices.length > 0) utterance.voice = this.availableVoices[0];
            }
        }
         if (!utterance.voice && this.availableVoices.length === 0) {
             console.error(`TTS Service (Queue): No voices available at all. Cannot speak.`);
             this.isProcessingQueue = false; // Reset flag
             reject(new Error('No TTS voices available in the browser.'));
             this.processQueue(); // Attempt next if any (though unlikely if no voices)
             return;
        }

        utterance.onstart = (event: SpeechSynthesisEvent) => {
            speakOptionsWithCallbacks.onStart?.();
        };
        utterance.onend = () => {
            if (this.currentUtterance === utterance) this.currentUtterance = null;
            this.isProcessingQueue = false; // Done with this item
            speakOptionsWithCallbacks.onEnd?.(); // Calls resolve()
            this.processQueue(); // Process next
        };
        utterance.onerror = (event: SpeechSynthesisErrorEvent) => {
            if (this.currentUtterance === utterance) this.currentUtterance = null;
            this.isProcessingQueue = false; // Done with this item
            speakOptionsWithCallbacks.onError?.(event); // Calls reject()
            this.processQueue(); // Process next
        };

        console.log(`TTS Service: Dequeuing and speaking "${text.substring(0, 30)}...". Remaining: ${this.utteranceQueue.length}`);
        this.synthesis!.speak(utterance);

    } catch (error) { // Catch errors from the utterance setup itself (e.g. if speak fails immediately)
        console.error('TTS Service (Queue): Error in utterance setup or immediate speak call.', error);
        this.currentUtterance = null;
        this.isProcessingQueue = false; // Reset flag
        reject(error); // Reject the promise for this specific queued item
        this.processQueue(); // Attempt to process the next item in the queue
    }
  }

  /**
   * Cancels the currently speaking utterance and clears the entire queue.
   * Any promises associated with queued items will be rejected.
   * @public
   */
  public cancel(): void {
    if (!this.synthesis) return;

    // Reject all promises for items currently in the queue
    this.utteranceQueue.forEach((item) =>
      item.reject(new Error('TTS Canceled: Speech was canceled by a new request or explicit call.'))
    );
    this.utteranceQueue = []; // Clear the queue

    if (this.currentUtterance && this.synthesis.speaking) {
      console.log('TTS Service: Cancelling current browser speech.');
      // Detach onend/onerror from currentUtterance temporarily to prevent them from
      // calling resolve/reject on a promise that might belong to a `speak()` call
      // that is being superseded by this `cancel()`.
      // The promise for a `speak()` call will be rejected by the `speak()` method itself.
      // For queued items, their promises were already rejected above.
      if(this.currentUtterance) {
        this.currentUtterance.onend = null;
        this.currentUtterance.onerror = null;
      }
      this.synthesis.cancel(); // This will stop speech.
    }
    // Reset tracking variables
    this.currentUtterance = null;
    this.isProcessingQueue = false;
    console.log('TTS Service: All speech cancelled and queue cleared.');
  }

  /**
   * Pauses the currently speaking utterance, if any.
   * @public
   */
  public pause(): void {
    if (this.synthesis && this.synthesis.speaking && !this.synthesis.paused) {
      this.synthesis.pause();
      console.log('TTS Service: Speech paused.');
    }
  }

  /**
   * Resumes a paused utterance, if any.
   * @public
   */
  public resume(): void {
    if (this.synthesis && this.synthesis.paused) {
      this.synthesis.resume();
      console.log('TTS Service: Speech resumed.');
    }
  }

  /**
   * Checks if speech synthesis is currently active (either speaking or paused).
   * @public
   * @returns {boolean} True if speaking or paused, false otherwise.
   */
  public isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking || this.synthesis.paused : false;
  }

  /**
   * Checks if speech synthesis is currently paused.
   * @public
   * @returns {boolean} True if paused, false otherwise.
   */
  public isPaused(): boolean {
    return this.synthesis ? this.synthesis.paused : false;
  }
}

/**
 * Singleton instance of the TtsService.
 * Use this instance throughout the application to interact with TTS functionalities.
 * @example
 * import { ttsService } from './tts.service';
 * ttsService.speak("Hello");
 */
export const ttsService = new TtsService();
