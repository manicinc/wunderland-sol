# Database Connections Guide

> Comprehensive guide to managing database backends in Frame.dev (Quarry)

## Overview

Frame.dev supports multiple storage backends for your content, allowing flexible deployment options from fully local to cloud-synced setups. The unified connection management system provides:

- **Local SQLite Vault**: Your data on your machine, fully offline-capable
- **GitHub Repository**: Sync content with a Git repository for version control
- **PostgreSQL Database**: Enterprise-grade remote storage with team collaboration

## Table of Contents

1. [Quick Start](#quick-start)
2. [Connection Types](#connection-types)
3. [Managing Connections](#managing-connections)
4. [Security & Credentials](#security--credentials)
5. [Sync & Collaboration](#sync--collaboration)
6. [Troubleshooting](#troubleshooting)
7. [API Reference](#api-reference)

---

## Quick Start

### Accessing Database Settings

1. Open **Settings** (⌘+,)
2. Navigate to **Data & Storage**
3. Click **Database Connections**

### Creating Your First Connection

By default, Frame.dev creates a local vault at `~/Documents/Quarry`. To add additional connections:

1. Click **+ Add Connection**
2. Select connection type:
   - **Local Vault** - SQLite on your filesystem
   - **GitHub** - Sync with a GitHub repository
   - **PostgreSQL** - Remote database
3. Fill in connection details
4. Click **Test Connection** to verify
5. Click **Save** to create the connection

---

## Connection Types

### Local Vault (SQLite)

The default storage method. Data is stored in SQLite databases on your local machine.

**Best for:**
- Personal use
- Offline-first workflows
- Maximum privacy
- Fast performance

**Configuration:**

| Field | Description | Default |
|-------|-------------|---------|
| Name | Display name for this connection | "My Vault" |
| Vault Path | Directory path | `~/Documents/Quarry` |
| Adapter Type | Storage engine | `indexeddb` (browser) / `electron` (desktop) |

**Directory Structure:**
```
~/Documents/Quarry/
├── .quarry/
│   ├── vault.json    # Vault configuration
│   └── .gitignore    # Cache exclusions
├── weaves/           # Markdown content
│   └── welcome.md
└── assets/           # Attachments
```

### GitHub Repository

Sync your content with a GitHub repository for version control and backup.

**Best for:**
- Git-based workflows
- Version history
- Open-source documentation
- Team collaboration (via PRs)

**Configuration:**

| Field | Description | Required |
|-------|-------------|----------|
| Name | Display name | Yes |
| Owner | GitHub username or org | Yes |
| Repository | Repository name | Yes |
| Branch | Branch to sync with | Yes (default: `main`) |
| Base Path | Subdirectory for content | No |
| Personal Access Token | GitHub PAT | Yes (for private repos) |

**Required PAT Scopes:**
- `repo` - Full repository access (private repos)
- `public_repo` - Public repo access only

### PostgreSQL Database

Enterprise-grade storage with ACID compliance and team collaboration.

**Best for:**
- Team deployments
- Enterprise security requirements
- Custom integrations
- Large-scale content management

**Configuration:**

| Field | Description | Default |
|-------|-------------|---------|
| Name | Display name | Required |
| Host | Database server hostname | Required |
| Port | PostgreSQL port | `5432` |
| Database | Database name | Required |
| Username | Database user | Required |
| Password | Database password | Stored encrypted |
| SSL | Enable SSL encryption | `true` |
| SSL Mode | SSL verification level | `require` |
| Schema | PostgreSQL schema | `public` |
| Pool Size | Connection pool limit | `10` |

**Connection String Format:**
```
postgresql://username:password@host:port/database?sslmode=require
```

**Supported SSL Modes:**
- `disable` - No SSL
- `require` - SSL required, no verification
- `verify-ca` - Verify server certificate
- `verify-full` - Verify server certificate and hostname

---

## Managing Connections

### Adding a Connection

```typescript
import { getConnectionManager } from '@/lib/storage/connectionManager'
import { createPostgresConnection } from '@/lib/storage/types'

const manager = getConnectionManager()

const connection = createPostgresConnection({
  id: crypto.randomUUID(),
  name: 'Production Database',
  host: 'db.example.com',
  database: 'quarry_prod',
  username: 'quarry_app',
})

await manager.addConnection(connection, { password: 'secret' })
```

### Switching Active Connection

Only one connection can be active at a time. To switch:

1. Go to **Settings > Data & Storage > Database Connections**
2. Find the target connection in the list
3. Click **Activate**
4. Confirm the switch in the dialog

Or programmatically:

```typescript
const manager = getConnectionManager()
await manager.connect('connection-id-here')
```

### Testing a Connection

Before activating a connection, test it:

```typescript
const result = await manager.testConnection('connection-id')

if (result.success) {
  console.log(`Connected in ${result.latencyMs}ms`)
  console.log(`Server version: ${result.version}`)
} else {
  console.error(`Connection failed: ${result.message}`)
}
```

### Removing a Connection

```typescript
await manager.removeConnection('connection-id')
```

> **Warning:** Removing a connection does not delete the underlying data.

---

## Security & Credentials

### Encryption

All sensitive credentials (passwords, tokens) are encrypted using:

- **Algorithm:** AES-256-GCM
- **Key Derivation:** PBKDF2 with 100,000 iterations
- **Storage:** 
  - Electron: `electron-store` with hardware keychain
  - Browser: IndexedDB with Web Crypto API

### Best Practices

1. **Use strong passwords** - At least 16 characters, mixed case, numbers, symbols
2. **Limit PAT scopes** - Only grant necessary permissions
3. **Rotate credentials** - Update tokens periodically
4. **Use SSL** - Always enable SSL for remote connections
5. **Environment variables** - For CI/CD, use environment variables instead of stored credentials

### Credential Storage Locations

| Platform | Storage Location |
|----------|------------------|
| macOS Electron | `~/Library/Application Support/Frame/frame-settings.json` (encrypted) |
| Windows Electron | `%APPDATA%\Frame\frame-settings.json` (encrypted) |
| Linux Electron | `~/.config/Frame/frame-settings.json` (encrypted) |
| Browser | IndexedDB (encrypted) |

---

## Sync & Collaboration

### Sync Status

The Sync Status Dashboard shows:

- **Current Status**: Connected, Syncing, Offline, Error
- **Last Sync**: Timestamp of last successful sync
- **Pending Changes**: Number of local changes not yet synced
- **Conflicts**: Number of sync conflicts requiring resolution

### Multi-Device Sync

When using PostgreSQL or GitHub backends:

1. **Device Registry** - See all connected devices
2. **Real-time Updates** - Changes propagate automatically
3. **Conflict Resolution** - Manual merge for conflicting edits

### Conflict Resolution

When two devices edit the same content:

1. **Auto-merge** - Non-overlapping changes merge automatically
2. **Manual resolution** - Overlapping changes require manual intervention
3. **Version history** - Previous versions are preserved for recovery

---

## Troubleshooting

### Connection Issues

#### "Connection refused"
- Verify the host and port are correct
- Check if the database server is running
- Verify firewall rules allow the connection

#### "Authentication failed"
- Double-check username and password
- Verify the user has access to the database
- Check if SSL is required but disabled

#### "SSL certificate error"
- Use `sslmode=require` instead of `verify-full` for self-signed certs
- Add your CA certificate to the system trust store

#### "Database does not exist"
- Verify the database name is correct
- Create the database if it doesn't exist:
  ```sql
  CREATE DATABASE quarry_prod;
  ```

### GitHub Issues

#### "Bad credentials"
- Regenerate your Personal Access Token
- Ensure the token has `repo` scope

#### "Not found"
- Verify repository owner and name
- Check if the repository exists
- Ensure your PAT has access to the repository

### Performance Issues

#### Slow connections
- Increase pool size for high-concurrency workloads
- Enable connection pooling at the database level
- Consider using a connection pooler like PgBouncer

#### High latency
- Use a geographically closer database server
- Enable compression in PostgreSQL
- Consider read replicas for read-heavy workloads

---

## API Reference

### ConnectionManager

```typescript
import { 
  getConnectionManager, 
  initConnectionManager,
  type ConnectionManager 
} from '@/lib/storage/connectionManager'

// Get singleton instance
const manager = getConnectionManager()

// Initialize (call once at app startup)
await initConnectionManager()

// Methods
manager.getConnections(): DatabaseConnection[]
manager.getActiveConnection(): DatabaseConnection | null
manager.addConnection(connection, credentials?): Promise<void>
manager.updateConnection(id, updates, credentials?): Promise<void>
manager.removeConnection(id): Promise<void>
manager.connect(connectionId): Promise<boolean>
manager.disconnect(): Promise<void>
manager.testConnection(connectionId): Promise<ConnectionTestResult>
manager.getSyncStatus(connectionId): SyncStatus | null
```

### Type Definitions

```typescript
// Connection Types
type ConnectionType = 'local' | 'github' | 'postgres'
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'syncing'

// Base Connection Interface
interface BaseConnection {
  id: string
  name: string
  type: ConnectionType
  isActive: boolean
  status: ConnectionStatus
  lastConnected?: string
  lastError?: string
  createdAt: string
  updatedAt: string
}

// Specific Connection Types
interface LocalConnection extends BaseConnection { ... }
interface GitHubConnection extends BaseConnection { ... }
interface PostgresConnection extends BaseConnection { ... }

// Union Type
type DatabaseConnection = LocalConnection | GitHubConnection | PostgresConnection
```

### Helper Functions

```typescript
import {
  createLocalConnection,
  createGitHubConnection,
  createPostgresConnection,
  buildPostgresConnectionString,
  parsePostgresConnectionString,
  getConnectionTypeLabel,
  getConnectionTypeIcon,
  CONNECTION_DEFAULTS,
} from '@/lib/storage/types'
```

---

## Related Documentation

- [Storage and Profile Management](./STORAGE_AND_PROFILE.md)
- [Electron Build Guide](./ELECTRON_BUILD.md)
- [Development Setup](./DEVELOPMENT.md)

---

## Changelog

- **v1.0.0** - Initial connection management system
  - Support for Local, GitHub, and PostgreSQL backends
  - Encrypted credential storage
  - Sync status dashboard
  - Multi-device support

