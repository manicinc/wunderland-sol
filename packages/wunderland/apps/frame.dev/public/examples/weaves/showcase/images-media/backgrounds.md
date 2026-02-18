---
id: backgrounds-guide
slug: backgrounds-guide
title: Background Images
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - design
  topics:
    - images
    - backgrounds
tags:
  - images
  - backgrounds
  - styling
relationships:
  prerequisites:
    - thumbnails-guide
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: How to use background images for rich visual branding.
---

# 🌄 Background Images

Background images can transform a simple card into an eye-catching visual element. Use them for featured content or to establish strong visual branding.

## Basic Usage

```yaml
style:
  backgroundImage: "https://example.com/backgrounds/tech-bg.jpg"
  backgroundOpacity: 0.3
```

## Properties

### `backgroundImage`
URL to the background image.

```yaml
backgroundImage: "https://example.com/bg.jpg"
```

### `backgroundOpacity`
Controls the overlay darkness (0-1). Lower values make text more readable.

```yaml
backgroundOpacity: 0.3  # 30% visible, 70% overlay
```

Default is `0.4` if not specified.

## Recommended Specs

| Property | Value |
|----------|-------|
| **Size** | 1200×400 pixels (minimum) |
| **Format** | JPEG or WebP |
| **File Size** | Under 100KB (optimize!) |
| **Style** | Abstract, blurred, or subtle patterns |

## Examples

### Subtle Pattern
```yaml
style:
  icon: Code
  backgroundImage: "/images/patterns/circuit.png"
  backgroundOpacity: 0.15
  accentColor: "#3b82f6"
```

### Bold Hero Image
```yaml
style:
  icon: Mountain
  backgroundImage: "/images/heroes/landscape.jpg"
  backgroundOpacity: 0.4
  accentColor: "#ffffff"
  textColor: "#ffffff"
  darkText: false
```

### Blurred Abstract
```yaml
style:
  icon: Sparkles
  backgroundImage: "/images/abstract/gradient-blur.jpg"
  backgroundOpacity: 0.25
  accentColor: "#8b5cf6"
```

## Tips for Readability

1. **Use low opacity** (0.2-0.4) for text readability
2. **Choose muted images** - avoid high contrast photos
3. **Set explicit text color** when using dark backgrounds
4. **Test both themes** - ensure it works in light and dark mode

## Cover Images

For a banner-style cover (used in expanded views):

```yaml
style:
  coverImage: "https://example.com/covers/my-cover.jpg"
```

Cover images appear:
- At the top of expanded weave/loom views
- In preview cards on hover
- In social media shares (if configured)

---

**← Previous:** [Using Thumbnails](./thumbnails.md)


















