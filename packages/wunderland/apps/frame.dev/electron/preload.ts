import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getPlatform: () => ipcRenderer.invoke('get-platform'),
  isPackaged: () => ipcRenderer.invoke('is-packaged'),

  // Theme sync
  onNativeThemeUpdated: (callback: (event: unknown, data: { shouldUseDarkColors: boolean; themeSource: string }) => void) => {
    ipcRenderer.on('native-theme-updated', callback)
    return () => ipcRenderer.removeListener('native-theme-updated', callback)
  },

  // Window controls (for custom titlebar if needed)
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // File dialogs
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  selectFile: (filters?: { name: string; extensions: string[] }[]) =>
    ipcRenderer.invoke('select-file', filters),

  // Settings (persistent storage via electron-store)
  settings: {
    get: (key: string) => ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('settings:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('settings:delete', key),
    getAll: () => ipcRenderer.invoke('settings:getAll'),
  },

  // Vault status (for Electron auto-initialization)
  vault: {
    getStatus: () => ipcRenderer.invoke('vault:getElectronVaultStatus'),
    repair: () => ipcRenderer.invoke('vault:repair'),
  },

  // File system access
  fs: {
    readFile: (path: string) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:writeFile', path, content),
    readDir: (path: string) => ipcRenderer.invoke('fs:readDir', path),
    mkdir: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
    exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
    stat: (path: string) => ipcRenderer.invoke('fs:stat', path),
    delete: (path: string) => ipcRenderer.invoke('fs:delete', path),
  },

  // Auto-updater
  autoUpdater: {
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    downloadUpdate: () => ipcRenderer.invoke('download-update'),
    installUpdate: () => ipcRenderer.invoke('install-update'),
    onUpdateStatus: (callback: (status: { status: string; data?: unknown }) => void) => {
      const handler = (_event: unknown, status: { status: string; data?: unknown }) => callback(status)
      ipcRenderer.on('update-status', handler)
      return () => ipcRenderer.removeListener('update-status', handler)
    },
  },
})

// Expose audio capture APIs for system audio recording
contextBridge.exposeInMainWorld('electronAudio', {
  // Get available capture sources (windows and screens)
  getSources: () => ipcRenderer.invoke('audio:get-sources'),

  // Get capture constraints for a specific source
  getCaptureConstraints: (sourceId: string) =>
    ipcRenderer.invoke('audio:get-capture-constraints', sourceId),

  // Check if system audio capture is supported
  isSupported: () => ipcRenderer.invoke('audio:is-supported'),

  // Get only screen sources (for system-wide audio)
  getScreenSources: () => ipcRenderer.invoke('audio:get-screen-sources'),

  // Get only window sources (for app-specific audio)
  getWindowSources: () => ipcRenderer.invoke('audio:get-window-sources'),

  // Check if running in Electron
  isAvailable: () => true,
})

declare global {
  interface Window {
    electronAPI: {
      getAppVersion: () => Promise<string>
      getPlatform: () => Promise<string>
      isPackaged: () => Promise<boolean>
      onNativeThemeUpdated: (callback: (event: unknown, data: { shouldUseDarkColors: boolean; themeSource: string }) => void) => () => void
      minimize: () => void
      maximize: () => void
      close: () => void
      selectDirectory: () => Promise<string | null>
      selectFile: (filters?: { name: string; extensions: string[] }[]) => Promise<string | null>
      // Settings (persistent storage via electron-store)
      settings: {
        get: (key: string) => Promise<unknown>
        set: (key: string, value: unknown) => Promise<boolean>
        delete: (key: string) => Promise<boolean>
        getAll: () => Promise<Record<string, unknown>>
      }
      // Vault status (for Electron auto-initialization)
      vault: {
        getStatus: () => Promise<{
          isElectron: boolean
          vaultPath: string | null
          vaultName: string
          firstLaunchCompleted: boolean
          electronVaultInitialized: boolean
        }>
        repair: () => Promise<{
          success: boolean
          vaultPath?: string
          contentSeeded?: boolean
          fileCount?: number
          error?: string
        }>
      }
      // File system access
      fs: {
        readFile: (path: string) => Promise<string>
        writeFile: (path: string, content: string) => Promise<boolean>
        readDir: (path: string) => Promise<{ name: string; isDirectory: boolean }[]>
        mkdir: (path: string) => Promise<boolean>
        exists: (path: string) => Promise<boolean>
        stat: (path: string) => Promise<{ size: number; mtime: string; isDirectory: boolean }>
        delete: (path: string) => Promise<boolean>
      }
      // Auto-updater
      autoUpdater: {
        checkForUpdates: () => Promise<unknown>
        downloadUpdate: () => Promise<unknown>
        installUpdate: () => Promise<void>
        onUpdateStatus: (callback: (status: { status: string; data?: unknown }) => void) => () => void
      }
    }
    // Note: electronAudio type is declared in lib/audio/types.ts
  }
}
