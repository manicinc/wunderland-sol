// File: frontend/src/components/voice-input/composables/modes/useVadMode.ts
/**
 * @file useVadMode.ts
 * @description Voice Activation Detection (VAD) mode implementation.
 * This mode listens for a wake word, then captures a command.
 *
 * @version 1.4.1
 * @updated 2025-06-05
 * - Corrected `isBlocked` method visibility to protected.
 * - Removed unused `readonly` import.
 * - Addressed `showVadTimeout` argument mismatch (assuming no arguments for now).
 * - Ensured SttModeContext properties are correctly accessed.
 */

import { ref, computed } from 'vue'; // Removed unused 'readonly' import
import type { ComputedRef } from 'vue';
import { BaseSttMode, type SttModeContext, type SttModePublicState } from './BaseSttMode';
import type { SttHandlerErrorPayload } from '../../types';

type VadPhase = 'idle' | 'listening-wake' | 'capturing-command' | 'transitioning';

export class VadMode extends BaseSttMode implements SttModePublicState {
  private phase = ref<VadPhase>('idle');
  private commandTranscriptBuffer = ref('');
  private returnToWakeTimer: number | null = null;

  public readonly isActive: ComputedRef<boolean>;
  public readonly canStart: ComputedRef<boolean>;
  public readonly statusText: ComputedRef<string>;
  public readonly placeholderText: ComputedRef<string>;
  public readonly requiresHandler: boolean = true;

  constructor(context: SttModeContext) {
    super(context);

    const primaryWakeWord = computed(() => (this.context.settings.value.vadWakeWordsBrowserSTT?.[0] || 'Hey V').toUpperCase());

    this.isActive = computed(() => this.phase.value !== 'idle');
    this.canStart = computed(() =>
        this.phase.value === 'idle' &&
        !this.isBlocked() // Use the inherited isBlocked which now checks isExplicitlyStoppedByUser
    );
    this.statusText = computed(() => {
      if (this.context.isExplicitlyStoppedByUser.value && this.phase.value === 'idle') return 'VAD: Off';
      if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value && this.phase.value === 'idle') return 'VAD: Assistant busy';
      if (!this.context.micPermissionGranted.value && this.phase.value === 'idle') return 'VAD: Mic needed';
      switch (this.phase.value) {
        case 'transitioning': return 'VAD: Initializing...';
        case 'listening-wake': return `VAD: Listening for "${primaryWakeWord.value}"`;
        case 'capturing-command': return 'VAD: Listening for command...';
        default: return `VAD: Say "${primaryWakeWord.value}"`;
      }
    });
    this.placeholderText = computed(() => {
      const t = this.context.t;
      if (this.context.isExplicitlyStoppedByUser.value && this.phase.value === 'idle') return t('voice.vadOff');
      if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value && this.phase.value === 'idle') return t('voice.assistantProcessing');
      if (!this.context.micPermissionGranted.value && this.phase.value === 'idle') return t('voice.microphonePermissionRequiredVAD');
      switch (this.phase.value) {
        case 'transitioning': return t('voice.vadPreparing');
        case 'listening-wake': return t('voice.sayToActivate', { wakeWord: primaryWakeWord.value });
        case 'capturing-command': return t('voice.listeningForCommand');
        default: return t('voice.vadSayOrType', { wakeWord: primaryWakeWord.value });
      }
    });
  }

  private get wakeWords(): readonly string[] {
    return this.context.settings.value.vadWakeWordsBrowserSTT || ['hey v', 'victoria'];
  }

  /**
   * @override
   * @description Checks specific VAD mode blocking conditions in addition to base conditions.
   * @returns {boolean} True if VAD mode is blocked.
   */
  protected isBlocked(): boolean {
    if (super.isBlocked()) return true; // Check base conditions first (includes isExplicitlyStoppedByUser)
    // Add any VAD-specific blocking conditions here if necessary
    return false;
  }


  async start(): Promise<boolean> {
    console.log(`[VadMode] start() called. Phase: ${this.phase.value}, canStart: ${this.canStart.value}, explicitlyStopped: ${this.context.isExplicitlyStoppedByUser.value}`);
    if (!this.canStart.value) {
      console.warn('[VadMode] Cannot start VAD mode - conditions not met.', {
        canStart: this.canStart.value, phase: this.phase.value, isBlocked: this.isBlocked()
      });
      // Specific toasts are good, leveraging isBlocked logic
      if (this.context.isExplicitlyStoppedByUser.value) {
         this.context.toast?.add({ type: 'info', title: 'VAD Off', message: 'Voice input was manually turned off.' });
      } else if (this.context.isProcessingLLM.value && !this.context.isAwaitingVadCommandResult.value) {
          this.context.toast?.add({ type: 'info', title: 'Assistant Busy', message: 'Cannot start VAD now.' });
      } else if (!this.context.micPermissionGranted.value) {
          this.context.toast?.add({ type: 'error', title: 'Microphone Access', message: 'VAD mode requires microphone permission.' });
      } else if (this.requiresHandler && !this.context.activeHandlerApi.value) {
        this.context.toast?.add({ type: 'error', title: 'STT Error', message: 'Speech handler not available for VAD.' });
      }
      return false;
    }
    
    this.clearTimers();
    this.context.setExplicitlyStoppedByUser(false);
    this.phase.value = 'transitioning';
    this.commandTranscriptBuffer.value = '';
    
    this.context.sharedState.isListeningForWakeWord.value = true; 
    this.context.sharedState.isProcessingAudio.value = true; 

    try {
      if (!this.context.activeHandlerApi.value) {
        console.error('[VadMode] No active STT handler available.');
        await this.resetToIdleState('No speech recognition handler available.', true);
        return false;
      }

      if (this.context.activeHandlerApi.value.isActive.value || this.context.activeHandlerApi.value.isListeningForWakeWord.value) {
        await this.context.activeHandlerApi.value.stopListening(true);
        await new Promise(r => setTimeout(r, 100));
      }

      const handlerStarted = await this.context.activeHandlerApi.value.startListening(false);
      if (handlerStarted) {
        this.phase.value = 'listening-wake';
        this.context.transcriptionDisplay.showInterimTranscript(`Listening for "${this.wakeWords[0]}"...`);
        console.log('[VadMode] Started successfully. Phase: listening-wake.');
        console.log(`[VadMode] After start - isActive: ${this.isActive.value}, phase: ${this.phase.value}, explicitlyStopped: ${this.context.isExplicitlyStoppedByUser.value}`);
        return true;
      } else {
        await this.resetToIdleState('STT handler failed to start for wake word.', true);
        return false;
      }
    } catch (error: any) {
      this.handleError(error);
      return false;
    }
  }

  async stop(): Promise<void> {
    if (this.phase.value === 'idle' && !this.context.isExplicitlyStoppedByUser.value) {
      console.log('[VadMode] Already idle and not explicitly stopped - ignoring stop request');
      return;
    }

    console.log(`[VadMode] Stop requested. Current phase: ${this.phase.value}. User initiated stop: ${this.context.isExplicitlyStoppedByUser.value}`);
    console.trace('[VadMode] Stop call stack trace'); // Add stack trace to see what's calling stop

    // Don't stop if we're in the middle of transitioning between wake and command phases
    if (this.phase.value === 'transitioning') {
      console.log('[VadMode] Ignoring stop request during transition phase');
      return;
    }

    this.context.setExplicitlyStoppedByUser(true);
    this.clearTimers();
    this.context.clearVadCommandTimeout();

    if (this.phase.value === 'capturing-command' && this.commandTranscriptBuffer.value.trim()) {
      this.emitTranscription(this.commandTranscriptBuffer.value);
      this.context.playSound(this.context.audioFeedback.beepOutSound.value);
    }

    await this.resetToIdleState(undefined, true);
  }

  public async handleWakeWordDetected(): Promise<void> {
    if (this.phase.value !== 'listening-wake') {
      console.warn(`[VadMode] Wake word detected but not in 'listening-wake' phase. Phase: ${this.phase.value}. Ignoring.`);
      return;
    }

    console.log('[VadMode] Wake word detected, transitioning to command capture.');
    console.log('[VadMode] Current state - isProcessingLLM:', this.context.isProcessingLLM.value,
                'isAwaitingVadCommandResult:', this.context.isAwaitingVadCommandResult.value);
    this.clearTimers();
    this.context.clearVadCommandTimeout();

    this.phase.value = 'transitioning';
    this.context.sharedState.isListeningForWakeWord.value = false;
    this.commandTranscriptBuffer.value = '';
    this.context.sharedState.pendingTranscript.value = '';

    this.context.playSound(this.context.audioFeedback.beepInSound.value);
    this.context.transcriptionDisplay.showWakeWordDetected();

    try {
      if (!this.context.activeHandlerApi.value) {
        console.error('[VadMode] No active STT handler in handleWakeWordDetected.');
        this.context.transcriptionDisplay.showError('Speech recognition not available.', 2500);
        await this.returnToWakeListening('No STT handler available.');
        return;
      }

      if(this.context.activeHandlerApi.value.isListeningForWakeWord.value) { // ensure only stopping if it was in wake word mode
        await this.context.activeHandlerApi.value.stopListening(true);
        await new Promise(r => setTimeout(r, 50));
      }

      const handlerStarted = await this.context.activeHandlerApi.value.startListening(true);
      console.log('[VadMode] Command listener start result:', handlerStarted);
      if (!handlerStarted) {
        console.error('[VadMode] Failed to start command listener');
        this.context.transcriptionDisplay.showError('Could not start command listener.', 2500);
        await this.returnToWakeListening('STT handler failed for command capture.');
      } else {
        this.phase.value = 'capturing-command';
        console.log('[VadMode] Successfully transitioned to command capture phase.');
        console.log('[VadMode] Current handler state - isActive:', this.context.activeHandlerApi.value.isActive.value);
      }
    } catch (error: any) {
      this.context.transcriptionDisplay.showError('Error starting command listener.', 2500);
      this.handleError(error);
    }
  }

  handleTranscription(text: string): void {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    if (this.phase.value === 'capturing-command') {
      console.log(`[VadMode] Final command transcript: "${trimmedText}"`);
      this.context.clearVadCommandTimeout();
      this.commandTranscriptBuffer.value = trimmedText;
      this.emitTranscription(this.commandTranscriptBuffer.value);
      this.context.playSound(this.context.audioFeedback.beepOutSound.value);
      this.context.sharedState.pendingTranscript.value = '';
      this.commandTranscriptBuffer.value = '';
      this.returnToWakeListeningAfterDelay();
    }
  }

  public handleInterimTranscript(text: string): void {
    if (this.phase.value === 'capturing-command') {
      const trimmedText = text.trim();
      this.context.sharedState.pendingTranscript.value = trimmedText;
      this.context.transcriptionDisplay.showInterimTranscript(trimmedText);
      if (trimmedText) this.commandTranscriptBuffer.value = trimmedText;
    }
  }

  private clearTimers(): void {
    if (this.returnToWakeTimer) {
      clearTimeout(this.returnToWakeTimer);
      this.returnToWakeTimer = null;
    }
  }

  private async returnToWakeListeningAfterDelay(delayMs: number = 300): Promise<void> {
    if (this.context.isExplicitlyStoppedByUser.value) {
      console.log('[VadMode] Manual stop, not returning to wake listening after delay.');
      await this.resetToIdleState(undefined, true);
      return;
    }
    this.clearTimers();
    this.returnToWakeTimer = window.setTimeout(async () => {
      this.returnToWakeTimer = null;
      await this.returnToWakeListening();
    }, delayMs);
  }

  private async returnToWakeListening(reason?: string): Promise<void> {
    if (this.context.isExplicitlyStoppedByUser.value) {
      console.log('[VadMode] Explicitly stopped, not returning to wake listening.');
      await this.resetToIdleState(undefined, true);
      return;
    }
    
    if (this.isBlocked() && !this.context.isAwaitingVadCommandResult.value) {
      console.warn(`[VadMode] Blocked from returning to wake listening. Reason: ${reason || 'conditions not met'}`);
      if (reason) this.context.transcriptionDisplay.showError(reason, 2000);
      await this.resetToIdleState(reason);
      return;
    }

    console.log(`[VadMode] Returning to wake listening. Reason: ${reason || 'normal transition'}`);
    this.phase.value = 'transitioning';
    this.clearTimers();
    this.context.clearVadCommandTimeout(); 

    this.commandTranscriptBuffer.value = '';
    this.context.sharedState.pendingTranscript.value = '';

    if (this.context.activeHandlerApi.value && (this.context.activeHandlerApi.value.isActive.value || this.context.activeHandlerApi.value.isListeningForWakeWord.value)) {
        await this.context.activeHandlerApi.value.stopListening(true);
        await new Promise(r => setTimeout(r, 50));
    }
    
    this.phase.value = 'idle'; 

    if (!this.context.isExplicitlyStoppedByUser.value) {
      await this.start();
    } else {
      console.log('[VadMode] Explicitly stopped, start() aborted during returnToWakeListening.');
      await this.resetToIdleState(undefined, true);
    }
  }

  private async resetToIdleState(errorMessage?: string, isUserInitiatedStop: boolean = false): Promise<void> {
    console.log(`[VadMode] Resetting to idle. User stop: ${isUserInitiatedStop}. Error: ${errorMessage || 'None'}`);
    this.phase.value = 'transitioning';
    this.clearTimers();
    this.context.clearVadCommandTimeout();
    
    if (this.context.activeHandlerApi.value && (this.context.activeHandlerApi.value.isActive.value || this.context.activeHandlerApi.value.isListeningForWakeWord.value)) {
      await this.context.activeHandlerApi.value.stopAll(true);
    }
    
    this.phase.value = 'idle';
    this.commandTranscriptBuffer.value = '';
    this.context.sharedState.pendingTranscript.value = '';
    this.context.sharedState.isListeningForWakeWord.value = false;
    this.context.sharedState.isProcessingAudio.value = false;

    if (errorMessage) {
      this.context.transcriptionDisplay.showError(errorMessage, 2500);
    } else if (!isUserInitiatedStop) {
      this.context.transcriptionDisplay.clearTranscription();
    }
  }

  handleError(error: Error | SttHandlerErrorPayload): void {
    const errorPayload = ('type' in error && 'message' in error) ? error : {
        type: 'vad_mode_error', message: error.message || 'Unknown VAD error.',
        code: (error as any).code || (error as Error).name, fatal: false,
    } as SttHandlerErrorPayload;

    console.error(`[VadMode] Error. Phase: ${this.phase.value}. Code: ${errorPayload.code}. Msg: ${errorPayload.message}`);
    this.context.clearVadCommandTimeout();

    if (errorPayload.code === 'vad-command-timeout-internal' || errorPayload.code === 'vad-command-no-speech' || errorPayload.code === 'vad-command-max-timeout') {
        this.context.playSound(this.context.audioFeedback.beepOutSound.value);
        this.context.transcriptionDisplay.showVadTimeout(); // Assuming this takes no args now
    } else if (errorPayload.code !== 'no-speech' && errorPayload.code !== 'aborted' && !errorPayload.message.includes('aborted by the user') && !errorPayload.message.includes('transitioning states')) {
        this.context.transcriptionDisplay.showError(errorPayload.message, 3000);
    }

    this.context.emit('voice-input-error', errorPayload);

    if (this.phase.value !== 'idle' && this.phase.value !== 'transitioning' &&
        !this.context.isExplicitlyStoppedByUser.value && !errorPayload.fatal) {
      console.log('[VadMode] Attempting return to wake listening after error.');
      this.returnToWakeListening(`Recovering from error: ${errorPayload.message.substring(0, 30)}`);
    } else {
      console.log('[VadMode] Error, not returning to wake listening due to state/error type.');
      this.resetToIdleState(undefined, this.context.isExplicitlyStoppedByUser.value);
    }
  }

  cleanup(): void {
    console.log('[VadMode] Cleanup initiated.');
    this.context.setExplicitlyStoppedByUser(true);
    this.clearTimers();
    this.context.clearVadCommandTimeout();
    this.resetToIdleState(undefined, true); // Ensure isUserInitiatedStop is true
    console.log('[VadMode] Cleanup complete.');
  }

  public getCurrentPhase(): VadPhase { 
    return this.phase.value; 
  }
}

export function useVadMode(context: SttModeContext): VadMode {
  return new VadMode(context);
}