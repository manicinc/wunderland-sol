---
id: color-themes-intro
slug: color-themes-introduction
title: Color Themes Introduction
version: "1.0.0"
difficulty: beginner
taxonomy:
  subjects:
    - design
  topics:
    - colors
    - themes
tags:
  - colors
  - themes
  - styling
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: Learn how to apply custom color themes to your weaves and looms.
---

# 🎨 Color Themes Introduction

Colors are a powerful way to create visual hierarchy and make your knowledge base more navigable. Quarry supports several color customization options.

## Color Properties

### `accentColor`
The primary highlight color used for:
- Badges and labels
- Buttons and interactive elements
- Active states and selections
- Progress indicators

```yaml
style:
  accentColor: "#3b82f6"  # Blue
```

### `backgroundColor`
The card/container background color:

```yaml
style:
  backgroundColor: "#eff6ff"  # Light blue
```

### `borderColor`
Optional border color for the card:

```yaml
style:
  borderColor: "#93c5fd"  # Medium blue
```

### `textColor`
Override the default text color:

```yaml
style:
  textColor: "#1e3a8a"  # Dark blue
```

### `darkText`
Use dark text on light backgrounds:

```yaml
style:
  darkText: true
```

## Recommended Color Palettes

Here are some battle-tested color combinations:

### 🔵 Ocean Blue
```yaml
style:
  accentColor: "#0ea5e9"
  backgroundColor: "#f0f9ff"
  darkText: true
```

### 💜 Royal Purple
```yaml
style:
  accentColor: "#8b5cf6"
  backgroundColor: "#faf5ff"
  darkText: true
```

### 🟢 Forest Green
```yaml
style:
  accentColor: "#22c55e"
  backgroundColor: "#f0fdf4"
  darkText: true
```

### 🟠 Warm Amber
```yaml
style:
  accentColor: "#f59e0b"
  backgroundColor: "#fffbeb"
  darkText: true
```

### 🔴 Ruby Red
```yaml
style:
  accentColor: "#ef4444"
  backgroundColor: "#fef2f2"
  darkText: true
```

### 🩷 Soft Pink
```yaml
style:
  accentColor: "#ec4899"
  backgroundColor: "#fdf2f8"
  darkText: true
```

---

**Next:** [Color Palettes →](./palettes.md)


















