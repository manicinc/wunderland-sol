/**
 * Repository Config Tests
 * @module __tests__/unit/lib/config/repositoryConfig.test
 *
 * Tests for repository configuration functions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getPluginRepo,
  getPluginRegistryUrl,
  getCodexRepo,
  getRepositoryConfig,
  getPluginRepoInfo,
  getCodexRepoUrl,
  isUsingOfficialRepos,
} from '@/lib/config/repositoryConfig'

// ============================================================================
// getPluginRepo
// ============================================================================

describe('getPluginRepo', () => {
  const originalEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO

  afterEach(() => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = originalEnv
  })

  it('returns default when not configured', () => {
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
    expect(getPluginRepo()).toBe('framersai/quarry-plugins')
  })

  it('returns custom repo when configured', () => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = 'myorg/my-plugins'
    expect(getPluginRepo()).toBe('myorg/my-plugins')
  })
})

// ============================================================================
// getPluginRegistryUrl
// ============================================================================

describe('getPluginRegistryUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL

  afterEach(() => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL = originalEnv
  })

  it('returns default URL when not configured', () => {
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL
    expect(getPluginRegistryUrl()).toBe(
      'https://raw.githubusercontent.com/framersai/quarry-plugins/main/registry.json'
    )
  })

  it('returns custom URL when configured', () => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL = 'https://custom.example.com/plugins.json'
    expect(getPluginRegistryUrl()).toBe('https://custom.example.com/plugins.json')
  })
})

// ============================================================================
// getCodexRepo
// ============================================================================

describe('getCodexRepo', () => {
  const originalEnv = process.env.NEXT_PUBLIC_CODEX_REPO

  afterEach(() => {
    process.env.NEXT_PUBLIC_CODEX_REPO = originalEnv
  })

  it('returns default when not configured', () => {
    delete process.env.NEXT_PUBLIC_CODEX_REPO
    expect(getCodexRepo()).toBe('framersai/frame.dev')
  })

  it('returns custom repo when configured', () => {
    process.env.NEXT_PUBLIC_CODEX_REPO = 'myorg/my-codex'
    expect(getCodexRepo()).toBe('myorg/my-codex')
  })
})

// ============================================================================
// getRepositoryConfig
// ============================================================================

describe('getRepositoryConfig', () => {
  it('returns complete config object', () => {
    const config = getRepositoryConfig()

    expect(config).toHaveProperty('pluginRepo')
    expect(config).toHaveProperty('pluginRegistryUrl')
    expect(config).toHaveProperty('codexRepo')
    expect(config).toHaveProperty('canEdit')
    expect(config).toHaveProperty('showExternalDocs')
  })

  it('all string properties are strings', () => {
    const config = getRepositoryConfig()

    expect(typeof config.pluginRepo).toBe('string')
    expect(typeof config.pluginRegistryUrl).toBe('string')
    expect(typeof config.codexRepo).toBe('string')
  })

  it('all boolean properties are booleans', () => {
    const config = getRepositoryConfig()

    expect(typeof config.canEdit).toBe('boolean')
    expect(typeof config.showExternalDocs).toBe('boolean')
  })
})

// ============================================================================
// getPluginRepoInfo
// ============================================================================

describe('getPluginRepoInfo', () => {
  const originalEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO

  afterEach(() => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = originalEnv
  })

  describe('with default repo', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
    })

    it('returns correct owner and name', () => {
      const info = getPluginRepoInfo()

      expect(info.owner).toBe('framersai')
      expect(info.name).toBe('quarry-plugins')
    })

    it('returns correct GitHub URL', () => {
      const info = getPluginRepoInfo()

      expect(info.url).toBe('https://github.com/framersai/quarry-plugins')
    })

    it('returns correct contributing URL', () => {
      const info = getPluginRepoInfo()

      expect(info.contributingUrl).toBe(
        'https://github.com/framersai/quarry-plugins/blob/main/CONTRIBUTING.md'
      )
    })

    it('returns correct docs URL', () => {
      const info = getPluginRepoInfo()

      expect(info.docsUrl).toBe('https://github.com/framersai/quarry-plugins/blob/main/README.md')
    })

    it('returns correct issues URL', () => {
      const info = getPluginRepoInfo()

      expect(info.issuesUrl).toBe('https://github.com/framersai/quarry-plugins/issues')
    })

    it('has MIT license', () => {
      const info = getPluginRepoInfo()

      expect(info.license).toBe('MIT')
    })

    it('is marked as official', () => {
      const info = getPluginRepoInfo()

      expect(info.isOfficial).toBe(true)
    })
  })

  describe('with custom repo', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = 'myorg/my-plugins'
    })

    it('returns correct owner and name', () => {
      const info = getPluginRepoInfo()

      expect(info.owner).toBe('myorg')
      expect(info.name).toBe('my-plugins')
    })

    it('returns correct GitHub URL', () => {
      const info = getPluginRepoInfo()

      expect(info.url).toBe('https://github.com/myorg/my-plugins')
    })

    it('is not marked as official', () => {
      const info = getPluginRepoInfo()

      expect(info.isOfficial).toBe(false)
    })
  })
})

// ============================================================================
// getCodexRepoUrl
// ============================================================================

describe('getCodexRepoUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_CODEX_REPO

  afterEach(() => {
    process.env.NEXT_PUBLIC_CODEX_REPO = originalEnv
  })

  it('returns default GitHub URL when not configured', () => {
    delete process.env.NEXT_PUBLIC_CODEX_REPO
    expect(getCodexRepoUrl()).toBe('https://github.com/framersai/frame.dev')
  })

  it('returns custom GitHub URL when configured', () => {
    process.env.NEXT_PUBLIC_CODEX_REPO = 'myorg/my-codex'
    expect(getCodexRepoUrl()).toBe('https://github.com/myorg/my-codex')
  })
})

// ============================================================================
// isUsingOfficialRepos
// ============================================================================

describe('isUsingOfficialRepos', () => {
  const originalPluginEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
  const originalCodexEnv = process.env.NEXT_PUBLIC_CODEX_REPO

  afterEach(() => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = originalPluginEnv
    process.env.NEXT_PUBLIC_CODEX_REPO = originalCodexEnv
  })

  it('returns true when using all defaults', () => {
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
    delete process.env.NEXT_PUBLIC_CODEX_REPO

    expect(isUsingOfficialRepos()).toBe(true)
  })

  it('returns false when using custom plugin repo', () => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = 'myorg/my-plugins'
    delete process.env.NEXT_PUBLIC_CODEX_REPO

    expect(isUsingOfficialRepos()).toBe(false)
  })

  it('returns false when using custom codex repo', () => {
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
    process.env.NEXT_PUBLIC_CODEX_REPO = 'myorg/my-codex'

    expect(isUsingOfficialRepos()).toBe(false)
  })

  it('returns false when using both custom repos', () => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = 'myorg/my-plugins'
    process.env.NEXT_PUBLIC_CODEX_REPO = 'myorg/my-codex'

    expect(isUsingOfficialRepos()).toBe(false)
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('repository config integration', () => {
  const originalPluginEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
  const originalCodexEnv = process.env.NEXT_PUBLIC_CODEX_REPO
  const originalRegistryUrlEnv = process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL

  beforeEach(() => {
    // Clear env vars to use defaults
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO
    delete process.env.NEXT_PUBLIC_CODEX_REPO
    delete process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_REPO = originalPluginEnv
    process.env.NEXT_PUBLIC_CODEX_REPO = originalCodexEnv
    process.env.NEXT_PUBLIC_PLUGIN_REGISTRY_URL = originalRegistryUrlEnv
  })

  it('all default URLs are valid', () => {
    const urlPattern = /^https:\/\/.+$/

    const registryUrl = getPluginRegistryUrl()
    const codexUrl = getCodexRepoUrl()
    const infoUrl = getPluginRepoInfo().url

    expect(registryUrl).toMatch(urlPattern)
    expect(codexUrl).toMatch(urlPattern)
    expect(infoUrl).toMatch(urlPattern)
  })

  it('plugin info URLs are consistent with repo', () => {
    const info = getPluginRepoInfo()
    const repo = getPluginRepo()

    expect(info.url).toContain(repo)
    expect(info.contributingUrl).toContain(repo)
    expect(info.docsUrl).toContain(repo)
    expect(info.issuesUrl).toContain(repo)
  })

  it('repository config uses same repos as individual getters', () => {
    const config = getRepositoryConfig()

    expect(config.pluginRepo).toBe(getPluginRepo())
    expect(config.pluginRegistryUrl).toBe(getPluginRegistryUrl())
    expect(config.codexRepo).toBe(getCodexRepo())
  })
})
