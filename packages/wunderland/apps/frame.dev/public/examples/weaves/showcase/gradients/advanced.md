---
id: gradients-advanced
slug: gradients-advanced
title: Advanced Gradients
version: "1.0.0"
difficulty: advanced
taxonomy:
  subjects:
    - design
  topics:
    - css
    - gradients
    - effects
tags:
  - gradients
  - css
  - advanced
relationships:
  prerequisites:
    - gradients-basics
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: Advanced gradient techniques including radial gradients and effects.
---

# 🌟 Advanced Gradients

Take your gradients to the next level with radial gradients, multiple layers, and special effects.

## Radial Gradients

Create circular or elliptical gradients:

```yaml
backgroundGradient: "radial-gradient(circle at center, #8b5cf6, #3b82f6)"
```

### Position Options
- `circle at center` - Centered circle
- `circle at top left` - Corner positioned
- `ellipse at center` - Oval shape
- `circle at 30% 70%` - Custom position

### Examples

**Spotlight Effect**
```yaml
backgroundGradient: "radial-gradient(circle at 30% 30%, #fef3c7 0%, #fef9c3 50%, #fefce8 100%)"
```

**Glow Effect**
```yaml
backgroundGradient: "radial-gradient(ellipse at center, #ddd6fe 0%, #faf5ff 70%, #ffffff 100%)"
```

## Popular Gradient Presets

### 🌅 Sunset
```yaml
style:
  icon: Sunset
  backgroundGradient: "linear-gradient(135deg, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fbbf24 75%, #f59e0b 100%)"
  accentColor: "#d97706"
  darkText: true
```

### 🌊 Ocean
```yaml
style:
  icon: Waves
  backgroundGradient: "linear-gradient(135deg, #ecfeff 0%, #cffafe 25%, #a5f3fc 50%, #67e8f9 75%, #22d3ee 100%)"
  accentColor: "#0891b2"
  darkText: true
```

### 🌸 Sakura
```yaml
style:
  icon: Flower2
  backgroundGradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 33%, #fbcfe8 66%, #f9a8d4 100%)"
  accentColor: "#db2777"
  darkText: true
```

### 🌿 Forest
```yaml
style:
  icon: TreeDeciduous
  backgroundGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 25%, #bbf7d0 50%, #86efac 75%, #4ade80 100%)"
  accentColor: "#16a34a"
  darkText: true
```

### 🔮 Mystic
```yaml
style:
  icon: Sparkles
  backgroundGradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 20%, #e9d5ff 40%, #d8b4fe 60%, #c084fc 80%, #a855f7 100%)"
  accentColor: "#7c3aed"
  darkText: true
```

### 🌙 Midnight
```yaml
style:
  icon: Moon
  backgroundGradient: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)"
  accentColor: "#818cf8"
  textColor: "#e0e7ff"
  darkText: false
```

## Conic Gradients

Create color wheel effects:

```yaml
backgroundGradient: "conic-gradient(from 0deg, #f87171, #fbbf24, #34d399, #60a5fa, #a78bfa, #f87171)"
```

> ⚠️ **Note:** Conic gradients may not render in all contexts. Use sparingly.

## Performance Tips

1. **Keep it simple** - Complex gradients impact rendering
2. **Avoid too many stops** - 3-5 colors is usually enough
3. **Test on mobile** - Ensure gradients look good on smaller screens
4. **Consider dark mode** - Some gradients need adjustment for dark themes

## Gradient Tools

Generate custom gradients with these online tools:
- [cssgradient.io](https://cssgradient.io/)
- [uigradients.com](https://uigradients.com/)
- [gradient.style](https://gradient.style/)

---

**← Previous:** [Gradient Basics](./basics.md)


















