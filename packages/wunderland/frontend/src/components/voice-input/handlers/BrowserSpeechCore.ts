// File: frontend/src/components/voice-input/handlers/browser/BrowserSpeechCore.ts
/**
 * @file BrowserSpeechCore.ts
 * @description Provides a robust, framework-agnostic core class for interacting with the browser's
 * Web Speech API (SpeechRecognition).
 *
 * @version 1.2.3
 * @updated 2025-06-05 - Fixed no-speech error handling to never be fatal
 * - No-speech is now treated as a normal condition, not an error
 * - Prevents unwanted stops and app crashes
 */

// --- Web Speech API Type Declarations ---
interface SpeechRecognitionErrorEventInit extends EventInit { error: string; message?: string; }
declare class SpeechRecognitionErrorEvent extends Event { constructor(type: string, eventInitDict: SpeechRecognitionErrorEventInit); readonly error: string; readonly message?: string; }
interface SpeechRecognitionAlternative { readonly transcript: string; readonly confidence: number; }
interface SpeechRecognitionResult extends ReadonlyArray<SpeechRecognitionAlternative> { readonly isFinal: boolean; }
interface SpeechRecognitionResultList extends ReadonlyArray<SpeechRecognitionResult> { readonly length: number; item(index: number): SpeechRecognitionResult; }
interface SpeechRecognitionEventInit extends EventInit { resultIndex?: number; results: SpeechRecognitionResultList; }
declare class SpeechRecognitionEvent extends Event { constructor(type: string, eventInitDict: SpeechRecognitionEventInit); readonly resultIndex?: number; readonly results: SpeechRecognitionResultList; readonly emma?: Document | null; readonly interpretation?: any; }
interface SpeechGrammar { src: string; weight?: number; }
interface SpeechGrammarList { readonly length: number; item(index: number): SpeechGrammar; addFromURI(src: string, weight?: number): void; addFromString(grammarString: string, weight?: number): void; }
interface SpeechRecognitionStatic { new (): SpeechRecognition; prototype: SpeechRecognition; }
interface SpeechRecognition extends EventTarget { 
  grammars: SpeechGrammarList; 
  lang: string; 
  continuous: boolean; 
  interimResults: boolean; 
  maxAlternatives: number; 
  serviceURI?: string; 
  start(): void; 
  stop(): void; 
  abort(): void; 
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onend: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null; 
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null; 
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null; 
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null; 
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null; 
}
// --- End of Web Speech API Type Declarations ---

export type RecognitionState =
  | 'idle' | 'starting' | 'listening' | 'processing' | 'stopping' | 'error';

export type RecognitionMode = 'single' | 'continuous' | 'vad-wake' | 'vad-command';

export interface BrowserSpeechEvents {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string, code: string, isFatal?: boolean) => void;
  onEnd?: (reason: string) => void;
  onAudioStart?: () => void;
  onAudioEnd?: () => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onNoMatch?: () => void;
}

export interface BrowserSpeechConfig {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export class BrowserSpeechCore {
  private recognition: SpeechRecognition | null = null;
  private currentState: RecognitionState = 'idle';
  private currentMode: RecognitionMode = 'single';
  private config: Required<BrowserSpeechConfig>;
  private readonly events: BrowserSpeechEvents;

  private startTime: number = 0;
  private lastResultTime: number = 0;
  private restartAttempts: number = 0;
  private readonly MAX_RESTART_ATTEMPTS: number = 5;
  private readonly WARM_UP_TIME_MS: number = 150;
  private readonly RESULT_TIMEOUT_MS: number = 15000;
  private resultTimeoutTimer: number | null = null;
  private readonly MIN_RESTART_DELAY_MS = 1000;
  private readonly MAX_RESTART_DELAY_MS = 3000;

  private readonly browserInfo: {
    name: string;
    version: string;
    isFirefox: boolean;
    isChrome: boolean;
    isSafari: boolean;
    hasWebSpeech: boolean;
    SpeechRecognitionAPI: SpeechRecognitionStatic | null;
  };

  constructor(initialConfig: BrowserSpeechConfig = {}, eventHandlers: BrowserSpeechEvents = {}) {
    this.config = {
      language: typeof navigator !== 'undefined' ? navigator.language || 'en-US' : 'en-US',
      continuous: false,
      interimResults: true,
      maxAlternatives: 1,
      ...initialConfig,
    };
    this.events = eventHandlers;
    this.browserInfo = this.detectBrowserAndAPI();

    if (!this.browserInfo.hasWebSpeech) {
      console.warn('[BrowserSpeechCore] Web Speech API is not supported by this browser or in the current context (e.g., HTTP page).');
    }
  }

  private detectBrowserAndAPI(): typeof BrowserSpeechCore.prototype.browserInfo {
    const info: typeof BrowserSpeechCore.prototype.browserInfo = {
      name: 'unknown', version: '', isFirefox: false, isChrome: false, isSafari: false,
      hasWebSpeech: false, SpeechRecognitionAPI: null,
    };
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      info.hasWebSpeech = false; return info;
    }
    const ua = navigator.userAgent.toLowerCase();
    info.isFirefox = ua.includes('firefox');
    info.isChrome = ua.includes('chrome') && !ua.includes('edg');
    info.isSafari = ua.includes('safari') && !ua.includes('chrome');
    if (info.isFirefox) info.name = 'Firefox';
    else if (info.isChrome) info.name = 'Chrome';
    else if (info.isSafari) info.name = 'Safari';
    else if (ua.includes('edg')) info.name = 'Edge';
    const Api = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || (window as any).mozSpeechRecognition || (window as any).msSpeechRecognition;
    if (typeof Api !== 'undefined' && Api !== null) {
      info.SpeechRecognitionAPI = Api as SpeechRecognitionStatic; info.hasWebSpeech = true;
    } else { info.hasWebSpeech = false; }
    console.log(`[BrowserSpeechCore] Browser: ${info.name}, Web Speech API available: ${info.hasWebSpeech}`);
    return info;
  }

  private createRecognitionInstance(): boolean {
    if (!this.browserInfo.hasWebSpeech || !this.browserInfo.SpeechRecognitionAPI) {
      this.handleErrorInternal('api-not-available', 'Web Speech API not supported in this browser or context.', true);
      return false;
    }
    try {
      this.recognition = new this.browserInfo.SpeechRecognitionAPI();
      this.recognition.lang = this.config.language;
      this.recognition.continuous = this.config.continuous;
      this.recognition.interimResults = this.config.interimResults;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
      this.attachEventHandlers();
      return true;
    } catch (e: any) {
      this.handleErrorInternal('init-failed', `Failed to create SpeechRecognition instance: ${e.message || e}`, true);
      return false;
    }
  }

  private attachEventHandlers(): void {
    if (!this.recognition) return;
    this.recognition.onstart = this.handleRecognitionStart.bind(this);
    this.recognition.onresult = this.handleRecognitionResult.bind(this);
    this.recognition.onerror = this.handleRecognitionErrorEvent.bind(this);
    this.recognition.onend = this.handleRecognitionEnd.bind(this);
    this.recognition.onaudiostart = () => { this.events.onAudioStart?.(); };
    this.recognition.onaudioend = () => { this.events.onAudioEnd?.(); };
    this.recognition.onspeechstart = () => { this.events.onSpeechStart?.(); };
    this.recognition.onspeechend = () => { this.events.onSpeechEnd?.(); };
    this.recognition.onnomatch = () => { this.events.onNoMatch?.(); };
  }

  private handleRecognitionStart(): void {
    this.currentState = 'listening';
    this.startTime = Date.now();
    this.lastResultTime = Date.now();
    this.clearResultTimeoutTimer();
    if (this.recognition?.continuous) {
      this.startResultTimeoutMonitor();
    }
    this.events.onStart?.();
  }

  private handleRecognitionResult(event: SpeechRecognitionEvent): void {
    this.lastResultTime = Date.now();
    if (this.recognition?.continuous) {
      this.resetResultTimeoutMonitor();
    }
    let finalTranscript = ''; 
    let interimTranscript = '';
    const resultIndex = event.resultIndex || 0;
    for (let i = resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      if (result.isFinal) finalTranscript += result[0].transcript;
      else interimTranscript += result[0].transcript;
    }
    if (Date.now() - this.startTime < this.WARM_UP_TIME_MS && !finalTranscript.trim()) {
      if (interimTranscript.trim() && this.config.interimResults) this.events.onResult?.(interimTranscript.trim(), false);
      return;
    }
    if (interimTranscript.trim() && this.config.interimResults) this.events.onResult?.(interimTranscript.trim(), false);
    if (finalTranscript.trim()) this.events.onResult?.(finalTranscript.trim(), true);
  }

  private handleRecognitionErrorEvent(event: SpeechRecognitionErrorEvent): void {
    const errorType = event.error;
    const errorMessage = event.message || this.getErrorMessageFriendly(errorType);
    console.log(`[BrowserSpeechCore] Recognition event: ${errorType} - "${errorMessage}" (Mode: ${this.currentMode})`);
    
    const previousState = this.currentState;
    this.currentState = 'error';
    this.clearResultTimeoutTimer();
    
    let isFatal = false;
    
    switch (errorType) {
      case 'no-speech':
        // CRITICAL FIX: Never treat no-speech as fatal - it's a completely normal condition
        isFatal = false;
        
        // Log for debugging but don't treat as error
        console.log(`[BrowserSpeechCore] No speech detected in mode '${this.currentMode}' - this is normal`);
        
        // For VAD wake mode, don't even emit as an error - just silently ignore
        if (this.currentMode === 'vad-wake') {
          console.log('[BrowserSpeechCore] No-speech in VAD wake mode - continuing to listen');
          // Reset state back to listening since this isn't really an error
          this.currentState = 'listening';
          return; // Don't emit any error event
        }
        
        // For other modes, emit as non-fatal info only
        this.events.onError?.(errorMessage, errorType, false);
        break;
        
      case 'aborted':
        if (previousState !== 'stopping') {
          this.events.onError?.(errorMessage, errorType, false);
        } else {
          console.log('[BrowserSpeechCore] Recognition aborted by explicit stop/abort call.');
        }
        break;
        
      case 'audio-capture':
        isFatal = true;
        this.events.onError?.('Microphone not available or disconnected.', errorType, isFatal);
        break;
        
      case 'not-allowed':
      case 'service-not-allowed':
        isFatal = true;
        this.events.onError?.('Microphone permission denied or speech service blocked.', errorType, isFatal);
        break;
        
      case 'network':
        isFatal = true;
        this.events.onError?.('Network error during speech recognition.', errorType, isFatal);
        break;
        
      default:
        this.events.onError?.(errorMessage, errorType, false);
    }
  }

  private handleRecognitionEnd(): void {
    console.log(`[BrowserSpeechCore] Event: onend. State before 'onend': ${this.currentState}.`);
    this.clearResultTimeoutTimer();
    let reason = 'normal_end';
    if (this.currentState === 'stopping') reason = 'stopped_by_user';
    else if (this.currentState === 'error') reason = 'error_occurred';
    else if (this.currentState === 'listening' && this.recognition?.continuous) {
      reason = 'unexpected_continuous_end';
      console.warn('[BrowserSpeechCore] Continuous mode ended unexpectedly.');
    }
    const previousStateBeforeEnd = this.currentState;
    this.currentState = 'idle';
    this.events.onEnd?.(reason);

    // Auto-restart logic for continuous modes
    if (this.recognition?.continuous && previousStateBeforeEnd !== 'stopping') {
      if (reason === 'unexpected_continuous_end' || (reason === 'error_occurred' && this.shouldAttemptRestartAfterError(previousStateBeforeEnd))) {
        if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
          this.restartAttempts++;
          const restartDelay = Math.min(this.MIN_RESTART_DELAY_MS + (this.restartAttempts * 300), this.MAX_RESTART_DELAY_MS) + Math.random() * 200;
          console.log(`[BrowserSpeechCore] Attempting auto-restart #${this.restartAttempts} for mode '${this.currentMode}' (reason: ${reason}) with delay ${Math.round(restartDelay)}ms.`);
          setTimeout(() => {
            if(this.currentState === 'idle' && this.recognition?.continuous) {
              this.start(this.currentMode);
            } else {
              console.log(`[BrowserSpeechCore] Restart for mode '${this.currentMode}' aborted, state changed or not continuous anymore.`);
            }
          }, restartDelay);
        } else {
          console.error(`[BrowserSpeechCore] Max restart attempts (${this.MAX_RESTART_ATTEMPTS}) reached for mode '${this.currentMode}'. Stopping auto-restarts.`);
          this.events.onError?.('Continuous recognition failed after multiple restarts and will not be auto-restarted.', 'max_restarts_exceeded', true);
        }
      } else if (reason !== 'error_occurred') {
        this.restartAttempts = 0;
      }
    } else {
      this.restartAttempts = 0;
    }
  }

  private shouldAttemptRestartAfterError(stateBeforeError: RecognitionState): boolean {
    // Always attempt restart for continuous modes unless explicitly stopped
    return stateBeforeError === 'listening' || stateBeforeError === 'starting';
  }

  private getErrorMessageFriendly(error: string): string {
    const messages: Record<string, string> = {
      'no-speech': 'No speech was detected. Please try speaking again.',
      'aborted': 'Speech recognition was aborted by the system or user.',
      'audio-capture': 'Audio capture failed. Please check your microphone connection and permissions.',
      'not-allowed': 'Permission for speech recognition was denied. Please enable microphone access in your browser settings.',
      'service-not-allowed': 'The speech recognition service is not allowed, possibly due to browser security settings or private mode (e.g. Firefox requires enabling).',
      'network': 'A network error occurred while contacting the speech recognition service.',
      'bad-grammar': 'There was an error in the speech recognition grammar specified.',
      'language-not-supported': 'The specified language is not supported by the speech recognition service.',
    };
    return messages[error] || `An unknown speech error occurred: ${error}`;
  }

  private handleErrorInternal(code: string, message: string, isFatal: boolean = true): void {
    console.error(`[BrowserSpeechCore] Internal Error - Code: ${code}, Message: "${message}", Fatal: ${isFatal}`);
    this.currentState = 'error';
    this.clearResultTimeoutTimer();
    this.events.onError?.(message, code, isFatal);
  }

  public async start(mode: RecognitionMode = 'single'): Promise<boolean> {
    if (this.currentState !== 'idle' && this.currentState !== 'error') {
      console.warn(`[BrowserSpeechCore] Start called but current state is ${this.currentState}. Aborting start.`);
      return false;
    }
    if (!this.browserInfo.hasWebSpeech) {
      this.handleErrorInternal('api-not-available', 'Web Speech API is not available in this browser or context.', true);
      return false;
    }
    this.currentMode = mode;

    const isContinuousOperation = (this.currentMode === 'continuous' || this.currentMode === 'vad-wake');
    const useInterimResults = (this.currentMode !== 'vad-wake');

    if (!this.recognition || this.currentState === 'error') {
      if (!this.createRecognitionInstance()) return false;
    }
    
    if (this.recognition) {
      this.recognition.continuous = isContinuousOperation;
      this.recognition.interimResults = useInterimResults;
      this.recognition.lang = this.config.language;
      this.recognition.maxAlternatives = this.config.maxAlternatives;
      console.log(`[BrowserSpeechCore] Configuring recognition for mode '${mode}': continuous=${isContinuousOperation}, interim=${useInterimResults}`);
    } else {
      console.error("[BrowserSpeechCore] Recognition instance is null before start, shouldn't happen.");
      return false;
    }

    this.currentState = 'starting';
    try {
      this.recognition.start();
      return true;
    } catch (e: any) {
      if (e.name === 'InvalidStateError') {
        console.warn('[BrowserSpeechCore] InvalidStateError on start. Aborting.');
        try { this.recognition.abort(); } catch (abortErr) { /* ignore */ }
        this.handleErrorInternal('start-failed-invalid-state', `Failed to start (InvalidStateError). Error: ${e.message}`, false);
      } else {
        this.handleErrorInternal('start-failed', `Failed to start recognition: ${e.message || e}`, true);
      }
      return false;
    }
  }

  public stop(abort: boolean = false): void {
    if (this.currentState === 'idle' || this.currentState === 'stopping' || !this.recognition) return;
    this.currentState = 'stopping';
    this.clearResultTimeoutTimer();
    try { 
      if (abort) this.recognition.abort(); 
      else this.recognition.stop(); 
    }
    catch (e: any) { 
      this.currentState = 'idle'; 
      this.events.onEnd?.('forced_stop_error'); 
    }
  }

  private startResultTimeoutMonitor(): void {
    this.clearResultTimeoutTimer();
    if (!this.recognition?.continuous) return;
    this.resultTimeoutTimer = window.setTimeout(() => {
      if (this.currentState === 'listening') {
        console.warn(`[BrowserSpeechCore] Continuous mode result timeout (${this.RESULT_TIMEOUT_MS}ms). Forcing stop.`);
        this.handleErrorInternal('continuous_timeout', `Continuous recognition timed out after ${this.RESULT_TIMEOUT_MS}ms without results.`, false);
        if (this.recognition) { 
          try { this.recognition.abort(); } catch(e){ /*ignore*/ } 
        }
      }
    }, this.RESULT_TIMEOUT_MS);
  }

  private resetResultTimeoutMonitor(): void {
    this.clearResultTimeoutTimer();
    if (this.recognition?.continuous && this.currentState === 'listening') {
      this.startResultTimeoutMonitor();
    }
  }

  private clearResultTimeoutTimer(): void {
    if (this.resultTimeoutTimer) { 
      clearTimeout(this.resultTimeoutTimer); 
      this.resultTimeoutTimer = null; 
    }
  }

  public updateConfig(newConfig: Partial<BrowserSpeechConfig>): void {
    const oldLang = this.config.language;
    this.config = { ...this.config, ...newConfig };
    if (this.recognition) {
      if (newConfig.language && newConfig.language !== oldLang && (this.currentState === 'idle' || this.currentState === 'error')) {
        this.destroyRecognitionInstance();
      } else if (this.recognition && (this.currentState === 'idle' || this.currentState === 'error')) {
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = this.config.maxAlternatives;
      } else if (this.currentState === 'listening' || this.currentState === 'starting'){
        console.warn('[BrowserSpeechCore] Config update while active. Some changes (like lang) may need a full restart (stop/start).');
        if (newConfig.maxAlternatives !== undefined) this.recognition.maxAlternatives = newConfig.maxAlternatives;
      }
    }
  }

  public getState(): RecognitionState { return this.currentState; }
  public getBrowserInfo(): Readonly<typeof BrowserSpeechCore.prototype.browserInfo> { return this.browserInfo; }
  public isSupported(): boolean { return this.browserInfo.hasWebSpeech; }

  private destroyRecognitionInstance(): void {
    if (this.recognition) {
      this.recognition.onstart = null; 
      this.recognition.onresult = null;
      this.recognition.onerror = null; 
      this.recognition.onend = null;
      this.recognition.onaudiostart = null; 
      this.recognition.onaudioend = null;
      this.recognition.onspeechstart = null; 
      this.recognition.onspeechend = null;
      this.recognition.onnomatch = null;
      try { 
        if (this.currentState !== 'idle' && this.currentState !== 'stopping') {
          this.recognition.abort(); 
        }
      }
      catch(e) { /* ignore */ }
      this.recognition = null;
    }
  }

  public destroy(): void {
    this.clearResultTimeoutTimer();
    this.destroyRecognitionInstance();
    this.currentState = 'idle';
    this.restartAttempts = 0;
    console.log('[BrowserSpeechCore] Instance destroyed.');
  }
}