/**
 * Window Management Module for Electron SQL Storage Adapter.
 *
 * Provides multi-window coordination and change broadcasting.
 *
 * @packageDocumentation
 */

export {
  WindowManager,
  createWindowManager,
  type WindowManagerConfig,
  type WindowManagerCallbacks,
  type RegisteredWindow,
} from './windowManager';
