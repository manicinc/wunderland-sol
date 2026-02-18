## [0.5.2] - 2026-02-06

### Added
- `ensureColumnExists` helper for SQLite schema migrations — safely adds columns to existing tables without failing if the column already exists

## [0.5.1] - 2025-12-26

### Added
- **Electron Adapter** - Full-featured Electron support with IPC bridge architecture
  - `ElectronMainAdapter`: Main process adapter wrapping better-sqlite3 with WAL, recovery, and multi-window support
  - `ElectronRendererAdapter`: Renderer process proxy with transparent IPC communication
  - Preload script with `contextBridge` for secure renderer access
  - Type-safe IPC protocol with request/response correlation
  - WAL checkpoint management and corruption detection
  - Auto-migration system with app version tracking
  - Multi-window database change broadcasting
  - Export: `@framers/sql-storage-adapter/electron`

- **Cross-Platform Sync Module** - Real-time delta synchronization across platforms
  - `CrossPlatformSync`: Main sync orchestrator with configurable table priorities
  - **Vector Clocks**: Distributed causality tracking for conflict detection
  - **WebSocket Transport**: Real-time bidirectional sync with auto-reconnection and heartbeats
  - **HTTP Transport**: Polling fallback for firewalls/proxies that block WebSocket
  - **Conflict Resolution**: Strategies include `last-write-wins`, `local-wins`, `remote-wins`, `merge`, `manual`
  - **Device Registry**: Track and manage syncing devices with presence status
  - **SyncLogManager**: Change log and conflict tables for delta tracking
  - UI hooks for custom conflict resolution dialogs
  - Export: `@framers/sql-storage-adapter/sync`

### Changed
- Updated package exports to include `/electron`, `/electron/preload`, and `/sync` entry points
- Enhanced `StorageContext` with Electron-specific properties

### Technical Details
- Vector clocks use `Record<string, number>` for causality comparison
- Sync protocol messages use underscore naming (`delta_push`, `handshake_response`)
- Transport layer abstracts WebSocket/HTTP with unified event system
- Field mergers support custom merge logic for complex data types

## [0.5.0] - 2025-12-14

### Fixed
- **IndexedDB options**: Exposed `indexedDb` options in `DatabaseOptions` for browser WASM configuration

## [0.4.2] - 2025-12-11

### Fixed
- **better-sqlite3 directory creation**: Adapter now creates parent directories before opening database file (fixes SQLITE_CANTOPEN when directory doesn't exist)
- **ESLint monorepo conflict**: Added `tsconfigRootDir` to ESLint config to resolve parsing errors in monorepo setups
- **TypeDoc build**: Moved guide docs from `docs/` to `guides/` to prevent deletion by TypeDoc's `cleanOutputDir`
- **README logo**: Fixed Frame.dev logo URL (was 404ing due to incorrect path format)

### Added
- New test file `betterSqliteAdapter.spec.ts` for directory creation tests

## [0.3.6] - 2025-11-12

### Fixed
- Release workflow: replace Node heredoc with robust bash/awk; always set notes output. Ensures GitHub Release is created even if npm publish step is skipped or fails.

## [0.3.5] - 2025-11-12

### Changed
- Release automation: fixed GitHub Actions release-on-tag workflow (pnpm install, bash env handling, README/Typedoc sync). No runtime code changes.

## [0.3.4] - 2025-11-11

### Fixed
- Normalized all ESM export/import specifiers in the published bundle so Node.js can resolve the adapter without additional build-time patches.

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.3] - 2025-01-08

### Changed
- **Browser-friendly by default**: Made `sql-storage-adapter` more browser-friendly to prevent bundling issues
  - **PostgreSQL adapter**: Changed from top-level `import { Pool } from 'pg'` to dynamic `await import('pg')` to prevent bundlers from trying to bundle `pg` in browser builds
  - **Resolver**: Replaced `import path from 'path'` with browser-safe dynamic import and conditional usage
  - **Process access**: Added browser-safe wrappers for `process.env` and `process.cwd()` that gracefully handle browser environments
  - These changes prevent Vite and other bundlers from trying to bundle Node.js-only modules (`pg`, `path`) in browser builds

### Fixed
- **Browser compatibility**: Fixed issues where bundlers would try to analyze and bundle server-only dependencies (`pg`, `path`) when `sql-storage-adapter` was imported in browser code
- **No breaking changes**: All changes are backward compatible - server-side behavior is unchanged

### Technical Details
- `postgresAdapter.ts`: Now uses lazy dynamic import of `pg` module (similar to `betterSqliteAdapter.ts`)
- `resolver.ts`: Uses browser-safe path utilities and process access that don't require Node.js modules at module load time
- Browser detection: Added runtime checks to avoid Node.js module imports in browser environments

## [0.3.2] - 2025-11-07

### Changed
- **Documentation clarifications**: Updated all docs to clarify that IndexedDB adapter is sql.js + IndexedDB persistence wrapper (not a separate SQL engine)
- **Capability updates**: Added `json` and `prepared` capabilities to IndexedDB and sql.js adapters
  - Both adapters now correctly declare JSON support (via SQLite JSON1 extension)
  - Prepared statements capability added for both adapters
- **README updates**: Clarified IndexedDB adapter relationship with sql.js throughout documentation

### Documentation
- Updated README.md adapter matrix to clarify IndexedDB is sql.js wrapper
- Updated PLATFORM_STRATEGY.md with detailed explanation of IndexedDB + sql.js architecture
- Updated ARCHITECTURE.md to note IndexedDB adapter is not a separate SQL engine
- Added notes about JSON support via SQLite JSON1 extension for IndexedDB/sql.js adapters

## [0.3.0] - 2025-11-06

### Added
- **IndexedDB Adapter** (`IndexedDbAdapter`) - sql.js + IndexedDB persistence wrapper for browser-native SQL storage
  - **Note**: This adapter uses sql.js (WASM SQLite) for all SQL execution and IndexedDB only for storing the database file as a binary blob
  - Automatic persistence to IndexedDB with configurable auto-save intervals
  - Full SQL support via sql.js (SQLite compiled to WebAssembly)
  - Export/import functionality for data portability
  - Optimized for Progressive Web Apps (PWAs) and offline-first workflows
  - Privacy-first: data never leaves the browser
- **AgentOS Integration Layer** (`createAgentOSStorage`, `AgentOSStorageAdapter`)
  - Pre-configured schema for AgentOS entities (conversations, sessions, personas, telemetry)
  - Auto-detection of platform (web, electron, capacitor, node, cloud)
  - Typed query builders for common AgentOS operations
  - Graceful degradation across platforms
  - Export available via `@framers/sql-storage-adapter/agentos`
- **Enhanced Graceful Degradation**
  - IndexedDB added to resolver priority chain for browser environments
  - Automatic fallback: IndexedDB → sql.js → memory for web
  - Improved platform detection for Electron, Capacitor, and Node.js
- **Platform Strategy Documentation**
  - New `PLATFORM_STRATEGY.md` with comprehensive pros/cons analysis
  - Updated `docs/media/ARCHITECTURE.md` with IndexedDB adapter details
  - Client-side storage guide for AgentOS deployments

### Changed
- Resolver now prioritizes `indexeddb` for browser environments
- `AdapterKind` type now includes `'indexeddb'` option
- Improved adapter selection logic with better fallback chains

### Documentation
- Added IndexedDB adapter to README adapter matrix
- Comprehensive TSDoc comments for IndexedDB adapter
- Platform strategy guide with detailed comparison tables
- AgentOS integration examples and best practices

## [0.2.0] - 2025-11-04

### Added
- Barrel export available via `@framers/sql-storage-adapter/types` so bundlers can import the public type surface without reaching into `dist/`.

### Changed
- Hardened adapter modules (PostgreSQL, better-sqlite3, Capacitor, SQL.js) to avoid top-level side effects and provide clearer runtime errors when optional dependencies are missing.
- Normalised `lastInsertRowid` values returned by PostgreSQL, better-sqlite3, and SQL.js adapters so they are always plain numbers or strings.
- Improved `createDatabase` automatic adapter resolution for Node.js, browser, and Deno environments with clearer fallbacks.
- Restructured the source tree into `core/`, `adapters/`, `features/`, and `shared/` folders so contributors can navigate contracts, runtime APIs, and higher-level utilities independently.

### Fixed
- Sanitised Sync Manager merge inputs and conflict handling so records lacking IDs or timestamps no longer crash synchronisation.
- Tightened Supabase adapter caching/stream typings and connection pool metrics reporting to prevent `unknown` leak-through at runtime.
- Updated offline sync example merge helper to defensively parse profile data before combining settings.
- Migration tests now fall back to the `sql.js` adapter when `better-sqlite3` is unavailable, keeping CI and contributors unblocked.

## [0.1.0] - 2025-11-01

### Added
- Initial release of SQL Storage Adapter
- Support for multiple SQL backends:
  - PostgreSQL (via `pg`)
  - Better-SQLite3 (native SQLite)
  - SQL.js (WebAssembly SQLite)
  - Capacitor SQLite (mobile)
- Automatic runtime detection and adapter selection
- Graceful fallback mechanisms
- Full TypeScript support with comprehensive type definitions
- Transaction support across all adapters
- Prepared statement support (where available)
- Batch operations for bulk inserts
- Connection pooling for PostgreSQL
- Comprehensive documentation with pros/cons for each adapter
- Extensive error handling and recovery mechanisms

### Features
- **Automatic Adapter Resolution**: Intelligently selects the best available adapter
- **Cross-Platform**: Works in Node.js, browsers, Electron, and mobile apps
- **Type Safety**: Full TypeScript support with detailed interfaces
- **Performance**: Optimized for each platform with adapter-specific enhancements
- **Security**: SQL injection prevention through parameterized queries
- **Flexibility**: Support for both named and positional parameters

### Supported Capabilities by Adapter
- **PostgreSQL**: transactions, locks, persistence, concurrent, json, arrays, prepared
- **Better-SQLite3**: sync, transactions, wal, locks, persistence, prepared, batch
- **SQL.js**: transactions, persistence (Node.js only)
- **Capacitor**: transactions, wal, persistence

### Documentation
- Comprehensive README with usage examples
- Detailed pros/cons for each adapter
- Migration guides from raw database drivers
- Troubleshooting section
- Performance considerations

### Security
- SQL injection prevention through parameterized queries
- Connection security guidelines
- Secure default configurations

---

For more information, see the [README](README.md) or visit our [GitHub repository](https://github.com/framersai/sql-storage-adapter).
