/**
 * Electron Main Process Tests
 *
 * Tests for validating the Electron main process configuration and IPC handlers.
 * Note: These tests validate the source code structure, not runtime behavior.
 * @module __tests__/unit/electron/main
 */

import * as fs from 'fs'
import * as path from 'path'

const ELECTRON_DIR = path.join(process.cwd(), 'electron')
const MAIN_TS = path.join(ELECTRON_DIR, 'main.ts')
const PRELOAD_TS = path.join(ELECTRON_DIR, 'preload.ts')
const TSCONFIG = path.join(ELECTRON_DIR, 'tsconfig.json')

describe('Electron Source Files', () => {
  it('should have main.ts file', () => {
    expect(fs.existsSync(MAIN_TS)).toBe(true)
  })

  it('should have preload.ts file', () => {
    expect(fs.existsSync(PRELOAD_TS)).toBe(true)
  })

  it('should have tsconfig.json', () => {
    expect(fs.existsSync(TSCONFIG)).toBe(true)
  })
})

describe('Main Process Configuration', () => {
  let mainContent: string

  beforeAll(() => {
    mainContent = fs.readFileSync(MAIN_TS, 'utf-8')
  })

  describe('Window Configuration', () => {
    it('should use hiddenInset title bar style for macOS', () => {
      expect(mainContent).toContain("titleBarStyle: 'hiddenInset'")
    })

    it('should have traffic light positioning', () => {
      expect(mainContent).toContain('trafficLightPosition')
    })

    it('should disable nodeIntegration for security', () => {
      expect(mainContent).toContain('nodeIntegration: false')
    })

    it('should enable contextIsolation for security', () => {
      expect(mainContent).toContain('contextIsolation: true')
    })

    it('should enable sandbox for security', () => {
      expect(mainContent).toContain('sandbox: true')
    })

    it('should reference preload script', () => {
      expect(mainContent).toContain('preload')
    })
  })

  describe('IPC Handlers', () => {
    const expectedHandlers = [
      'get-app-version',
      'get-platform',
      'is-packaged',
      'select-directory',
      'select-file',
      'settings:get',
      'settings:set',
      'settings:delete',
      'settings:getAll',
      'fs:readFile',
      'fs:writeFile',
      'fs:readDir',
      'fs:mkdir',
      'fs:exists',
      'fs:stat',
      'fs:delete',
    ]

    expectedHandlers.forEach((handler) => {
      it(`should register '${handler}' IPC handler`, () => {
        expect(mainContent).toContain(`'${handler}'`)
      })
    })
  })

  describe('Next.js Integration', () => {
    it('should reference standalone server path', () => {
      expect(mainContent).toContain('.next/standalone')
    })

    it('should configure production port', () => {
      expect(mainContent).toMatch(/PORT.*3847|3847.*PORT/)
    })

    it('should spawn child process for production server', () => {
      expect(mainContent).toContain('spawn')
    })

    it('should handle development mode', () => {
      expect(mainContent).toContain('localhost:3000')
    })
  })

  describe('Electron Store', () => {
    it('should import electron-store', () => {
      expect(mainContent).toContain('electron-store')
    })

    it('should create store instance', () => {
      expect(mainContent).toMatch(/new\s+Store|Store\s*\(/)
    })
  })
})

describe('Preload Script', () => {
  let preloadContent: string

  beforeAll(() => {
    preloadContent = fs.readFileSync(PRELOAD_TS, 'utf-8')
  })

  it('should use contextBridge', () => {
    expect(preloadContent).toContain('contextBridge')
  })

  it('should expose electronAPI', () => {
    expect(preloadContent).toContain('electronAPI')
  })

  it('should use ipcRenderer.invoke', () => {
    expect(preloadContent).toContain('ipcRenderer.invoke')
  })

  describe('Exposed APIs', () => {
    const expectedAPIs = [
      'getAppVersion',
      'getPlatform',
      'isPackaged',
      'selectDirectory',
      'selectFile',
    ]

    expectedAPIs.forEach((api) => {
      it(`should expose '${api}' API`, () => {
        expect(preloadContent).toContain(api)
      })
    })
  })

  describe('Settings API', () => {
    it('should expose settings.get', () => {
      expect(preloadContent).toContain('settings')
    })
  })

  describe('File System API', () => {
    it('should expose fs API', () => {
      expect(preloadContent).toMatch(/fs[:\s]|fileSystem/)
    })
  })
})

describe('TypeScript Configuration', () => {
  let tsconfig: {
    compilerOptions: {
      target: string
      module: string
      outDir: string
      strict: boolean
    }
    include: string[]
  }

  beforeAll(() => {
    const content = fs.readFileSync(TSCONFIG, 'utf-8')
    tsconfig = JSON.parse(content)
  })

  it('should target ES2020 or later', () => {
    const validTargets = ['ES2020', 'ES2021', 'ES2022', 'ES2023', 'ESNext']
    expect(validTargets).toContain(tsconfig.compilerOptions.target)
  })

  it('should use CommonJS modules', () => {
    expect(tsconfig.compilerOptions.module).toBe('CommonJS')
  })

  it('should output to electron-dist', () => {
    expect(tsconfig.compilerOptions.outDir).toContain('electron-dist')
  })

  it('should have strict mode enabled', () => {
    expect(tsconfig.compilerOptions.strict).toBe(true)
  })

  it('should include TypeScript files', () => {
    // Check that include pattern covers TypeScript files
    const includePatterns = tsconfig.include as string[]
    const coversTs = includePatterns.some(p => p.includes('*.ts') || p.includes('.ts'))
    expect(coversTs).toBe(true)
  })
})
