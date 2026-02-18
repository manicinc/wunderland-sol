/**
 * Deployment Mode Tests
 * @module __tests__/unit/lib/utils/deploymentMode.test
 *
 * Tests for deployment mode detection utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  isStaticExport,
  isLocalDev,
  hasApiRoutes,
  getDeploymentMode,
  isQuarryDomain,
  getQuarryAppUrl,
  getQuarryPath,
  resolveQuarryPath,
} from '@/lib/utils/deploymentMode'

describe('deploymentMode module', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    process.env = originalEnv
  })

  // ============================================================================
  // isStaticExport
  // ============================================================================

  describe('isStaticExport', () => {
    it('returns false when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(isStaticExport()).toBe(false)
    })

    it('returns true for github.io domains', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'user.github.io' },
      })
      expect(isStaticExport()).toBe(true)
    })

    it('returns true for frame.dev domain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(isStaticExport()).toBe(true)
    })

    it('returns true for vercel.app domains', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'my-app.vercel.app' },
      })
      expect(isStaticExport()).toBe(true)
    })

    it('returns true when NEXT_PUBLIC_DEPLOYMENT_MODE is static', () => {
      process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'static'
      vi.stubGlobal('window', {
        location: { hostname: 'custom-domain.com' },
      })
      expect(isStaticExport()).toBe(true)
    })

    it('returns false for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(isStaticExport()).toBe(false)
    })

    it('returns false for unknown domains', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'custom-domain.com' },
      })
      expect(isStaticExport()).toBe(false)
    })
  })

  // ============================================================================
  // isLocalDev
  // ============================================================================

  describe('isLocalDev', () => {
    it('returns true when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(isLocalDev()).toBe(true)
    })

    it('returns true for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(isLocalDev()).toBe(true)
    })

    it('returns true for 127.0.0.1', () => {
      vi.stubGlobal('window', {
        location: { hostname: '127.0.0.1' },
      })
      expect(isLocalDev()).toBe(true)
    })

    it('returns false for remote domains', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(isLocalDev()).toBe(false)
    })
  })

  // ============================================================================
  // hasApiRoutes
  // ============================================================================

  describe('hasApiRoutes', () => {
    it('returns true when window is undefined (SSR)', () => {
      vi.stubGlobal('window', undefined)
      expect(hasApiRoutes()).toBe(true)
    })

    it('returns true for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(hasApiRoutes()).toBe(true)
    })

    it('returns true when offline mode is set', () => {
      process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'offline'
      vi.stubGlobal('window', {
        location: { hostname: 'custom-domain.com' },
      })
      expect(hasApiRoutes()).toBe(true)
    })

    it('returns false for static export domains', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(hasApiRoutes()).toBe(false)
    })
  })

  // ============================================================================
  // getDeploymentMode
  // ============================================================================

  describe('getDeploymentMode', () => {
    it('returns development for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(getDeploymentMode()).toBe('development')
    })

    it('returns offline when NEXT_PUBLIC_DEPLOYMENT_MODE is offline', () => {
      process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = 'offline'
      vi.stubGlobal('window', {
        location: { hostname: 'custom-domain.com' },
      })
      expect(getDeploymentMode()).toBe('offline')
    })

    it('returns static for remote domains without offline mode', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(getDeploymentMode()).toBe('static')
    })
  })

  // ============================================================================
  // isQuarryDomain
  // ============================================================================

  describe('isQuarryDomain', () => {
    it('returns false when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(isQuarryDomain()).toBe(false)
    })

    it('returns true for quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(isQuarryDomain()).toBe(true)
    })

    it('returns true for subdomain of quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'app.quarry.space' },
      })
      expect(isQuarryDomain()).toBe(true)
    })

    it('returns true for quarry.dev', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.dev' },
      })
      expect(isQuarryDomain()).toBe(true)
    })

    it('returns true for subdomain of quarry.dev', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'app.quarry.dev' },
      })
      expect(isQuarryDomain()).toBe(true)
    })

    it('returns false for frame.dev', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(isQuarryDomain()).toBe(false)
    })

    it('returns false for localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(isQuarryDomain()).toBe(false)
    })
  })

  // ============================================================================
  // getQuarryAppUrl
  // ============================================================================

  describe('getQuarryAppUrl', () => {
    it('returns /quarry/app when window is undefined', () => {
      vi.stubGlobal('window', undefined)
      expect(getQuarryAppUrl()).toBe('/quarry/app')
    })

    it('returns /app on quarry.space domain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(getQuarryAppUrl()).toBe('/app')
    })

    it('returns /app on quarry.dev domain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.dev' },
      })
      expect(getQuarryAppUrl()).toBe('/app')
    })

    it('returns /quarry/app on frame.dev', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(getQuarryAppUrl()).toBe('/quarry/app')
    })

    it('returns /quarry/app on localhost', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'localhost' },
      })
      expect(getQuarryAppUrl()).toBe('/quarry/app')
    })
  })

  // ============================================================================
  // getQuarryPath
  // ============================================================================

  describe('getQuarryPath', () => {
    it('returns path unchanged on non-quarry domain', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'frame.dev' },
      })
      expect(getQuarryPath('/quarry/about')).toBe('/quarry/about')
    })

    it('converts /quarry to / on quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(getQuarryPath('/quarry')).toBe('/')
    })

    it('converts /quarry# to /# on quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(getQuarryPath('/quarry#features')).toBe('/#features')
    })

    it('converts /quarry/ paths on quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(getQuarryPath('/quarry/about')).toBe('/about')
      expect(getQuarryPath('/quarry/docs/intro')).toBe('/docs/intro')
    })

    it('returns non-quarry paths unchanged on quarry.space', () => {
      vi.stubGlobal('window', {
        location: { hostname: 'quarry.space' },
      })
      expect(getQuarryPath('/app')).toBe('/app')
      expect(getQuarryPath('/other/path')).toBe('/other/path')
    })
  })

  // ============================================================================
  // resolveQuarryPath
  // ============================================================================

  describe('resolveQuarryPath', () => {
    it('returns path unchanged when not on quarry domain', () => {
      expect(resolveQuarryPath('/quarry/about', false)).toBe('/quarry/about')
      expect(resolveQuarryPath('/quarry', false)).toBe('/quarry')
    })

    it('converts /quarry to / when on quarry domain', () => {
      expect(resolveQuarryPath('/quarry', true)).toBe('/')
    })

    it('converts /quarry# to /# when on quarry domain', () => {
      expect(resolveQuarryPath('/quarry#features', true)).toBe('/#features')
      expect(resolveQuarryPath('/quarry#pricing', true)).toBe('/#pricing')
    })

    it('strips /quarry/ prefix when on quarry domain', () => {
      expect(resolveQuarryPath('/quarry/about', true)).toBe('/about')
      expect(resolveQuarryPath('/quarry/docs/intro', true)).toBe('/docs/intro')
    })

    it('returns non-quarry paths unchanged when on quarry domain', () => {
      expect(resolveQuarryPath('/app', true)).toBe('/app')
      expect(resolveQuarryPath('/other/path', true)).toBe('/other/path')
    })
  })
})
