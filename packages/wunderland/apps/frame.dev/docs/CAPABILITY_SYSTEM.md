# Quarry Codex Capability Detection System

## Philosophy

**Screen size determines LAYOUT, not capability.**  
**Device capability determines FEATURES, not layout.**

This means:
- A flagship iPhone gets **full features** in a mobile layout
- A budget Chromebook gets **reduced effects** in a desktop layout
- User preferences **always** override automatic detection

## Architecture

### 1. useDeviceCapabilities Hook

Located at `components/quarry/hooks/useDeviceCapabilities.ts`

Detects:
- **Hardware**: CPU cores, device memory, GPU support
- **Display**: Screen size, pixel density, touch support
- **Network**: Connection type, bandwidth, data saver mode
- **Browser**: WebGL, WebWorker, Service Worker support
- **User Preferences**: Reduced motion, data saver

Returns:
```typescript
{
  capabilities: DeviceCapabilities,  // Raw detected values
  tier: PerformanceTier,             // 'high' | 'medium' | 'low' | 'minimal'
  viewport: { isMobile, isTablet, isDesktop, isUltraWide },
  shouldEnable: (feature: FeatureFlag) => boolean,
  setTierOverride: (tier) => void,   // User override
}
```

### 2. Performance Tiers

| Tier | Score Range | Typical Device |
|------|-------------|----------------|
| **High** | 80-100 | Flagship phone, modern laptop, desktop |
| **Medium** | 55-79 | Mid-range phone, older laptop |
| **Low** | 30-54 | Budget phone, weak laptop, old hardware |
| **Minimal** | 0-29 | Very old devices, data saver mode |

### 3. Feature Flags

Features are enabled based on tier, not screen size:

| Feature | Min Tier | Requirements |
|---------|----------|--------------|
| `complexAnimations` | medium | - |
| `d3PhysicsSimulation` | high | - |
| `backgroundEffects` | medium | - |
| `syntaxHighlighting` | low | Important for code |
| `imagePreloading` | medium | Good network |
| `virtualScrolling` | low | Helps performance |
| `realtimeSearch` | medium | WebWorker |
| `aiFeatures` | low | Server-side |
| `offlineSupport` | minimal | Always available |
| `hapticFeedback` | minimal | Always available |

### 4. Layout Configuration

Located at `components/quarry/lib/responsiveConfig.ts`

Layout is purely viewport-based:

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Single panel, bottom nav, overlay sidebar |
| Tablet | 768-1023px | Single panel, overlay sidebar |
| Desktop | 1024-1599px | Two panels, inline sidebar |
| Ultra-wide | ≥ 1600px | Three panels, all visible |

## Usage

### In Components

```tsx
import { useDeviceCapabilities } from '@/components/codex'

function MyComponent() {
  const { tier, shouldEnable, viewport } = useDeviceCapabilities()
  
  // Feature-based (capability)
  const showFancyAnimation = shouldEnable('complexAnimations')
  
  // Layout-based (viewport)
  const showBottomNav = viewport.isMobile
  
  return (
    <div>
      {showFancyAnimation && <FancyParticles />}
      {showBottomNav && <BottomNav />}
    </div>
  )
}
```

### Animation Helpers

```tsx
import { getAnimationVariants, getContainerVariants } from '@/components/codex'

function AnimatedList({ tier, items }) {
  const variants = getAnimationVariants(tier)
  const containerVariants = getContainerVariants(tier)
  
  return (
    <motion.ul variants={containerVariants} initial="hidden" animate="visible">
      {items.map(item => (
        <motion.li key={item.id} variants={variants}>
          {item.content}
        </motion.li>
      ))}
    </motion.ul>
  )
}
```

### Effect Classes

```tsx
import { getEffectClasses } from '@/components/codex'

function Panel({ tier }) {
  const effects = getEffectClasses(tier)
  // Returns 'backdrop-blur-xl shadow-theme-md' for high tier
  // Returns '' for minimal tier
  
  return <div className={`bg-white/50 ${effects}`}>...</div>
}
```

## User Override

Users can override automatic detection via:

1. **UI**: `PerformanceSettings` component
2. **localStorage**: `quarry-codex-performance-tier`

```tsx
const { setTierOverride, tierOverride } = useDeviceCapabilities()

// Force low-power mode
setTierOverride('low')

// Reset to auto-detect
setTierOverride(null)
```

## Network Awareness

The system respects:
- `navigator.connection.saveData` - Data saver mode
- Connection type (2G, 3G, 4G, WiFi)
- Effective bandwidth

Features like image preloading are disabled on slow/metered connections.

## Reduced Motion

When `prefers-reduced-motion: reduce` is set:
- `complexAnimations` is disabled
- `backgroundEffects` is disabled
- Animation durations are shortened

## Best Practices

1. **Don't assume mobile = slow**
   ```tsx
   // ❌ Bad
   if (viewport.isMobile) disableAnimations()
   
   // ✅ Good
   if (!shouldEnable('complexAnimations')) disableAnimations()
   ```

2. **Layout vs Capability**
   ```tsx
   // Layout decisions (use viewport)
   const showDrawer = viewport.isMobile
   
   // Feature decisions (use capability)
   const useSpringPhysics = shouldEnable('complexAnimations')
   ```

3. **Graceful Degradation**
   ```tsx
   // Always provide a fallback
   {shouldEnable('d3PhysicsSimulation') ? (
     <LiveForceGraph />
   ) : (
     <StaticGraphImage />
   )}
   ```

4. **Test All Tiers**
   Use the Performance Settings panel to test each tier manually.

## Score Calculation

The tier score (0-100) is calculated from:

| Factor | Max Points |
|--------|------------|
| CPU Cores (8+ = 20, 4+ = 15, 2+ = 10) | 20 |
| Memory (8GB+ = 20, 4GB+ = 15, 2GB+ = 10) | 20 |
| Screen Width (1920+ = 15, 1280+ = 12, 768+ = 8) | 15 |
| High DPI (2x+ = 5) | 5 |
| Network (WiFi/Ethernet = 20, 4G = 15, 3G = 10) | 20 |
| WebGL Support | 8 |
| WebWorker Support | 6 |
| IntersectionObserver | 4 |
| ServiceWorker | 2 |

**Penalties:**
- Data Saver Mode: -20
- Reduced Motion: -10

