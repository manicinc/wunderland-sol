---
id: gradients-basics
slug: gradients-basics
title: Gradient Basics
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - design
  topics:
    - css
    - gradients
tags:
  - gradients
  - css
  - styling
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: Learn how to create beautiful CSS gradients for your weaves and looms.
---

# ✨ Gradient Basics

CSS gradients allow you to create smooth color transitions that can make your content stand out. Quarry supports any valid CSS gradient string.

## Basic Syntax

```yaml
style:
  backgroundGradient: "linear-gradient(direction, color1, color2)"
```

## Linear Gradients

### Direction Options
- `to right` - Left to right
- `to left` - Right to left
- `to bottom` - Top to bottom (default)
- `to top` - Bottom to top
- `45deg` - Diagonal (any degree value)
- `135deg` - Opposite diagonal

### Examples

**Horizontal Blue**
```yaml
backgroundGradient: "linear-gradient(to right, #3b82f6, #8b5cf6)"
```

**Diagonal Sunset**
```yaml
backgroundGradient: "linear-gradient(135deg, #f97316, #ec4899)"
```

**Vertical Ocean**
```yaml
backgroundGradient: "linear-gradient(to bottom, #06b6d4, #3b82f6)"
```

## Multi-Color Gradients

Add more color stops for complex gradients:

```yaml
backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
```

## Soft Gradients (Recommended)

For readability, use subtle gradients with similar colors:

### Soft Purple
```yaml
style:
  backgroundGradient: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 50%, #ede9fe 100%)"
  accentColor: "#8b5cf6"
  darkText: true
```

### Soft Blue
```yaml
style:
  backgroundGradient: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 50%, #bfdbfe 100%)"
  accentColor: "#3b82f6"
  darkText: true
```

### Soft Green
```yaml
style:
  backgroundGradient: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 50%, #bbf7d0 100%)"
  accentColor: "#22c55e"
  darkText: true
```

## Combining with Other Styles

Gradients work alongside other style properties:

```yaml
style:
  icon: Sparkles
  backgroundGradient: "linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%)"
  accentColor: "#ec4899"
  textColor: "#831843"
  darkText: true
```

---

**Next:** [Advanced Gradients →](./advanced.md)


















