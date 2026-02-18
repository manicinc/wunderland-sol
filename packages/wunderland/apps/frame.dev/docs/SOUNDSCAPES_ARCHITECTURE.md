# Soundscapes Architecture

Technical architecture documentation for the audio-reactive soundscape system.

## File Structure

```
components/quarry/ui/soundscapes/
├── index.ts                          # Public API exports
├── types.ts                          # Types, constants, utilities
├── hooks/
│   └── useAudioReactivity.ts         # Audio processing hook
├── shared/
│   └── SoundscapeContainer.tsx       # Base container component
└── scenes/
    ├── RainScene.tsx                 # Rain/window scene
    ├── CafeScene.tsx                 # Coffee shop scene
    ├── ForestScene.tsx               # Woodland scene
    ├── OceanScene.tsx                # Beach/waves scene
    ├── FireplaceScene.tsx            # Fireplace scene
    ├── LofiScene.tsx                 # Lo-fi study room
    └── WhiteNoiseScene.tsx           # Static TV scene
```

## Component Hierarchy

```
SoundscapeContainer (base wrapper)
├── Theme overlays (terminal phosphor, sepia filter)
├── Vignette overlay
├── Playing indicator
├── Overlay slot
└── Scene content
    └── [SceneComponent]
        ├── Background layers
        ├── Animated elements
        └── Foreground overlays
```

## Core Types

### SoundscapeSceneProps

```typescript
interface SoundscapeSceneProps {
  analyser: AnalyserNode | null  // Web Audio analyser
  isPlaying: boolean             // Audio playback state
  width?: number                 // Scene width (default: 400)
  height?: number                // Scene height (auto from ratio)
  isDark?: boolean               // Dark mode (deprecated)
  theme?: ThemeName              // Full theme name
  className?: string             // Additional CSS classes
  reducedMotion?: boolean        // Disable animations
}
```

### AudioReactiveData

```typescript
interface AudioReactiveData {
  amplitude: number              // 0-1, weighted average
  bass: number                   // 0-1, low frequencies (0-10%)
  mid: number                    // 0-1, mid frequencies (10-50%)
  high: number                   // 0-1, high frequencies (50-100%)
  frequencyData: Uint8Array | null  // Raw frequency data
}
```

### SoundscapePalette

```typescript
interface SoundscapePalette {
  primary: string     // Main accent color (hex)
  secondary: string   // Secondary color (hex)
  accent: string      // Highlight color (hex)
  background: string  // Background color (hex)
  glow: string        // Glow color (rgba)
}
```

### ThemeStyleConfig

```typescript
interface ThemeStyleConfig {
  isTerminal: boolean    // Terminal theme flag
  isSepia: boolean       // Sepia theme flag
  isOceanic: boolean     // Oceanic theme flag
  isDark: boolean        // Dark variant flag
  phosphorColor: string  // Terminal phosphor rgba
  glowIntensity: number  // Glow multiplier (0.7-1.2)
}
```

## Web Audio Integration

### AnalyserNode Setup

The soundscape system expects a Web Audio API `AnalyserNode` for audio reactivity:

```typescript
// In audio source (e.g., ambienceSounds.ts)
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
analyser.fftSize = 256  // 128 frequency bins

// Connect: source → analyser → destination
source.connect(analyser)
analyser.connect(audioContext.destination)
```

### Frequency Processing

The `useAudioReactivity` hook processes frequency data into usable bands:

```typescript
// Band ranges (percentage of frequencyBinCount)
const DEFAULT_OPTIONS = {
  bassRange: [0, 0.1],     // 0-10%: bass frequencies
  midRange: [0.1, 0.5],    // 10-50%: mid frequencies
  highRange: [0.5, 1.0],   // 50-100%: high frequencies
}

// Amplitude is weighted average
amplitude = bass * 0.4 + mid * 0.4 + high * 0.2
```

### Smoothing

Values are smoothed to prevent jitter:

```typescript
function smoothValue(current: number, target: number, factor: number = 0.1) {
  return current + (target - current) * factor
}
```

## Animation System

### Animation Loop

Each scene uses `requestAnimationFrame` for smooth updates:

```typescript
useEffect(() => {
  let running = true

  const animate = (timestamp: number) => {
    if (!running) return

    // Throttle based on updateRate
    if (timestamp - lastUpdate >= updateRate) {
      processAudio()
      lastUpdate = timestamp
    }

    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)

  return () => { running = false }
}, [])
```

### GPU-Accelerated Properties

All animations use transform/opacity for GPU acceleration:

```css
/* Particle motion */
transform: translateY(100px) rotate(10deg);
opacity: 0.8;

/* Filter effects */
filter: blur(4px);
```

### Framer Motion Integration

Complex animations use Framer Motion:

```tsx
<motion.div
  animate={{
    y: [0, height],
    opacity: [1, 0],
  }}
  transition={{
    duration: 2,
    repeat: Infinity,
    ease: 'linear',
  }}
/>
```

## Theme System

### Palette Structure

Each soundscape has palettes for all 8 themes:

```typescript
THEMED_SOUNDSCAPE_PALETTES = {
  rain: {
    light: { primary: '#3b82f6', ... },
    dark: { primary: '#60a5fa', ... },
    'sepia-light': { primary: '#8b7355', ... },
    'sepia-dark': { primary: '#a89070', ... },
    'terminal-light': { primary: '#ffb000', ... },
    'terminal-dark': { primary: '#00ff00', ... },
    'oceanic-light': { primary: '#0e7490', ... },
    'oceanic-dark': { primary: '#22d3ee', ... },
  },
  // ... other soundscapes
}
```

### Theme Detection

Helper functions detect theme category:

```typescript
function getThemeStyleConfig(theme?: ThemeName | null): ThemeStyleConfig {
  return {
    isTerminal: theme?.includes('terminal') ?? false,
    isSepia: theme?.includes('sepia') ?? false,
    isOceanic: theme?.includes('oceanic') ?? false,
    isDark: theme ? isDarkTheme(theme) : true,
    phosphorColor: getPhosphorColor(theme),
    glowIntensity: getGlowIntensity(theme),
  }
}
```

### Theme Overlays

Themes apply visual overlays in SoundscapeContainer:

```tsx
{/* Terminal phosphor glow */}
{themeConfig.isTerminal && (
  <div style={{ background: phosphorColor, mixBlendMode: 'screen' }} />
)}

{/* Sepia warm filter */}
{themeConfig.isSepia && (
  <div style={{ background: 'rgba(180, 140, 100, 0.05)', mixBlendMode: 'multiply' }} />
)}
```

## Scene Architecture

### Scene Composition

Each scene follows a layered composition:

```tsx
function RainScene(props) {
  return (
    <SoundscapeContainer soundscapeType="rain" {...props}>
      <SkyBackground />      {/* Layer 1: Static background */}
      <Clouds />             {/* Layer 2: Slow-moving clouds */}
      <CitySilhouette />     {/* Layer 3: Static silhouette */}
      <Puddles />            {/* Layer 4: Animated ripples */}
      <RainDrops />          {/* Layer 5: Falling particles */}
      <Condensation />       {/* Layer 6: Static drops */}
      <GlassOverlay />       {/* Layer 7: Reflections */}
      <WindowFrame />        {/* Layer 8: Frame overlay */}
      <MistOverlay />        {/* Layer 9: Audio-reactive mist */}
    </SoundscapeContainer>
  )
}
```

### Particle Systems

Scenes with particles use generated arrays:

```typescript
interface Particle {
  id: string
  x: number      // 0-1 normalized position
  y: number      // 0-1 normalized position
  size: number   // Particle size
  opacity: number
  delay: number  // Animation delay
  duration: number
}

function createParticles(count: number, prefix: string): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i}-${Date.now()}`,
    x: Math.random(),
    y: Math.random(),
    size: lerp(minSize, maxSize, Math.random()),
    opacity: lerp(minOpacity, maxOpacity, Math.random()),
    delay: Math.random() * maxDelay,
    duration: lerp(minDuration, maxDuration, Math.random()),
  }))
}
```

### Audio-Reactive Elements

Elements respond to audio through audioLerp:

```typescript
function audioLerp(min: number, max: number, value: number, sensitivity = 1) {
  const clamped = Math.min(1, Math.max(0, value * sensitivity))
  return min + (max - min) * clamped
}

// Usage in scene
const rainIntensity = audioLerp(0.4, 1, amplitude + bass * 0.2)
const activeDropCount = Math.floor(totalDrops * rainIntensity)
```

## Performance Considerations

### Memory Management

- Particles are generated once on mount with `useMemo`
- Ripples use a sliding window (max 20-30 active)
- RAF callbacks are properly cleaned up

### Render Optimization

- SVG elements use `key` props for efficient reconciliation
- Complex gradients defined once in `<defs>`
- Heavy components wrapped in `React.memo`

### Animation Throttling

```typescript
const DEFAULT_OPTIONS = {
  updateRate: 16,  // ~60fps, increase for less frequent updates
  smoothing: 0.15, // Higher = smoother but more latency
}
```

## Testing Strategy

### Unit Tests

Test pure functions and hooks:

```typescript
describe('audioLerp', () => {
  it('returns min when value is 0', () => {
    expect(audioLerp(10, 100, 0)).toBe(10)
  })

  it('returns max when value is 1', () => {
    expect(audioLerp(10, 100, 1)).toBe(100)
  })
})
```

### Component Tests

Test rendering and interactions:

```typescript
describe('SoundscapeContainer', () => {
  it('renders children', () => {
    render(<SoundscapeContainer soundscapeType="rain">
      <div data-testid="child">Content</div>
    </SoundscapeContainer>)

    expect(screen.getByTestId('child')).toBeInTheDocument()
  })
})
```

### Mocking

Test utilities for Web Audio:

```typescript
function createMockAnalyserNode(options = {}) {
  return {
    frequencyBinCount: 256,
    getByteFrequencyData: vi.fn((array) => {
      array.fill(options.fillValue ?? 128)
    }),
    // ... other methods
  }
}
```

## Extension Points

### Adding New Scenes

1. Create scene file in `scenes/`
2. Export from `index.ts`
3. Add to `SOUNDSCAPE_SCENES` map
4. Add palettes to `THEMED_SOUNDSCAPE_PALETTES`

### Custom Audio Bands

```typescript
const { getFrequencyRange } = useAudioReactivity(analyser, isPlaying, {
  // Define custom ranges
  bassRange: [0, 0.05],  // Narrow bass
  midRange: [0.05, 0.3],
  highRange: [0.3, 1.0],
})

// Or query arbitrary ranges
const subBass = getFrequencyRange(0, 0.03)
const presence = getFrequencyRange(0.4, 0.6)
```

### Custom Theme Palettes

```typescript
// Extend THEMED_SOUNDSCAPE_PALETTES
import { THEMED_SOUNDSCAPE_PALETTES } from '@/components/quarry/ui/soundscapes'

const customPalettes = {
  ...THEMED_SOUNDSCAPE_PALETTES,
  rain: {
    ...THEMED_SOUNDSCAPE_PALETTES.rain,
    'my-custom-theme': {
      primary: '#custom',
      secondary: '#colors',
      accent: '#here',
      background: '#value',
      glow: 'rgba(custom, rgba)',
    },
  },
}
```

## Dependencies

- **framer-motion**: Complex animations and AnimatePresence
- **next-themes**: Theme detection via useTheme hook
- **@/lib/utils**: cn() utility for classNames
- **@/types/theme**: ThemeName type and theme helpers
