# Architecture & Technical Details

This document provides in-depth information about the SQL Storage Adapter's design, implementation, and capabilities.

## Table of Contents

- [Design Philosophy](#design-philosophy)
- [Adapter Comparison](#adapter-comparison)
- [Capability System](#capability-system)
- [Runtime Introspection](#runtime-introspection)
- [Performance Characteristics](#performance-characteristics)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Design Philosophy

The SQL Storage Adapter follows these principles:

1. **Zero Configuration** - Works out of the box with sensible defaults
2. **Graceful Degradation** - Falls back to alternative adapters automatically
3. **Type Safety** - Full TypeScript support with no `any` types
4. **Runtime Introspection** - Know what your adapter can do at runtime
5. **Minimal Overhead** - Thin abstraction layer (<1% performance impact)

## Adapter Comparison

### PostgreSQL Adapter

**Implementation**: Uses `pg` (node-postgres) with connection pooling

**When to use**:
- Production servers with multiple users
- Applications requiring ACID guarantees with high concurrency
- Complex queries (CTEs, window functions, full-text search)
- Applications needing JSON/JSONB or array data types
- Cloud deployments (AWS RDS, Heroku Postgres, Supabase)

**Pros**:
- ✅ MVCC for excellent read/write concurrency
- ✅ Rich feature set (20+ data types)
- ✅ Connection pooling (100+ concurrent connections)
- ✅ Battle-tested in production (used by millions of apps)
- ✅ Horizontal scaling with replication
- ✅ Native JSON operations (faster than SQLite)
- ✅ Full-text search built-in

**Cons**:
- ❌ Requires separate server process
- ❌ Higher memory footprint (100-500MB typical)
- ❌ Network latency for remote connections
- ❌ More complex deployment
- ❌ Overkill for single-user applications

**Limitations**:
- All operations are asynchronous (no sync API)
- Prepared statements are connection-scoped
- SSL/TLS configuration required for production
- Connection pool size limited by server config

**Configuration**:
```typescript
const db = await resolveStorageAdapter({
  postgres: {
    connectionString: 'postgresql://user:password@host:5432/database'
  }
});
```

### Better-SQLite3 Adapter

**Implementation**: Native Node.js binding to SQLite using N-API

**When to use**:
- Desktop applications (Electron, Tauri)
- Development environments
- Single-user applications
- Embedded databases
- When you need synchronous operations

**Pros**:
- ✅ Fastest SQLite implementation (faster than sql.js by 10x)
- ✅ Synchronous operations available
- ✅ Zero configuration (serverless)
- ✅ Small footprint (~6MB)
- ✅ File-based persistence
- ✅ ACID compliant
- ✅ Write-Ahead Logging (WAL) support

**Cons**:
- ❌ Single-writer limitation
- ❌ Not suitable for high-concurrency scenarios
- ❌ Requires native compilation
- ❌ Platform-specific binaries
- ❌ No network access (local only)

**Limitations**:
- Only one write operation at a time
- Maximum database size: 281 TB (theoretical, disk-limited in practice)
- Maximum row size: 1 GB
- No native JSON operations (stored as TEXT)
- No built-in replication

**Platform Requirements**:
- **Windows**: Visual Studio Build Tools 2022, Python 3.8+
- **macOS**: Xcode Command Line Tools
- **Linux**: build-essential, python3, libsqlite3-dev

**Configuration**:
```typescript
const db = await resolveStorageAdapter({
  filePath: '/absolute/path/to/database.sqlite3',
  priority: ['better-sqlite3']
});
```

### SQL.js Adapter (WebAssembly)

**Implementation**: SQLite compiled to WebAssembly using Emscripten

**When to use**:
- Browser applications
- Environments without native modules
- Testing and prototyping
- When you need guaranteed cross-platform compatibility

**Pros**:
- ✅ Works everywhere (pure JavaScript/WASM)
- ✅ No native dependencies
- ✅ Good for prototyping and testing
- ✅ Can persist to IndexedDB in browsers
- ✅ Consistent behavior across platforms
- ✅ No compilation required

**Cons**:
- ❌ 2-10x slower than better-sqlite3
- ❌ Higher memory usage (WASM overhead)
- ❌ Large initial download (~2.3MB)
- ❌ Limited by browser memory constraints
- ❌ No true concurrency (single-threaded)

**Limitations**:
- In-memory by default (data lost on refresh)
- Browser storage limits (50-80% of free disk, typically 50MB-2GB)
- No file locking
- No native extensions support
- Cannot share databases between tabs/workers
- Performance degrades with large datasets (>100MB)

**Configuration**:
```typescript
const db = await resolveStorageAdapter({
  priority: ['sqljs'],
  filePath: '/path/to/persist.db'  // Node.js only, ignored in browsers
});
```

**Browser Persistence**:
```typescript
// Persist to IndexedDB
import initSqlJs from 'sql.js';

const SQL = await initSqlJs({
  locateFile: file => `/path/to/${file}`
});

// Export database
const data = db.export();
localStorage.setItem('mydb', JSON.stringify(Array.from(data)));

// Import database
const saved = JSON.parse(localStorage.getItem('mydb'));
const db = new SQL.Database(new Uint8Array(saved));
```

### Capacitor SQLite Adapter

**Implementation**: Native SQLite via Capacitor plugin

**When to use**:
- Mobile applications (iOS/Android)
- Ionic/Capacitor apps
- React Native apps with Capacitor

**Pros**:
- ✅ Native performance on mobile
- ✅ Encrypted database support
- ✅ Background execution support
- ✅ Handles app lifecycle (suspend/resume)
- ✅ Cross-platform mobile (iOS + Android)

**Cons**:
- ❌ Requires Capacitor setup
- ❌ Platform-specific configurations
- ❌ Debugging can be challenging
- ❌ Version compatibility issues
- ❌ Additional app size overhead

**Limitations**:
- Mobile platform restrictions apply
- Database location varies by platform (iOS: Documents, Android: internal storage)
- Limited debugging tools
- Synchronization must be handled manually
- Background execution limits on iOS (10 seconds typical)

**Configuration**:
```typescript
const db = await resolveStorageAdapter({
  capacitor: {
    database: 'myapp',
    encrypted: false,
    mode: 'no-encryption'
  }
});
```

## Capability System

The library uses a capability-based system to determine what features are available:

```typescript
interface StorageAdapter {
  readonly capabilities: ReadonlySet<StorageCapability>;
}

type StorageCapability =
  | 'sync'         // Synchronous execution
  | 'transactions' // ACID transactions
  | 'wal'          // Write-Ahead Logging
  | 'locks'        // File locking
  | 'persistence'  // Data survives restarts
  | 'streaming'    // Stream large results
  | 'batch'        // Batch operations
  | 'prepared'     // Prepared statements
  | 'concurrent'   // Concurrent connections
  | 'json'         // Native JSON support
  | 'arrays';      // Native array types
```

### Capability Matrix

| Capability | PostgreSQL | better-sqlite3 | SQL.js | Capacitor |
|------------|------------|----------------|--------|-----------|
| sync | ❌ | ✅ | ❌ | ❌ |
| transactions | ✅ | ✅ | ✅ | ✅ |
| wal | ❌ | ✅ | ❌ | ✅ |
| locks | ✅ | ✅ | ❌ | ✅ |
| persistence | ✅ | ✅ | ⚠️* | ✅ |
| streaming | 🚧 | 🚧 | ❌ | ❌ |
| batch | ✅ | ✅ | ⚠️** | ⚠️** |
| prepared | ✅ | ✅ | ❌ | ❌ |
| concurrent | ✅ | ❌ | ❌ | ❌ |
| json | ✅ | ❌ | ❌ | ❌ |
| arrays | ✅ | ❌ | ❌ | ❌ |

*SQL.js requires manual persistence  
**Implemented as sequential operations  
🚧 Planned feature

## Runtime Introspection

New in v0.1.0: comprehensive runtime introspection capabilities.

### Adapter Context

```typescript
const context = db.context;

// Connection info
console.log(context.connectionInfo.type);     // 'file' | 'memory' | 'network'
console.log(context.connectionInfo.engine);   // 'sqlite' | 'postgres' | 'sqljs'
console.log(context.connectionInfo.version);  // '3.45.0'

// Simple capability checks
if (context.supportsBatch) {
  await db.batch(operations);
}

if (context.supportsJSON) {
  await db.run('INSERT INTO data (json_col) VALUES ($1)', [jsonData]);
}
```

### Adapter Limitations

Each adapter exposes its limitations at runtime:

```typescript
const limits = context.getLimitations();

console.log('Max connections:', limits.maxConnections);           // 1 (SQLite) or 100 (Postgres)
console.log('Max batch size:', limits.maxBatchSize);             // 1000 (recommended)
console.log('Supported types:', limits.supportedDataTypes);       // ['INTEGER', 'TEXT', ...]
console.log('Unsupported:', limits.unsupportedFeatures);         // ['streaming', 'json']

// Performance characteristics
console.log('Concurrency:', limits.performanceCharacteristics.concurrency);     // 'single' | 'pooled'
console.log('Persistence:', limits.performanceCharacteristics.persistence);     // 'file' | 'memory' | 'network'
console.log('Async:', limits.performanceCharacteristics.asyncExecution);        // true | false
```

### Health Status

Monitor adapter health and performance:

```typescript
const status = context.getStatus();

console.log('Healthy:', status.healthy);           // true | false
console.log('Connected:', status.connected);       // true | false
console.log('Uptime:', status.uptime);            // milliseconds
console.log('Total queries:', status.totalQueries); // 1523
console.log('Errors:', status.errors);            // 0
console.log('Last query:', status.lastQuery);     // Date object
```

### Event System

Subscribe to adapter events for monitoring:

```typescript
// Query errors
db.events.on('query:error', (event) => {
  logger.error('Query failed:', {
    statement: event.statement,
    error: event.error,
    duration: event.duration
  });
});

// Slow queries
db.events.on('performance:slow-query', (event) => {
  if (event.duration > 1000) {
    analytics.track('slow_query', {
      statement: event.statement,
      duration: event.duration
    });
  }
});

// Cache performance
db.events.on('cache:hit', (event) => {
  metrics.increment('cache.hits');
});

db.events.on('cache:miss', (event) => {
  metrics.increment('cache.misses');
});

// Connection lifecycle
db.events.on('connection:opened', (event) => {
  logger.info('Database connected:', event.context.kind);
});

db.events.on('connection:error', (event) => {
  logger.error('Connection error:', event.error);
});
```

## Performance Characteristics

### Query Performance (ops/sec)

| Operation | PostgreSQL | better-sqlite3 | SQL.js | Capacitor |
|-----------|------------|----------------|--------|-----------|
| Simple SELECT | 10,000 | 50,000 | 5,000 | 15,000 |
| INSERT (single) | 500 | 2,000 | 200 | 1,000 |
| INSERT (batch) | 5,000 | 20,000 | 1,000 | 5,000 |
| Complex JOIN | 1,000 | 10,000 | 500 | 5,000 |

*Benchmarks from mid-range hardware, YMMV

### Memory Usage

| Adapter | Minimum | Typical | Maximum |
|---------|---------|---------|---------|
| PostgreSQL | 50 MB | 200 MB | 1 GB+ |
| better-sqlite3 | 10 MB | 30 MB | 100 MB |
| SQL.js | 30 MB | 80 MB | 500 MB |
| Capacitor | 20 MB | 50 MB | 200 MB |

### Startup Time

| Adapter | Cold Start | Warm Start |
|---------|------------|------------|
| PostgreSQL | 1-5 sec | 100-500 ms |
| better-sqlite3 | 50-100 ms | <10 ms |
| SQL.js | 200-500 ms | 50-100 ms |
| Capacitor | 100-300 ms | 20-50 ms |

## Security Considerations

### SQL Injection Prevention

Always use parameterized queries:

```typescript
// ❌ VULNERABLE
const name = req.body.name;
await db.run(`DELETE FROM users WHERE name = '${name}'`);
// Attack: name = "'; DROP TABLE users; --"

// ✅ SAFE
await db.run('DELETE FROM users WHERE name = ?', [req.body.name]);
```

### Connection Security

**PostgreSQL**:
- Use SSL/TLS in production: `postgresql://user:pass@host:5432/db?sslmode=require`
- Never commit connection strings with credentials
- Use environment variables: `process.env.DATABASE_URL`
- Consider connection pooling limits (prevent resource exhaustion)

**SQLite**:
- Use file system permissions (chmod 600 database.db)
- Consider encrypting at rest (SQLCipher)
- Validate file paths (prevent directory traversal)

**Capacitor**:
- Enable database encryption for sensitive data
- Use iOS Keychain / Android KeyStore for encryption keys
- Implement proper app transport security

## Troubleshooting

### Common Issues

**"Cannot find module 'better-sqlite3'"**
```bash
# Solution 1: Install the peer dependency
npm install better-sqlite3

# Solution 2: Let it fall back to sql.js automatically
# (no action needed, works out of the box)
```

**"SQLITE_CANTOPEN: unable to open database file"**
```typescript
// ❌ Wrong: relative path
const db = await resolveStorageAdapter({ filePath: './db.sqlite3' });

// ✅ Correct: absolute path
import path from 'path';
const db = await resolveStorageAdapter({
  filePath: path.join(process.cwd(), 'db.sqlite3')
});

// Also check:
// - Directory exists and has write permissions
// - Sufficient disk space available
// - File not locked by another process
```

**"Connection timeout" with PostgreSQL**
```typescript
// Check connection string format
const db = await resolveStorageAdapter({
  postgres: {
    connectionString: 'postgresql://user:password@localhost:5432/database'
  }
});

// Common issues:
// - Wrong port (default is 5432)
// - PostgreSQL not running (systemctl status postgresql)
// - Firewall blocking connection
// - Wrong credentials (check pg_hba.conf)
```

**WebAssembly instantiation failed**
```typescript
// In browsers, check Content Security Policy
// Add to your HTML:
// <meta http-equiv="Content-Security-Policy" 
//       content="script-src 'self' 'wasm-unsafe-eval'">

// Also check:
// - Sufficient memory available
// - WASM file served with correct MIME type
// - Browser supports WebAssembly (IE doesn't)
```

### Debug Logging

```typescript
// Enable verbose logging
const db = await resolveStorageAdapter({
  openOptions: {
    adapterOptions: { 
      debug: true,
      verbose: console.log
    }
  }
});
```

### Performance Debugging

```typescript
// Track slow queries
db.events.on('performance:slow-query', (event) => {
  console.warn(`Slow query (${event.duration}ms):`);
  console.warn(event.statement);
  console.warn('Consider adding an index or optimizing the query');
});

// Monitor query count
let queryCount = 0;
db.events.on('query:complete', () => {
  queryCount++;
  if (queryCount % 100 === 0) {
    console.log(`Executed ${queryCount} queries`);
  }
});
```

## Migration Strategies

### SQLite to PostgreSQL

When your app grows beyond SQLite:

```bash
# 1. Export SQLite to SQL
sqlite3 app.db .dump > backup.sql

# 2. Convert SQLite SQL to PostgreSQL
# (handle type differences: INTEGER → SERIAL, AUTOINCREMENT → SERIAL, etc.)

# 3. Import to PostgreSQL
psql -d mydb -f backup.sql

# 4. Update code
# Old:
const db = await resolveStorageAdapter({ filePath: 'app.db' });

# New:
const db = await resolveStorageAdapter({
  postgres: { connectionString: process.env.DATABASE_URL }
});
```

### Handling Migrations

```typescript
// Simple version tracking
await db.exec(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

const currentVersion = await db.get<{ version: number }>(
  'SELECT MAX(version) as version FROM schema_version'
);

if (!currentVersion || currentVersion.version < 2) {
  await db.transaction(async (tx) => {
    await tx.exec('ALTER TABLE users ADD COLUMN email TEXT');
    await tx.run('INSERT INTO schema_version (version) VALUES (2)');
  });
}
```

For production apps, use a migration tool like:
- [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
- [Prisma](https://www.prisma.io/)
- [Knex.js migrations](http://knexjs.org/guide/migrations.html)

## Advanced Patterns

### Connection Pooling

```typescript
// PostgreSQL automatically pools connections
const db = await resolveStorageAdapter({
  postgres: {
    connectionString: process.env.DATABASE_URL,
    // pool config passed through
    max: 20,           // max connections
    idleTimeoutMillis: 30000
  }
});
```

### Read Replicas

```typescript
// Write to primary, read from replica
const primary = await resolveStorageAdapter({
  postgres: { connectionString: process.env.PRIMARY_DB }
});

const replica = await resolveStorageAdapter({
  postgres: { connectionString: process.env.REPLICA_DB }
});

// Writes go to primary
await primary.run('INSERT INTO logs (msg) VALUES (?)', ['event']);

// Reads from replica (eventual consistency)
const logs = await replica.all('SELECT * FROM logs ORDER BY created_at DESC LIMIT 100');
```

### Sharding

```typescript
// Route queries based on user ID
function getDB(userId: number) {
  const shardId = userId % 4; // 4 shards
  return resolveStorageAdapter({
    postgres: {
      connectionString: process.env[`SHARD_${shardId}_DB`]
    }
  });
}

const db = await getDB(user.id);
await db.run('INSERT INTO posts (user_id, content) VALUES (?, ?)', [user.id, content]);
```

---

For more examples and patterns, see the [GitHub repository](https://github.com/framersai/sql-storage-adapter).
