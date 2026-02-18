/**
 * Public Access Mode Unit Tests
 * Tests for PUBLIC_ACCESS environment variable behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Public Access Mode', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('isPublicAccess', () => {
    it('should return false when NEXT_PUBLIC_PUBLIC_ACCESS is not set', async () => {
      delete process.env.NEXT_PUBLIC_PUBLIC_ACCESS

      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      expect(isPublicAccess()).toBe(false)
    })

    it('should return false when NEXT_PUBLIC_PUBLIC_ACCESS is "false"', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      expect(isPublicAccess()).toBe(false)
    })

    it('should return true when NEXT_PUBLIC_PUBLIC_ACCESS is "true"', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      expect(isPublicAccess()).toBe(true)
    })

    it('should return false for invalid values', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'yes'

      const { isPublicAccess } = await import('@/lib/config/publicAccess')
      expect(isPublicAccess()).toBe(false)
    })
  })

  describe('canInstallPlugins', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canInstallPlugins } = await import('@/lib/config/publicAccess')
      expect(canInstallPlugins()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canInstallPlugins } = await import('@/lib/config/publicAccess')
      expect(canInstallPlugins()).toBe(false)
    })
  })

  describe('canRemovePlugins', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canRemovePlugins } = await import('@/lib/config/publicAccess')
      expect(canRemovePlugins()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canRemovePlugins } = await import('@/lib/config/publicAccess')
      expect(canRemovePlugins()).toBe(false)
    })
  })

  describe('canModifySecuritySettings', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canModifySecuritySettings } = await import('@/lib/config/publicAccess')
      expect(canModifySecuritySettings()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canModifySecuritySettings } = await import('@/lib/config/publicAccess')
      expect(canModifySecuritySettings()).toBe(false)
    })
  })

  describe('getPublicAccessMessage', () => {
    it('should return appropriate message', async () => {
      const { getPublicAccessMessage } = await import('@/lib/config/publicAccess')
      const message = getPublicAccessMessage()

      expect(message).toContain('public access mode')
      expect(message).toContain('administrator')
    })
  })

  describe('canModifyStorageSettings', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canModifyStorageSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyStorageSettings()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canModifyStorageSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyStorageSettings()).toBe(false)
    })
  })

  describe('canModifyConnectionSettings', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canModifyConnectionSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyConnectionSettings()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canModifyConnectionSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyConnectionSettings()).toBe(false)
    })
  })

  describe('canModifyInstanceSettings', () => {
    it('should return true when public access is disabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'false'

      const { canModifyInstanceSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyInstanceSettings()).toBe(true)
    })

    it('should return false when public access is enabled', async () => {
      process.env.NEXT_PUBLIC_PUBLIC_ACCESS = 'true'

      const { canModifyInstanceSettings } = await import('@/lib/config/publicAccess')
      expect(canModifyInstanceSettings()).toBe(false)
    })
  })

  describe('getDisabledTooltip', () => {
    it('should return generic message when no setting provided', async () => {
      const { getDisabledTooltip } = await import('@/lib/config/publicAccess')
      const tooltip = getDisabledTooltip()

      expect(tooltip).toBe('Locked in public access mode')
    })

    it('should return setting-specific message when setting provided', async () => {
      const { getDisabledTooltip } = await import('@/lib/config/publicAccess')
      const tooltip = getDisabledTooltip('GitHub PAT')

      expect(tooltip).toBe('GitHub PAT is locked in public access mode')
    })
  })
})

describe('Public Access Mode - Default Behavior', () => {
  it('should default to allowing all actions when env is not set', async () => {
    delete process.env.NEXT_PUBLIC_PUBLIC_ACCESS
    vi.resetModules()

    const mod = await import('@/lib/config/publicAccess')

    expect(mod.isPublicAccess()).toBe(false)
    expect(mod.canInstallPlugins()).toBe(true)
    expect(mod.canRemovePlugins()).toBe(true)
    expect(mod.canModifySecuritySettings()).toBe(true)
    expect(mod.canModifyStorageSettings()).toBe(true)
    expect(mod.canModifyConnectionSettings()).toBe(true)
    expect(mod.canModifyInstanceSettings()).toBe(true)
  })
})
