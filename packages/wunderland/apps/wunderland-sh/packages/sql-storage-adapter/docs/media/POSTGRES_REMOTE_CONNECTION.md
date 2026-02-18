# Remote PostgreSQL Connection Guide

This guide covers connecting to remote PostgreSQL databases from any environment using the SQL Storage Adapter.

## Quick Start

```typescript
import { createDatabase } from '@framers/sql-storage-adapter';

// Auto-detect from DATABASE_URL environment variable
const db = await createDatabase();

// Or explicit connection
const db = await createDatabase({
  url: process.env.DATABASE_URL
});

await db.open();
```

## Connection Methods

### 1. Connection String (Recommended)

The simplest way to connect:

```typescript
const db = await createDatabase({
  url: 'postgresql://user:password@host:5432/database?sslmode=require'
});
```

### 2. Configuration Object

For more control:

```typescript
const db = await createDatabase({
  postgres: {
    host: 'db.example.com',
    port: 5432,
    database: 'myapp',
    user: 'dbuser',
    password: process.env.DB_PASSWORD,
    ssl: true,
    max: 20  // Connection pool size
  }
});
```

### 3. Environment-Based (Best for Production)

```typescript
// .env.production
DATABASE_URL=postgresql://user:pass@prod.db.com/myapp?sslmode=require

// .env.development
DATABASE_URL=  # Empty = falls back to SQLite

// Your code (works in both environments!)
const db = await createDatabase();
```

## Cloud Provider Examples

### Supabase

```typescript
// Connection string from Supabase dashboard
const db = await createDatabase({
  url: process.env.SUPABASE_DATABASE_URL
});

// Or with pooling (recommended)
const db = await createDatabase({
  postgres: {
    connectionString: process.env.SUPABASE_DATABASE_URL,
    max: 20,
    ssl: { rejectUnauthorized: false }
  }
});
```

### AWS RDS

```typescript
const db = await createDatabase({
  postgres: {
    host: 'mydb.abc123.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'production',
    user: 'admin',
    password: process.env.RDS_PASSWORD,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.RDS_CA_CERT  // Optional
    },
    max: 20
  }
});
```

### Heroku

```typescript
// Heroku provides DATABASE_URL automatically
const db = await createDatabase({
  url: process.env.DATABASE_URL,
  postgres: {
    ssl: { rejectUnauthorized: false }  // Required for Heroku
  }
});
```

### DigitalOcean

```typescript
const db = await createDatabase({
  postgres: {
    host: 'db-postgresql-nyc3-12345.ondigitalocean.com',
    port: 25060,
    database: 'defaultdb',
    user: 'doadmin',
    password: process.env.DO_DB_PASSWORD,
    ssl: true,
    max: 15
  }
});
```

### Railway

```typescript
// Railway provides DATABASE_URL
const db = await createDatabase({
  url: process.env.DATABASE_URL
});
```

### Render

```typescript
// Render provides DATABASE_URL (internal) and EXTERNAL_DATABASE_URL (external)
const db = await createDatabase({
  url: process.env.DATABASE_URL  // Use internal URL for same-region performance
});
```

### Neon

```typescript
// Neon serverless PostgreSQL
const db = await createDatabase({
  url: process.env.NEON_DATABASE_URL,
  postgres: {
    ssl: true,
    max: 10  // Neon handles pooling automatically
  }
});
```

### Google Cloud SQL

```typescript
const db = await createDatabase({
  postgres: {
    host: '/cloudsql/project:region:instance',  // Unix socket
    // Or use IP: host: '10.1.2.3'
    database: 'mydb',
    user: 'postgres',
    password: process.env.CLOUDSQL_PASSWORD
  }
});
```

### Azure Database for PostgreSQL

```typescript
const db = await createDatabase({
  postgres: {
    host: 'myserver.postgres.database.azure.com',
    port: 5432,
    database: 'mydb',
    user: 'adminuser@myserver',
    password: process.env.AZURE_DB_PASSWORD,
    ssl: {
      rejectUnauthorized: true
    }
  }
});
```

## Security Best Practices

### SSL/TLS Configuration

Always use SSL in production:

```typescript
const db = await createDatabase({
  postgres: {
    // ... other config
    ssl: {
      rejectUnauthorized: true,  // Verify server certificate
      ca: fs.readFileSync('./ca-cert.pem'),  // CA certificate
      key: fs.readFileSync('./client-key.pem'),  // Client key (if required)
      cert: fs.readFileSync('./client-cert.pem')  // Client cert (if required)
    }
  }
});
```

For some cloud providers (like Heroku), you may need:

```typescript
ssl: { rejectUnauthorized: false }  // Use with caution!
```

### Environment Variables

Never hardcode credentials:

```typescript
// ❌ Bad
const db = await createDatabase({
  url: 'postgresql://admin:mypassword@prod.db.com/app'
});

// ✅ Good
const db = await createDatabase({
  url: process.env.DATABASE_URL
});
```

### Connection Pooling

Use connection pooling to avoid exhausting database connections:

```typescript
const db = await createDatabase({
  postgres: {
    // ... other config
    max: 20,                    // Maximum connections
    min: 2,                     // Minimum idle connections
    idleTimeoutMillis: 10000,   // Close idle connections after 10s
    connectionTimeoutMillis: 5000  // Timeout when acquiring connection
  }
});
```

## Performance Tuning

### Query Timeouts

Prevent long-running queries:

```typescript
const db = await createDatabase({
  postgres: {
    // ... other config
    statement_timeout: 30000,  // 30 seconds (in ms)
    query_timeout: 30000       // Alternative property name
  }
});
```

### Application Name

For monitoring and debugging:

```typescript
const db = await createDatabase({
  postgres: {
    // ... other config
    application_name: 'my-app-v1.2.3'
  }
});
```

This helps identify connections in PostgreSQL logs and monitoring tools.

### Connection Limits

Optimize based on your workload:

```typescript
// High-traffic API server
const db = await createDatabase({
  postgres: {
    max: 50,
    min: 10
  }
});

// Background worker
const db = await createDatabase({
  postgres: {
    max: 5,
    min: 1
  }
});

// Serverless function (single connection)
const db = await createDatabase({
  postgres: {
    max: 1,
    min: 0
  }
});
```

## Troubleshooting

### Connection Refused

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions:**
- Verify host and port are correct
- Check firewall rules allow connections
- Ensure PostgreSQL is running
- Check if database is accessible from your network

### SSL Required

```
Error: no pg_hba.conf entry for host
```

**Solution:**
```typescript
const db = await createDatabase({
  postgres: {
    // ... other config
    ssl: true
  }
});
```

### Connection Timeout

```
Error: Connection timeout
```

**Solutions:**
- Increase `connectionTimeoutMillis`
- Check network connectivity
- Verify database server is responding
- Check if IP is whitelisted

### Too Many Connections

```
Error: sorry, too many clients already
```

**Solutions:**
- Reduce `max` pool size
- Increase PostgreSQL's `max_connections` setting
- Use connection pooling (PgBouncer, etc.)

### SSL Certificate Verification Failed

```
Error: self signed certificate in certificate chain
```

**Solution:**
```typescript
ssl: { rejectUnauthorized: false }  // Development only!
```

For production, get the proper CA certificate from your provider.

## Health Checks

Implement health checks to monitor database connectivity:

```typescript
async function checkDatabaseHealth(db: StorageAdapter) {
  try {
    const result = await db.get<{ now: string }>('SELECT NOW() as now');
    return {
      status: 'healthy',
      timestamp: result?.now,
      adapter: db.kind
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message
    };
  }
}

// Use in your health endpoint
app.get('/health', async (req, res) => {
  const health = await checkDatabaseHealth(db);
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

## Migration Patterns

### Development to Production

```typescript
import { migrateLocalToSupabase, openDatabase, createDatabase } from '@framers/sql-storage-adapter';

// Export from local development database
const localDb = await openDatabase('./dev.db');

// Import to production Supabase
const prodDb = await createDatabase({
  url: process.env.SUPABASE_DATABASE_URL
});

const result = await migrateLocalToSupabase(localDb, prodDb, {
  verify: true,
  onConflict: 'replace'
});

console.log(`Migrated ${result.rowsImported} rows in ${result.duration}ms`);
```

### Cross-Region Replication

```typescript
const sourceDb = await createDatabase({
  url: process.env.US_DATABASE_URL
});

const targetDb = await createDatabase({
  url: process.env.EU_DATABASE_URL
});

const result = await migrateAdapter(sourceDb, targetDb, {
  verify: true,
  batchSize: 1000
});
```

## Advanced Configuration

### Read Replicas

```typescript
// Write to primary
const primaryDb = await createDatabase({
  url: process.env.PRIMARY_DATABASE_URL
});

// Read from replica
const replicaDb = await createDatabase({
  url: process.env.REPLICA_DATABASE_URL,
  postgres: {
    max: 50  // More connections for read-heavy workload
  }
});

// Use appropriately
await primaryDb.run('INSERT INTO users ...');
const users = await replicaDb.all('SELECT * FROM users');
```

### Multi-Tenant

```typescript
async function getDatabaseForTenant(tenantId: string) {
  return createDatabase({
    postgres: {
      host: 'shared-db.example.com',
      database: `tenant_${tenantId}`,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: true
    }
  });
}

const tenantDb = await getDatabaseForTenant('acme-corp');
```

## Resources

- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [node-postgres Documentation](https://node-postgres.com/)
- [Connection Pooling Guide](https://node-postgres.com/features/pooling)
- [SSL/TLS Configuration](https://node-postgres.com/features/ssl)

## See Also

- [API Redesign Guide](../API_REDESIGN.md) - Overview of the simplified API
- [Migration Guide](../README.md#migration-tools) - Data migration utilities
- [Examples](../examples/remote-postgres.ts) - Complete working examples
