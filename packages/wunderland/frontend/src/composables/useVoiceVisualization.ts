// File: frontend/src/composables/useVoiceVisualization.ts
/**
 * @file useVoiceVisualization.ts
 * @description Composable for managing and rendering dynamic audio visualizations on an HTML5 Canvas.
 * Supports frequency bars, waveform, and multiple circular/organic visualizers.
 * Designed to be themeable and responsive to audio input and application states.
 *
 * @module composables/useVoiceVisualization
 * @version 1.2.0
 * @updated 2025-06-05 - Added `drawStaticWaveform`, `resizeCanvas` methods.
 * - Added `circularPulse` and `radiantWave` visualization types.
 * - Added `glowColor` to config.
 * - Ensured `currentConfig` is exposed as a Readonly<Ref<VoiceVisualizationConfig>>.
 */
import { ref, onUnmounted, readonly, watch, type Ref, shallowRef, nextTick } from 'vue';
import { useUiStore } from '@/store/ui.store'; // For reduced motion preference

/**
 * @type VoiceVisualizationType
 * @description Defines the available types of visualizations.
 * - `frequencyBars`: Classic spectrum analyzer bars.
 * - `waveform`: Oscilloscope-like time-domain waveform.
 * - `circular`: Original organic circular visualizer.
 * - `circularPulse`: A circular visualizer with a more pronounced pulsing behavior.
 * - `radiantWave`: Multiple lines radiating outwards, forming a wave pattern.
 */
export type VoiceVisualizationType =
  | 'frequencyBars'
  | 'waveform'
  | 'circular'
  | 'circularPulse'
  | 'radiantWave';

/**
 * Configuration options for the voice visualizer.
 */
export interface VoiceVisualizationConfig {
  fftSize?: number;
  smoothingTimeConstant?: number;
  visualizationType?: VoiceVisualizationType; // Updated to use the union type
  shapeColor?: string;
  glowColor?: string; // Added for glow effects
  barCount?: number;
  circularBaseRadiusFactor?: number;
  circularAmplitudeFactor?: number;
  circularMaxExtensionRadius?: number;
  circularPointCount?: number;
  circularRotationSpeed?: number;
  circularPulseSpeed?: number;
  circularPointSharpness?: number;
  circularConnectionType?: 'line' | 'curve';
  lineWidth?: number;
  globalVizAlpha?: number;

  // For circularPulse
  pulseFactor?: number; // How much base radius pulses

  // For radiantWave
  waveColor?: string; // Specific color for radiant waves if different from shapeColor
  amplitude?: number; // Max amplitude of waves
  frequency?: number; // Spatial frequency of waves
  phaseShiftSpeed?: number; // Speed of phase animation
  crestFactor?: number; // How sharp the wave crests are
  lineCount?: number; // Number of radiating lines/waves
  lineSpread?: number; // Angular spread or spacing between lines
}

/**
 * Configuration for drawing a static waveform (e.g., for PTT preview).
 */
export interface StaticWaveformConfig {
    waveColor?: string;
    backgroundColor?: string;
    lineWidth?: number;
    density?: number; // 0 to 1, controls how many data points are sampled
    padding?: number; // Padding around the waveform
}


const DEFAULT_VIZ_CONFIG: Readonly<VoiceVisualizationConfig> = Object.freeze({
  fftSize: 512,
  smoothingTimeConstant: 0.75,
  visualizationType: 'circular',
  shapeColor: 'hsl(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l))',
  glowColor: 'hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), calc(var(--color-accent-interactive-l) + 10%), 0.7)',
  barCount: 32,
  circularBaseRadiusFactor: 0.25,
  circularAmplitudeFactor: 0.5,
  circularMaxExtensionRadius: 40,
  circularPointCount: 90,
  circularRotationSpeed: 0.002,
  circularPulseSpeed: 0.015,
  circularPointSharpness: 0.3,
  circularConnectionType: 'curve',
  lineWidth: 2,
  globalVizAlpha: 0.75, // Slightly increased default opacity
  pulseFactor: 0.2,
  waveColor: 'hsl(var(--color-accent-primary-h), var(--color-accent-primary-s), var(--color-accent-primary-l))',
  amplitude: 50,
  frequency: 0.05,
  phaseShiftSpeed: 0.01,
  crestFactor: 2,
  lineCount: 7,
  lineSpread: 20,
});

export function useVoiceVisualization(
  mediaStreamRef: Ref<MediaStream | null>,
  canvasRef: Ref<HTMLCanvasElement | null>,
  initialConfigOverride?: Partial<VoiceVisualizationConfig>
) {
  const uiStore = useUiStore();
  const audioContext = shallowRef<AudioContext | null>(null);
  const analyserNode = shallowRef<AnalyserNode | null>(null);
  const sourceNode = shallowRef<MediaStreamAudioSourceNode | null>(null);

  const frequencyData = shallowRef<Uint8Array | null>(null);
  const timeDomainData = shallowRef<Uint8Array | null>(null);
  const _isVisualizing = ref(false);
  let animationFrameId: number | null = null;
  let visibilityHandler: (() => void) | null = null;

  let currentAngle = 0;
  let pulseOffset = Math.random() * Math.PI * 2;
  let wavePhase = 0; // For radiantWave

  const _currentConfig = ref<VoiceVisualizationConfig>({
    ...DEFAULT_VIZ_CONFIG,
    ...(initialConfigOverride || {}),
  });

  const updateConfig = (newConfigOverride: Partial<VoiceVisualizationConfig>): void => {
    const oldFftSize = _currentConfig.value.fftSize;
    _currentConfig.value = { ..._currentConfig.value, ...newConfigOverride };

    if (analyserNode.value) {
      if (newConfigOverride.fftSize && newConfigOverride.fftSize !== oldFftSize) {
        analyserNode.value.fftSize = _currentConfig.value.fftSize!;
        const bufferLength = analyserNode.value.frequencyBinCount;
        frequencyData.value = new Uint8Array(bufferLength);
        timeDomainData.value = new Uint8Array(analyserNode.value.fftSize);
      }
      if (newConfigOverride.smoothingTimeConstant !== undefined) {
        analyserNode.value.smoothingTimeConstant = _currentConfig.value.smoothingTimeConstant!;
      }
    }
    console.log('[VoiceViz] Config updated:', JSON.parse(JSON.stringify(_currentConfig.value)));
  };

  const _setupAudioProcessing = (): boolean => {
    if (!mediaStreamRef.value || !mediaStreamRef.value.active) {
      console.warn('[VoiceViz] Setup failed: MediaStream is null or inactive.');
      _stopVisualizationInternal();
      return false;
    }
    try {
      if (!audioContext.value || audioContext.value.state === 'closed') {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) { console.error("[VoiceViz] AudioContext not supported."); return false; }
        audioContext.value = new AudioCtx();
      }
      if (audioContext.value.state === 'suspended') {
        audioContext.value.resume().catch(e => console.warn("Failed to resume AudioContext for viz:", e));
      }

      if (!analyserNode.value || analyserNode.value.context !== audioContext.value ||
          (_currentConfig.value.fftSize && analyserNode.value.fftSize !== _currentConfig.value.fftSize)) {
        if(analyserNode.value) try { analyserNode.value.disconnect(); } catch(e) {/*ignore*/}
        analyserNode.value = audioContext.value.createAnalyser();
        analyserNode.value.fftSize = _currentConfig.value.fftSize!;
      }
      analyserNode.value.smoothingTimeConstant = _currentConfig.value.smoothingTimeConstant!;
      
      if (sourceNode.value && (sourceNode.value.context !== audioContext.value || sourceNode.value.mediaStream !== mediaStreamRef.value)) {
        try { sourceNode.value.disconnect(); } catch(e) {/*ignore*/}
        sourceNode.value = null;
      }
      if (!sourceNode.value) {
        sourceNode.value = audioContext.value.createMediaStreamSource(mediaStreamRef.value);
      }
      try { sourceNode.value.disconnect(); } catch(e) {/*ignore*/}
      sourceNode.value.connect(analyserNode.value);

      const bufferLength = analyserNode.value.frequencyBinCount;
      if (!frequencyData.value || frequencyData.value.length !== bufferLength) {
        frequencyData.value = new Uint8Array(bufferLength);
      }
      if (!timeDomainData.value || timeDomainData.value.length !== analyserNode.value.fftSize) {
        timeDomainData.value = new Uint8Array(analyserNode.value.fftSize);
      }
      return true;
    } catch (error) {
      console.error("[VoiceViz] Error setting up audio processing:", error);
      _stopVisualizationInternal();
      return false;
    }
  };
  
  const _drawLoop = (): void => {
    if (!_isVisualizing.value) return;
    animationFrameId = requestAnimationFrame(_drawLoop);
    if (!analyserNode.value || !canvasRef.value || !frequencyData.value || !timeDomainData.value) return;
    
    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyserNode.value.getByteFrequencyData(frequencyData.value);
    analyserNode.value.getByteTimeDomainData(timeDomainData.value);

    let sum = 0;
    for (let i = 0; i < timeDomainData.value.length; i++) {
      sum += Math.abs(timeDomainData.value[i] - 128);
    }
    const averageAmplitude = timeDomainData.value.length > 0 ? sum / timeDomainData.value.length / 128 : 0;
    
    _updateCssVariables(averageAmplitude);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = _currentConfig.value.globalVizAlpha ?? DEFAULT_VIZ_CONFIG.globalVizAlpha!;

    if (uiStore.isReducedMotionPreferred) {
      ctx.fillStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
      const indicatorSize = Math.min(canvas.width, canvas.height) / 10 + averageAmplitude * (Math.min(canvas.width, canvas.height) / 10);
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, Math.max(2, indicatorSize), 0, 2 * Math.PI);
      ctx.fill();
    } else {
      switch (_currentConfig.value.visualizationType) {
        case 'waveform':
          _drawWaveform(ctx, timeDomainData.value, canvas.width, canvas.height, averageAmplitude);
          break;
        case 'circular':
          _drawCircular(ctx, frequencyData.value, canvas.width, canvas.height, averageAmplitude);
          break;
        case 'circularPulse': // New Type
          _drawCircularPulse(ctx, frequencyData.value, canvas.width, canvas.height, averageAmplitude);
          break;
        case 'radiantWave': // New Type
          _drawRadiantWave(ctx, timeDomainData.value, canvas.width, canvas.height, averageAmplitude);
          break;
        case 'frequencyBars':
        default:
          _drawFrequencyBars(ctx, frequencyData.value, canvas.width, canvas.height, averageAmplitude);
          break;
      }
    }
    ctx.globalAlpha = 1.0;
  };

  const _updateCssVariables = (averageAmplitude: number): void => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty('--voice-amplitude', averageAmplitude.toFixed(3));
  };

  const _applyGlow = (ctx: CanvasRenderingContext2D, color?: string, blurAmount: number = 10) => {
      if (color) {
        ctx.shadowBlur = blurAmount;
        ctx.shadowColor = color;
      }
  };
  const _clearGlow = (ctx: CanvasRenderingContext2D) => {
      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';
  };

  const _drawFrequencyBars = (ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, globalAmplitude: number): void => {
    const barCount = Math.min(data.length, _currentConfig.value.barCount!);
    if (barCount <= 0) return;
    const barWidthPercentage = 0.7;
    const spacingPercentage = 1 - barWidthPercentage;
    const totalBarPlusSpacingWidth = W / barCount;
    const barWidth = totalBarPlusSpacingWidth * barWidthPercentage;
    let x = totalBarPlusSpacingWidth * spacingPercentage / 2;
    
    _applyGlow(ctx, _currentConfig.value.glowColor, 5 + globalAmplitude * 10);
    ctx.fillStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    const maxBarHeight = H * 0.9;

    for (let i = 0; i < barCount; i++) {
      const dataIndex = Math.min(data.length - 1, Math.floor(i * (data.length / barCount)));
      let barHeight = (data[dataIndex] / 255) * maxBarHeight;
      barHeight = barHeight * (0.5 + globalAmplitude * 0.8);
      barHeight = Math.min(Math.max(2, barHeight), maxBarHeight);
      ctx.fillRect(x, H - barHeight, barWidth, barHeight);
      x += totalBarPlusSpacingWidth;
    }
    _clearGlow(ctx);
  };

  const _drawWaveform = (ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, globalAmplitude: number): void => {
    _applyGlow(ctx, _currentConfig.value.glowColor, 5 + globalAmplitude * 5);
    ctx.lineWidth = (_currentConfig.value.lineWidth ?? 2) * (0.8 + globalAmplitude * 0.7);
    ctx.strokeStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    ctx.beginPath();
    if (data.length === 0) return;
    const sliceWidth = W * 1.0 / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0;
      const y = (v * H / 2) ;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    _clearGlow(ctx);
  };

  const _drawCircular = (ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, globalAmplitude: number): void => {
    const centerX = W / 2; const centerY = H / 2;
    const baseRadiusRef = Math.min(W, H) / 2;
    pulseOffset += (_currentConfig.value.circularPulseSpeed ?? 0.015) * (0.5 + globalAmplitude * 1.5);
    currentAngle += (_currentConfig.value.circularRotationSpeed ?? 0.002) * (0.3 + globalAmplitude * 1.0);
    const dynamicBaseRadius = baseRadiusRef * (_currentConfig.value.circularBaseRadiusFactor ?? 0.25) * (0.8 + Math.sin(pulseOffset) * 0.2) * (0.6 + globalAmplitude * 0.8);
    
    _applyGlow(ctx, _currentConfig.value.glowColor, 8 + globalAmplitude * 12);
    ctx.strokeStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    ctx.lineWidth = (_currentConfig.value.lineWidth ?? 2) * (0.7 + globalAmplitude * 0.8);
    
    const numPoints = _currentConfig.value.circularPointCount ?? 90;
    if (numPoints <= 0 || data.length === 0) { _clearGlow(ctx); return; }
    ctx.beginPath();
    const angleStep = (2 * Math.PI) / numPoints;
    for (let i = 0; i <= numPoints; i++) {
      const pointAngle = (i % numPoints) * angleStep + currentAngle;
      const dataIndex = Math.min(data.length -1, Math.floor((i % numPoints) * (data.length / numPoints)));
      const amplitudeAtPoint = data[dataIndex] / 255.0;
      const extension = amplitudeAtPoint * baseRadiusRef * (_currentConfig.value.circularAmplitudeFactor ?? 0.5);
      const currentRadius = dynamicBaseRadius + Math.min(extension, _currentConfig.value.circularMaxExtensionRadius ?? 40);
      const x = centerX + Math.cos(pointAngle) * currentRadius;
      const y = centerY + Math.sin(pointAngle) * currentRadius;
      if (i === 0) ctx.moveTo(x, y);
      else {
        if (_currentConfig.value.circularConnectionType === 'curve') {
          const prevI = (i - 1 + numPoints) % numPoints;
          const prevPointAngle = prevI * angleStep + currentAngle;
          const prevAmp = data[Math.min(data.length - 1, Math.floor(prevI * (data.length / numPoints)))] / 255.0;
          const prevExt = prevAmp * baseRadiusRef * (_currentConfig.value.circularAmplitudeFactor ?? 0.5);
          const prevR = dynamicBaseRadius + Math.min(prevExt, _currentConfig.value.circularMaxExtensionRadius ?? 40);
          const prevX = centerX + Math.cos(prevPointAngle) * prevR;
          const prevY = centerY + Math.sin(prevPointAngle) * prevR;
          const cp1x = (prevX + x) / 2 + (y - prevY) * (_currentConfig.value.circularPointSharpness ?? 0.3);
          const cp1y = (prevY + y) / 2 - (x - prevX) * (_currentConfig.value.circularPointSharpness ?? 0.3);
          ctx.quadraticCurveTo(cp1x, cp1y, x, y);
        } else { ctx.lineTo(x, y); }
      }
    }
    ctx.closePath();
    ctx.stroke();
    _clearGlow(ctx);
  };

  const _drawCircularPulse = (ctx: CanvasRenderingContext2D, data: Uint8Array, W: number, H: number, globalAmplitude: number): void => {
    const centerX = W / 2; const centerY = H / 2;
    const baseRadius = Math.min(W, H) * (_currentConfig.value.circularBaseRadiusFactor ?? 0.15);
    const pulseFactor = _currentConfig.value.pulseFactor ?? 0.2;
    const maxRadius = Math.min(W,H) / 2 * 0.8;

    // Calculate overall energy from frequency data for pulse magnitude
    let energy = 0;
    for(let i=0; i < data.length; i++) energy += data[i];
    const avgEnergy = data.length > 0 ? energy / data.length / 255 : 0; // Normalized 0-1

    const pulseRadius = baseRadius + avgEnergy * maxRadius * pulseFactor * (0.5 + globalAmplitude * 0.5) ;
    
    _applyGlow(ctx, _currentConfig.value.glowColor, 15 + avgEnergy * 20);
    ctx.strokeStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    ctx.lineWidth = (_currentConfig.value.lineWidth ?? 3) * (1 + avgEnergy * 0.5);
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(5, pulseRadius), 0, 2 * Math.PI);
    ctx.stroke();
    
    // Inner more solid circle
    ctx.fillStyle = _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    ctx.globalAlpha = (_currentConfig.value.globalVizAlpha ?? 0.7) * (0.1 + avgEnergy * 0.3);
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(3, pulseRadius * 0.6), 0, 2 * Math.PI);
    ctx.fill();
    _clearGlow(ctx);
  };

  const _drawRadiantWave = (ctx: CanvasRenderingContext2D, _data: Uint8Array, W: number, H: number, globalAmplitude: number): void => {
    // Time domain data might be more suitable for wave-like patterns
    const centerX = W / 2; const centerY = H / 2;
    const lineCount = _currentConfig.value.lineCount ?? 7;
    const maxAmplitude = (_currentConfig.value.amplitude ?? 50) * (0.5 + globalAmplitude * 1.0);
    const waveLength = W / (_currentConfig.value.frequency ?? 0.05) / (2 * Math.PI); // Adjust for visual frequency
    const phaseSpeed = _currentConfig.value.phaseShiftSpeed ?? 0.01;
    const lineSpreadDeg = _currentConfig.value.lineSpread ?? 20; // Degrees
    
    wavePhase += phaseSpeed * (1 + globalAmplitude * 2); // Phase shifts faster with amplitude

    _applyGlow(ctx, _currentConfig.value.glowColor, 8 + globalAmplitude * 10);
    ctx.strokeStyle = _currentConfig.value.waveColor || _currentConfig.value.shapeColor || DEFAULT_VIZ_CONFIG.shapeColor!;
    ctx.lineWidth = (_currentConfig.value.lineWidth ?? 2) * (0.8 + globalAmplitude * 0.5);

    for(let i=0; i < lineCount; i++) {
        ctx.beginPath();
        const angleOffset = (i - Math.floor(lineCount/2)) * (lineSpreadDeg * Math.PI / 180);
        let lastX = centerX;
        let lastY = centerY;
        ctx.moveTo(centerX, centerY);

        for (let r = 0; r < Math.max(W,H)/1.5; r += 5) { // Draw outwards
            const angle = Math.atan2(lastY - centerY, lastX - centerX); // Angle of previous segment
            const currentPhase = wavePhase + (r / waveLength); // Add distance to phase
            
            const waveOffset = Math.sin(currentPhase) * maxAmplitude * (r / (Math.max(W,H)/2)) ; // Wave diminishes outwards
            
            // Target point on a straight line
            const targetX = centerX + Math.cos(angleOffset) * r;
            const targetY = centerY + Math.sin(angleOffset) * r;

            // Add perpendicular wave offset
            const x = targetX + Math.cos(angleOffset + Math.PI/2) * waveOffset;
            const y = targetY + Math.sin(angleOffset + Math.PI/2) * waveOffset;
            
            ctx.lineTo(x, y);
            lastX = x; lastY = y;
        }
        ctx.stroke();
    }
    _clearGlow(ctx);
  };


  const _stopVisualizationInternal = (): void => {
    _isVisualizing.value = false;
    if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
    if (canvasRef.value) {
      const ctx = canvasRef.value.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    }
  };

  const startVisualization = (): void => {
    if (_isVisualizing.value) return;
    if (!mediaStreamRef.value || !mediaStreamRef.value.active) return;
    if (!canvasRef.value) return;
    if (!_setupAudioProcessing()) return;
    _isVisualizing.value = true;

    // Pause drawing when tab is hidden; resume on visible
    if (typeof document !== 'undefined' && !visibilityHandler) {
      visibilityHandler = () => {
        const hidden = document.visibilityState === 'hidden';
        if (hidden) {
          if (animationFrameId) { cancelAnimationFrame(animationFrameId); animationFrameId = null; }
        } else if (_isVisualizing.value && animationFrameId == null) {
          _drawLoop();
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    _drawLoop();
    console.log('[VoiceViz] Visualization started with type:', _currentConfig.value.visualizationType);
  };

  const stopVisualization = (): void => {
    if (!_isVisualizing.value) return;
    _stopVisualizationInternal();
    console.log('[VoiceViz] Visualization drawing stopped.');
  };

  const resizeCanvas = (width: number, height: number): void => {
    if (canvasRef.value) {
      canvasRef.value.width = width;
      canvasRef.value.height = height;
      // console.log(`[VoiceViz] Canvas resized to ${width}x${height}`);
      // No need to redraw here, drawLoop will handle it if active
    }
  };

  const drawStaticWaveform = (targetCanvas: HTMLCanvasElement, audioBuffer: AudioBuffer, config: StaticWaveformConfig = {}): void => {
    const {
        waveColor = _currentConfig.value.shapeColor || 'rgba(200, 200, 255, 0.8)',
        backgroundColor = 'rgba(0,0,0,0)',
        lineWidth = 2,
        density = 0.5, // Sample 50% of points by default
        padding = 5
    } = config;

    const ctx = targetCanvas.getContext('2d');
    if (!ctx) return;

    const W = targetCanvas.width;
    const H = targetCanvas.height;
    ctx.clearRect(0, 0, W, H);

    if (backgroundColor && backgroundColor !== 'transparent') {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, W, H);
    }
    
    const data = audioBuffer.getChannelData(0); // Use the first channel
    const step = Math.max(1, Math.floor(1 / Math.max(0.01, Math.min(1, density)))); // Ensure step is at least 1
    const effectiveWidth = W - padding * 2;
    const effectiveHeight = H - padding * 2;
    const hMid = padding + effectiveHeight / 2;

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = waveColor;
    ctx.beginPath();
    ctx.moveTo(padding, hMid);

    for (let i = 0; i < data.length; i += step) {
        const x = padding + (i / (data.length -1)) * effectiveWidth;
        const y = hMid - (data[i] * effectiveHeight / 2); // data[i] is -1 to 1
        ctx.lineTo(x, y);
    }
    ctx.stroke();
    console.log("[VoiceViz] Static waveform drawn.");
  };


  watch(mediaStreamRef, (newStream, oldStream) => {
    if (newStream === oldStream && newStream?.active === oldStream?.active) return;
    _stopVisualizationInternal();
    if (sourceNode.value) { try { sourceNode.value.disconnect(); } catch(e) {/*ignore*/} sourceNode.value = null; }
    // Restart logic is now handled by VoiceInput.vue's watcher on isVisualizationActive & stream
  }, { deep: false });

  onUnmounted(() => {
    console.log('[VoiceViz] Unmounting. Cleaning up audio resources.');
    _stopVisualizationInternal();
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
    if (sourceNode.value) { try { sourceNode.value.disconnect(); } catch(e) {/*ignore*/} sourceNode.value = null; }
    if (analyserNode.value) { try { analyserNode.value.disconnect(); } catch(e) {/*ignore*/} analyserNode.value = null; }
    if (audioContext.value && audioContext.value.state !== 'closed') {
      audioContext.value.close().catch(e => console.warn("[VoiceViz] Error closing AudioContext on unmount:", e));
    }
    audioContext.value = null;
  });

  return {
    isVisualizing: readonly(_isVisualizing),
    startVisualization,
    stopVisualization,
    updateConfig,
    currentConfig: readonly(_currentConfig), // Expose for reading current config
    resizeCanvas, // New method
    drawStaticWaveform // New method
  };
}