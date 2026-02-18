# SQL Storage Adapter - Optimization & Cost Configuration Guide

> Comprehensive guide for configuring performance tiers, cost optimization, and sensible defaults across all platforms.

---

## Table of Contents

1. [Overview](#overview)
2. [Performance Tiers](#performance-tiers)
3. [Cost vs Accuracy Tradeoffs](#cost-vs-accuracy-tradeoffs)
4. [Platform-Specific Optimization](#platform-specific-optimization)
5. [Extension Points](#extension-points)
6. [Configuration Reference](#configuration-reference)
7. [Best Practices](#best-practices)
8. [Monitoring & Metrics](#monitoring--metrics)

---

## Overview

The SQL Storage Adapter is designed as a **platform-agnostic foundation** for cross-platform SQL operations. This guide explains how to configure the adapter for optimal performance across different use cases:

| Use Case | Priority | Recommended Config |
|----------|----------|-------------------|
| **Development/Testing** | Speed | `tier: 'fast'`, memory adapter |
| **Production Web App** | Balance | `tier: 'balanced'`, IndexedDB |
| **Mobile (Offline-First)** | Battery/Storage | `tier: 'efficient'`, Capacitor |
| **Enterprise/Cloud** | Reliability | `tier: 'accurate'`, PostgreSQL |
| **RAG/Embeddings** | Accuracy | `tier: 'accurate'`, with hooks |

---

## Performance Tiers

### Tier Definition

```typescript
/**
 * Performance tier presets for common use cases.
 * 
 * @remarks
 * Tiers provide sensible defaults that can be overridden individually.
 * The tier affects caching, batching, validation, and query optimization.
 */
export type PerformanceTier = 
  | 'fast'      // Prioritize speed over accuracy (dev/testing)
  | 'balanced'  // Default - good for most production apps
  | 'accurate'  // Prioritize accuracy over speed (RAG, analytics)
  | 'efficient' // Prioritize battery/bandwidth (mobile, IoT)
  | 'custom';   // Fully custom configuration

/**
 * Performance configuration options.
 */
export interface PerformanceConfig {
  /** Performance tier preset (default: 'balanced') */
  tier?: PerformanceTier;
  
  /** Enable query result caching (default: tier-dependent) */
  cacheEnabled?: boolean;
  
  /** Cache TTL in milliseconds (default: 5000 for balanced) */
  cacheTtlMs?: number;
  
  /** Maximum cache entries (default: 1000) */
  cacheMaxEntries?: number;
  
  /** Enable write batching (default: true for efficient tier) */
  batchWrites?: boolean;
  
  /** Batch flush interval in ms (default: 100) */
  batchFlushIntervalMs?: number;
  
  /** Maximum batch size before auto-flush (default: 50) */
  batchMaxSize?: number;
  
  /** Validate SQL before execution (default: true for accurate) */
  validateSql?: boolean;
  
  /** Track performance metrics (default: true) */
  trackMetrics?: boolean;
  
  /** Log slow queries above this threshold in ms (default: 100) */
  slowQueryThresholdMs?: number;
  
  /** Retry transient errors (default: true) */
  retryOnError?: boolean;
  
  /** Maximum retry attempts (default: 3) */
  maxRetries?: number;
  
  /** Retry delay in ms (default: 100) */
  retryDelayMs?: number;
}
```

### Tier Defaults

| Setting | Fast | Balanced | Accurate | Efficient |
|---------|------|----------|----------|-----------|
| `cacheEnabled` | ✅ | ✅ | ❌ | ✅ |
| `cacheTtlMs` | 30000 | 5000 | 0 | 60000 |
| `cacheMaxEntries` | 500 | 1000 | 0 | 200 |
| `batchWrites` | ✅ | ❌ | ❌ | ✅ |
| `batchFlushIntervalMs` | 50 | 100 | 0 | 500 |
| `batchMaxSize` | 100 | 50 | 1 | 20 |
| `validateSql` | ❌ | ✅ | ✅ | ❌ |
| `trackMetrics` | ❌ | ✅ | ✅ | ❌ |
| `slowQueryThresholdMs` | 500 | 100 | 50 | 200 |
| `retryOnError` | ❌ | ✅ | ✅ | ✅ |
| `maxRetries` | 1 | 3 | 5 | 3 |

### Usage Examples

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Development: Fast tier for quick iteration
const devDb = await createDatabase({
  type: 'memory',
  performance: { tier: 'fast' }
});

// Production web app: Balanced tier (default)
const webDb = await createDatabase({
  priority: ['indexeddb', 'sqljs'],
  performance: { tier: 'balanced' }
});

// Mobile app: Efficient tier for battery life
const mobileDb = await createDatabase({
  priority: ['capacitor', 'indexeddb'],
  performance: { 
    tier: 'efficient',
    batchFlushIntervalMs: 1000, // Override: flush less often
    cacheMaxEntries: 100        // Override: smaller cache
  }
});

// Analytics system: Accurate tier for consistent results
const analyticsDb = await createDatabase({
  postgres: { connectionString: process.env.DATABASE_URL },
  performance: { 
    tier: 'accurate',
    trackMetrics: true,
    slowQueryThresholdMs: 50
  }
});
```

---

## Cost vs Accuracy Tradeoffs

### Decision Matrix

| Scenario | Cost Factor | Accuracy Need | Recommended |
|----------|-------------|---------------|-------------|
| Full-text search | Medium | High | `accurate` + caching |
| User preferences | Low | Medium | `balanced` |
| Session data | Low | Low | `fast` + batching |
| Offline sync | Medium (bandwidth) | High | `efficient` + validation |
| Analytics/BI | High (queries) | High | `accurate` + metrics |

### Cost Optimization Strategies

#### 1. Query Caching (Reduce Redundant Computation)

```typescript
const db = await createDatabase({
  performance: {
    tier: 'balanced',
    cacheEnabled: true,
    cacheTtlMs: 10000,     // 10 seconds
    cacheMaxEntries: 500,  // Max 500 queries cached
  }
});

// First call: executes query
const results1 = await db.all('SELECT * FROM products WHERE category = ?', ['electronics']);

// Second call within TTL: returns cached result
const results2 = await db.all('SELECT * FROM products WHERE category = ?', ['electronics']);
```

#### 2. Write Batching (Reduce I/O Operations)

```typescript
const db = await createDatabase({
  performance: {
    tier: 'efficient',
    batchWrites: true,
    batchMaxSize: 50,
    batchFlushIntervalMs: 500,
  }
});

// These writes are batched and flushed together
await db.run('INSERT INTO logs (message) VALUES (?)', ['Event 1']);
await db.run('INSERT INTO logs (message) VALUES (?)', ['Event 2']);
await db.run('INSERT INTO logs (message) VALUES (?)', ['Event 3']);
// Batch flushes after 500ms or when 50 writes accumulate
```

#### 3. Connection Pooling (PostgreSQL)

```typescript
const db = await createDatabase({
  postgres: {
    connectionString: process.env.DATABASE_URL,
    max: 20,      // Maximum pool size
    min: 5,       // Minimum pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  },
  performance: { tier: 'balanced' }
});
```

---

## Platform-Specific Optimization

### Browser (IndexedDB)

```typescript
const browserDb = await createDatabase({
  priority: ['indexeddb', 'sqljs'],
  performance: {
    tier: 'balanced',
    // IndexedDB-specific: batch writes to reduce IDB transactions
    batchWrites: true,
    batchFlushIntervalMs: 200,
  }
});
```

**Considerations:**
- IndexedDB has per-transaction overhead; batching is highly recommended
- Storage quota varies by browser (50MB-1GB+)
- Use `efficient` tier for PWAs that run in background

### Mobile (Capacitor)

```typescript
const mobileDb = await createDatabase({
  priority: ['capacitor', 'indexeddb'],
  mobile: {
    dbName: 'app-db',
    encrypted: true,          // Enable SQLCipher encryption
    encryptionKey: process.env.DB_KEY,
  },
  performance: {
    tier: 'efficient',
    // Mobile-specific: larger batches, less frequent flushes
    batchWrites: true,
    batchMaxSize: 30,
    batchFlushIntervalMs: 1000,
    // Disable expensive operations
    trackMetrics: false,
  }
});
```

**Considerations:**
- Battery life: larger batch intervals, less frequent syncs
- Storage: set appropriate limits via SyncManager
- Encryption: always enable for sensitive data

### Desktop (Electron / Node.js)

```typescript
const desktopDb = await createDatabase({
  priority: ['better-sqlite3', 'sqljs'],
  file: './data/app.db',
  performance: {
    tier: 'balanced',
    // Desktop has more resources; enable all features
    trackMetrics: true,
    validateSql: true,
    cacheMaxEntries: 2000,
  }
});
```

**Considerations:**
- Native better-sqlite3 is 10-50x faster than sql.js WASM
- Use WAL mode for concurrent read performance
- Consider memory-mapped I/O for large datasets

### Cloud (PostgreSQL)

```typescript
const cloudDb = await createDatabase({
  postgres: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    statement_timeout: 30000,
  },
  performance: {
    tier: 'accurate',
    // Cloud-specific: connection pooling handles batching
    batchWrites: false,
    retryOnError: true,
    maxRetries: 5,
  }
});
```

**Considerations:**
- Use connection pooling (PgBouncer or built-in)
- Set appropriate timeouts for serverless environments
- Consider read replicas for high-read workloads

---

## Extension Points

The SQL Storage Adapter provides lifecycle hooks for extending behavior without modifying core implementations.

### Lifecycle Hooks

```typescript
/**
 * Hooks for extending adapter behavior.
 * Use for logging, analytics, caching, and auditing.
 */
export interface StorageHooks {
  /**
   * Called before any query execution.
   * Use for query transformation, logging, or caching checks.
   */
  onBeforeQuery?: (context: QueryContext) => Promise<QueryContext | void>;
  
  /**
   * Called after query execution.
   * Use for result transformation, caching, or metrics.
   */
  onAfterQuery?: (context: QueryContext, result: unknown) => Promise<unknown>;
  
  /**
   * Called before any write operation.
   * Use for validation, transformation, or auditing.
   */
  onBeforeWrite?: (context: WriteContext) => Promise<WriteContext | void>;
  
  /**
   * Called after write operation.
   * Use for cache invalidation, sync triggers, or logging.
   */
  onAfterWrite?: (context: WriteContext, result: StorageRunResult) => Promise<void>;
  
  /**
   * Called when an error occurs.
   * Use for error transformation, logging, or recovery.
   */
  onError?: (error: Error, context: OperationContext) => Promise<Error | void>;
}
```

### Hook Example: Audit Logging

```typescript
import { createDatabase, type StorageHooks } from '@framers/sql-storage-adapter';

// Audit logging hooks
const auditHooks: StorageHooks = {
  onBeforeWrite: async (context) => {
    console.log(`[AUDIT] Write operation: ${context.operation}`);
    console.log(`[AUDIT] Statement: ${context.statement}`);
    return context;
  },
  
  onAfterWrite: async (context, result) => {
    console.log(`[AUDIT] Rows affected: ${result.changes}`);
  },
  
  onAfterQuery: async (context, result) => {
    const duration = Date.now() - context.startTime;
    console.log(`[METRICS] Query took ${duration}ms`);
    return result;
  },
  
  onError: async (error, context) => {
    console.error(`[ERROR] ${context.operation} failed:`, error.message);
    return error;
  }
};

const db = await createDatabase({
  performance: { tier: 'balanced' },
  hooks: auditHooks
});
```

---

## Configuration Reference

### Full Configuration Interface

```typescript
export interface StorageConfig {
  // ============================================================
  // Adapter Selection
  // ============================================================
  
  /** Explicit adapter priority order */
  priority?: AdapterKind[];
  
  /** Force a specific adapter type */
  type?: 'postgres' | 'sqlite' | 'browser' | 'mobile' | 'memory';
  
  /** Database URL (PostgreSQL) */
  url?: string;
  
  /** File path (SQLite) */
  file?: string;
  
  // ============================================================
  // Adapter-Specific Options
  // ============================================================
  
  /** PostgreSQL configuration */
  postgres?: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    ssl?: boolean | object;
    max?: number;           // Pool max connections
    min?: number;           // Pool min connections
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
    statement_timeout?: number;
  };
  
  /** Capacitor (mobile) configuration */
  mobile?: {
    dbName?: string;
    encrypted?: boolean;
    encryptionKey?: string;
    mode?: 'no-encryption' | 'encryption' | 'secret';
    biometricAuth?: boolean;
  };
  
  /** IndexedDB configuration */
  indexedDb?: {
    dbName?: string;        // Default: 'app-db'
    storeName?: string;     // Default: 'sqliteDb'
    autoSave?: boolean;     // Default: true
    saveIntervalMs?: number; // Default: 5000
  };
  
  // ============================================================
  // Performance Configuration
  // ============================================================
  
  /** Performance tier and options */
  performance?: PerformanceConfig;
  
  // ============================================================
  // Extension Points
  // ============================================================
  
  /** Lifecycle hooks for extending behavior */
  hooks?: StorageHooks;
  
  /** Custom logger implementation */
  logger?: StorageLogger;
  
  // ============================================================
  // Sync Configuration
  // ============================================================
  
  /** Remote database for synchronization */
  remote?: StorageConfig;
  
  /** Sync options */
  sync?: SyncConfig;
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_ADAPTER` | Force specific adapter: `better-sqlite3`, `sqljs`, `indexeddb`, `postgres`, `capacitor` | Auto-detect |
| `DATABASE_URL` | PostgreSQL connection string | None |
| `STORAGE_TIER` | Performance tier: `fast`, `balanced`, `accurate`, `efficient` | `balanced` |
| `STORAGE_CACHE_TTL_MS` | Query cache TTL | `5000` |
| `STORAGE_CACHE_MAX` | Max cached queries | `1000` |
| `STORAGE_BATCH_SIZE` | Write batch size | `50` |
| `STORAGE_BATCH_INTERVAL_MS` | Batch flush interval | `100` |
| `STORAGE_LOG_LEVEL` | Log level: `debug`, `info`, `warn`, `error` | `info` |
| `STORAGE_SLOW_QUERY_MS` | Slow query threshold | `100` |

---

## Best Practices

### 1. Choose the Right Tier

```typescript
// ❌ Don't: Use accurate tier for development
const devDb = await createDatabase({ performance: { tier: 'accurate' } });

// ✅ Do: Use fast tier for development, accurate for production RAG
const db = await createDatabase({
  performance: { 
    tier: process.env.NODE_ENV === 'development' ? 'fast' : 'balanced'
  }
});
```

### 2. Enable Caching for Read-Heavy Workloads

```typescript
// ✅ Good: Cache frequently-read, rarely-changed data
const db = await createDatabase({
  performance: {
    tier: 'balanced',
    cacheEnabled: true,
    cacheTtlMs: 60000, // 1 minute for stable data
  }
});
```

### 3. Batch Writes on Mobile/Browser

```typescript
// ✅ Good: Batch writes to reduce I/O
const mobileDb = await createDatabase({
  priority: ['capacitor'],
  performance: {
    tier: 'efficient',
    batchWrites: true,
    batchMaxSize: 25,
    batchFlushIntervalMs: 500,
  }
});
```

### 4. Monitor Slow Queries in Production

```typescript
// ✅ Good: Log slow queries for optimization
const db = await createDatabase({
  performance: {
    tier: 'balanced',
    trackMetrics: true,
    slowQueryThresholdMs: 50,
  },
  logger: {
    warn: (msg, meta) => {
      if (meta?.type === 'slow_query') {
        analytics.track('slow_query', meta);
      }
    }
  }
});
```

### 5. Use Hooks for Cross-Cutting Concerns

```typescript
// ✅ Good: Centralize audit logging via hooks
const db = await createDatabase({
  hooks: {
    onAfterWrite: async (context, result) => {
      await auditLog.record({
        operation: context.operation,
        statement: context.statement,
        rowsAffected: result.changes,
        duration: Date.now() - context.startTime,
      });
    }
  }
});
```

---

## Monitoring & Metrics

### Built-in Metrics

The adapter tracks performance metrics when `trackMetrics: true`:

```typescript
const db = await createDatabase({
  performance: { tier: 'balanced', trackMetrics: true }
});

// Get metrics after some operations
const metrics = db.getMetrics();
console.log(metrics);
// {
//   totalQueries: 150,
//   totalMutations: 25,
//   totalTransactions: 5,
//   totalErrors: 0,
//   averageQueryDuration: 12.5,
//   openedAt: Date
// }
```

### Custom Metrics Integration

```typescript
import { createDatabase, type StorageHooks } from '@framers/sql-storage-adapter';

// Integration with your metrics system (DataDog, Prometheus, etc.)
const metricsHooks: StorageHooks = {
  onAfterQuery: async (context, result) => {
    const duration = Date.now() - context.startTime;
    
    // Record to your metrics system
    metrics.histogram('db.query.duration', duration, {
      operation: context.operation,
      adapter: db.kind,
    });
    
    if (duration > 100) {
      metrics.increment('db.slow_queries', 1);
    }
    
    return result;
  },
  
  onError: async (error, context) => {
    metrics.increment('db.errors', 1, {
      operation: context.operation,
      error: error.message,
    });
    return error;
  }
};

const db = await createDatabase({
  performance: { tier: 'balanced' },
  hooks: metricsHooks
});
```

---

## Version History

| Version | Changes |
|---------|---------|
| 1.0.0 | Initial release with performance tiers |
| 1.1.0 | Added lifecycle hooks for extensibility |
| 1.2.0 | Added custom logger interface |

---

<p align="center">
  Built and maintained by <a href="https://frame.dev" target="_blank" rel="noopener"><strong>Frame.dev</strong></a>
</p>



