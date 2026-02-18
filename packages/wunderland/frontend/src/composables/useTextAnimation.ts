// File: frontend/src/composables/useTextAnimation.ts
/**
 * @file useTextAnimation.ts
 * @description Enhanced text animation composable with reactive state integration
 * Features dynamic animation styles based on app state, message type, and content complexity
 * @version 2.0.0
 */

import { ref, computed, watch, type Ref, type CSSProperties, nextTick } from 'vue';
import { useUiStore } from '@/store/ui.store';
import { useReactiveStore } from '@/store/reactive.store';
import { readonly } from 'vue';

export interface TextAnimationUnit {
  type: 'char' | 'word' | 'line' | 'block';
  content: string;
  key: string;
  index: number;
  style: Partial<CSSProperties>;
  classes: string[];
  metadata?: {
    isCode?: boolean;
    isEmphasis?: boolean;
    isPunctuation?: boolean;
    isNumber?: boolean;
    complexity?: number;
  };
}

export interface TextRevealConfig {
  mode: 'character' | 'word' | 'line' | 'smart';
  baseSpeed: number; // Base duration per unit in ms
  staggerDelay: number; // Delay between units in ms
  animationStyle: 'organic' | 'digital' | 'quantum' | 'terminal' | 'cascade' | 'wave' | 'neural';
  easing: 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'spring' | 'elastic';
  withTrail?: boolean;
  maxTotalDuration?: number;
  adaptToContent?: boolean;
  adaptToState?: boolean;
  glowIntensity?: number;
  waveAmplitude?: number;
  particleEffect?: boolean;
}

export interface UseTextAnimationReturn {
  animatedUnits: Ref<TextAnimationUnit[]>;
  isAnimating: Ref<boolean>;
  animationProgress: Ref<number>;
  estimatedDuration: Ref<number>;
  animateText: (text: string, configOverride?: Partial<TextRevealConfig>) => Promise<void>;
  pauseAnimation: () => void;
  resumeAnimation: () => void;
  resetAnimation: () => void;
  skipAnimation: () => void;
}

// Animation presets based on app state
const STATE_ANIMATION_PRESETS: Record<string, Partial<TextRevealConfig>> = {
  idle: {
    baseSpeed: 50,
    staggerDelay: 25,
    animationStyle: 'organic',
    easing: 'ease-out',
  },
  listening: {
    baseSpeed: 40,
    staggerDelay: 20,
    animationStyle: 'wave',
    easing: 'spring',
    waveAmplitude: 0.3,
  },
  transcribing: {
    baseSpeed: 30,
    staggerDelay: 15,
    animationStyle: 'cascade',
    easing: 'linear',
    withTrail: true,
  },
  thinking: {
    baseSpeed: 60,
    staggerDelay: 30,
    animationStyle: 'neural',
    easing: 'ease-out',
    glowIntensity: 0.6,
  },
  responding: {
    baseSpeed: 35,
    staggerDelay: 18,
    animationStyle: 'quantum',
    easing: 'spring',
    particleEffect: true,
  },
  speaking: {
    baseSpeed: 45,
    staggerDelay: 22,
    animationStyle: 'wave',
    easing: 'elastic',
    waveAmplitude: 0.5,
  },
};

// Content complexity analyzer
function analyzeTextComplexity(text: string): number {
  const wordCount = text.split(/\s+/).length;
  const avgWordLength = text.length / wordCount;
  const punctuationCount = (text.match(/[.,!?;:]/g) || []).length;
  const numberCount = (text.match(/\d+/g) || []).length;
  const codePatterns = (text.match(/[{}()[\]<>]/g) || []).length;
  
  const complexity = 
    (wordCount > 50 ? 0.3 : 0) +
    (avgWordLength > 6 ? 0.2 : 0) +
    (punctuationCount > 10 ? 0.2 : 0) +
    (numberCount > 5 ? 0.1 : 0) +
    (codePatterns > 5 ? 0.2 : 0);
  
  return Math.min(1, complexity);
}

const DEFAULT_TEXT_REVEAL_CONFIG: TextRevealConfig = {
  mode: 'smart',
  baseSpeed: 50,
  staggerDelay: 25,
  animationStyle: 'organic',
  easing: 'ease-out',
  withTrail: false,
  adaptToContent: true,
  adaptToState: true,
  glowIntensity: 0.3,
  waveAmplitude: 0.2,
  particleEffect: false,
};

export function useTextAnimation(
  initialConfig?: Partial<TextRevealConfig>
): UseTextAnimationReturn {
  const uiStore = useUiStore();
  const reactiveStore = useReactiveStore();
  
  const animatedUnits = ref<TextAnimationUnit[]>([]);
  const isAnimating = ref(false);
  const isPaused = ref(false);
  const animationProgress = ref(0);
  const estimatedDuration = ref(0);
  
  let animationIdCounter = 0;
  let animationFrameId: number | null = null;
  let animationStartTime = 0;
  let pausedTime = 0;

  const currentConfig = computed<TextRevealConfig>(() => {
    const base = { ...DEFAULT_TEXT_REVEAL_CONFIG, ...(initialConfig || {}) };
    
    // Apply state-based presets if enabled
    if (base.adaptToState) {
      const statePreset = STATE_ANIMATION_PRESETS[reactiveStore.appState];
      if (statePreset) {
        Object.assign(base, statePreset);
      }
    }
    
    // Apply reactive speed modifier
    const textStreamSpeed = typeof reactiveStore.textStreamSpeed === 'number'
      ? reactiveStore.textStreamSpeed
      : (typeof reactiveStore.textStreamSpeed === 'object' && reactiveStore.textStreamSpeed !== null && 'value' in reactiveStore.textStreamSpeed
          ? (reactiveStore.textStreamSpeed as { value: number }).value
          : 0);

    base.baseSpeed *= (1 - textStreamSpeed * 0.5);
    base.staggerDelay *= (1 - textStreamSpeed * 0.5);
    
    return base;
  });

  const resetAnimation = (): void => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    animatedUnits.value = [];
    isAnimating.value = false;
    isPaused.value = false;
    animationProgress.value = 0;
    estimatedDuration.value = 0;
    animationIdCounter = 0;
    animationStartTime = 0;
    pausedTime = 0;
  };

  const prepareUnits = (text: string, config: TextRevealConfig): TextAnimationUnit[] => {
    const units: TextAnimationUnit[] = [];
    const complexity = analyzeTextComplexity(text);
    
    // Smart mode determines the best unit type based on content
    let mode = config.mode;
    if (mode === 'smart') {
      if (text.length < 50) mode = 'character';
      else if (text.length < 200) mode = 'word';
      else mode = 'line';
    }
    
    // Split text into units
    let rawUnits: string[] = [];
    switch (mode) {
      case 'character':
        rawUnits = text.split('');
        break;
      case 'word':
        // Preserve spaces by including them in the split
        rawUnits = text.split(/(\s+)/).filter(unit => unit.length > 0);
        break;
      case 'line':
        rawUnits = text.split('\n');
        break;
      default:
        rawUnits = [text];
    }
    
    // Process each unit
    rawUnits.forEach((unitContent, index) => {
      const isWhitespace = unitContent.trim() === '';
      const isPunctuation = /^[.,!?;:]$/.test(unitContent);
      const isNumber = /^\d+$/.test(unitContent);
      const isCode = /^[{}()[\]<>]$/.test(unitContent);
      const isEmphasis = /^[*_~`]/.test(unitContent);
      
      // Determine animation properties
      const unitType = mode === 'character' ? 'char' : mode === 'word' ? 'word' : 'line';
      const reducedMotion = uiStore.isReducedMotionPreferred;
      
      // Calculate timing with content awareness
      let speedModifier = 1;
      if (config.adaptToContent) {
        if (isPunctuation) speedModifier = 1.5; // Slower for punctuation
        if (isNumber) speedModifier = 0.8; // Faster for numbers
        if (isCode) speedModifier = 0.7; // Faster for code
        if (complexity > 0.5) speedModifier *= 1.2; // Slower for complex text
      }
      
      const unitDelay = isWhitespace ? 0 : index * config.staggerDelay * speedModifier;
      const unitDuration = isWhitespace ? 1 : config.baseSpeed * speedModifier;
      
      // Determine animation class
      let animationClass = '';
      if (!isWhitespace && !reducedMotion) {
        switch (config.animationStyle) {
          case 'organic':
            animationClass = 'animate-text-organic';
            break;
          case 'digital':
            animationClass = 'animate-text-digital';
            break;
          case 'quantum':
            animationClass = 'animate-text-quantum';
            break;
          case 'terminal':
            animationClass = 'animate-text-terminal';
            break;
          case 'cascade':
            animationClass = 'animate-text-cascade';
            break;
          case 'wave':
            animationClass = 'animate-text-wave';
            break;
          case 'neural':
            animationClass = 'animate-text-neural';
            break;
        }
      }
      
      // Additional style properties
      const style: Partial<CSSProperties> = {
        animationDelay: `${unitDelay}ms`,
        animationDuration: `${unitDuration}ms`,
        opacity: reducedMotion || isWhitespace ? '1' : '0',
      };
      
      // Add wave effect
      if (config.animationStyle === 'wave' && config.waveAmplitude) {
        style['--wave-amplitude'] = `${config.waveAmplitude * 10}px`;
        style['--wave-offset'] = `${index * 0.1}`;
      }
      
      // Add glow effect
      if (config.glowIntensity && (isEmphasis || config.animationStyle === 'neural')) {
        style['--glow-intensity'] = config.glowIntensity.toString();
      }
      
      // Build classes array
      const classes = [
        animationClass,
        `text-unit-${unitType}`,
        isWhitespace ? 'whitespace' : '',
        isPunctuation ? 'punctuation' : '',
        isNumber ? 'number' : '',
        isCode ? 'code' : '',
        isEmphasis ? 'emphasis' : '',
        config.withTrail ? 'with-trail' : '',
        config.particleEffect ? 'with-particles' : '',
      ].filter(Boolean);
      
      units.push({
        type: unitType,
        content: unitContent,
        key: `unit-${animationIdCounter++}-${index}`,
        index,
        style,
        classes,
        metadata: {
          isCode,
          isEmphasis,
          isPunctuation,
          isNumber,
          complexity,
        },
      });
    });
    
    return units;
  };

  const animateText = async (
    text: string,
    configOverride?: Partial<TextRevealConfig>
  ): Promise<void> => {
    resetAnimation();
    await nextTick();
    
    if (!text || text.trim() === '') return;
    
    const effectiveConfig = { ...currentConfig.value, ...(configOverride || {}) };
    const units = prepareUnits(text, effectiveConfig);
    
    if (units.length === 0) return;
    
    animatedUnits.value = units;
    isAnimating.value = true;
    animationStartTime = performance.now();
    
    // Calculate total duration
    const nonEmptyUnits = units.filter(u => u.content.trim() !== '');
    const totalDelay = (nonEmptyUnits.length - 1) * effectiveConfig.staggerDelay;
    const avgDuration = effectiveConfig.baseSpeed;
    const totalDuration = totalDelay + avgDuration;
    estimatedDuration.value = totalDuration;
    
    // Apply max duration if specified
    if (effectiveConfig.maxTotalDuration) {
      estimatedDuration.value = Math.min(totalDuration, effectiveConfig.maxTotalDuration);
    }
    
    // Start progress tracking
    const updateProgress = () => {
      if (!isAnimating.value || isPaused.value) return;
      
      const elapsed = performance.now() - animationStartTime - pausedTime;
      animationProgress.value = Math.min(1, elapsed / estimatedDuration.value);
      
      if (animationProgress.value < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        isAnimating.value = false;
        animationFrameId = null;
      }
    };
    
    animationFrameId = requestAnimationFrame(updateProgress);
    
    // Trigger reactive effects if configured
    if (effectiveConfig.particleEffect) {
      reactiveStore.triggerRipple({ duration: totalDuration, intensity: 0.5 });
    }
    
    if (effectiveConfig.glowIntensity && effectiveConfig.glowIntensity > 0.5) {
      reactiveStore.triggerGlowBurst(effectiveConfig.glowIntensity, totalDuration * 0.5);
    }
  };

  const pauseAnimation = () => {
    if (!isAnimating.value || isPaused.value) return;
    
    isPaused.value = true;
    pausedTime += performance.now() - animationStartTime;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  const resumeAnimation = () => {
    if (!isAnimating.value || !isPaused.value) return;
    
    isPaused.value = false;
    animationStartTime = performance.now();
    
    const updateProgress = () => {
      if (!isAnimating.value || isPaused.value) return;
      
      const elapsed = performance.now() - animationStartTime - pausedTime;
      animationProgress.value = Math.min(1, elapsed / estimatedDuration.value);
      
      if (animationProgress.value < 1) {
        animationFrameId = requestAnimationFrame(updateProgress);
      } else {
        isAnimating.value = false;
        animationFrameId = null;
      }
    };
    
    animationFrameId = requestAnimationFrame(updateProgress);
  };

  const skipAnimation = () => {
    if (!isAnimating.value) return;
    
    // Set all units to visible
    animatedUnits.value = animatedUnits.value.map(unit => ({
      ...unit,
      style: {
        ...unit.style,
        opacity: '1',
        animationDelay: '0ms',
        animationDuration: '0ms',
      },
    }));
    
    animationProgress.value = 1;
    isAnimating.value = false;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  };

  // Watch for state changes to adapt animation style
  watch(() => reactiveStore.appState, () => {
    if (isAnimating.value && currentConfig.value.adaptToState) {
      // Update animation style for remaining units
      const currentIndex = Math.floor(animationProgress.value * animatedUnits.value.length);
      const remainingUnits = animatedUnits.value.slice(currentIndex);
      
      if (remainingUnits.length > 0) {
        const newConfig = { ...currentConfig.value };
        const processedUnits = prepareUnits(
          remainingUnits.map(u => u.content).join(''),
          newConfig
        );
        
        // Update remaining units with new style
        animatedUnits.value = [
          ...animatedUnits.value.slice(0, currentIndex),
          ...processedUnits,
        ];
      }
    }
  });

  return {
    animatedUnits,
    isAnimating: readonly(isAnimating),
    animationProgress: readonly(animationProgress),
    estimatedDuration: readonly(estimatedDuration),
    animateText,
    pauseAnimation,
    resumeAnimation,
    resetAnimation,
    skipAnimation,
  };
}