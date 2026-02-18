/**
 * Electron Platform Utilities
 *
 * Provides platform detection, native bridge, and Electron-specific functionality
 * for the Quarry Codex desktop app.
 *
 * Features:
 * - Window management (minimize, maximize, close, fullscreen)
 * - File system access (read/write local files)
 * - Shell integration (open external links, show in folder)
 * - Clipboard operations
 * - Native dialogs (open, save, message box)
 * - App lifecycle (quit, restart, version info)
 * - Auto-update support
 *
 * @module lib/electron
 */

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */

export interface WindowState {
  isMaximized: boolean
  isMinimized: boolean
  isFullScreen: boolean
  isFocused: boolean
  bounds: { x: number; y: number; width: number; height: number }
}

export interface FileDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
  >
}

export interface SaveDialogOptions {
  title?: string
  defaultPath?: string
  buttonLabel?: string
  filters?: Array<{ name: string; extensions: string[] }>
  message?: string
}

export interface MessageBoxOptions {
  type?: 'none' | 'info' | 'error' | 'question' | 'warning'
  title?: string
  message: string
  detail?: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

export interface MessageBoxResult {
  response: number
}

export interface AppInfo {
  name: string
  version: string
  electronVersion: string
  platform: 'darwin' | 'win32' | 'linux'
  arch: string
  isPackaged: boolean
  userDataPath: string
}

export interface UpdateInfo {
  version: string
  releaseDate: string
  releaseNotes?: string
}

export interface UpdateProgress {
  bytesPerSecond: number
  percent: number
  transferred: number
  total: number
}

/* ═══════════════════════════════════════════════════════════════════════════
   PLATFORM DETECTION
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Detect if running in Electron environment
 */
export function isElectron(): boolean {
  // Check for QUARRY_ELECTRON environment variable (set by Electron main process for SSR context)
  // This works during Next.js SSR when running inside Electron's spawned server
  if (typeof process !== 'undefined' && process.env?.QUARRY_ELECTRON === '1') {
    return true
  }

  // Check for electronAPI (exposed by preload script)
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    return true
  }

  // Check for legacy electron bridge
  if (typeof window !== 'undefined' && (window as any).electron) {
    return true
  }

  // Check for Electron renderer process
  if (
    typeof window !== 'undefined' &&
    typeof window.process === 'object' &&
    (window.process as any).type === 'renderer'
  ) {
    return true
  }

  // Check for Electron main process
  if (
    typeof process !== 'undefined' &&
    typeof process.versions === 'object' &&
    !!process.versions.electron
  ) {
    return true
  }

  // Detect Electron via Capacitor
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) {
    const platform = (window as any).Capacitor.getPlatform?.()
    return platform === 'electron'
  }

  return false
}

/**
 * Detect if running in Capacitor (mobile or desktop native)
 */
export function isCapacitor(): boolean {
  return typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()
}

/**
 * Get current platform
 */
export function getPlatform(): 'electron' | 'ios' | 'android' | 'web' {
  // Check for QUARRY_ELECTRON environment variable (set by Electron main process for SSR context)
  // This works during Next.js SSR when running inside Electron's spawned server
  if (typeof process !== 'undefined' && process.env?.QUARRY_ELECTRON === '1') {
    return 'electron'
  }

  if (typeof window === 'undefined') return 'web'

  // Check for electronAPI (exposed by preload script)
  if ((window as any).electronAPI) {
    return 'electron'
  }

  const capacitor = (window as any).Capacitor
  if (capacitor?.isNativePlatform?.()) {
    const platform = capacitor.getPlatform?.()
    if (platform === 'electron') return 'electron'
    if (platform === 'ios') return 'ios'
    if (platform === 'android') return 'android'
  }

  return 'web'
}

/**
 * Check if running in Electron on macOS
 * Used for traffic light (window controls) padding
 */
export function isElectronMac(): boolean {
  if (!isElectron()) return false

  const bridge = getElectronBridge()
  if (bridge?.platform === 'darwin') return true

  // Fallback: check navigator.platform
  if (typeof navigator !== 'undefined') {
    return navigator.platform?.toLowerCase().includes('mac') ?? false
  }

  return false
}

/**
 * Get CSS class for macOS Electron titlebar padding
 * Returns 'pt-8' (32px) when in Electron on macOS, empty string otherwise
 */
export function getElectronMacPaddingClass(): string {
  return isElectronMac() ? 'pt-8' : ''
}

/* ═══════════════════════════════════════════════════════════════════════════
   NATIVE CAPABILITIES
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Check if native file system access is available
 */
export function hasNativeFileAccess(): boolean {
  return isElectron() || isCapacitor()
}

/**
 * Check if running with full Node.js integration
 */
export function hasNodeIntegration(): boolean {
  if (!isElectron()) return false

  // Check if Node.js APIs are available
  try {
    return typeof require !== 'undefined' && typeof require('fs') !== 'undefined'
  } catch {
    return false
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   IPC BRIDGE (for Electron preload scripts)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Type-safe IPC bridge interface
 * Exposed by Electron preload script via contextBridge
 */
export interface ElectronBridge {
  // Platform info
  isElectron: boolean
  platform: 'darwin' | 'win32' | 'linux'

  // Window management
  window: {
    minimize(): void
    maximize(): void
    unmaximize(): void
    close(): void
    toggleFullScreen(): void
    setFullScreen(flag: boolean): void
    getState(): Promise<WindowState>
    onStateChange(callback: (state: WindowState) => void): () => void
  }

  // File system operations
  fs: {
    readFile(path: string): Promise<string>
    readFileBuffer(path: string): Promise<Uint8Array>
    writeFile(path: string, data: string | Uint8Array): Promise<void>
    exists(path: string): Promise<boolean>
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>
    readdir(path: string): Promise<string[]>
    stat(path: string): Promise<{
      isFile: boolean
      isDirectory: boolean
      size: number
      mtime: string
      ctime: string
    }>
    unlink(path: string): Promise<void>
    rename(oldPath: string, newPath: string): Promise<void>
    watch(
      path: string,
      callback: (event: 'rename' | 'change', filename: string) => void
    ): () => void
  }

  // Shell integration
  shell: {
    openExternal(url: string): Promise<void>
    openPath(path: string): Promise<string>
    showItemInFolder(path: string): void
    beep(): void
  }

  // Clipboard
  clipboard: {
    readText(): string
    writeText(text: string): void
    readHTML(): string
    writeHTML(html: string): void
    clear(): void
  }

  // Dialogs
  dialog: {
    showOpenDialog(options?: FileDialogOptions): Promise<string[] | null>
    showSaveDialog(options?: SaveDialogOptions): Promise<string | null>
    showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult>
    showErrorBox(title: string, content: string): void
  }

  // App lifecycle
  app: {
    getInfo(): Promise<AppInfo>
    getPath(
      name: 'home' | 'appData' | 'userData' | 'temp' | 'desktop' | 'documents' | 'downloads'
    ): Promise<string>
    quit(): void
    relaunch(): void
  }

  // Auto-update
  update: {
    checkForUpdates(): Promise<UpdateInfo | null>
    downloadUpdate(): Promise<void>
    installUpdate(): void
    onProgress(callback: (progress: UpdateProgress) => void): () => void
    onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void
    onUpdateDownloaded(callback: (info: UpdateInfo) => void): () => void
  }

  // IPC utilities
  ipc: {
    invoke<T>(channel: string, ...args: unknown[]): Promise<T>
    send(channel: string, ...args: unknown[]): void
    on(channel: string, callback: (...args: unknown[]) => void): () => void
  }

  // Legacy compatibility
  fetch: (url: string, options?: RequestInit) => Promise<Response>
}

/**
 * Get the Electron bridge if available
 */
export function getElectronBridge(): ElectronBridge | null {
  if (typeof window === 'undefined') return null

  // Check for exposed bridge
  const bridge = (window as any).electronBridge || (window as any).electron
  if (bridge) return bridge as ElectronBridge

  return null
}

/* ═══════════════════════════════════════════════════════════════════════════
   ENHANCED FETCH (with CORS bypass for Electron)
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Fetch with automatic Electron bridge fallback
 * In Electron, uses Node.js fetch to bypass CORS restrictions
 */
export async function electronFetch(
  url: string | URL,
  options?: RequestInit
): Promise<Response> {
  const bridge = getElectronBridge()

  if (bridge?.fetch) {
    // Use Electron's native fetch (no CORS)
    return bridge.fetch(url.toString(), options)
  }

  // Fall back to standard fetch
  return fetch(url, options)
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOCAL CONTENT MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Local content source configuration
 */
export interface LocalContentConfig {
  /** Base directory for local content */
  basePath: string
  /** Watch for file changes */
  watchChanges?: boolean
}

let contentConfig: LocalContentConfig | null = null

/**
 * Initialize local content source
 */
export function initLocalContent(config: LocalContentConfig): void {
  contentConfig = config
}

/**
 * Get local content configuration
 */
export function getLocalContentConfig(): LocalContentConfig | null {
  return contentConfig
}

/**
 * Read a local file (Electron only)
 */
export async function readLocalFile(relativePath: string): Promise<string | null> {
  const bridge = getElectronBridge()
  if (!bridge?.fs || !contentConfig) return null

  try {
    const fullPath = `${contentConfig.basePath}/${relativePath}`
    return await bridge.fs.readFile(fullPath)
  } catch (error) {
    console.warn('Failed to read local file:', relativePath, error)
    return null
  }
}

/**
 * List local directory contents (Electron only)
 */
export async function listLocalDirectory(relativePath: string): Promise<string[] | null> {
  const bridge = getElectronBridge()
  if (!bridge?.fs || !contentConfig) return null

  try {
    const fullPath = `${contentConfig.basePath}/${relativePath}`
    return await bridge.fs.readdir(fullPath)
  } catch (error) {
    console.warn('Failed to list local directory:', relativePath, error)
    return null
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONVENIENCE WRAPPERS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Open external URL (works in both web and Electron)
 */
export async function openExternal(url: string): Promise<void> {
  const bridge = getElectronBridge()
  if (bridge?.shell) {
    await bridge.shell.openExternal(url)
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Copy text to clipboard (works in both web and Electron)
 */
export async function copyToClipboard(text: string): Promise<void> {
  const bridge = getElectronBridge()
  if (bridge?.clipboard) {
    bridge.clipboard.writeText(text)
  } else if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

/**
 * Read text from clipboard (works in both web and Electron)
 */
export async function readFromClipboard(): Promise<string> {
  const bridge = getElectronBridge()
  if (bridge?.clipboard) {
    return bridge.clipboard.readText()
  } else if (navigator.clipboard) {
    return navigator.clipboard.readText()
  }
  return ''
}

/**
 * Show native file open dialog
 */
export async function showOpenDialog(
  options?: FileDialogOptions
): Promise<string[] | null> {
  const bridge = getElectronBridge()
  if (bridge?.dialog) {
    return bridge.dialog.showOpenDialog(options)
  }

  // Web fallback: use file input
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = options?.properties?.includes('multiSelections') ?? false

    if (options?.filters) {
      const extensions = options.filters
        .flatMap((f) => f.extensions)
        .map((ext) => `.${ext}`)
        .join(',')
      input.accept = extensions
    }

    input.onchange = () => {
      if (input.files && input.files.length > 0) {
        const paths = Array.from(input.files).map((f) => f.name)
        resolve(paths)
      } else {
        resolve(null)
      }
    }

    input.click()
  })
}

/**
 * Show native save dialog
 */
export async function showSaveDialog(
  options?: SaveDialogOptions
): Promise<string | null> {
  const bridge = getElectronBridge()
  if (bridge?.dialog) {
    return bridge.dialog.showSaveDialog(options)
  }

  // Web has no save dialog - return suggested filename
  return options?.defaultPath || 'download'
}

/**
 * Show message box
 */
export async function showMessageBox(
  options: MessageBoxOptions
): Promise<MessageBoxResult> {
  const bridge = getElectronBridge()
  if (bridge?.dialog) {
    return bridge.dialog.showMessageBox(options)
  }

  // Web fallback: use confirm/alert
  const result = options.buttons
    ? window.confirm(`${options.title}\n\n${options.message}`)
    : (window.alert(`${options.title}\n\n${options.message}`), true)

  return { response: result ? 0 : 1 }
}

/* ═══════════════════════════════════════════════════════════════════════════
   WINDOW MANAGEMENT
═══════════════════════════════════════════════════════════════════════════ */

/**
 * Minimize window
 */
export function minimizeWindow(): void {
  const bridge = getElectronBridge()
  bridge?.window?.minimize()
}

/**
 * Maximize/restore window
 */
export async function toggleMaximize(): Promise<void> {
  const bridge = getElectronBridge()
  if (!bridge?.window) return

  const state = await bridge.window.getState()
  if (state.isMaximized) {
    bridge.window.unmaximize()
  } else {
    bridge.window.maximize()
  }
}

/**
 * Close window
 */
export function closeWindow(): void {
  const bridge = getElectronBridge()
  if (bridge?.window) {
    bridge.window.close()
  } else {
    window.close()
  }
}

/**
 * Toggle fullscreen
 */
export function toggleFullscreen(): void {
  const bridge = getElectronBridge()
  if (bridge?.window) {
    bridge.window.toggleFullScreen()
  } else if (document.fullscreenEnabled) {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }
}

/**
 * Subscribe to window state changes
 */
export function onWindowStateChange(
  callback: (state: WindowState) => void
): () => void {
  const bridge = getElectronBridge()
  if (bridge?.window) {
    return bridge.window.onStateChange(callback)
  }

  // Web fallback: listen for resize/focus events
  const handleResize = () => {
    callback({
      isMaximized: false,
      isMinimized: false,
      isFullScreen: !!document.fullscreenElement,
      isFocused: document.hasFocus(),
      bounds: {
        x: window.screenX,
        y: window.screenY,
        width: window.innerWidth,
        height: window.innerHeight,
      },
    })
  }

  window.addEventListener('resize', handleResize)
  window.addEventListener('focus', handleResize)
  window.addEventListener('blur', handleResize)
  document.addEventListener('fullscreenchange', handleResize)

  return () => {
    window.removeEventListener('resize', handleResize)
    window.removeEventListener('focus', handleResize)
    window.removeEventListener('blur', handleResize)
    document.removeEventListener('fullscreenchange', handleResize)
  }
}

/**
 * Get app version
 */
export async function getAppVersion(): Promise<string> {
  const bridge = getElectronBridge()
  if (bridge?.app) {
    const info = await bridge.app.getInfo()
    return info.version
  }
  return process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
}

/**
 * Get user data path for persistent storage
 */
export async function getUserDataPath(): Promise<string | null> {
  const bridge = getElectronBridge()
  if (!bridge?.app) return null
  return bridge.app.getPath('userData')
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPORTS
═══════════════════════════════════════════════════════════════════════════ */

export default {
  // Detection
  isElectron,
  isElectronMac,
  isCapacitor,
  getPlatform,
  hasNativeFileAccess,
  hasNodeIntegration,
  getElectronBridge,
  getElectronMacPaddingClass,

  // Network
  electronFetch,

  // Local content
  initLocalContent,
  getLocalContentConfig,
  readLocalFile,
  listLocalDirectory,

  // Convenience
  openExternal,
  copyToClipboard,
  readFromClipboard,
  showOpenDialog,
  showSaveDialog,
  showMessageBox,

  // Window
  minimizeWindow,
  toggleMaximize,
  closeWindow,
  toggleFullscreen,
  onWindowStateChange,

  // App
  getAppVersion,
  getUserDataPath,
}
