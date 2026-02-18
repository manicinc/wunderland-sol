---
id: icons-overview
slug: icons-overview
title: Icons Overview
version: "1.0.0"
difficulty: beginner
taxonomy:
  subjects:
    - design
  topics:
    - icons
    - lucide
tags:
  - icons
  - getting-started
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: An overview of the Lucide icon system used in Quarry.
---

# 🎯 Icons Overview

Quarry uses **Lucide Icons** - a beautiful, consistent, and open-source icon library with over 1,500 icons.

## How to Use Icons

In your `weave.yaml` or `loom.yaml`, specify the icon name:

```yaml
style:
  icon: BookOpen
```

## Icon Categories

### 📚 Knowledge & Learning
Perfect for educational content, documentation, and learning resources.

| Icon Name | Use Case |
|-----------|----------|
| `BookOpen` | General reading, documentation |
| `Book` | References, manuals |
| `GraduationCap` | Courses, certifications |
| `Library` | Collections, archives |
| `Lightbulb` | Tips, ideas, insights |
| `Brain` | Concepts, thinking |
| `Sparkles` | New features, highlights |
| `Star` | Favorites, important |

### 💻 Technology & Code
Ideal for technical documentation, programming guides, and DevOps content.

| Icon Name | Use Case |
|-----------|----------|
| `Code` | Programming, source code |
| `Terminal` | CLI, shell commands |
| `Cpu` | Hardware, processing |
| `Server` | Backend, infrastructure |
| `Database` | Data storage, SQL |
| `Cloud` | Cloud services, deployment |
| `Wifi` | Networking, connectivity |
| `Monitor` | Displays, UI/UX |

### 🔬 Science & Math
Great for scientific documentation, research, and analytical content.

| Icon Name | Use Case |
|-----------|----------|
| `Atom` | Physics, chemistry |
| `FlaskConical` | Experiments, labs |
| `Microscope` | Research, analysis |
| `Dna` | Biology, genetics |
| `Calculator` | Mathematics, calculations |
| `Sigma` | Statistics, summation |
| `BarChart` | Data visualization |

## Using Emoji Instead

If you prefer emoji, you can use the `emoji` field instead of `icon`:

```yaml
style:
  emoji: "📚"
```

> **Note:** Use either `icon` OR `emoji`, not both. If both are specified, emoji takes precedence.

## Popular Icon Combinations

Here are some common weave/loom themes with recommended icons:

| Theme | Icon | Accent Color |
|-------|------|--------------|
| Getting Started | `Rocket` | `#22c55e` (green) |
| API Reference | `Code` | `#3b82f6` (blue) |
| Tutorials | `GraduationCap` | `#8b5cf6` (purple) |
| Troubleshooting | `Wrench` | `#f59e0b` (amber) |
| Security | `Shield` | `#ef4444` (red) |
| Performance | `Zap` | `#eab308` (yellow) |

---

**Next:** [Popular Icons →](./popular-icons.md)


















