# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
