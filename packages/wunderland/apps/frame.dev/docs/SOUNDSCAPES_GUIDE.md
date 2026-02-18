# Soundscapes Guide

Audio-reactive animated scenes for immersive writing experiences.

## Overview

The Soundscapes system provides 7 ambient audio environments, each with its own animated SVG scene that responds to audio frequencies in real-time. The system supports all 8 application themes with theme-specific visual adaptations.

## Available Soundscapes

| Soundscape | Description | Key Visual Elements |
|------------|-------------|---------------------|
| **Rain** | Rainy window view | Falling drops, puddle ripples, clouds, lightning |
| **Cafe** | Cozy coffee shop | Steam, pendant lights, bokeh, people silhouettes |
| **Forest** | Peaceful woodland | Swaying trees, floating leaves, birds, sunlight rays |
| **Ocean** | Beach waves | Wave layers, foam, seagulls, water sparkles |
| **Fireplace** | Crackling fire | Flames, glowing embers, warm ambient light |
| **Lo-fi** | Study room | Spinning vinyl, equalizer bars, plants, city view |
| **White Noise** | Static TV | Noise patterns, scan lines, glitch effects |

## Usage

### Basic Usage

```tsx
import { RainScene, useAudioReactivity } from '@/components/quarry/ui/soundscapes'
import { useAmbienceSounds } from '@/lib/audio/ambienceSounds'

function MyComponent() {
  const { analyser, isPlaying } = useAmbienceSounds()

  return (
    <RainScene
      analyser={analyser}
      isPlaying={isPlaying}
      width={400}
      height={300}
    />
  )
}
```

### With Theme Support

```tsx
import { useTheme } from 'next-themes'
import { RainScene } from '@/components/quarry/ui/soundscapes'

function ThemedScene() {
  const { resolvedTheme } = useTheme()
  const { analyser, isPlaying } = useAmbienceSounds()

  return (
    <RainScene
      analyser={analyser}
      isPlaying={isPlaying}
      theme={resolvedTheme as ThemeName}
      width={400}
      height={300}
    />
  )
}
```

### Using SoundscapeContainer Directly

```tsx
import { SoundscapeContainer, getSoundscapeScene } from '@/components/quarry/ui/soundscapes'

function DynamicScene({ soundscape }) {
  const SceneComponent = getSoundscapeScene(soundscape)

  return (
    <SoundscapeContainer
      soundscapeType={soundscape}
      isPlaying={isPlaying}
      showGlow={true}
      theme={theme}
    >
      {SceneComponent && <SceneComponent analyser={analyser} isPlaying={isPlaying} />}
    </SoundscapeContainer>
  )
}
```

## Audio Reactivity

Scenes respond to audio frequencies through the `useAudioReactivity` hook:

### Frequency Bands

| Band | Frequency Range | Use Case |
|------|-----------------|----------|
| **Bass** | 0-10% | Heavy effects (lightning, wave height) |
| **Mid** | 10-50% | Medium effects (steam, wind) |
| **High** | 50-100% | Light effects (sparkles, leaves) |
| **Amplitude** | Weighted average | Overall intensity |

### Example: Custom Audio-Reactive Element

```tsx
import { useAudioReactivity, audioLerp } from '@/components/quarry/ui/soundscapes'

function AudioReactiveCircle({ analyser, isPlaying }) {
  const { amplitude, bass } = useAudioReactivity(analyser, isPlaying)

  // Radius varies from 10 to 50 based on bass
  const radius = audioLerp(10, 50, bass)

  // Opacity varies from 0.5 to 1 based on amplitude
  const opacity = audioLerp(0.5, 1, amplitude)

  return (
    <circle
      r={radius}
      fill={`rgba(100, 150, 255, ${opacity})`}
    />
  )
}
```

## Theme Support

The soundscape system supports all 8 themes with theme-specific visual adaptations:

### Standard Themes (light, dark)
- Default color palettes
- Standard rounded corners
- Normal glow intensity

### Terminal Themes (terminal-light, terminal-dark)
- Phosphor glow effect (amber for light, green for dark)
- Square corners (no border-radius)
- Increased glow intensity (1.2x)
- CRT vignette overlay

### Sepia Themes (sepia-light, sepia-dark)
- Warm color filter overlay
- Reduced glow intensity (0.7x)
- Vintage paper aesthetic

### Oceanic Themes (oceanic-light, oceanic-dark)
- Cool blue/teal color cast
- Wave-inspired accents
- Deeper shadows

### Getting Theme-Aware Palettes

```tsx
import { getSoundscapePalette, getThemeStyleConfig } from '@/components/quarry/ui/soundscapes'

// Get palette for a soundscape + theme combination
const palette = getSoundscapePalette('rain', 'terminal-dark')
// Returns: { primary, secondary, accent, background, glow }

// Get theme configuration
const themeConfig = getThemeStyleConfig('terminal-dark')
// Returns: { isTerminal, isSepia, isOceanic, isDark, phosphorColor, glowIntensity }
```

## Customization

### Scene Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `analyser` | `AnalyserNode \| null` | `null` | Web Audio analyser for reactivity |
| `isPlaying` | `boolean` | `false` | Whether audio is playing |
| `width` | `number` | `400` | Scene width in pixels |
| `height` | `number` | `300` | Scene height (auto from aspect ratio) |
| `theme` | `ThemeName` | `undefined` | Theme name for styling |
| `isDark` | `boolean` | `true` | Dark mode (deprecated, use theme) |
| `className` | `string` | `''` | Additional CSS classes |
| `reducedMotion` | `boolean` | `false` | Disable animations |

### Container Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `soundscapeType` | `SoundscapeType` | required | Type for palette selection |
| `showGlow` | `boolean` | `true` | Show glow effect when playing |
| `borderRadius` | `number` | `12` | Corner radius (0 for terminal) |
| `overlay` | `ReactNode` | `undefined` | Overlay content slot |
| `onClick` | `() => void` | `undefined` | Click handler |

## Performance

### GPU Acceleration

All animations use GPU-accelerated properties:
- `transform` (translateX, translateY, scale, rotate)
- `opacity`
- `filter` (blur, drop-shadow)

### Reduced Motion

Pass `reducedMotion={true}` to disable animations for users who prefer reduced motion:

```tsx
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches

<RainScene
  analyser={analyser}
  isPlaying={isPlaying}
  reducedMotion={prefersReducedMotion}
/>
```

### Performance Tips

1. **Limit concurrent scenes** - Only render one scene at a time
2. **Throttle audio updates** - Use `updateRate` option in `useAudioReactivity`
3. **Reduce particle counts** - Fewer elements = better performance
4. **Use visibility** - Stop processing when scene is not visible

## Accessibility

- All scenes support `reducedMotion` prop
- Interactive containers have proper ARIA roles
- Keyboard navigation support (Enter/Space for clicks)
- Color contrast maintained across themes

## Testing

```tsx
import { createMockAnalyserNode, setupRAFMock } from '@/__tests__/setup/soundscapeMocks'

describe('MyScene', () => {
  it('responds to audio', () => {
    const analyser = createMockAnalyserNode({ fillValue: 200 })
    const rafMock = setupRAFMock()

    render(<MyScene analyser={analyser} isPlaying={true} />)

    // Simulate animation frames
    act(() => {
      rafMock.tick(16)
      rafMock.tick(32)
    })

    expect(analyser.getByteFrequencyData).toHaveBeenCalled()
  })
})
```

## Integration with Meditation Page

The Soundscapes system is fully integrated with the [Focus page](/quarry/focus) for deep focus sessions. See the [Focus Guide](./FOCUS_GUIDE.md) for details on:

- Deep Focus mode with fullscreen soundscapes
- Background slideshow matched to soundscape type
- Floating widgets for productivity
- Pomodoro timer integration
- Quick capture for notes

### Soundscape-to-Background Mapping

Each soundscape has curated background images:

| Soundscape | Background Categories |
|------------|----------------------|
| Rain | Rain, storm, cozy windows |
| Cafe | Coffee shops, urban, warm interiors |
| Forest | Nature, trees, greenery |
| Ocean | Beaches, waves, seaside |
| Fireplace | Cozy, warm, cabins |
| Lo-fi | Study spaces, night city, aesthetic |
| White Noise | Abstract, minimal, space |

## Troubleshooting

### Scene Not Animating
1. Check that `isPlaying={true}`
2. Verify `analyser` is connected to audio source
3. Ensure `reducedMotion` is not `true`

### Colors Look Wrong
1. Pass correct `theme` prop
2. Check that theme is a valid `ThemeName`
3. Verify CSS variables are not overridden

### Performance Issues
1. Enable reduced motion
2. Reduce scene dimensions
3. Throttle audio updates with higher `updateRate`
4. Ensure only one scene is rendering
