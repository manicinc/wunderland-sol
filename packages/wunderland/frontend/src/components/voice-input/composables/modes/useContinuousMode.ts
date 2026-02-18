// File: frontend/src/components/voice-input/composables/modes/useContinuousMode.ts
/**
 * @file useContinuousMode.ts
 * @description Continuous listening mode implementation.
 * This mode starts listening upon activation and automatically sends transcripts
 * based on speech pauses or segment limits.
 *
 * @version 1.3.0
 * @updated 2025-06-05
 * - Integrated `isExplicitlyStoppedByUser` from context.
 * - Refined start/stop logic and state management (`isStarting`, `isListeningInternally`).
 * - Ensured interim transcripts replace content correctly.
 * - Improved timer management and clarity.
 */

import { ref, computed } from 'vue';
import type { ComputedRef } from 'vue';
import { BaseSttMode, type SttModeContext, type SttModePublicState } from './BaseSttMode';
import type { SttHandlerErrorPayload } from '../../types';
import { createScopedSttLogger } from '@/utils/debug';

// Constants for timing
const CONTINUOUS_MODE_START_DELAY_MS = 200; // Slightly reduced delay, manager provides some buffer too
const MIN_TRANSCRIPT_LENGTH_FOR_FINAL_SEND = 2;

/**
 * @class ContinuousMode
 * @extends BaseSttMode
 * @implements SttModePublicState
 * @description Implements the continuous speech-to-text listening mode.
 */
export class ContinuousMode extends BaseSttMode implements SttModePublicState {
  private readonly debugLog = createScopedSttLogger('ContinuousMode');
  private currentTranscriptSegment = ref(''); // Stores the current, potentially partial, segment from the handler
  private isListeningInternally = ref(false); // True when STT handler is actively capturing audio for this mode
  private autoSendTimerId: number | null = null; // Timer for sending after a pause
  private countdownTimerId: number | null = null; // Timer for the countdown display
  private countdownValueMs = ref(0); // Current countdown value in milliseconds
  private startDelayTimerId: number | null = null; // Timer for delaying the actual start
  private isStartingProcess = ref(false); // True during the start-up phase (including delay)

  public readonly isActive: ComputedRef<boolean>;
  public readonly canStart: ComputedRef<boolean>;
  public readonly statusText: ComputedRef<string>;
  public readonly placeholderText: ComputedRef<string>;
  public readonly requiresHandler: boolean = true;

  constructor(context: SttModeContext) {
    super(context);

    this.isActive = computed(() => this.isListeningInternally.value || this.countdownValueMs.value > 0 || this.isStartingProcess.value);
    this.canStart = computed(() => {
        const blocked = this.isBlocked();
        const active = this.isActive.value;
        const canStartResult = !active && !blocked;
        this.debugLog('[ContinuousMode] canStart computed:', canStartResult, 'active:', active, 'blocked:', blocked);
        return canStartResult;
    });

    this.statusText = computed(() => {
      if (this.context.isExplicitlyStoppedByUser.value && !this.isActive.value) return 'Continuous: Off';
      if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value && !this.isActive.value) return 'Continuous: Assistant busy';
      if (!this.context.micPermissionGranted.value && !this.isActive.value) return 'Continuous: Mic needed';
      if (this.isStartingProcess.value) return 'Continuous: Starting...';
      if (this.countdownValueMs.value > 0) {
        return `Continuous: Sending in ${Math.ceil(this.countdownValueMs.value / 1000)}s...`;
      }
      return this.isListeningInternally.value ? 'Continuous: Listening...' : 'Continuous: Ready';
    });

    this.placeholderText = computed(() => {
      const t = this.context.t;
      if (this.context.isExplicitlyStoppedByUser.value && !this.isActive.value) return t('voice.continuousModeOff');
      if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value && !this.isActive.value) return t('voice.assistantProcessing');
      if (!this.context.micPermissionGranted.value && !this.isActive.value) return t('voice.microphonePermissionRequiredContinuous');
      if (this.isStartingProcess.value) return t('voice.initializingContinuous');
      return this.isListeningInternally.value
        ? t('voice.continuousListeningActive')
        : t('voice.continuousModeReady');
    });
  }

  private get autoSendEnabled(): boolean {
    return this.context.settings.value.continuousModeAutoSend ?? true;
  }

  private get pauseTimeoutMs(): number {
    return this.context.settings.value.continuousModePauseTimeoutMs ?? 2500;
  }

  private get sendDelayMs(): number {
    return this.context.settings.value.continuousModeSilenceSendDelayMs ?? 1000;
  }

  async start(): Promise<boolean> {
    if (!this.canStart.value) {
      console.warn('[ContinuousMode] Cannot start - conditions not met.', { canStart: this.canStart.value, isBlocked: this.isBlocked() });
      // Toasts are handled by SttManager based on canStart conditions generally
      return false;
    }

    this.debugLog('[ContinuousMode] Starting continuous mode sequence...');
    this.clearAllTimers();
    this.currentTranscriptSegment.value = '';
    this.context.sharedState.pendingTranscript.value = '';
    this.isStartingProcess.value = true;
    this.context.setExplicitlyStoppedByUser(false); // Clear explicit stop flag on start attempt
    this.context.sharedState.isProcessingAudio.value = true; // Indicate intent to process

    return new Promise<boolean>((resolve) => {
      this.startDelayTimerId = window.setTimeout(async () => {
        this.startDelayTimerId = null;
        
        if (this.isBlocked() || this.context.audioMode.value !== 'continuous') { // Re-check conditions
          this.debugLog('[ContinuousMode] Conditions changed during start delay, aborting start.');
          this.isStartingProcess.value = false;
          this.context.sharedState.isProcessingAudio.value = false;
          resolve(false);
          return;
        }

        try {
          if (!this.context.activeHandlerApi.value) {
            console.error('[ContinuousMode] No active STT handler available.');
            await this.resetStateOnError('No speech recognition handler available.');
            resolve(false);
            return;
          }
          const handlerStarted = await this.context.activeHandlerApi.value.startListening(false); // false = not for VAD command
          if (handlerStarted) {
            this.isListeningInternally.value = true;
            this.isStartingProcess.value = false; // Starting process finished, now listening
            this.debugLog('[ContinuousMode] STT handler started successfully.');
            this.context.transcriptionDisplay.showListening();
            resolve(true);
          } else {
            console.error('[ContinuousMode] Failed to start STT handler.');
            await this.resetStateOnError('Failed to start continuous STT.');
            resolve(false);
          }
        } catch (error: any) {
          await this.resetStateOnError(error.message || 'Error during STT handler start.');
          this.handleError(error); // Propagate error
          resolve(false);
        }
      }, CONTINUOUS_MODE_START_DELAY_MS);
    });
  }

  async stop(): Promise<void> {
    this.debugLog('[ContinuousMode] stop() called. States:', {
      isListeningInternally: this.isListeningInternally.value,
      autoSendTimerId: !!this.autoSendTimerId,
      countdownTimerId: !!this.countdownTimerId,
      isStartingProcess: this.isStartingProcess.value,
      isExplicitlyStoppedByUser: this.context.isExplicitlyStoppedByUser.value
    });

    // Only proceed if there's something to stop (active listening, countdown, or starting process)
    if (!this.isListeningInternally.value && !this.autoSendTimerId && !this.countdownTimerId && !this.isStartingProcess.value) {
      // If explicitly stopped by user, ensure shared state is accurate even if already "idle" locally
      if(this.context.isExplicitlyStoppedByUser.value) {
         this.context.sharedState.isProcessingAudio.value = false;
      }
      this.debugLog('[ContinuousMode] Nothing to stop, returning early');
      return;
    }
    this.debugLog('[ContinuousMode] Stopping continuous listening...');
    // isExplicitlyStoppedByUser is set by SttManager on mic click

    this.clearAllTimers(); // Clear all mode-specific timers
    
    const wasListening = this.isListeningInternally.value;
    this.isListeningInternally.value = false;
    this.isStartingProcess.value = false;
    this.context.sharedState.isProcessingAudio.value = false; // Reflect that we are stopping

    try {
      if (this.context.activeHandlerApi.value?.isActive.value) { // Check if handler thinks it's active
        await this.context.activeHandlerApi.value.stopListening(false); // false = not an abort, but a graceful stop
      }

      if (this.autoSendEnabled && this.currentTranscriptSegment.value.trim().length >= MIN_TRANSCRIPT_LENGTH_FOR_FINAL_SEND) {
        this.debugLog('[ContinuousMode] Sending buffered transcript on stop.');
        this.sendCurrentTranscriptSegment(); // This clears the buffer
      } else {
        this.currentTranscriptSegment.value = ''; // Clear buffer if not sending
        this.context.sharedState.pendingTranscript.value = '';
      }
      this.context.transcriptionDisplay.clearTranscription();
    } catch (error: any) {
      this.handleError(error); // Handle potential errors during stop
    } finally {
      this.debugLog('[ContinuousMode] Continuous listening stopped.');
    }
  }

  handleTranscription(text: string): void { // This is for FINAL transcripts from the handler
    if (!this.isListeningInternally.value && !(this.autoSendEnabled && this.countdownValueMs.value > 0)) {
        this.debugLog('[ContinuousMode] Received final transcript while not actively listening or counting down, ignoring:', text);
        return;
    }
    const trimmedText = text.trim();
    this.debugLog(`[ContinuousMode] Final segment received: "${trimmedText}"`);
    
    this.clearAllTimers(); // Stop any pending auto-send or countdown as we got a final segment

    if (trimmedText.length >= MIN_TRANSCRIPT_LENGTH_FOR_FINAL_SEND) {
      this.currentTranscriptSegment.value = trimmedText; // Handler provides complete final segments
      this.context.sharedState.pendingTranscript.value = this.currentTranscriptSegment.value;
      this.context.transcriptionDisplay.showInterimTranscript(this.currentTranscriptSegment.value); // Show it as "final" for this segment
      this.sendCurrentTranscriptSegment(); // Immediately send this final segment
    } else {
      this.currentTranscriptSegment.value = ''; // Discard short/empty final segment
      this.context.sharedState.pendingTranscript.value = '';
    }
    
    // If still supposed to be listening (e.g., user hasn't stopped), restart auto-send timer for next utterance
    if (this.isListeningInternally.value && this.autoSendEnabled) {
      this.resetAutoSendTimer();
    }
  }

  public handleUserDismissedTranscript(): void {
    this.debugLog('[ContinuousMode] User dismissed transcript confirmation; resetting state.');
    this.clearAllTimers();
    this.currentTranscriptSegment.value = '';
    this.context.sharedState.pendingTranscript.value = '';
    this.context.transcriptionDisplay.clearTranscription();

    if (this.isListeningInternally.value) {
      if (this.autoSendEnabled) {
        this.resetAutoSendTimer();
      }
      return;
    }

    if (!this.context.isExplicitlyStoppedByUser.value && this.canStart.value) {
      void this.start().catch((error) => {
        console.warn('[ContinuousMode] Failed to restart after dismissal:', error);
      });
    }
  }

  public handleInterimTranscript(text: string): void {
    if (!this.isListeningInternally.value) return; // Only process interim if actively listening
    
    const trimmedText = text.trim();
    // For continuous mode, interim transcripts from BrowserSpeechHandler usually represent the full current utterance.
    this.currentTranscriptSegment.value = trimmedText; 
    this.context.sharedState.pendingTranscript.value = this.currentTranscriptSegment.value;
    this.context.transcriptionDisplay.showInterimTranscript(this.currentTranscriptSegment.value);
    
    if (this.autoSendEnabled) {
      this.resetAutoSendTimer(); // Reset timer on any new speech activity
    }
  }

  private resetAutoSendTimer(): void {
    this.clearCountdownTimer(); // Clear countdown if it was running
    if (this.autoSendTimerId) clearTimeout(this.autoSendTimerId);
    this.autoSendTimerId = null;

    if (!this.autoSendEnabled || !this.isListeningInternally.value) return;
    
    // Only start pause timer if there's actually something in the buffer
    if (this.currentTranscriptSegment.value.trim().length > 0) {
      this.autoSendTimerId = window.setTimeout(() => {
        this.debugLog('[ContinuousMode] Pause detected, starting send countdown.');
        this.startSendCountdown();
      }, this.pauseTimeoutMs);
    }
  }

  private startSendCountdown(): void {
    this.clearAutoSendTimer(); // Stop the pause detection timer
    if (this.countdownTimerId) clearInterval(this.countdownTimerId); // Clear existing countdown
    
    const transcriptToSend = this.currentTranscriptSegment.value.trim();
    if (!transcriptToSend || !this.autoSendEnabled) {
      this.countdownValueMs.value = 0;
      return;
    }

    this.countdownValueMs.value = this.sendDelayMs;
    const countdownInterval = 100; // Update display every 100ms

    this.countdownTimerId = window.setInterval(() => {
      this.countdownValueMs.value -= countdownInterval;
      if (this.countdownValueMs.value <= 0) {
        this.clearCountdownTimer();
        if (this.currentTranscriptSegment.value.trim().length >= MIN_TRANSCRIPT_LENGTH_FOR_FINAL_SEND) {
          this.sendCurrentTranscriptSegment();
        } else {
          this.debugLog('[ContinuousMode] Countdown finished, but transcript too short. Discarding.');
          this.currentTranscriptSegment.value = '';
          this.context.sharedState.pendingTranscript.value = '';
        }
        // If still supposed to be listening, prepare for next utterance
        if (this.isListeningInternally.value && this.autoSendEnabled) {
          this.resetAutoSendTimer();
        }
      }
    }, countdownInterval);
  }

  private sendCurrentTranscriptSegment(): void {
    const transcriptToSend = this.currentTranscriptSegment.value.trim();
    if (transcriptToSend.length < MIN_TRANSCRIPT_LENGTH_FOR_FINAL_SEND) {
        this.debugLog(`[ContinuousMode] Transcript "${transcriptToSend}" too short to send.`);
        return;
    }
    
    this.debugLog(`[ContinuousMode] Sending transcript segment: "${transcriptToSend}"`);
    this.emitTranscription(transcriptToSend); // BaseSttMode handles emit and display
    
    this.currentTranscriptSegment.value = ''; // Clear buffer after sending
    this.context.sharedState.pendingTranscript.value = ''; // Clear pending display
    this.countdownValueMs.value = 0; // Reset countdown display value
    this.clearAllTimers(); // Clear timers after send
    
    // If mode is still active and auto-send is on, prime for next input
    if (this.isListeningInternally.value && this.autoSendEnabled) {
        this.resetAutoSendTimer();
    }
    this.context.playSound(this.context.audioFeedback.beepOutSound.value, 0.5);
  }

  private clearAutoSendTimer(): void {
    if (this.autoSendTimerId) clearTimeout(this.autoSendTimerId);
    this.autoSendTimerId = null;
  }

  private clearCountdownTimer(): void {
    if (this.countdownTimerId) clearInterval(this.countdownTimerId);
    this.countdownTimerId = null;
    this.countdownValueMs.value = 0;
  }
  
  private clearStartDelayTimer(): void {
    if (this.startDelayTimerId) clearTimeout(this.startDelayTimerId);
    this.startDelayTimerId = null;
  }

  private clearAllTimers(): void {
    this.clearAutoSendTimer();
    this.clearCountdownTimer();
    this.clearStartDelayTimer();
  }
  
  private async resetStateOnError(errorMessage?: string): Promise<void> {
    this.clearAllTimers();
    this.isListeningInternally.value = false;
    this.isStartingProcess.value = false;
    this.currentTranscriptSegment.value = '';
    this.context.sharedState.pendingTranscript.value = '';
    this.context.sharedState.isProcessingAudio.value = false;
    if (errorMessage) {
        this.context.transcriptionDisplay.showError(errorMessage, 3000);
    }
  }

  handleError(error: Error | SttHandlerErrorPayload): void {
    const errorPayload = ('type' in error && 'message' in error) ? error : {
        type: 'continuous_mode_error', message: error.message || 'Error in continuous mode.',
        code: (error as any).code || (error as Error).name, fatal: false,
    } as SttHandlerErrorPayload;

    console.error('[ContinuousMode] Error:', errorPayload.message, `(Code: ${errorPayload.code || 'N/A'})`);
    this.resetStateOnError(); // Reset internal state on error

    // Avoid showing generic "no-speech" or "aborted" errors if not fatal or part of normal flow
    if (errorPayload.code !== 'no-speech' && 
        !(errorPayload.code === 'aborted' && (this.context.isExplicitlyStoppedByUser.value || errorPayload.message.includes('transitioning states'))) &&
        !errorPayload.message.includes('aborted by the user')) {
        this.context.transcriptionDisplay.showError(errorPayload.message, 3000);
    }
    this.context.emit('voice-input-error', errorPayload);
  }

  cleanup(): void {
    this.debugLog('[ContinuousMode] Cleanup initiated.');
    this.clearAllTimers();
    this.currentTranscriptSegment.value = '';
    this.context.sharedState.pendingTranscript.value = '';
    this.isListeningInternally.value = false;
    this.isStartingProcess.value = false;
    this.context.sharedState.isProcessingAudio.value = false;
    // No need to setExplicitlyStoppedByUser here, manager handles that context on overall cleanup
    this.context.transcriptionDisplay.clearTranscription();
    this.debugLog('[ContinuousMode] Cleanup complete.');
  }
}

export function useContinuousMode(context: SttModeContext): ContinuousMode {
  return new ContinuousMode(context);
}

