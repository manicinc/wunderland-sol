---
id: thumbnails-guide
slug: thumbnails-guide
title: Using Thumbnails
version: "1.0.0"
difficulty: intermediate
taxonomy:
  subjects:
    - design
  topics:
    - images
    - thumbnails
tags:
  - images
  - thumbnails
  - branding
publishing:
  status: published
  lastUpdated: "2025-01-27"
summary: How to add custom thumbnail images to weaves and looms.
---

# 🖼️ Using Thumbnails

Thumbnails provide a small, recognizable icon for your weave or loom. They appear in the sidebar navigation and breadcrumbs.

## Recommended Specs

| Property | Value |
|----------|-------|
| **Size** | 64×64 pixels (minimum) |
| **Format** | PNG or WebP (with transparency) |
| **File Size** | Under 10KB |
| **Style** | Simple, recognizable at small sizes |

## Usage

```yaml
style:
  thumbnail: "https://example.com/icons/my-icon.png"
```

## Where Thumbnails Appear

1. **Sidebar Navigation** - Next to the weave/loom name
2. **Breadcrumbs** - In the navigation trail
3. **Knowledge Graph** - As node icons
4. **Search Results** - Alongside result titles

## Best Practices

### ✅ Do
- Use simple, bold designs
- Ensure good contrast
- Use consistent style across related content
- Optimize file size

### ❌ Don't
- Use complex images with fine details
- Use photos (they don't scale well)
- Mix vastly different styles
- Use oversized files

## Hosting Options

1. **Same Repository** - Store in `/public/images/`
   ```yaml
   thumbnail: "/images/weaves/my-icon.png"
   ```

2. **CDN** - Use a CDN for better performance
   ```yaml
   thumbnail: "https://cdn.example.com/icons/my-icon.png"
   ```

3. **GitHub Raw** - Direct link to repo asset
   ```yaml
   thumbnail: "https://raw.githubusercontent.com/user/repo/main/assets/icon.png"
   ```

## Fallback Behavior

If no thumbnail is specified:
1. Uses `emoji` if provided
2. Uses `icon` (Lucide icon) if provided
3. Falls back to default level icon (Layers for weave, Box for loom)

---

**Next:** [Background Images →](./backgrounds.md)


















