---
title: "Storage Modes"
description: "How to choose between GitHub and Local storage modes"
tags: ["storage", "github", "local", "offline", "setup"]
created: "2024-12-22"
updated: "2024-12-28"
status: "published"
author: "FABRIC Team"
---

# Storage Modes

Quarry offers two storage modes, each optimized for different use cases.

## Quick Comparison

| Feature | GitHub Mode | Local Mode |
|---------|-------------|------------|
| Best for | Web version | Desktop app |
| Offline access | With cache enabled | Always |
| Data location | GitHub repository | SQLite database |
| Multi-device sync | Automatic | Manual/git |
| Requires | Internet (initial) | Nothing |

## GitHub Mode (Web)

Best for the web version hosted on GitHub Pages.

**How it works:**
- Fetches content directly from a GitHub repository
- Optional offline cache stores content locally after first sync
- Rate limited: 60 requests/hour (or 5,000 with PAT)

**Setup:**
1. Go to **Settings** > **Content Source**
2. Select **GitHub**
3. (Optional) Enable **offline cache** for offline access
4. (Optional) Add a Personal Access Token for higher rate limits

**Offline Cache:**
When enabled, content is cached locally so the app works without internet after the initial sync. This uses IndexedDB/SQLite to store fetched content.

## Local Mode (Desktop)

Best for the downloadable Electron desktop app.

**How it works:**
- All content stored in a local SQLite database
- Full offline access, no internet required
- Import/export via ZIP archives

**Setup:**
1. Go to **Settings** > **Content Source**
2. Select **Local Storage**
3. Use **Import ZIP** to add content from archives

**Adding Content:**
- **Import ZIP**: Download a Quarry archive and import it
- **Create New**: Use the strand editor to create content directly

## Switching Modes

You can switch between modes anytime in Settings. Each mode maintains its own separate data:

- **GitHub mode** reads from the configured repository
- **Local mode** reads from the local SQLite database

Switching modes does not delete or modify existing data - you're simply changing which data source the app reads from.

## Which Should I Use?

- **Using the web app (framers.dev)?** Use GitHub mode with offline cache enabled
- **Using the desktop app?** Use Local mode
- **Want offline access on web?** Enable the offline cache checkbox
- **Sharing a public knowledge base?** Use GitHub mode (your repo is the source of truth)
- **Private notes?** Use Local mode (data stays on your device)


