/**
 * Electron Builder Configuration Tests
 *
 * Tests for validating the electron-builder.yml configuration.
 * @module __tests__/unit/electron/electron-builder
 */

import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'

const CONFIG_PATH = path.join(process.cwd(), 'electron-builder.yml')

interface ElectronBuilderConfig {
  appId: string
  productName: string
  asar: boolean
  files: string[]
  extraResources: Array<{
    from: string
    to: string
    filter?: string
  }>
  mac: {
    icon: string
    category: string
    darkModeSupport: boolean
    hardenedRuntime: boolean
  }
  dmg: {
    icon: string
  }
  win: {
    icon: string
  }
  linux: {
    icon: string
  }
}

describe('Electron Builder Configuration', () => {
  let config: ElectronBuilderConfig

  beforeAll(() => {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf-8')
    config = yaml.load(configContent) as ElectronBuilderConfig
  })

  describe('App Identity', () => {
    it('should have correct appId', () => {
      expect(config.appId).toBe('dev.frame.quarry')
    })

    it('should have correct productName', () => {
      expect(config.productName).toBe('Quarry')
    })
  })

  describe('Build Settings', () => {
    it('should have asar disabled for Next.js standalone', () => {
      expect(config.asar).toBe(false)
    })

    it('should include electron-dist files', () => {
      expect(config.files).toContain('electron-dist/**/*')
    })

    it('should include package.json', () => {
      expect(config.files).toContain('package.json')
    })

    it('should include Next.js standalone server', () => {
      expect(config.files).toContain('.next/standalone/**/*')
    })

    it('should include Next.js static files', () => {
      expect(config.files).toContain('.next/static/**/*')
    })

    it('should include public folder', () => {
      expect(config.files).toContain('public/**/*')
    })

    it('should exclude root node_modules', () => {
      expect(config.files).toContain('!node_modules')
    })

    it('should exclude .next/cache', () => {
      expect(config.files).toContain('!.next/cache')
    })

    it('should exclude source files', () => {
      expect(config.files).toContain('!src')
    })

    it('should exclude test files', () => {
      expect(config.files).toContain('!__tests__')
    })
  })

  describe('Extra Resources', () => {
    it('should copy .next/static to app/.next/standalone/.next/static', () => {
      const staticResource = config.extraResources.find(
        (r) => r.from === '.next/static'
      )
      expect(staticResource).toBeDefined()
      expect(staticResource?.to).toBe('app/.next/standalone/.next/static')
    })

    it('should copy public to app/.next/standalone/public', () => {
      const publicResource = config.extraResources.find(
        (r) => r.from === 'public'
      )
      expect(publicResource).toBeDefined()
      expect(publicResource?.to).toBe('app/.next/standalone/public')
    })

    it('should copy electron-store for main process', () => {
      const storeResource = config.extraResources.find(
        (r) => r.from === 'node_modules/electron-store'
      )
      expect(storeResource).toBeDefined()
      expect(storeResource?.to).toBe('app/node_modules/electron-store')
    })
  })

  describe('macOS Configuration', () => {
    it('should have icon configured', () => {
      expect(config.mac.icon).toBe('build/icon.icns')
    })

    it('should have productivity category', () => {
      expect(config.mac.category).toBe('public.app-category.productivity')
    })

    it('should support dark mode', () => {
      expect(config.mac.darkModeSupport).toBe(true)
    })

    it('should have hardened runtime enabled', () => {
      expect(config.mac.hardenedRuntime).toBe(true)
    })
  })

  describe('DMG Configuration', () => {
    it('should have icon configured', () => {
      expect(config.dmg.icon).toBe('build/icon.icns')
    })
  })

  describe('Windows Configuration', () => {
    it('should have icon configured', () => {
      expect(config.win.icon).toBe('build/icon.png')
    })
  })

  describe('Linux Configuration', () => {
    it('should have icons directory configured', () => {
      expect(config.linux.icon).toBe('build/icons')
    })
  })
})

describe('Build Assets', () => {
  const BUILD_DIR = path.join(process.cwd(), 'build')

  it('should have macOS icon file', () => {
    const iconPath = path.join(BUILD_DIR, 'icon.icns')
    expect(fs.existsSync(iconPath)).toBe(true)
  })

  it('should have Windows icon file', () => {
    const iconPath = path.join(BUILD_DIR, 'icon.png')
    expect(fs.existsSync(iconPath)).toBe(true)
  })

  it('should have Linux icon files', () => {
    const iconsDir = path.join(BUILD_DIR, 'icons')
    expect(fs.existsSync(iconsDir)).toBe(true)
    expect(fs.existsSync(path.join(iconsDir, '512x512.png'))).toBe(true)
  })

  it('should have entitlements file', () => {
    const entitlements = path.join(BUILD_DIR, 'entitlements.mac.plist')
    expect(fs.existsSync(entitlements)).toBe(true)
  })
})
