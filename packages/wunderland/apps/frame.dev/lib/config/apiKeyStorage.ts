/**
 * API Key Storage
 *
 * Securely stores API keys in localStorage with AES-256-GCM encryption.
 * Settings-based keys take priority over environment variables.
 *
 * @module lib/config/apiKeyStorage
 */

// ============================================================================
// TYPES
// ============================================================================

export type APIProvider = 'openai' | 'anthropic' | 'openrouter' | 'ollama' | 'mistral'

export interface APIKeyConfig {
  /** The API key */
  key: string
  /** Optional custom base URL */
  baseUrl?: string
  /** Optional organization ID (OpenAI) */
  organization?: string
  /** When the key was saved */
  savedAt: number
  /** Optional label for identification */
  label?: string
}

export interface StoredAPIKeys {
  openai?: APIKeyConfig
  anthropic?: APIKeyConfig
  openrouter?: APIKeyConfig
  ollama?: APIKeyConfig
  mistral?: APIKeyConfig
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'quarry-codex-api-keys'
const ELECTRON_API_KEYS_KEY = 'apiKeys'
const ELECTRON_PREFERRED_PROVIDER_KEY = 'preferredProvider'

// ============================================================================
// ELECTRON DETECTION & TYPES
// ============================================================================

// Type for Electron settings API (matches electron/preload.ts)
interface ElectronSettingsAPI {
  get: (key: string) => Promise<unknown>
  set: (key: string, value: unknown) => Promise<boolean>
  delete: (key: string) => Promise<boolean>
  getAll: () => Promise<Record<string, unknown>>
}

interface ElectronAPI {
  settings?: ElectronSettingsAPI
  [key: string]: unknown
}

/**
 * Get the electronAPI with proper typing
 */
function getElectronAPI(): ElectronAPI | null {
  if (typeof window === 'undefined') return null
  if (!('electronAPI' in window)) return null
  return (window as unknown as { electronAPI: ElectronAPI }).electronAPI
}

/**
 * Check if we're running in Electron with the electronAPI available
 */
function isElectron(): boolean {
  const api = getElectronAPI()
  return api !== null && api.settings !== undefined
}

// Default base URLs for providers
export const DEFAULT_BASE_URLS: Record<APIProvider, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  ollama: 'http://localhost:11434',
  mistral: 'https://api.mistral.ai/v1',
}

// ============================================================================
// ENCRYPTION UTILITIES
// ============================================================================

/**
 * Generate a browser fingerprint for encryption passphrase
 */
function getBrowserFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side-render'

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  ctx?.fillText('fingerprint', 2, 2)
  const canvasHash = canvas.toDataURL().slice(0, 50)

  return btoa(
    navigator.userAgent +
    navigator.language +
    screen.colorDepth +
    screen.width +
    screen.height +
    canvasHash
  ).slice(0, 32)
}

/**
 * Encrypt data using AES-256-GCM
 */
async function encrypt(data: string): Promise<string> {
  const passphrase = getBrowserFingerprint()
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(data)

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  )

  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer)

  const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  combined.set(salt, 0)
  combined.set(iv, salt.length)
  combined.set(new Uint8Array(encrypted), salt.length + iv.length)

  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt data using AES-256-GCM
 */
async function decrypt(ciphertext: string): Promise<string | null> {
  try {
    const passphrase = getBrowserFingerprint()
    const encoder = new TextEncoder()
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0))

    const salt = combined.slice(0, 16)
    const iv = combined.slice(16, 28)
    const data = combined.slice(28)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    )

    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    )

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    return new TextDecoder().decode(decrypted)
  } catch {
    return null
  }
}

// Export encryption utilities for external use (e.g., OAuth tokens)
export const encryptData = encrypt
export const decryptData = decrypt

// ============================================================================
// STORAGE OPERATIONS
// ============================================================================

/**
 * Save API key for a provider
 */
export async function saveAPIKey(
  provider: APIProvider,
  config: Omit<APIKeyConfig, 'savedAt'>
): Promise<void> {
  if (typeof window === 'undefined') return

  const current = await loadAPIKeys()
  current[provider] = {
    ...config,
    savedAt: Date.now(),
  }

  if (isElectron()) {
    // Use Electron's persistent storage (already encrypted by electron-store)
    const api = getElectronAPI()!
    await api.settings!.set(ELECTRON_API_KEYS_KEY, current)
  } else {
    // Use localStorage with encryption for browser
    const encrypted = await encrypt(JSON.stringify(current))
    localStorage.setItem(STORAGE_KEY, encrypted)
  }

  // Dispatch event for reactivity
  window.dispatchEvent(new CustomEvent('api-keys-changed', { detail: { provider } }))
}

/**
 * Load all stored API keys
 */
export async function loadAPIKeys(): Promise<StoredAPIKeys> {
  if (typeof window === 'undefined') return {}

  try {
    if (isElectron()) {
      // Use Electron's persistent storage
      const api = getElectronAPI()!
      const keys = await api.settings!.get(ELECTRON_API_KEYS_KEY)
      return (keys as StoredAPIKeys) || {}
    } else {
      // Use localStorage with decryption for browser
      const encrypted = localStorage.getItem(STORAGE_KEY)
      if (!encrypted) return {}

      const decrypted = await decrypt(encrypted)
      if (!decrypted) return {}

      return JSON.parse(decrypted) as StoredAPIKeys
    }
  } catch {
    return {}
  }
}

/**
 * Get API key for a specific provider (settings override .env)
 */
export async function getAPIKey(provider: APIProvider): Promise<APIKeyConfig | null> {
  // First check settings (priority)
  const stored = await loadAPIKeys()
  if (stored[provider]?.key) {
    return stored[provider]!
  }

  // Fall back to environment variables
  const envKey = getEnvAPIKey(provider)
  if (envKey) {
    return {
      key: envKey,
      savedAt: 0, // Indicates env source
    }
  }

  return null
}

/**
 * Get API key from environment variables
 */
function getEnvAPIKey(provider: APIProvider): string | null {
  if (typeof process === 'undefined') return null

  switch (provider) {
    case 'openai':
      return process.env.NEXT_PUBLIC_OPENAI_API_KEY ||
             process.env.OPENAI_API_KEY ||
             null
    case 'anthropic':
      return process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ||
             process.env.ANTHROPIC_API_KEY ||
             null
    case 'openrouter':
      return process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
             process.env.OPENROUTER_API_KEY ||
             null
    case 'ollama':
      // Ollama typically doesn't need an API key
      return null
    case 'mistral':
      return process.env.NEXT_PUBLIC_MISTRAL_API_KEY ||
             process.env.MISTRAL_API_KEY ||
             null
    default:
      return null
  }
}

/**
 * Check if API key is from settings (not env)
 */
export async function isKeyFromSettings(provider: APIProvider): Promise<boolean> {
  const stored = await loadAPIKeys()
  return !!stored[provider]?.key
}

/**
 * Remove API key for a provider
 */
export async function removeAPIKey(provider: APIProvider): Promise<void> {
  if (typeof window === 'undefined') return

  const current = await loadAPIKeys()
  delete current[provider]

  if (isElectron()) {
    // Use Electron's persistent storage
    const api = getElectronAPI()!
    if (Object.keys(current).length === 0) {
      await api.settings!.delete(ELECTRON_API_KEYS_KEY)
    } else {
      await api.settings!.set(ELECTRON_API_KEYS_KEY, current)
    }
  } else {
    // Use localStorage for browser
    if (Object.keys(current).length === 0) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      const encrypted = await encrypt(JSON.stringify(current))
      localStorage.setItem(STORAGE_KEY, encrypted)
    }
  }

  window.dispatchEvent(new CustomEvent('api-keys-changed', { detail: { provider } }))
}

/**
 * Clear all stored API keys
 */
export async function clearAllAPIKeys(): Promise<void> {
  if (typeof window === 'undefined') return

  if (isElectron()) {
    const api = getElectronAPI()!
    await api.settings!.delete(ELECTRON_API_KEYS_KEY)
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }

  window.dispatchEvent(new CustomEvent('api-keys-changed', { detail: { provider: 'all' } }))
}

/**
 * Check which providers have API keys configured
 */
export async function getConfiguredProviders(): Promise<APIProvider[]> {
  const providers: APIProvider[] = ['openai', 'anthropic', 'openrouter', 'ollama', 'mistral']
  const configured: APIProvider[] = []

  for (const provider of providers) {
    const key = await getAPIKey(provider)
    if (key?.key) {
      configured.push(provider)
    }
  }

  return configured
}

/**
 * Validate an API key by making a test request
 */
export async function validateAPIKey(
  provider: APIProvider,
  key: string,
  baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    switch (provider) {
      case 'openai': {
        const url = `${baseUrl || DEFAULT_BASE_URLS.openai}/models`
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${key}` },
        })
        if (res.ok) return { valid: true }
        const data = await res.json().catch(() => ({}))
        return { valid: false, error: data.error?.message || 'Invalid API key' }
      }

      case 'anthropic': {
        // Anthropic doesn't have a simple validation endpoint
        // We'll just check the format
        if (key.startsWith('sk-ant-')) {
          return { valid: true }
        }
        return { valid: false, error: 'Invalid key format (should start with sk-ant-)' }
      }

      case 'openrouter': {
        const url = `${baseUrl || DEFAULT_BASE_URLS.openrouter}/auth/key`
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${key}` },
        })
        if (res.ok) return { valid: true }
        return { valid: false, error: 'Invalid API key' }
      }

      case 'ollama': {
        const url = `${baseUrl || DEFAULT_BASE_URLS.ollama}/api/tags`
        const res = await fetch(url)
        if (res.ok) return { valid: true }
        return { valid: false, error: 'Cannot connect to Ollama server' }
      }

      case 'mistral': {
        const url = `${baseUrl || DEFAULT_BASE_URLS.mistral}/models`
        const res = await fetch(url, {
          headers: { 'Authorization': `Bearer ${key}` },
        })
        if (res.ok) return { valid: true }
        const data = await res.json().catch(() => ({}))
        return { valid: false, error: data.message || 'Invalid API key' }
      }

      default:
        return { valid: false, error: 'Unknown provider' }
    }
  } catch (error) {
    return { valid: false, error: (error as Error).message }
  }
}

// ============================================================================
// PREFERRED PROVIDER SELECTION
// ============================================================================

const PREFERRED_PROVIDER_KEY = 'quarry-codex-preferred-provider'

/**
 * Get the user's preferred LLM provider
 */
export async function getPreferredProvider(): Promise<APIProvider | null> {
  if (typeof window === 'undefined') return null

  try {
    let stored: string | null = null

    if (isElectron()) {
      const api = getElectronAPI()!
      stored = await api.settings!.get(ELECTRON_PREFERRED_PROVIDER_KEY) as string | null
    } else {
      stored = localStorage.getItem(PREFERRED_PROVIDER_KEY)
    }

    if (!stored) return null

    const provider = stored as APIProvider
    // Validate it's a real provider
    const validProviders: APIProvider[] = ['openai', 'anthropic', 'openrouter', 'ollama', 'mistral']
    if (!validProviders.includes(provider)) return null

    return provider
  } catch {
    return null
  }
}

/**
 * Set the user's preferred LLM provider
 */
export async function setPreferredProvider(provider: APIProvider): Promise<void> {
  if (typeof window === 'undefined') return

  if (isElectron()) {
    const api = getElectronAPI()!
    await api.settings!.set(ELECTRON_PREFERRED_PROVIDER_KEY, provider)
  } else {
    localStorage.setItem(PREFERRED_PROVIDER_KEY, provider)
  }

  window.dispatchEvent(new CustomEvent('preferred-provider-changed', { detail: { provider } }))
}

/**
 * Clear the preferred provider selection
 */
export async function clearPreferredProvider(): Promise<void> {
  if (typeof window === 'undefined') return

  if (isElectron()) {
    const api = getElectronAPI()!
    await api.settings!.delete(ELECTRON_PREFERRED_PROVIDER_KEY)
  } else {
    localStorage.removeItem(PREFERRED_PROVIDER_KEY)
  }

  window.dispatchEvent(new CustomEvent('preferred-provider-changed', { detail: { provider: null } }))
}

/**
 * Get the best available provider based on preference and availability
 * 
 * Priority:
 * 1. User's preferred provider (if configured)
 * 2. First configured provider from settings
 * 3. First provider with env key
 */
export async function getBestAvailableProvider(): Promise<APIProvider | null> {
  // Check user preference first
  const preferred = await getPreferredProvider()
  if (preferred) {
    const key = await getAPIKey(preferred)
    // For Ollama, we don't need an API key
    if (key?.key || preferred === 'ollama') {
      return preferred
    }
  }
  
  // Fall back to first configured provider
  const configured = await getConfiguredProviders()
  if (configured.length > 0) {
    return configured[0]
  }
  
  return null
}

// React hook moved to ./useAPIKeys.ts to avoid React imports in server-side code
