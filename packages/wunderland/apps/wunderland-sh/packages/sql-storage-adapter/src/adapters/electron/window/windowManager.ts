/**
 * Multi-Window Manager for Electron SQL Storage Adapter.
 *
 * Coordinates database access across multiple Electron windows.
 * Broadcasts database changes to all windows and manages
 * window-specific state.
 *
 * ## Features
 * - Change broadcasting to all windows
 * - Window registration and tracking
 * - Focused window optimization
 * - Connection state synchronization
 *
 * @example
 * ```typescript
 * const manager = new WindowManager({
 *   broadcastChanges: true,
 *   trackFocusedWindow: true,
 * });
 *
 * manager.initialize();
 *
 * // Register a window
 * manager.registerWindow(mainWindow);
 *
 * // Broadcast a change
 * manager.broadcastChange({
 *   type: 'insert',
 *   tables: ['users'],
 *   changes: 1,
 * });
 * ```
 */

import { BrowserWindow, ipcMain } from 'electron';
import { BROADCAST_CHANNELS } from '../ipc/channels';
import type { DbChangeEvent, ConnectionStateEvent } from '../ipc/types';

// ============================================================================
// Types
// ============================================================================

/**
 * Window registration info.
 */
export interface RegisteredWindow {
  /** Window ID */
  id: number;
  /** Window name/label */
  name?: string;
  /** Whether the window is currently focused */
  isFocused: boolean;
  /** When the window was registered */
  registeredAt: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  /** Whether the window is subscribed to changes */
  subscribedToChanges: boolean;
}

/**
 * Window manager configuration.
 */
export interface WindowManagerConfig {
  /** Broadcast changes to all windows (default: true) */
  broadcastChanges?: boolean;
  /** Track focused window for optimizations (default: true) */
  trackFocusedWindow?: boolean;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
  /** Exclude windows by name from broadcasts */
  excludeWindows?: string[];
}

/**
 * Window manager event callbacks.
 */
export interface WindowManagerCallbacks {
  /** Called when a window is registered */
  onWindowRegistered?: (window: RegisteredWindow) => void;
  /** Called when a window is unregistered */
  onWindowUnregistered?: (windowId: number) => void;
  /** Called when focus changes */
  onFocusChanged?: (windowId: number | null) => void;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: Required<WindowManagerConfig> = {
  broadcastChanges: true,
  trackFocusedWindow: true,
  verbose: false,
  excludeWindows: [],
};

// ============================================================================
// Window Manager
// ============================================================================

/**
 * Multi-Window Manager.
 *
 * Manages database access coordination across multiple Electron windows.
 */
export class WindowManager {
  private readonly config: Required<WindowManagerConfig>;
  private readonly callbacks: WindowManagerCallbacks;
  private windows: Map<number, RegisteredWindow> = new Map();
  private focusedWindowId: number | null = null;
  private isInitialized = false;

  constructor(
    config: WindowManagerConfig = {},
    callbacks: WindowManagerCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.callbacks = callbacks;
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the window manager.
   */
  public initialize(): void {
    if (this.isInitialized) return;

    // Set up focus tracking
    if (this.config.trackFocusedWindow) {
      this.setupFocusTracking();
    }

    // Register existing windows
    const allWindows = BrowserWindow.getAllWindows();
    for (const win of allWindows) {
      this.registerWindow(win);
    }

    this.isInitialized = true;
    this.log(`Window Manager initialized with ${this.windows.size} windows`);
  }

  /**
   * Dispose the window manager.
   */
  public dispose(): void {
    this.windows.clear();
    this.focusedWindowId = null;
    this.isInitialized = false;
  }

  /**
   * Set up focus tracking for all windows.
   */
  private setupFocusTracking(): void {
    // Listen for new windows
    const originalGetAllWindows = BrowserWindow.getAllWindows.bind(BrowserWindow);

    // Check for new windows periodically
    setInterval(() => {
      const currentWindows = originalGetAllWindows();
      for (const win of currentWindows) {
        if (!this.windows.has(win.id)) {
          this.registerWindow(win);
        }
      }
    }, 1000);
  }

  // ============================================================================
  // Window Registration
  // ============================================================================

  /**
   * Register a window for management.
   */
  public registerWindow(window: BrowserWindow, name?: string): void {
    if (this.windows.has(window.id)) {
      return;
    }

    const registration: RegisteredWindow = {
      id: window.id,
      name,
      isFocused: window.isFocused(),
      registeredAt: Date.now(),
      lastActivityAt: Date.now(),
      subscribedToChanges: true,
    };

    this.windows.set(window.id, registration);

    // Set up event listeners
    window.on('focus', () => {
      this.handleWindowFocus(window.id);
    });

    window.on('blur', () => {
      this.handleWindowBlur(window.id);
    });

    window.on('closed', () => {
      this.unregisterWindow(window.id);
    });

    // Track initial focus
    if (window.isFocused()) {
      this.focusedWindowId = window.id;
    }

    this.log(`Registered window: ${window.id}${name ? ` (${name})` : ''}`);
    this.callbacks.onWindowRegistered?.(registration);
  }

  /**
   * Unregister a window.
   */
  public unregisterWindow(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (!registration) return;

    this.windows.delete(windowId);

    if (this.focusedWindowId === windowId) {
      this.focusedWindowId = null;
    }

    this.log(`Unregistered window: ${windowId}`);
    this.callbacks.onWindowUnregistered?.(windowId);
  }

  /**
   * Handle window focus event.
   */
  private handleWindowFocus(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (registration) {
      registration.isFocused = true;
      registration.lastActivityAt = Date.now();
    }

    this.focusedWindowId = windowId;
    this.callbacks.onFocusChanged?.(windowId);
  }

  /**
   * Handle window blur event.
   */
  private handleWindowBlur(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (registration) {
      registration.isFocused = false;
    }
  }

  // ============================================================================
  // Broadcasting
  // ============================================================================

  /**
   * Broadcast a database change to all windows.
   */
  public broadcastChange(
    change: Omit<DbChangeEvent, 'timestamp'>,
    excludeWindowId?: number
  ): void {
    if (!this.config.broadcastChanges) return;

    const event: DbChangeEvent = {
      ...change,
      timestamp: Date.now(),
      sourceWindowId: excludeWindowId,
    };

    const windows = BrowserWindow.getAllWindows();

    for (const win of windows) {
      // Skip excluded window
      if (win.id === excludeWindowId) continue;

      // Skip windows by name
      const registration = this.windows.get(win.id);
      if (registration?.name && this.config.excludeWindows.includes(registration.name)) {
        continue;
      }

      // Skip unsubscribed windows
      if (registration && !registration.subscribedToChanges) {
        continue;
      }

      if (!win.isDestroyed()) {
        win.webContents.send(BROADCAST_CHANNELS.DB_CHANGE, event);
      }
    }

    this.log(`Broadcasted change to ${windows.length - (excludeWindowId ? 1 : 0)} windows`);
  }

  /**
   * Broadcast connection state change to all windows.
   */
  public broadcastConnectionState(state: 'open' | 'closed' | 'error', error?: Error): void {
    const event: ConnectionStateEvent = {
      state,
      timestamp: Date.now(),
      error: error ? {
        code: error.name,
        message: error.message,
      } : undefined,
    };

    const windows = BrowserWindow.getAllWindows();

    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(BROADCAST_CHANNELS.CONNECTION_STATE, event);
      }
    }
  }

  /**
   * Send a message to a specific window.
   */
  public sendToWindow(windowId: number, channel: string, data: unknown): boolean {
    const win = BrowserWindow.fromId(windowId);
    if (!win || win.isDestroyed()) {
      return false;
    }

    win.webContents.send(channel, data);
    return true;
  }

  /**
   * Send a message to the focused window.
   */
  public sendToFocusedWindow(channel: string, data: unknown): boolean {
    if (!this.focusedWindowId) {
      return false;
    }
    return this.sendToWindow(this.focusedWindowId, channel, data);
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe a window to database changes.
   */
  public subscribeWindow(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (registration) {
      registration.subscribedToChanges = true;
    }
  }

  /**
   * Unsubscribe a window from database changes.
   */
  public unsubscribeWindow(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (registration) {
      registration.subscribedToChanges = false;
    }
  }

  // ============================================================================
  // Query Methods
  // ============================================================================

  /**
   * Get all registered windows.
   */
  public getWindows(): RegisteredWindow[] {
    return Array.from(this.windows.values());
  }

  /**
   * Get a specific window registration.
   */
  public getWindow(windowId: number): RegisteredWindow | undefined {
    return this.windows.get(windowId);
  }

  /**
   * Get the focused window ID.
   */
  public getFocusedWindowId(): number | null {
    return this.focusedWindowId;
  }

  /**
   * Get the focused window registration.
   */
  public getFocusedWindow(): RegisteredWindow | undefined {
    if (!this.focusedWindowId) return undefined;
    return this.windows.get(this.focusedWindowId);
  }

  /**
   * Get window count.
   */
  public getWindowCount(): number {
    return this.windows.size;
  }

  /**
   * Check if a window is registered.
   */
  public hasWindow(windowId: number): boolean {
    return this.windows.has(windowId);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Update window activity timestamp.
   */
  public updateActivity(windowId: number): void {
    const registration = this.windows.get(windowId);
    if (registration) {
      registration.lastActivityAt = Date.now();
    }
  }

  /**
   * Get statistics about windows.
   */
  public getStats(): {
    totalWindows: number;
    subscribedWindows: number;
    focusedWindowId: number | null;
  } {
    const subscribed = Array.from(this.windows.values())
      .filter(w => w.subscribedToChanges).length;

    return {
      totalWindows: this.windows.size,
      subscribedWindows: subscribed,
      focusedWindowId: this.focusedWindowId,
    };
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[WindowManager] ${message}`);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a Window Manager.
 *
 * @param config - Manager configuration
 * @param callbacks - Event callbacks
 * @returns WindowManager instance
 */
export function createWindowManager(
  config: WindowManagerConfig = {},
  callbacks: WindowManagerCallbacks = {}
): WindowManager {
  return new WindowManager(config, callbacks);
}
