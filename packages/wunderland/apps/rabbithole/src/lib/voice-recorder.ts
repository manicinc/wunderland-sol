'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceRecorderState {
  isRecording: boolean;
  isProcessing: boolean;
  audioBlob: Blob | null;
  error: string | null;
  duration: number;
}

interface VoiceRecorderActions {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

export type UseVoiceRecorderReturn = VoiceRecorderState & VoiceRecorderActions;

const MAX_DURATION_MS = 120_000; // 2 minutes
const SILENCE_TIMEOUT_MS = 1400;
const MIN_AUTOSTOP_RECORDING_MS = 1200;
const SILENCE_RMS_THRESHOLD = 0.018;

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const monitorFrameRef = useRef<number | null>(null);
  const lastVoiceActivityRef = useRef<number>(0);

  const cleanupVAD = useCallback(() => {
    if (monitorFrameRef.current != null) {
      cancelAnimationFrame(monitorFrameRef.current);
      monitorFrameRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }

    const ctx = audioContextRef.current;
    audioContextRef.current = null;
    if (ctx) {
      void ctx.close().catch(() => {});
    }
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }

    cleanupVAD();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    mediaRecorderRef.current = null;
  }, [cleanupVAD]);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    setDuration(0);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Pick best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        setIsProcessing(true);
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setIsRecording(false);
        setIsProcessing(false);
        cleanup();
      };

      recorder.onerror = () => {
        setError('Recording failed');
        setIsRecording(false);
        cleanup();
      };

      recorder.start(250); // collect data every 250ms
      startTimeRef.current = Date.now();
      lastVoiceActivityRef.current = startTimeRef.current;
      setIsRecording(true);

      // Duration timer
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      // Auto-stop after max duration
      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION_MS);

      // VAD-style silence detection (auto-stop after pause)
      const audioContext = new window.AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      sourceRef.current = source;
      analyserRef.current = analyser;

      const samples = new Float32Array(analyser.fftSize);
      const monitor = () => {
        const activeRecorder = mediaRecorderRef.current;
        if (!activeRecorder || activeRecorder.state !== 'recording') {
          monitorFrameRef.current = null;
          return;
        }

        analyser.getFloatTimeDomainData(samples);
        let sum = 0;
        for (const v of samples) sum += v * v;
        const rms = Math.sqrt(sum / samples.length);
        const now = Date.now();

        if (rms >= SILENCE_RMS_THRESHOLD) {
          lastVoiceActivityRef.current = now;
        } else {
          const silenceElapsed = now - lastVoiceActivityRef.current;
          const recordingElapsed = now - startTimeRef.current;
          if (
            recordingElapsed >= MIN_AUTOSTOP_RECORDING_MS &&
            silenceElapsed >= SILENCE_TIMEOUT_MS &&
            activeRecorder.state === 'recording'
          ) {
            activeRecorder.stop();
            monitorFrameRef.current = null;
            return;
          }
        }

        monitorFrameRef.current = requestAnimationFrame(monitor);
      };

      monitorFrameRef.current = requestAnimationFrame(monitor);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (
        err instanceof DOMException &&
        err.name === 'NotFoundError'
      ) {
        setError('No microphone found.');
      } else {
        setError('Could not start recording.');
      }
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setIsProcessing(false);
    setAudioBlob(null);
    setError(null);
    setDuration(0);
    chunksRef.current = [];
  }, [cleanup]);

  return {
    isRecording,
    isProcessing,
    audioBlob,
    error,
    duration,
    startRecording,
    stopRecording,
    reset,
  };
}
