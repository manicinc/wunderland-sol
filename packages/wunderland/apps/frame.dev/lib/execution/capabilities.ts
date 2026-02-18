/**
 * Runtime capability detection for code execution
 * Detects available execution environments and their status
 * @module execution/capabilities
 */

import type { ExecutionCapabilities, LanguageCapability } from './types'
import { isJavaScriptAvailable, isTypeScriptAvailable } from './jsExecutor'
import { checkPlaygroundConnectivity } from './playgroundExecutor'

/**
 * Backend capabilities response format
 */
interface BackendCapabilities {
  codeExecution?: {
    enabled: boolean
    python?: boolean
    bash?: boolean
  }
}

/** Cached capabilities (valid for 30s) */
let cachedCapabilities: ExecutionCapabilities | null = null
let cacheTimestamp = 0
const CACHE_TTL = 30000

/**
 * Detect all execution capabilities
 * Checks client-side, backend, and external API availability
 */
export async function detectCapabilities(): Promise<ExecutionCapabilities> {
  // Return cached if fresh
  const now = Date.now()
  if (cachedCapabilities && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedCapabilities
  }

  // Client-side capabilities (always available if Worker exists)
  const jsAvailable = isJavaScriptAvailable()
  const tsAvailable = isTypeScriptAvailable()

  const javascript: LanguageCapability = {
    available: jsAvailable,
    reason: jsAvailable ? undefined : 'Web Workers not supported',
  }

  const typescript: LanguageCapability = {
    available: tsAvailable,
    reason: tsAvailable ? undefined : 'Web Workers not supported',
  }

  // Backend capabilities
  let python: LanguageCapability = {
    available: false,
    reason: 'Backend not available',
  }

  let bash: LanguageCapability = {
    available: false,
    reason: 'Backend not available',
  }

  try {
    const backendCaps = await fetchBackendCapabilities()

    if (backendCaps?.codeExecution?.enabled) {
      python = {
        available: backendCaps.codeExecution.python ?? false,
        reason: backendCaps.codeExecution.python
          ? undefined
          : 'Python execution disabled on server',
      }

      bash = {
        available: backendCaps.codeExecution.bash ?? false,
        reason: backendCaps.codeExecution.bash
          ? undefined
          : 'Bash execution disabled on server',
      }
    }
  } catch {
    // Backend unavailable, keep defaults
  }

  // External playground capabilities
  const playgroundOnline = await checkPlaygroundConnectivity()

  const go: LanguageCapability = {
    available: true, // Always "available" but may be offline
    offline: !playgroundOnline,
    reason: playgroundOnline ? undefined : 'go.dev playground unreachable',
  }

  const rust: LanguageCapability = {
    available: true,
    offline: !playgroundOnline,
    reason: playgroundOnline ? undefined : 'Rust playground unreachable',
  }

  // Cache and return
  cachedCapabilities = {
    javascript,
    typescript,
    python,
    bash,
    go,
    rust,
  }
  cacheTimestamp = now

  return cachedCapabilities
}

/**
 * Fetch capabilities from backend API
 */
async function fetchBackendCapabilities(): Promise<BackendCapabilities | null> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch('/api/capabilities', {
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

/**
 * Invalidate capabilities cache
 * Call this when backend connectivity changes
 */
export function invalidateCapabilitiesCache(): void {
  cachedCapabilities = null
  cacheTimestamp = 0
}

/**
 * Check if a specific language is available for execution
 */
export async function isLanguageAvailable(
  language: keyof ExecutionCapabilities
): Promise<{ available: boolean; reason?: string; offline?: boolean }> {
  const caps = await detectCapabilities()
  return caps[language]
}

/**
 * Get a summary of available execution environments
 */
export async function getExecutionSummary(): Promise<{
  clientSide: string[]
  backend: string[]
  external: string[]
  offline: string[]
}> {
  const caps = await detectCapabilities()

  const clientSide: string[] = []
  const backend: string[] = []
  const external: string[] = []
  const offline: string[] = []

  // Client-side
  if (caps.javascript.available) clientSide.push('JavaScript')
  if (caps.typescript.available) clientSide.push('TypeScript')

  // Backend
  if (caps.python.available) backend.push('Python')
  if (caps.bash.available) backend.push('Bash')

  // External (may be offline)
  if (caps.go.available) {
    if (caps.go.offline) {
      offline.push('Go')
    } else {
      external.push('Go')
    }
  }

  if (caps.rust.available) {
    if (caps.rust.offline) {
      offline.push('Rust')
    } else {
      external.push('Rust')
    }
  }

  return { clientSide, backend, external, offline }
}
