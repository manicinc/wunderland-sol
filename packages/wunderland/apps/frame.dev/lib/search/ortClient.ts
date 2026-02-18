'use client'

/**
 * ONNX Runtime Web client loader with multi-strategy fallback
 * @module search/ortClient
 * 
 * Load strategies (tried in order):
 * 1. Pre-loaded global window.ort (UMD script tag)
 * 2. Dynamic bundled import (webpack/turbopack)
 * 3. CDN ESM import (jsdelivr)
 * 4. CDN UMD script tag fallback
 */

// CDN URLs for fallback
const ORT_CDN_ESM = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.min.mjs'
const ORT_CDN_UMD = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.21.0/dist/ort.min.js'

/**
 * Load ONNX Runtime Web with multi-strategy fallback
 * @returns ORT module or throws if all strategies fail
 */
export async function loadOrt(): Promise<any> {
  // Strategy 1: Check for pre-loaded global (UMD script in HTML)
  if (typeof window !== 'undefined' && (window as any).ort) {
    console.log('[ORT] Using pre-loaded global window.ort')
    return (window as any).ort
  }

  // Strategy 2: Try dynamic bundled import
  try {
    console.log('[ORT] Trying dynamic bundled import...')
    const dynamicImport = new Function('specifier', 'return import(specifier)')
    const mod = await dynamicImport('onnxruntime-web')
    console.log('[ORT] ✓ Dynamic bundled import succeeded')
    return mod
  } catch (bundleErr: any) {
    console.warn('[ORT] Dynamic bundled import failed:', bundleErr.message)
  }

  // Strategy 3: Try CDN ESM import
  try {
    console.log('[ORT] Trying CDN ESM import...')
    const dynamicImport = new Function('url', 'return import(url)')
    const mod = await dynamicImport(ORT_CDN_ESM)
    console.log('[ORT] ✓ CDN ESM import succeeded')
    
    // Store in global for subsequent calls
    if (typeof window !== 'undefined') {
      (window as any).ort = mod
    }
    return mod
  } catch (cdnEsmErr: any) {
    console.warn('[ORT] CDN ESM import failed:', cdnEsmErr.message)
  }

  // Strategy 4: Load via UMD script tag
  console.log('[ORT] Trying UMD script tag fallback...')
  return loadOrtFromScript()
}

/**
 * Load ORT via script tag (UMD bundle)
 */
async function loadOrtFromScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Cannot load ORT script in non-browser environment'))
      return
    }

    // Check if already loaded
    if ((window as any).ort) {
      console.log('[ORT] ✓ Found global ort from previous script load')
      resolve((window as any).ort)
      return
    }

    const script = document.createElement('script')
    script.src = ORT_CDN_UMD
    script.async = true

    const timeout = setTimeout(() => {
      script.remove()
      reject(new Error('ORT script load timed out after 30s'))
    }, 30000)

    script.onload = () => {
      clearTimeout(timeout)
      // ORT UMD exposes itself as window.ort
      setTimeout(() => {
        if ((window as any).ort) {
          console.log('[ORT] ✓ UMD script loaded successfully')
          resolve((window as any).ort)
        } else {
          reject(new Error('ORT script loaded but window.ort not found'))
        }
      }, 100)
    }

    script.onerror = () => {
      clearTimeout(timeout)
      script.remove()
      reject(new Error(`Failed to load ORT from ${ORT_CDN_UMD}`))
    }

    document.head.appendChild(script)
  })
}

/**
 * Configure ORT environment for the current browser
 * @param ort - ONNX Runtime module
 * @param wasmBasePath - Path to WASM files
 */
export function configureOrtEnv(ort: any, wasmBasePath: string = '/onnx-wasm/') {
  if (!ort?.env?.wasm) {
    console.warn('[ORT] Cannot configure env - ort.env.wasm not found')
    return
  }

  // Set WASM paths
  ort.env.wasm.wasmPaths = wasmBasePath
  console.log(`[ORT] WASM paths set to: ${wasmBasePath}`)

  // Configure for non-isolated environment (GitHub Pages)
  if (typeof crossOriginIsolated !== 'undefined' && !crossOriginIsolated) {
    ort.env.wasm.numThreads = 1
    ort.env.wasm.proxy = false
    console.log('[ORT] Configured for non-isolated environment (single thread, no proxy)')
  }

  // Silence verbose ORT logging
  if (ort.env) {
    ort.env.logLevel = 'warning'
  }
}