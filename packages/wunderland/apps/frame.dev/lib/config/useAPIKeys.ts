/**
 * React Hook for API Key Management
 *
 * Client-side hook for managing API keys with React state.
 * Separated from apiKeyStorage.ts to avoid React imports in server-side code.
 *
 * @module lib/config/useAPIKeys
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  type APIProvider,
  type APIKeyConfig,
  type StoredAPIKeys,
  loadAPIKeys,
  saveAPIKey,
  removeAPIKey,
  validateAPIKey,
  getConfiguredProviders,
  getPreferredProvider,
  setPreferredProvider,
  clearPreferredProvider,
  getAPIKey,
  isKeyFromSettings,
} from './apiKeyStorage'

/**
 * React hook for managing API keys
 */
export function useAPIKeys() {
  const [keys, setKeys] = useState<StoredAPIKeys>({})
  const [loading, setLoading] = useState(true)
  const [configuredProviders, setConfiguredProviders] = useState<APIProvider[]>([])
  const [preferredProvider, setPreferredProviderState] = useState<APIProvider | null>(null)

  // Load keys and preferred provider on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const stored = await loadAPIKeys()
      setKeys(stored)
      const providers = await getConfiguredProviders()
      setConfiguredProviders(providers)
      const preferred = await getPreferredProvider()
      setPreferredProviderState(preferred)
      setLoading(false)
    }
    load()

    // Listen for changes
    const handler = () => load()
    window.addEventListener('api-keys-changed', handler)
    window.addEventListener('preferred-provider-changed', handler)
    return () => {
      window.removeEventListener('api-keys-changed', handler)
      window.removeEventListener('preferred-provider-changed', handler)
    }
  }, [])

  const save = useCallback(async (
    provider: APIProvider,
    config: Omit<APIKeyConfig, 'savedAt'>
  ) => {
    await saveAPIKey(provider, config)
    const stored = await loadAPIKeys()
    setKeys(stored)
    const providers = await getConfiguredProviders()
    setConfiguredProviders(providers)
  }, [])

  const remove = useCallback(async (provider: APIProvider) => {
    await removeAPIKey(provider)
    const stored = await loadAPIKeys()
    setKeys(stored)
    const providers = await getConfiguredProviders()
    setConfiguredProviders(providers)
  }, [])

  const validate = useCallback(async (
    provider: APIProvider,
    key: string,
    baseUrl?: string
  ) => {
    return validateAPIKey(provider, key, baseUrl)
  }, [])

  const setPreferred = useCallback(async (provider: APIProvider | null) => {
    if (provider) {
      await setPreferredProvider(provider)
    } else {
      await clearPreferredProvider()
    }
    setPreferredProviderState(provider)
  }, [])

  return {
    keys,
    loading,
    configuredProviders,
    preferredProvider,
    save,
    remove,
    validate,
    setPreferred,
    getKey: getAPIKey,
    isFromSettings: isKeyFromSettings,
  }
}
