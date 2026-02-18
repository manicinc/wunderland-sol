// Import types for TypeScript
import type { BrowserWindow as BrowserWindowType, IpcMainInvokeEvent } from 'electron'
import type { ChildProcess } from 'child_process'

// Write a simple file to indicate the process started - use require to avoid import issues
const fsEarly = require('fs')
const pathEarly = require('path')
const earlyLogPath = pathEarly.join('/tmp', 'quarry-early.log')
fsEarly.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] main.ts starting\n`)

// In Electron's main process, require('electron') returns the Electron API
// Note: ELECTRON_RUN_AS_NODE must be unset (VS Code sets it) - see package.json electron:start script
const { app, BrowserWindow, shell, ipcMain, nativeTheme, dialog } = require('electron')
import * as path from 'path'
import * as fs from 'fs/promises'
import * as fsSync from 'fs'
import { spawn } from 'child_process'

fsEarly.appendFileSync(earlyLogPath, `[${new Date().toISOString()}] electron required successfully\n`)

// Debug logging to file
const logFile = path.join(app.getPath('temp'), 'quarry-debug.log')
function debugLog(...args: unknown[]) {
  const msg = `[${new Date().toISOString()}] ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}\n`
  try {
    fsSync.appendFileSync(logFile, msg)
  } catch (e) { /* ignore file write errors */ }
  try {
    console.log(...args)
  } catch (e) { /* ignore console errors when no TTY attached */ }
}
debugLog('[Main] Electron main process starting, log file:', logFile)
import { registerAudioHandlers } from './audio-handlers'

// eslint-disable-next-line @typescript-eslint/no-var-requires
// In packaged builds, electron-store is in Resources/app/node_modules (via extraResources)
const Store = app.isPackaged
  ? require(path.join(process.resourcesPath, 'app', 'node_modules', 'electron-store'))
  : require('electron-store')

// Define the store interface for type safety
interface StoreInterface {
  get(key: string): unknown
  set(key: string, value: unknown): void
  delete(key: string): void
  store: Record<string, unknown>
}

// Initialize electron-store for persistent settings
const store: StoreInterface = new Store({
  name: 'frame-settings',
  encryptionKey: 'frame-dev-local-encryption-key-v1', // For local builds
  defaults: {
    apiKeys: {},
    preferences: {},
    vaultPath: '',
    githubPAT: '',
    preferredProvider: '',
  }
})

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// Ensure only one instance of the app runs
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // Another instance is already running, quit this one
  app.quit()
} else {
  // Handle second instance trying to launch - focus existing window
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
}

// Next.js server process for production
let nextServer: ChildProcess | null = null
const NEXT_PORT = 3847 // Use a non-standard port to avoid conflicts

// Start the Next.js production server (standalone mode)
async function startNextServer(): Promise<void> {
  debugLog('[startNextServer] isDev:', isDev, 'app.isPackaged:', app.isPackaged)

  if (isDev) {
    debugLog('[startNextServer] Skipping server start - development mode')
    return // Dev mode uses external Next.js dev server
  }

  return new Promise((resolve, reject) => {
    // For standalone output, the server.js is in .next/standalone
    // When packaged with asar: false, files are directly in Resources/app folder
    const basePath = app.isPackaged
      ? path.join(process.resourcesPath, 'app')
      : path.join(__dirname, '..')

    const serverPath = path.join(basePath, '.next/standalone/server.js')

    debugLog('[Electron] Starting Next.js standalone server:', serverPath)
    debugLog('[Electron] Server exists:', fsSync.existsSync(serverPath))

    // Try to use system Node.js first to avoid dock icon, fall back to Electron
    let nodePath = process.execPath
    let useElectronAsNode = true

    // Check for system Node.js (avoids "exec" dock icon on macOS)
    const systemNodePaths = ['/usr/local/bin/node', '/opt/homebrew/bin/node', '/usr/bin/node']
    for (const np of systemNodePaths) {
      if (fsSync.existsSync(np)) {
        nodePath = np
        useElectronAsNode = false
        debugLog('[Electron] Using system Node.js:', np)
        break
      }
    }

    nextServer = spawn(nodePath, [serverPath], {
      cwd: path.join(basePath, '.next/standalone'),
      env: {
        ...process.env,
        ...(useElectronAsNode ? { ELECTRON_RUN_AS_NODE: '1' } : {}),
        // Prevent dock icon on macOS when using Electron as Node
        ELECTRON_NO_ATTACH_CONSOLE: '1',
        NODE_ENV: 'production',
        PORT: String(NEXT_PORT),
        HOSTNAME: 'localhost',
        QUARRY_ELECTRON: '1', // Tell the app it's running in Electron (for SSR detection)
        NEXT_PUBLIC_DEPLOYMENT_MODE: 'offline', // Force offline/local mode
        NEXT_PUBLIC_EDITION: 'premium', // Force premium edition with local storage
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true, // Hide console window on Windows
      detached: false, // Ensure child doesn't outlive parent
    })

    let started = false
    const timeout = setTimeout(() => {
      if (!started) {
        // Even if we didn't see "Ready", try anyway after timeout
        console.log('[Electron] Server startup timeout, attempting to load anyway...')
        started = true
        resolve()
      }
    }, 10000) // 10 second timeout

    nextServer.stdout?.on('data', (data: Buffer) => {
      const output = data.toString()
      console.log('[Next.js]', output)
      if (output.includes('Ready') || output.includes('started server') || output.includes('Listening')) {
        started = true
        clearTimeout(timeout)
        resolve()
      }
    })

    nextServer.stderr?.on('data', (data: Buffer) => {
      console.error('[Next.js Error]', data.toString())
    })

    nextServer.on('error', (err) => {
      console.error('[Next.js] Failed to start:', err)
      clearTimeout(timeout)
      reject(err)
    })

    nextServer.on('exit', (code) => {
      console.log('[Next.js] Server exited with code:', code)
      nextServer = null
    })
  })
}

// Stop the Next.js server
function stopNextServer() {
  if (nextServer) {
    nextServer.kill()
    nextServer = null
  }
}

let mainWindow: BrowserWindowType | null = null
let isCreatingWindow = false

async function createWindow() {
  // Prevent multiple windows from being created
  if (isCreatingWindow || mainWindow !== null) {
    mainWindow?.focus()
    return
  }
  isCreatingWindow = true
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Quarry',
    titleBarStyle: 'hiddenInset', // macOS native look
    trafficLightPosition: { x: 80, y: 16 }, // Moved right to avoid covering logo
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#fafafa',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: true,
    },
    show: false, // Don't show until ready
  })

  // Show window when ready to prevent visual flash
  mainWindow!.once('ready-to-show', () => {
    mainWindow?.show()
    if (isDev) {
      mainWindow?.webContents.openDevTools()
    }
  })

  // Load the app - go directly to /app (the main app, not landing page)
  if (isDev) {
    // In development, connect to the Next.js dev server
    await mainWindow!.loadURL('http://localhost:3000/app')
  } else {
    // In production, connect to the embedded Next.js server
    await mainWindow!.loadURL(`http://localhost:${NEXT_PORT}/app`)
  }

  // Open external links in browser
  mainWindow!.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Handle window close
  mainWindow!.on('closed', () => {
    mainWindow = null
    isCreatingWindow = false
  })

  // Window creation complete
  isCreatingWindow = false
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    stopNextServer()
    app.quit()
  }
})

// On macOS, re-create window when dock icon is clicked
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// Clean up on quit
app.on('before-quit', () => {
  stopNextServer()
})

// App is ready
app.whenReady().then(async () => {
  debugLog('[Electron] App ready, isDev:', isDev)
  debugLog('[Electron] app.isPackaged:', app.isPackaged)
  debugLog('[Electron] resourcesPath:', process.resourcesPath)

  try {
    // Register audio IPC handlers for system audio capture
    debugLog('[Electron] Registering audio handlers...')
    registerAudioHandlers()
    debugLog('[Electron] Audio handlers registered')

    // Start the Next.js server for production builds
    debugLog('[Electron] Starting Next.js server...')
    await startNextServer()
    debugLog('[Electron] Next.js server started')

    debugLog('[Electron] Creating window...')
    await createWindow()
    debugLog('[Electron] Window created')
  } catch (err) {
    debugLog('[Electron] Failed to start:', err)
    app.quit()
  }
})

// IPC handlers for renderer communication
ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

ipcMain.handle('get-platform', () => {
  return process.platform
})

ipcMain.handle('is-packaged', () => {
  return app.isPackaged
})

// File selection handlers for local vault support
ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Vault Directory',
  })

  return result.canceled ? null : result.filePaths[0]
})

ipcMain.handle('select-file', async (_event: IpcMainInvokeEvent, filters?: { name: string; extensions: string[] }[]) => {
  if (!mainWindow) return null

  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select File',
    filters: filters || [{ name: 'All Files', extensions: ['*'] }],
  })

  return result.canceled ? null : result.filePaths[0]
})

// Window control handlers
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// Handle theme changes
nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('native-theme-updated', {
    shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
    themeSource: nativeTheme.themeSource,
  })
})

// Settings IPC handlers (using electron-store)
ipcMain.handle('settings:get', (_event: IpcMainInvokeEvent, key: string) => {
  return store.get(key)
})

ipcMain.handle('settings:set', (_event: IpcMainInvokeEvent, key: string, value: unknown) => {
  store.set(key, value)
  return true
})

ipcMain.handle('settings:delete', (_event: IpcMainInvokeEvent, key: string) => {
  store.delete(key)
  return true
})

ipcMain.handle('settings:getAll', () => {
  return store.store
})

// File system IPC handlers
ipcMain.handle('fs:readFile', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    return await fs.readFile(filePath, 'utf-8')
  } catch (error) {
    console.error('fs:readFile error:', error)
    throw error
  }
})

ipcMain.handle('fs:writeFile', async (_event: IpcMainInvokeEvent, filePath: string, content: string) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8')
    return true
  } catch (error) {
    console.error('fs:writeFile error:', error)
    throw error
  }
})

ipcMain.handle('fs:readDir', async (_event: IpcMainInvokeEvent, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    return entries.map(e => ({ name: e.name, isDirectory: e.isDirectory() }))
  } catch (error) {
    console.error('fs:readDir error:', error)
    throw error
  }
})

ipcMain.handle('fs:mkdir', async (_event: IpcMainInvokeEvent, dirPath: string) => {
  try {
    await fs.mkdir(dirPath, { recursive: true })
    return true
  } catch (error) {
    console.error('fs:mkdir error:', error)
    throw error
  }
})

ipcMain.handle('fs:exists', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
})

ipcMain.handle('fs:stat', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    const stat = await fs.stat(filePath)
    return {
      size: stat.size,
      mtime: stat.mtime.toISOString(),
      isDirectory: stat.isDirectory(),
    }
  } catch (error) {
    console.error('fs:stat error:', error)
    throw error
  }
})

ipcMain.handle('fs:delete', async (_event: IpcMainInvokeEvent, filePath: string) => {
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    console.error('fs:delete error:', error)
    throw error
  }
})

// ============================================================================
// VAULT IPC HANDLERS
// ============================================================================

/**
 * Get the default vault path for first-time setup
 */
function getDefaultVaultPath(): string {
  const documentsPath = app.getPath('documents')
  return path.join(documentsPath, 'Quarry')
}

/**
 * Initialize the vault directory with basic structure
 */
async function initializeVault(vaultPath: string): Promise<{ success: boolean; fileCount: number }> {
  try {
    // Create vault directory
    await fs.mkdir(vaultPath, { recursive: true })

    // Create .quarry config directory
    const quarryDir = path.join(vaultPath, '.quarry')
    await fs.mkdir(quarryDir, { recursive: true })

    // Create vault.json config
    const vaultConfig = {
      version: 1,
      id: `vault-${Date.now()}`,
      name: 'My Vault',
      createdAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
    }
    await fs.writeFile(
      path.join(quarryDir, 'vault.json'),
      JSON.stringify(vaultConfig, null, 2),
      'utf-8'
    )

    // Create weaves directory
    const weavesDir = path.join(vaultPath, 'weaves')
    await fs.mkdir(weavesDir, { recursive: true })

    // Create assets directory
    const assetsDir = path.join(vaultPath, 'assets')
    await fs.mkdir(assetsDir, { recursive: true })

    // Create a welcome strand
    const welcomeDir = path.join(weavesDir, 'getting-started', 'looms', 'welcome', 'strands')
    await fs.mkdir(welcomeDir, { recursive: true })

    const welcomeContent = `---
title: Welcome to Quarry
description: Your local-first knowledge base
tags: [welcome, getting-started]
---

# Welcome to Quarry

This is your local vault for storing and organizing knowledge.

## Getting Started

1. Add markdown files to the \`weaves\` folder
2. Organize content into weaves (topics) and looms (sub-topics)
3. Use the sidebar to navigate your content

## Folder Structure

\`\`\`
vault/
├── .quarry/          # Vault configuration
├── weaves/           # Your content organized by topic
│   └── topic-name/
│       └── looms/
│           └── subtopic/
│               └── strands/
│                   └── note.md
└── assets/           # Images and attachments
\`\`\`

Happy organizing!
`
    await fs.writeFile(
      path.join(welcomeDir, 'welcome.md'),
      welcomeContent,
      'utf-8'
    )

    return { success: true, fileCount: 1 }
  } catch (error) {
    console.error('initializeVault error:', error)
    return { success: false, fileCount: 0 }
  }
}

/**
 * Get Electron vault status
 */
ipcMain.handle('vault:getElectronVaultStatus', async () => {
  const vaultPath = store.get('vaultPath') as string || ''
  const firstLaunchCompleted = store.get('firstLaunchCompleted') as boolean || false

  let electronVaultInitialized = false
  let vaultName = 'My Vault'

  if (vaultPath) {
    try {
      // Check if vault exists and has config
      const configPath = path.join(vaultPath, '.quarry', 'vault.json')
      await fs.access(configPath)
      electronVaultInitialized = true

      // Read vault name from config
      try {
        const configContent = await fs.readFile(configPath, 'utf-8')
        const config = JSON.parse(configContent)
        vaultName = config.name || 'My Vault'
      } catch {
        // Ignore config read errors
      }
    } catch {
      // Vault doesn't exist or isn't initialized
      electronVaultInitialized = false
    }
  }

  debugLog('[vault:getElectronVaultStatus]', { vaultPath, firstLaunchCompleted, electronVaultInitialized })

  return {
    isElectron: true,
    vaultPath: vaultPath || null,
    vaultName,
    firstLaunchCompleted,
    electronVaultInitialized,
  }
})

/**
 * Repair/initialize the vault
 */
ipcMain.handle('vault:repair', async () => {
  debugLog('[vault:repair] Starting vault repair...')

  try {
    // Get or create vault path
    let vaultPath = store.get('vaultPath') as string

    if (!vaultPath) {
      // First time setup - use default path
      vaultPath = getDefaultVaultPath()
      store.set('vaultPath', vaultPath)
      debugLog('[vault:repair] Set default vault path:', vaultPath)
    }

    // Initialize the vault
    const result = await initializeVault(vaultPath)

    if (result.success) {
      store.set('firstLaunchCompleted', true)
      debugLog('[vault:repair] Vault initialized successfully')
    }

    return {
      success: result.success,
      vaultPath,
      contentSeeded: result.success,
      fileCount: result.fileCount,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[vault:repair] Error:', error)
    return {
      success: false,
      error: errorMsg,
    }
  }
})
