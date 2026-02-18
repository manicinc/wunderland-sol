// File: frontend/src/components/voice-input/composables/useVoiceInputEffects.ts
import { ref, computed, watch, onMounted, onUnmounted, type Ref } from 'vue';
import { useUiStore } from '@/store/ui.store';

export interface GeometricPattern {
  id: string;
  x: number;
  y: number;
  radius: number;
  opacity: number;
  rotationSpeed: number;
  pulseSpeed: number;
  pulsePhase: number;
}

export interface UseVoiceInputEffectsOptions {
  isProcessingAudio: Ref<boolean>;
  isListeningForWakeWord: Ref<boolean>;
  isProcessingLLM: Ref<boolean>;
  audioMode: Ref<'push-to-talk' | 'continuous' | 'voice-activation'>;
}

export function useVoiceInputEffects(options: UseVoiceInputEffectsOptions) {
  const { isProcessingAudio, isListeningForWakeWord, isProcessingLLM, audioMode } = options;
  const uiStore = useUiStore();
  
  // Geometric pattern state
  const geometricPatterns = ref<GeometricPattern[]>([]);
  const patternAnimationFrame = ref<number | null>(null);
  const ignoredTextElements = ref<Array<{ id: string; text: string; opacity: number; y: number }>>([]);
  
  // Generate initial geometric patterns (circles)
  const initializePatterns = () => {
    const patterns: GeometricPattern[] = [];
    const numPatterns = uiStore.isReducedMotionPreferred ? 3 : 8;
    
    for (let i = 0; i < numPatterns; i++) {
      patterns.push({
        id: `pattern-${i}`,
        x: 10 + Math.random() * 80, // percentage
        y: 10 + Math.random() * 80,
        radius: 30 + Math.random() * 70,
        opacity: 0.02 + Math.random() * 0.03,
        rotationSpeed: (Math.random() - 0.5) * 0.002,
        pulseSpeed: 0.001 + Math.random() * 0.002,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    
    geometricPatterns.value = patterns;
  };
  
  // SVG path for geometric circles pattern (disabled in continuous mode)
  const geometricPatternSvg = computed(() => {
    // Don't generate patterns for continuous mode
    if (audioMode.value === 'continuous') {
      return [];
    }

    const paths = geometricPatterns.value.map(pattern => {
      const numCircles = 3;
      let path = '';

      for (let i = 0; i < numCircles; i++) {
        const radiusMultiplier = 1 - (i * 0.3);
        const r = pattern.radius * radiusMultiplier;
        path += `M ${pattern.x + r},${pattern.y} `;
        path += `A ${r},${r} 0 1,0 ${pattern.x - r},${pattern.y} `;
        path += `A ${r},${r} 0 1,0 ${pattern.x + r},${pattern.y} `;
      }

      return {
        path,
        opacity: pattern.opacity,
        id: pattern.id,
      };
    });

    return paths;
  });
  
  // Dynamic background gradient based on state
  const backgroundGradient = computed(() => {
    const baseColor = 'var(--color-bg-secondary';
    const accentColor = 'var(--color-accent-primary';
    
    if (isProcessingLLM.value) {
      return `radial-gradient(ellipse at 50% 50%, 
        hsla(${accentColor}-h), ${accentColor}-s), calc(${accentColor}-l) * 0.2), 0.1) 0%, 
        hsla(${baseColor}-h), ${baseColor}-s), ${baseColor}-l), 0.95) 50%)`;
    }
    
    if (isListeningForWakeWord.value) {
      return `radial-gradient(ellipse at 50% 100%, 
        hsla(var(--color-accent-interactive-h), var(--color-accent-interactive-s), var(--color-accent-interactive-l), 0.15) 0%, 
        hsla(${baseColor}-h), ${baseColor}-s), ${baseColor}-l), 0.95) 60%)`;
    }
    
    if (isProcessingAudio.value) {
      return `radial-gradient(ellipse at 50% 50%, 
        hsla(var(--color-voice-user-h), var(--color-voice-user-s), var(--color-voice-user-l), 0.1) 0%, 
        hsla(${baseColor}-h), ${baseColor}-s), ${baseColor}-l), 0.95) 40%)`;
    }
    
    return 'none';
  });
  
  // Animate patterns (disabled in continuous mode)
  const animatePatterns = () => {
    if (uiStore.isReducedMotionPreferred || audioMode.value === 'continuous') return;

    const time = Date.now() * 0.001; // Convert to seconds

    geometricPatterns.value = geometricPatterns.value.map(pattern => ({
      ...pattern,
      opacity: pattern.opacity * (0.8 + Math.sin(time * pattern.pulseSpeed + pattern.pulsePhase) * 0.2),
      x: pattern.x + Math.sin(time * pattern.rotationSpeed) * 0.5,
      y: pattern.y + Math.cos(time * pattern.rotationSpeed) * 0.5,
    }));

    // Animate ignored text fade out
    ignoredTextElements.value = ignoredTextElements.value
      .map(element => ({
        ...element,
        opacity: element.opacity - 0.02,
        y: element.y - 0.5,
      }))
      .filter(element => element.opacity > 0);

    patternAnimationFrame.value = requestAnimationFrame(animatePatterns);
  };
  
  // Add ignored text animation
  const addIgnoredText = (text: string) => {
    if (!isProcessingLLM.value) return;
    
    ignoredTextElements.value.push({
      id: `ignored-${Date.now()}-${Math.random()}`,
      text: text.substring(0, 50), // Limit length
      opacity: 0.7,
      y: 50 + Math.random() * 30,
    });
    
    // Play subtle "muted" sound effect
    playMutedSound();
  };
  
  // Play muted sound effect for ignored input
  const playMutedSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 200; // Low frequency
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.warn('[VoiceInputEffects] Could not play muted sound:', e);
    }
  };
  
  // Panel state classes
  const panelStateClass = computed(() => {
    const classes = ['voice-input-panel'];
    
    if (isProcessingLLM.value) {
      classes.push('state-llm-processing');
    } else if (isProcessingAudio.value) {
      classes.push('state-stt-active');
    } else if (isListeningForWakeWord.value) {
      classes.push('state-vad-listening');
    } else {
      classes.push('state-idle');
    }
    
    classes.push(`mode-${audioMode.value}`);
    
    return classes.join(' ');
  });
  
  // CSS variables for dynamic styling
  const cssVariables = computed(() => {
    return {
      '--pattern-opacity': isProcessingLLM.value ? '0.02' : '0.05',
      '--gradient-opacity': isProcessingAudio.value ? '0.3' : '0.1',
      '--glow-intensity': isListeningForWakeWord.value ? '0.5' : '0.2',
    };
  });
  
  // Watch for mode changes to stop/start animations
  watch(audioMode, (newMode, oldMode) => {
    if (newMode === 'continuous' && patternAnimationFrame.value) {
      // Stop animations when switching to continuous mode
      cancelAnimationFrame(patternAnimationFrame.value);
      patternAnimationFrame.value = null;
      geometricPatterns.value = []; // Clear patterns
    } else if (oldMode === 'continuous' && newMode !== 'continuous') {
      // Restart animations when leaving continuous mode
      initializePatterns();
      if (!uiStore.isReducedMotionPreferred) {
        animatePatterns();
      }
    }
  });

  onMounted(() => {
    // Don't initialize patterns for continuous mode
    if (audioMode.value !== 'continuous') {
      initializePatterns();
      if (!uiStore.isReducedMotionPreferred) {
        animatePatterns();
      }
    }
  });

  onUnmounted(() => {
    if (patternAnimationFrame.value) {
      cancelAnimationFrame(patternAnimationFrame.value);
    }
  });
  
  return {
    geometricPatternSvg,
    backgroundGradient,
    panelStateClass,
    cssVariables,
    ignoredTextElements,
    addIgnoredText,
  };
}