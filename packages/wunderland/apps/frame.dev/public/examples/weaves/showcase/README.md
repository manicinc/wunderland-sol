---
id: showcase-readme
slug: showcase-introduction
title: Showcase Gallery - Visual Styling Guide
version: "1.0.0"
difficulty: beginner
taxonomy:
  subjects:
    - documentation
    - design
  topics:
    - visual-styling
    - customization
tags:
  - showcase
  - examples
  - getting-started
relationships:
  references:
    - icons-overview
    - color-themes-intro
    - gradients-basics
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: Learn how to customize the visual appearance of weaves and looms using YAML configuration files.
---

# 🎨 Showcase Gallery

Welcome to the **Showcase Gallery** weave! This collection demonstrates all the visual customization options available for weaves and looms in Quarry.

## What You'll Learn

This weave contains five looms, each focusing on different aspects of Quarry:

### ✨ [Dynamic Documents](./dynamic-documents/) ⭐ NEW
Explore **Embark-style dynamic documents** with @mentions, formulas, maps, and calendars. Includes live trip planning and budget tracking examples inspired by [Ink & Switch research](https://inkandswitch.com/embark).

### 📁 [Icons Gallery](./icons-gallery/)
Explore the vast library of **Lucide icons** available for your weaves and looms. With over 1,500 icons to choose from, you can find the perfect visual representation for any topic.

### 🎨 [Color Themes](./color-themes/)
Learn how to apply custom **accent colors**, **background colors**, and **border colors** to create cohesive visual themes that match your content.

### 🖼️ [Images & Media](./images-media/)
Discover how to use **thumbnails**, **cover images**, and **background images** for rich visual branding of your knowledge collections.

### ✨ [Gradients & Effects](./gradients/)
Master **CSS gradients** and advanced visual effects for stunning, eye-catching presentations.

---

## Quick Start

Every weave and loom can have a YAML configuration file:

- **Weaves**: `weave.yaml` in the weave root directory
- **Looms**: `loom.yaml` in each loom directory

### Minimal Example

```yaml
name: My Custom Loom
description: A brief description

style:
  icon: BookOpen
  accentColor: "#3b82f6"
```

### Full Example

```yaml
name: Advanced Styling Example
description: Demonstrates all available options

style:
  icon: Sparkles
  emoji: "✨"          # Alternative to icon
  accentColor: "#8b5cf6"
  backgroundColor: "#faf5ff"
  backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  backgroundImage: "https://example.com/bg.jpg"
  backgroundOpacity: 0.3
  textColor: "#1f2937"
  borderColor: "#c4b5fd"
  thumbnail: "https://example.com/icon.png"
  coverImage: "https://example.com/cover.jpg"
  darkText: true

metadata:
  author: Your Name
  difficulty: intermediate
  estimatedTime: 30
  tags:
    - example
    - advanced

order: 1
featured: true
hidden: false
```

---

## Available Icons

Quarry uses [Lucide Icons](https://lucide.dev/icons), a beautiful & consistent icon library. Here are some popular choices organized by category:

| Category | Icons |
|----------|-------|
| **Knowledge** | `BookOpen`, `Book`, `GraduationCap`, `Library`, `Lightbulb`, `Brain` |
| **Technology** | `Code`, `Terminal`, `Cpu`, `Server`, `Database`, `Cloud` |
| **Science** | `Atom`, `FlaskConical`, `Microscope`, `Dna`, `Calculator` |
| **Creative** | `Palette`, `Paintbrush`, `Camera`, `Video`, `Music`, `Pen` |
| **Business** | `Briefcase`, `Building`, `DollarSign`, `TrendingUp`, `Target` |
| **Navigation** | `Folder`, `Layers`, `Box`, `Grid`, `Layout`, `Map` |

Browse all icons at [lucide.dev/icons](https://lucide.dev/icons) →

---

## Next Steps

1. Explore each loom in this weave for detailed examples
2. Copy configuration snippets to your own weaves/looms
3. Use the **Edit** button (⚙️) in the sidebar to customize visually
4. **Save Draft** to store changes locally
5. **Publish** to create a GitHub PR with your changes

Happy styling! 🎉


















