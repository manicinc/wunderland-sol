// File: frontend/src/components/voice-input/composables/shared/useTranscriptionDisplay.ts
/**
 * @file useTranscriptionDisplay.ts
 * @description Manages transcription display logic, feedback messages, and timing.
 * Centralizes all transcription UI updates to ensure consistency.
 */

import { watch, type Ref } from 'vue';
import type { VoiceInputSharedState } from './useVoiceInputState';

export interface TranscriptionDisplayOptions {
  sharedState: VoiceInputSharedState;
  minTimeBetweenTranscriptions?: number;
  feedbackDuration?: number;
}

export function useTranscriptionDisplay(options: TranscriptionDisplayOptions) {
  const {
    sharedState,
    minTimeBetweenTranscriptions = 100,
    feedbackDuration = 3000
  } = options;
  
  let clearTimeoutId: number | null = null;
  
  const clearTranscription = () => {
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
    sharedState.currentRecordingStatusHtml.value = '';
  };
  
  const showInterimTranscript = (text: string) => {
    if (!text.trim()) return;
    
    const sanitized = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sharedState.currentRecordingStatusHtml.value = 
      `<span class="interim-transcript-feedback">${sanitized}</span>`;
    
    // Don't auto-clear interim transcripts
    if (clearTimeoutId) {
      clearTimeout(clearTimeoutId);
      clearTimeoutId = null;
    }
  };
  
  const showListening = () => {
    sharedState.currentRecordingStatusHtml.value = 
      '<span class="listening-feedback">Listening...</span>';
  };
  
  const showError = (message: string, duration = 3500) => {
    const sanitized = message.substring(0, 50).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sharedState.currentRecordingStatusHtml.value = 
      `<span class="error-feedback">Error: ${sanitized}...</span>`;
    
    clearTimeoutId = window.setTimeout(clearTranscription, duration);
  };
  
  const showIgnored = (text: string) => {
    const sanitized = text.substring(0, 30).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sharedState.currentRecordingStatusHtml.value = 
      `<span class="ignored-transcript-feedback">(Assistant busy, ignored: ${sanitized}...)</span>`;
    
    clearTimeoutId = window.setTimeout(clearTranscription, 2500);
  };
  
  const showSent = (text: string) => {
    const sanitized = text.substring(0, 50).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    sharedState.currentRecordingStatusHtml.value = 
      `<span class="transcription-sent-feedback">✓ Sent: "${sanitized}"</span>`;
    
    clearTimeoutId = window.setTimeout(clearTranscription, feedbackDuration);
  };
  
  const showWakeWordDetected = () => {
    sharedState.currentRecordingStatusHtml.value = 
      '<span class="listening-feedback">Wake word detected! Listening for command...</span>';
  };
  
  const showVadTimeout = () => {
    sharedState.currentRecordingStatusHtml.value = 
      '<span class="info-feedback">Command timed out.</span>';
    
    clearTimeoutId = window.setTimeout(clearTranscription, 2000);
  };
  
  const canEmitTranscription = (): boolean => {
    const now = Date.now();
    const timeSinceLast = now - sharedState.lastTranscriptionEmitTime.value;
    
    if (timeSinceLast >= minTimeBetweenTranscriptions) {
      sharedState.lastTranscriptionEmitTime.value = now;
      return true;
    }
    return false;
  };
  
  // Watch for pending transcript changes
  watch(() => sharedState.pendingTranscript.value, (newText) => {
    if (newText.trim() && sharedState.isComponentMounted.value) {
      showInterimTranscript(newText);
    }
  });
  
  return {
    showInterimTranscript,
    showListening,
    showError,
    showIgnored,
    showSent,
    showWakeWordDetected,
    showVadTimeout,
    canEmitTranscription,
    clearTranscription
  };
}