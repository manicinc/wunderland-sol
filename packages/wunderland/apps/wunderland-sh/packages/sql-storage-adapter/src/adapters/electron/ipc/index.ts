/**
 * IPC Module for Electron SQL Storage Adapter.
 *
 * Provides type-safe IPC communication between main and renderer processes.
 *
 * @packageDocumentation
 */

export * from './channels';
export * from './types';
export {
  IpcProtocolManager,
  protocolManager,
  initializeIpcProtocol,
  disposeIpcProtocol,
} from './protocol';
