/**
 * API Key Storage Tests
 * @module __tests__/unit/lib/config/apiKeyStorage.test
 *
 * Tests for API key storage types and constants.
 */

import { describe, it, expect } from 'vitest'
import {
  DEFAULT_BASE_URLS,
  type APIProvider,
  type APIKeyConfig,
  type StoredAPIKeys,
} from '@/lib/config/apiKeyStorage'

describe('API Key Storage', () => {
  // ============================================================================
  // APIProvider type
  // ============================================================================

  describe('APIProvider type', () => {
    it('accepts openai provider', () => {
      const provider: APIProvider = 'openai'
      expect(provider).toBe('openai')
    })

    it('accepts anthropic provider', () => {
      const provider: APIProvider = 'anthropic'
      expect(provider).toBe('anthropic')
    })

    it('accepts openrouter provider', () => {
      const provider: APIProvider = 'openrouter'
      expect(provider).toBe('openrouter')
    })

    it('accepts ollama provider', () => {
      const provider: APIProvider = 'ollama'
      expect(provider).toBe('ollama')
    })

    it('accepts mistral provider', () => {
      const provider: APIProvider = 'mistral'
      expect(provider).toBe('mistral')
    })
  })

  // ============================================================================
  // APIKeyConfig type
  // ============================================================================

  describe('APIKeyConfig type', () => {
    it('creates minimal config', () => {
      const config: APIKeyConfig = {
        key: 'sk-test-key',
        savedAt: Date.now(),
      }
      expect(config.key).toBe('sk-test-key')
      expect(config.savedAt).toBeGreaterThan(0)
    })

    it('creates config with all options', () => {
      const config: APIKeyConfig = {
        key: 'sk-test-key',
        baseUrl: 'https://custom.api.com',
        organization: 'org-123',
        savedAt: Date.now(),
        label: 'Production Key',
      }
      expect(config.baseUrl).toBe('https://custom.api.com')
      expect(config.organization).toBe('org-123')
      expect(config.label).toBe('Production Key')
    })

    it('creates config with custom base URL only', () => {
      const config: APIKeyConfig = {
        key: 'sk-test',
        baseUrl: 'https://proxy.example.com',
        savedAt: 1234567890,
      }
      expect(config.baseUrl).toBe('https://proxy.example.com')
      expect(config.organization).toBeUndefined()
    })
  })

  // ============================================================================
  // StoredAPIKeys type
  // ============================================================================

  describe('StoredAPIKeys type', () => {
    it('creates empty stored keys', () => {
      const stored: StoredAPIKeys = {}
      expect(stored.openai).toBeUndefined()
      expect(stored.anthropic).toBeUndefined()
    })

    it('creates stored keys with single provider', () => {
      const stored: StoredAPIKeys = {
        openai: {
          key: 'sk-openai-key',
          savedAt: Date.now(),
        },
      }
      expect(stored.openai?.key).toBe('sk-openai-key')
    })

    it('creates stored keys with multiple providers', () => {
      const stored: StoredAPIKeys = {
        openai: {
          key: 'sk-openai',
          savedAt: Date.now(),
        },
        anthropic: {
          key: 'sk-ant-123',
          savedAt: Date.now(),
        },
        mistral: {
          key: 'mistral-key',
          savedAt: Date.now(),
        },
      }
      expect(Object.keys(stored)).toHaveLength(3)
    })

    it('creates stored keys with all providers', () => {
      const now = Date.now()
      const stored: StoredAPIKeys = {
        openai: { key: 'openai-key', savedAt: now },
        anthropic: { key: 'anthropic-key', savedAt: now },
        openrouter: { key: 'openrouter-key', savedAt: now },
        ollama: { key: 'ollama-key', savedAt: now },
        mistral: { key: 'mistral-key', savedAt: now },
      }
      expect(Object.keys(stored)).toHaveLength(5)
    })
  })

  // ============================================================================
  // DEFAULT_BASE_URLS constant
  // ============================================================================

  describe('DEFAULT_BASE_URLS', () => {
    it('has openai base URL', () => {
      expect(DEFAULT_BASE_URLS.openai).toBe('https://api.openai.com/v1')
    })

    it('has anthropic base URL', () => {
      expect(DEFAULT_BASE_URLS.anthropic).toBe('https://api.anthropic.com/v1')
    })

    it('has openrouter base URL', () => {
      expect(DEFAULT_BASE_URLS.openrouter).toBe('https://openrouter.ai/api/v1')
    })

    it('has ollama base URL', () => {
      expect(DEFAULT_BASE_URLS.ollama).toBe('http://localhost:11434')
    })

    it('has mistral base URL', () => {
      expect(DEFAULT_BASE_URLS.mistral).toBe('https://api.mistral.ai/v1')
    })

    it('contains all provider base URLs', () => {
      const providers: APIProvider[] = ['openai', 'anthropic', 'openrouter', 'ollama', 'mistral']
      for (const provider of providers) {
        expect(DEFAULT_BASE_URLS[provider]).toBeDefined()
        expect(typeof DEFAULT_BASE_URLS[provider]).toBe('string')
      }
    })

    it('all URLs are valid format', () => {
      for (const url of Object.values(DEFAULT_BASE_URLS)) {
        expect(url).toMatch(/^https?:\/\//)
      }
    })

    it('openai URL ends with /v1', () => {
      expect(DEFAULT_BASE_URLS.openai).toMatch(/\/v1$/)
    })

    it('anthropic URL ends with /v1', () => {
      expect(DEFAULT_BASE_URLS.anthropic).toMatch(/\/v1$/)
    })

    it('openrouter URL ends with /v1', () => {
      expect(DEFAULT_BASE_URLS.openrouter).toMatch(/\/v1$/)
    })

    it('mistral URL ends with /v1', () => {
      expect(DEFAULT_BASE_URLS.mistral).toMatch(/\/v1$/)
    })

    it('ollama URL is localhost', () => {
      expect(DEFAULT_BASE_URLS.ollama).toContain('localhost')
    })
  })

  // ============================================================================
  // Type inference tests
  // ============================================================================

  describe('type inference', () => {
    it('correctly infers config from StoredAPIKeys', () => {
      const stored: StoredAPIKeys = {
        openai: {
          key: 'test-key',
          savedAt: 123,
        },
      }

      const config = stored.openai
      expect(config?.key).toBe('test-key')
      expect(config?.savedAt).toBe(123)
    })

    it('correctly handles optional properties', () => {
      const config: APIKeyConfig = {
        key: 'key',
        savedAt: 0,
      }

      // These are optional
      expect(config.baseUrl).toBeUndefined()
      expect(config.organization).toBeUndefined()
      expect(config.label).toBeUndefined()
    })

    it('provider type matches stored keys', () => {
      const providers: APIProvider[] = ['openai', 'anthropic', 'openrouter', 'ollama', 'mistral']
      const stored: StoredAPIKeys = {}

      for (const provider of providers) {
        // This should compile - provider is a valid key for StoredAPIKeys
        stored[provider] = { key: `${provider}-key`, savedAt: Date.now() }
      }

      expect(Object.keys(stored)).toHaveLength(5)
    })
  })

  // ============================================================================
  // URL construction patterns
  // ============================================================================

  describe('URL construction patterns', () => {
    it('can build openai models endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.openai}/models`
      expect(endpoint).toBe('https://api.openai.com/v1/models')
    })

    it('can build openai completions endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.openai}/chat/completions`
      expect(endpoint).toBe('https://api.openai.com/v1/chat/completions')
    })

    it('can build anthropic messages endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.anthropic}/messages`
      expect(endpoint).toBe('https://api.anthropic.com/v1/messages')
    })

    it('can build openrouter auth endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.openrouter}/auth/key`
      expect(endpoint).toBe('https://openrouter.ai/api/v1/auth/key')
    })

    it('can build ollama tags endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.ollama}/api/tags`
      expect(endpoint).toBe('http://localhost:11434/api/tags')
    })

    it('can build mistral models endpoint', () => {
      const endpoint = `${DEFAULT_BASE_URLS.mistral}/models`
      expect(endpoint).toBe('https://api.mistral.ai/v1/models')
    })
  })

  // ============================================================================
  // Custom base URL scenarios
  // ============================================================================

  describe('custom base URL scenarios', () => {
    it('supports custom openai-compatible endpoint', () => {
      const config: APIKeyConfig = {
        key: 'custom-key',
        baseUrl: 'https://my-openai-proxy.company.com/v1',
        savedAt: Date.now(),
      }

      const endpoint = `${config.baseUrl}/chat/completions`
      expect(endpoint).toBe('https://my-openai-proxy.company.com/v1/chat/completions')
    })

    it('supports azure openai endpoint', () => {
      const config: APIKeyConfig = {
        key: 'azure-key',
        baseUrl: 'https://my-resource.openai.azure.com/openai/deployments/gpt-4',
        savedAt: Date.now(),
      }

      expect(config.baseUrl).toContain('azure.com')
    })

    it('supports local llm server', () => {
      const config: APIKeyConfig = {
        key: 'local-key',
        baseUrl: 'http://localhost:8080/v1',
        savedAt: Date.now(),
      }

      expect(config.baseUrl).toContain('localhost')
    })
  })

  // ============================================================================
  // SavedAt timestamp scenarios
  // ============================================================================

  describe('savedAt timestamp scenarios', () => {
    it('zero savedAt indicates env source', () => {
      const config: APIKeyConfig = {
        key: 'env-key',
        savedAt: 0,
      }

      // Convention: savedAt of 0 means the key came from environment
      expect(config.savedAt).toBe(0)
    })

    it('positive savedAt indicates user-saved key', () => {
      const config: APIKeyConfig = {
        key: 'user-key',
        savedAt: Date.now(),
      }

      expect(config.savedAt).toBeGreaterThan(0)
    })

    it('savedAt can be used to check key age', () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const config: APIKeyConfig = {
        key: 'old-key',
        savedAt: oneHourAgo,
      }

      const ageMs = Date.now() - config.savedAt
      expect(ageMs).toBeGreaterThanOrEqual(60 * 60 * 1000)
    })
  })

  // ============================================================================
  // Label usage scenarios
  // ============================================================================

  describe('label usage scenarios', () => {
    it('supports production/development labels', () => {
      const prodConfig: APIKeyConfig = {
        key: 'prod-key',
        savedAt: Date.now(),
        label: 'Production',
      }

      const devConfig: APIKeyConfig = {
        key: 'dev-key',
        savedAt: Date.now(),
        label: 'Development',
      }

      expect(prodConfig.label).toBe('Production')
      expect(devConfig.label).toBe('Development')
    })

    it('supports descriptive labels', () => {
      const config: APIKeyConfig = {
        key: 'shared-key',
        savedAt: Date.now(),
        label: 'Shared team key - expires 2025-12-31',
      }

      expect(config.label).toContain('expires')
    })
  })

  // ============================================================================
  // Organization ID scenarios
  // ============================================================================

  describe('organization ID scenarios', () => {
    it('supports OpenAI organization ID', () => {
      const config: APIKeyConfig = {
        key: 'sk-org-key',
        organization: 'org-abc123def456',
        savedAt: Date.now(),
      }

      expect(config.organization).toMatch(/^org-/)
    })

    it('can build header with organization', () => {
      const config: APIKeyConfig = {
        key: 'sk-key',
        organization: 'org-123',
        savedAt: Date.now(),
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${config.key}`,
      }

      if (config.organization) {
        headers['OpenAI-Organization'] = config.organization
      }

      expect(headers['OpenAI-Organization']).toBe('org-123')
    })
  })
})
