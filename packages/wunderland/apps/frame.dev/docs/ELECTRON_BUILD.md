# Electron Build Guide

This document covers building **Quarry** as a desktop application using Electron.

> **App Identity**: The desktop app is branded as "Quarry" (`productName: Quarry`).

## Architecture

Frame.dev uses a **Next.js standalone server** embedded in Electron:

```
┌─────────────────────────────────────────────┐
│               Electron Main                 │
│  ┌─────────────────────────────────────┐   │
│  │     Next.js Standalone Server       │   │
│  │        (port 3847)                  │   │
│  │  ┌──────────────────────────────┐   │   │
│  │  │   React App (Renderer)       │   │   │
│  │  │   - UI Components            │   │   │
│  │  │   - Client-side logic        │   │   │
│  │  └──────────────────────────────┘   │   │
│  │  ┌──────────────────────────────┐   │   │
│  │  │   Fastify API Server         │   │   │
│  │  │   - REST API                 │   │   │
│  │  │   - Swagger Docs             │   │   │
│  │  └──────────────────────────────┘   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  IPC Handlers:                              │
│  - File system access (fs:*)                │
│  - Settings storage (electron-store)        │
│  - Native dialogs                           │
│  - Window controls                          │
└─────────────────────────────────────────────┘
```

## Quick Start

### Development Mode

```bash
# Start Next.js dev server + Electron together
pnpm electron:dev
```

This runs:
1. Next.js dev server on port 3000
2. Electron connecting to localhost:3000

### Production Build

```bash
# Build for macOS (unsigned, for local testing)
pnpm electron:dist:mac:unsigned

# Build for macOS (signed, requires Apple Developer cert)
pnpm electron:dist:mac

# Build for Windows
pnpm electron:dist:win

# Build for Linux
pnpm electron:dist:linux
```

## Build Output

After building, find your distributable in:

| Platform | Location | Size |
|----------|----------|------|
| macOS DMG | `dist/Quarry-0.1.0-universal.dmg` | ~208MB |
| macOS ZIP | `dist/Quarry-0.1.0-universal-mac.zip` | ~201MB |
| macOS App | `dist/mac-universal/Quarry.app` | ~600MB |
| Windows Installer | `dist/Quarry Setup *.exe` | TBD |
| Linux AppImage | `dist/Quarry-*.AppImage` | TBD |

## Key Configuration Files

### electron-builder.yml

```yaml
appId: dev.frame.quarry
productName: Quarry

# Disable asar to allow spawning Next.js server as child process
asar: false

files:
  - "electron-dist/**/*"      # Compiled Electron main process
  - "package.json"
  - ".next/standalone/**/*"   # Next.js standalone server
  - ".next/static/**/*"       # Static assets
  - "public/**/*"
  - "!node_modules"           # Exclude root node_modules
  - "!.next/cache"            # Exclude build cache
  - "!src"                    # Exclude source files
  - "!__tests__"              # Exclude test files

extraResources:
  # Copy static files for Next.js standalone
  - from: ".next/static"
    to: "app/.next/static"
  - from: "public"
    to: "app/public"
  # Copy electron-store (main process runtime dependency)
  - from: "node_modules/electron-store"
    to: "app/node_modules/electron-store"

mac:
  icon: build/icon.icns
  category: public.app-category.productivity
  darkModeSupport: true
  hardenedRuntime: true
```

### next.config.mjs

When `ELECTRON_BUILD=true`:
- Output mode: `standalone` (creates minimal server bundle)
- Includes API routes (Fastify server)

### package.json pnpm overrides

```json
{
  "pnpm": {
    "overrides": {
      "onnxruntime-node": "npm:empty-npm-package@1.0.0"
    }
  }
}
```

This excludes the 211MB `onnxruntime-node` native binary (only `onnxruntime-web` is used in browser).

## IPC APIs Available

### Settings (electron-store)

```typescript
// Renderer process
window.electronAPI.settings.get('apiKeys')
window.electronAPI.settings.set('apiKeys', { openai: { key: '...' } })
window.electronAPI.settings.delete('apiKeys')
window.electronAPI.settings.getAll()
```

### File System

```typescript
window.electronAPI.fs.readFile(path)
window.electronAPI.fs.writeFile(path, content)
window.electronAPI.fs.readDir(path)
window.electronAPI.fs.mkdir(path)
window.electronAPI.fs.exists(path)
window.electronAPI.fs.stat(path)
window.electronAPI.fs.delete(path)
```

### Dialogs

```typescript
window.electronAPI.selectDirectory()  // Returns path or null
window.electronAPI.selectFile(filters)
```

### Window Controls

```typescript
window.electronAPI.minimize()
window.electronAPI.maximize()
window.electronAPI.close()
```

## Embedded Features

### REST API

The embedded Fastify server provides:
- Full REST API at `http://localhost:3847/api/v1`
- Swagger documentation at `http://localhost:3847/api/v1/docs`
- Token-based authentication
- Rate limiting (100 req/min)

### ML/AI Features

All ML features work in the Electron app:
- Semantic search (ONNX Runtime Web)
- Object detection (TensorFlow.js)
- Q&A, OCR, embeddings (HuggingFace Transformers)

These are dynamically loaded via the browser (WebAssembly).

## App Icons

App icons are stored in the `build/` directory:

| File | Platform | Notes |
|------|----------|-------|
| `build/icon.icns` | macOS | Generated from source PNG via `sips` + `iconutil` |
| `build/icon.png` | Windows | 512x512 PNG fallback |
| `build/icons/512x512.png` | Linux | Required sizes: 512, 256, 128 |

### Generating Icons from Source

```bash
# From a 512x512 source PNG
SOURCE=quarry-icon-green-512x512.png

# macOS: Create iconset and convert to .icns
mkdir -p build/icon.iconset
sips -z 16 16 $SOURCE --out build/icon.iconset/icon_16x16.png
sips -z 32 32 $SOURCE --out build/icon.iconset/icon_16x16@2x.png
sips -z 32 32 $SOURCE --out build/icon.iconset/icon_32x32.png
sips -z 64 64 $SOURCE --out build/icon.iconset/icon_32x32@2x.png
sips -z 128 128 $SOURCE --out build/icon.iconset/icon_128x128.png
sips -z 256 256 $SOURCE --out build/icon.iconset/icon_128x128@2x.png
sips -z 256 256 $SOURCE --out build/icon.iconset/icon_256x256.png
sips -z 512 512 $SOURCE --out build/icon.iconset/icon_256x256@2x.png
sips -z 512 512 $SOURCE --out build/icon.iconset/icon_512x512.png
sips -z 1024 1024 $SOURCE --out build/icon.iconset/icon_512x512@2x.png
iconutil -c icns build/icon.iconset -o build/icon.icns

# Windows: Copy as PNG
cp $SOURCE build/icon.png

# Linux: Create icon sizes
mkdir -p build/icons
sips -z 512 512 $SOURCE --out build/icons/512x512.png
sips -z 256 256 $SOURCE --out build/icons/256x256.png
sips -z 128 128 $SOURCE --out build/icons/128x128.png
```

## Troubleshooting

### "Cannot find module 'electron'" in VS Code terminal

VS Code sets `ELECTRON_RUN_AS_NODE=1` which causes Electron to run as plain Node.js. Fix:

```bash
# Clear the env variable before running
ELECTRON_RUN_AS_NODE= pnpm electron:start
```

The `package.json` script already handles this:
```json
"electron:start": "ELECTRON_RUN_AS_NODE= electron ."
```

### "Cannot find module 'electron-store'"

This means `electron-store` wasn't bundled with the app. Ensure `electron-builder.yml` has:

```yaml
extraResources:
  - from: "node_modules/electron-store"
    to: "app/node_modules/electron-store"
    filter: "**/*"
```

The module and its nested dependencies must be copied to `app/node_modules/`.

### App doesn't launch after install

1. Check Console.app for errors
2. Ensure port 3847 is available
3. Try removing and reinstalling

### Build fails with "pattern is too long"

The `asar: false` config in electron-builder.yml fixes this. The deeply nested standalone paths break minimatch pattern matching.

### Native modules not working

Native Node.js modules don't work in Electron renderer. Use:
- `onnxruntime-web` instead of `onnxruntime-node`
- IPC to main process for filesystem access

## Bundle Size Optimization

Current optimizations:
- `onnxruntime-node` excluded via pnpm override (-211MB)
- Root `node_modules` excluded (standalone has its own)
- Source files excluded (`src/`, `__tests__/`, etc.)
- Cache excluded (`.next/cache/`)

Potential future optimizations:
- Tree-shake unused date-fns functions
- Code-split mermaid diagrams (lazy load)
- Consider moving NLP features to optional download

## Capacitor (Mobile)

For iOS/Android builds via Capacitor:
- UI remains identical (WebView wrapper)
- Native APIs via Capacitor plugins (camera, filesystem)
- Does NOT auto-adapt to iOS/Android native styling
- Use Ionic components if platform-adaptive styling needed
