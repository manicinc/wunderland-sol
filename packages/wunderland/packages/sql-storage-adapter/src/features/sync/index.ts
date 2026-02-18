/**
 * Cross-Platform Sync Module.
 *
 * Provides real-time delta synchronization across Electron, Capacitor,
 * browser, and server platforms with conflict resolution and device management.
 *
 * @packageDocumentation
 *
 * @example
 * ```typescript
 * import { createCrossPlatformSync } from '@framers/sql-storage-adapter/sync';
 *
 * const sync = await createCrossPlatformSync({
 *   localAdapter: db,
 *   endpoint: 'wss://sync.example.com',
 *   tables: {
 *     notes: { priority: 'high', conflictStrategy: 'merge' },
 *     settings: { priority: 'critical', conflictStrategy: 'local-wins' },
 *   },
 *   hooks: {
 *     onConflictNeedsResolution: (conflict) => showConflictDialog(conflict),
 *   },
 * });
 *
 * await sync.sync();
 * ```
 */

// Main entry point
export {
  CrossPlatformSync,
  createCrossPlatformSync,
  type CrossPlatformSyncOptions,
  type CrossPlatformSyncHooks,
  type TableSyncConfig,
  type SyncResult,
  type SyncStatus as CrossPlatformSyncStatus,
} from './crossPlatformSync';

// Protocol layer - use explicit exports to avoid conflicts
export {
  VectorClock,
  createVectorClock,
  compareClocks,
  mergeClocks,
  generateDeviceId,
  dominates,
  type VectorClockData,
  type CausalRelation,
  type SerializedVectorClock,
} from './protocol/vectorClock';

export {
  // Types
  type ChangeOperation,
  type ChangeRecord,
  type ChangeBatch,
  type SyncProgress,
  type SyncStatus as ProtocolSyncStatus,
  type BaseMessage,
  type HandshakeRequest,
  type HandshakeResponse,
  type DeltaPush,
  type DeltaPullRequest,
  type DeltaPullResponse,
  type AckMessage,
  type ConflictMessage,
  type PresenceMessage,
  type HeartbeatMessage,
  type HeartbeatAck,
  type ErrorMessage,
  type SyncMessage,
  type SyncMessageType,
  type DeviceType as ProtocolDeviceType,
  type DeviceInfo as ProtocolDeviceInfo,
  type ConflictResolution as ProtocolConflictResolution,
  // Factories
  generateMessageId,
  createBaseMessage,
  createHandshakeRequest,
  createAck,
  createHeartbeat,
  createError,
  createDeltaPushMessage,
  createDeltaPullRequest,
  createPresenceMessage,
  createHeartbeatMessage,
  createAckMessage,
  generateChangeId,
  createChangeRecord,
  // Type guards
  isHandshakeRequest,
  isDeltaPush,
  isConflict,
  isError,
  isSyncMessage,
} from './protocol/messages';

// Transport layer
export {
  BaseTransport,
  TransportError,
  TransportErrorCodes,
  type SyncTransport,
  type TransportOptions,
  type TransportState,
  type TransportStats,
  type TransportEventType,
  type TransportEvents,
  type TransportEventListener,
} from './transport/transport';

export {
  WebSocketTransport,
  createWebSocketTransport,
  type WebSocketTransportOptions,
} from './transport/websocketTransport';

export {
  HttpTransport,
  createHttpTransport,
  type HttpTransportOptions,
} from './transport/httpTransport';

// Conflict resolution
export {
  ConflictResolver,
  createConflictResolver,
  FieldMergers,
  type ConflictStrategy,
  type ResolutionDecision,
  type SyncConflict,
  type ConflictResolution,
  type ConflictUIHooks,
  type ConflictResolverOptions,
  type FieldMerger,
} from './conflicts/conflictResolver';

// Device management
export {
  DeviceManager,
  createDeviceManager,
  type DeviceType,
  type PresenceStatus,
  type DeviceInfo,
  type DeviceCapabilities,
  type DeviceRegistrationOptions,
  type PresenceEvent,
  type DeviceManagerEventType,
  type DeviceManagerEvents,
  type DeviceManagerOptions,
} from './devices/deviceManager';

// Sync tables
export {
  SyncLogManager,
  type ChangeLogEntry as SyncLogChange,
  type ConflictEntry as SyncLogConflict,
} from './tables/syncLogManager';
