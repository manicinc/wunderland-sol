# ONNX Runtime Web - WASM Binaries

This directory contains the WebAssembly binaries for ONNX Runtime Web, used for on-device semantic search.

## Setup

These files should be copied from the `onnxruntime-web` npm package:

```bash
# From the project root
npm install
cp node_modules/onnxruntime-web/dist/*.wasm apps/frame.dev/public/onnx-wasm/
```

## Required Files

The following files are needed from `onnxruntime-web@1.17.3` or later:

- `ort-wasm.wasm` - Core WebAssembly runtime
- `ort-wasm-simd.wasm` - SIMD-optimized version (for modern browsers)
- `ort-wasm-threaded.wasm` - Multi-threaded version
- `ort-wasm-simd-threaded.wasm` - SIMD + threaded (best performance)

## Why Local Hosting?

Hosting these files locally avoids:
- CDN 404 errors when the CDN is unavailable
- Network latency for initial load
- Privacy concerns with external CDN tracking
- Version mismatches between code and binaries

## File Size

Total size: ~10-15 MB (compressed: ~3-4 MB with gzip)

## .gitignore

These .wasm files should be git-ignored to avoid bloating the repository. They will be copied during the build process or downloaded on first run.

## Fallback

If local files are not found, the code will fall back to the official CDN:
```
https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.3/dist/
```

