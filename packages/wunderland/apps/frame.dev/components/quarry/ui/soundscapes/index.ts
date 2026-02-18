/**
 * Soundscape Components
 * @module components/quarry/ui/soundscapes
 *
 * Audio-reactive animated SVG scenes for ambient soundscapes.
 * Each scene responds to Web Audio API AnalyserNode data for immersive visuals.
 *
 * @example
 * ```tsx
 * import { RainScene, useAudioReactivity, SoundscapeContainer } from '@/components/quarry/ui/soundscapes'
 *
 * function MyComponent() {
 *   const { analyser, isPlaying } = useAmbienceSounds()
 *
 *   return (
 *     <SoundscapeContainer soundscape="rain" isPlaying={isPlaying}>
 *       <RainScene analyser={analyser} isPlaying={isPlaying} />
 *     </SoundscapeContainer>
 *   )
 * }
 * ```
 */

// ============================================================================
// TYPES
// ============================================================================

export type {
  SoundscapeSceneProps,
  AudioReactiveData,
  Particle,
  MovingParticle,
  SoundscapeSceneComponent,
  SoundscapeSceneMap,
  SoundscapePalette,
  ThemeStyleConfig,
} from './types'

export {
  DEFAULT_AUDIO_DATA,
  EASING,
  DURATIONS,
  SOUNDSCAPE_PALETTES,
  THEMED_SOUNDSCAPE_PALETTES,
  DEFAULT_SCENE_DIMENSIONS,
  SCENE_ASPECT_RATIO,
  generateParticleId,
  createParticles,
  audioLerp,
  smoothValue,
  getSoundscapePalette,
  getThemeStyleConfig,
} from './types'

// ============================================================================
// HOOKS
// ============================================================================

export {
  useAudioReactivity,
  useBeatDetection,
  useAudioStyles,
} from './hooks/useAudioReactivity'

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

export {
  SoundscapeContainer,
  SoundscapeLoading,
  SoundscapeError,
  SoundscapePlaceholder,
} from './shared/SoundscapeContainer'

export { default as HolographicVisualizer } from './HolographicVisualizer'
export type { HolographicVisualizerProps } from './HolographicVisualizer'

// ============================================================================
// SCENE COMPONENTS
// ============================================================================

export { WhiteNoiseScene } from './scenes/WhiteNoiseScene'
export { FireplaceScene } from './scenes/FireplaceScene'
export { RainScene } from './scenes/RainScene'
export { OceanScene } from './scenes/OceanScene'
export { ForestScene } from './scenes/ForestScene'
export { CafeScene } from './scenes/CafeScene'
export { LofiScene } from './scenes/LofiScene'

// ============================================================================
// SCENE MAP
// ============================================================================

import type { SoundscapeType } from '@/lib/audio/ambienceSounds'
import type { SoundscapeSceneComponent } from './types'
import { WhiteNoiseScene } from './scenes/WhiteNoiseScene'
import { FireplaceScene } from './scenes/FireplaceScene'
import { RainScene } from './scenes/RainScene'
import { OceanScene } from './scenes/OceanScene'
import { ForestScene } from './scenes/ForestScene'
import { CafeScene } from './scenes/CafeScene'
import { LofiScene } from './scenes/LofiScene'

/**
 * Map of soundscape types to their scene components
 */
export const SOUNDSCAPE_SCENES: Record<
  Exclude<SoundscapeType, 'none'>,
  SoundscapeSceneComponent
> = {
  'white-noise': WhiteNoiseScene,
  fireplace: FireplaceScene,
  rain: RainScene,
  ocean: OceanScene,
  forest: ForestScene,
  cafe: CafeScene,
  lofi: LofiScene,
}

/**
 * Get the scene component for a soundscape type
 */
export function getSoundscapeScene(
  soundscape: SoundscapeType
): SoundscapeSceneComponent | null {
  if (soundscape === 'none') return null
  return SOUNDSCAPE_SCENES[soundscape] ?? null
}

/**
 * Check if a soundscape has a scene
 */
export function hasSoundscapeScene(soundscape: SoundscapeType): boolean {
  return soundscape !== 'none' && soundscape in SOUNDSCAPE_SCENES
}
