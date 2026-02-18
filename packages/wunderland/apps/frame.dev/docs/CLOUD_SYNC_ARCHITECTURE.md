# Quarry Cloud Sync Architecture

End-to-end encrypted cloud sync for Quarry. This document describes the architecture and requirements for implementing cross-device sync.

## Overview

Quarry Cloud Sync enables users to sync their encrypted data across devices while maintaining zero-knowledge encryption. The server never has access to unencrypted data or encryption keys.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Quarry App)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   User Passphrase ───► Argon2id KDF ───► Master Key                     │
│                              │                 │                         │
│                              │                 ▼                         │
│                              │         ┌──────────────┐                  │
│                              │         │  Wrap DEK    │                  │
│                              │         └──────────────┘                  │
│                              │                 │                         │
│                              ▼                 ▼                         │
│                         ┌─────────┐    ┌──────────────┐                  │
│                         │  Salt   │    │ Wrapped DEK  │                  │
│                         └─────────┘    └──────────────┘                  │
│                              │                 │                         │
│                              └────────┬────────┘                         │
│                                       │                                  │
│                                       ▼                                  │
│                              ┌────────────────┐                          │
│                              │   Upload to    │                          │
│                              │    Server      │                          │
│                              └────────────────┘                          │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLOUD SYNC SERVICE (Future)                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │
│   │   Auth API      │  │   Keys API      │  │   Sync API      │         │
│   │                 │  │                 │  │                 │         │
│   │ POST /register  │  │ POST /register  │  │ POST /push      │         │
│   │ POST /login     │  │ GET /fetch      │  │ GET /pull       │         │
│   │                 │  │ POST /rotate    │  │ GET /status     │         │
│   └────────┬────────┘  └────────┬────────┘  └────────┬────────┘         │
│            │                    │                    │                   │
│            └────────────────────┼────────────────────┘                   │
│                                 │                                        │
│                                 ▼                                        │
│                    ┌────────────────────────┐                            │
│                    │      PostgreSQL        │                            │
│                    │                        │                            │
│                    │  - sync_accounts       │                            │
│                    │  - wrapped_keys        │                            │
│                    │  - sync_devices        │                            │
│                    │  - sync_data           │                            │
│                    │  - recovery_hashes     │                            │
│                    └────────────────────────┘                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Security Model

### Zero-Knowledge Architecture

1. **Server never sees plaintext**: All data is encrypted client-side before upload
2. **Server never sees keys**: Only wrapped (encrypted) keys are stored
3. **Passphrase never transmitted**: Used only for local key derivation
4. **Recovery without backdoors**: BIP39 mnemonic recovery keys

### Cryptographic Primitives

| Component | Algorithm | Notes |
|-----------|-----------|-------|
| Encryption | AES-256-GCM | AEAD, authenticated encryption |
| Key Derivation | Argon2id | Memory-hard, GPU-resistant |
| Fallback KDF | PBKDF2-SHA256 | 600,000 iterations (browser compat) |
| Recovery Key | BIP39 (24 words) | 256-bit entropy |
| Checksums | HMAC-SHA256 | Integrity verification |

### Key Hierarchy

```
User Passphrase
       │
       ▼ Argon2id (salt, timeCost=3, memoryCost=64MB)
       │
   Master Key (256-bit AES)
       │
       ├──► Wraps Device Encryption Key (DEK)
       │         │
       │         └──► Encrypts all user data
       │
       └──► Derives Recovery Key verification hash
```

## Client-Side Implementation (Complete)

The following modules are already implemented in `lib/crypto/`:

### `masterKey.ts` - Passphrase-Based Key Derivation

```typescript
import { deriveMasterKey, createWrappedDEKBundle, restoreDEKFromBundle } from '@/lib/crypto/masterKey'

// First device - create wrapped bundle
const bundle = await createWrappedDEKBundle(deviceKey, 'user-passphrase')
// Upload bundle to server

// Other device - restore DEK from bundle
const deviceKey = await restoreDEKFromBundle(bundle, 'user-passphrase')
```

### `recoveryKey.ts` - BIP39 Recovery Keys

```typescript
import { generateRecoveryKey, validateMnemonic, verifyRecoveryKey } from '@/lib/crypto/recoveryKey'

// Generate recovery key (show to user, store hash on server)
const { mnemonic } = await generateRecoveryKey()
// "abandon ability able about above absent absorb abstract..."

// Validate user input
const isValid = await validateMnemonic(userInput)

// Verify against stored hash
const matches = await verifyRecoveryKey(mnemonic, storedHash)
```

### `keyExport.ts` - Key Backup/Transfer

```typescript
import { exportDeviceKey, importDeviceKey, downloadBundle } from '@/lib/crypto/keyExport'

// Export key to file
const bundle = await exportDeviceKey({ 
  password: 'export-password',
  deviceName: 'MacBook Pro',
  expiresInHours: 24 
})
downloadBundle(bundle, 'my-backup.quarry-key')

// Import on another device
const result = await importDeviceKey(bundle, 'export-password')
if (result.success) {
  // Store result.key as device key
}
```

## Server-Side Requirements (Future)

### Database Schema

```sql
-- User accounts
CREATE TABLE sync_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wrapped encryption keys (one per account)
CREATE TABLE wrapped_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sync_accounts(id) ON DELETE CASCADE,
  wrapped_dek TEXT NOT NULL,
  salt TEXT NOT NULL,
  argon2_params JSONB NOT NULL,
  dek_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id)
);

-- Registered devices
CREATE TABLE sync_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sync_accounts(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  device_name TEXT,
  user_agent TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  revoked BOOLEAN DEFAULT FALSE,
  revoked_at TIMESTAMPTZ,
  UNIQUE(account_id, device_id)
);

-- Encrypted data blobs
CREATE TABLE sync_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES sync_accounts(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  encrypted_data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(account_id, resource_type, resource_id)
);

-- Recovery key hashes (zero-knowledge)
CREATE TABLE recovery_hashes (
  account_id UUID PRIMARY KEY REFERENCES sync_accounts(id) ON DELETE CASCADE,
  recovery_key_hash TEXT NOT NULL,
  security_question TEXT,
  security_answer_hash TEXT,
  security_answer_salt TEXT,
  encrypted_hint TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sync log for conflict resolution
CREATE TABLE sync_log (
  id BIGSERIAL PRIMARY KEY,
  account_id UUID REFERENCES sync_accounts(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sync_data_account ON sync_data(account_id);
CREATE INDEX idx_sync_data_updated ON sync_data(account_id, updated_at);
CREATE INDEX idx_sync_devices_account ON sync_devices(account_id);
CREATE INDEX idx_sync_log_account ON sync_log(account_id, timestamp);
```

### API Endpoints

#### Authentication

```
POST /api/auth/register
  Request: { email, passwordHash }
  Response: { accountId, token }

POST /api/auth/login
  Request: { email, passwordHash }
  Response: { accountId, token }

POST /api/auth/verify-email
  Request: { token }
  Response: { success }
```

#### Key Management

```
POST /api/keys/register
  Headers: Authorization: Bearer <token>
  Request: { wrappedDek, salt, argon2Params, deviceId, deviceName }
  Response: { success, dekVersion }

GET /api/keys/fetch
  Headers: Authorization: Bearer <token>
  Response: { wrappedDek, salt, argon2Params, dekVersion }

POST /api/keys/rotate
  Headers: Authorization: Bearer <token>
  Request: { newWrappedDek, newSalt, newArgon2Params }
  Response: { success, newDekVersion }
```

#### Device Management

```
GET /api/devices
  Headers: Authorization: Bearer <token>
  Response: { devices: [{ deviceId, deviceName, lastActiveAt, revoked }] }

POST /api/devices/:deviceId/revoke
  Headers: Authorization: Bearer <token>
  Response: { success }

DELETE /api/devices/:deviceId
  Headers: Authorization: Bearer <token>
  Response: { success }
```

#### Data Sync

```
POST /api/sync/push
  Headers: Authorization: Bearer <token>
  Request: { 
    deviceId,
    operations: [{ 
      type: 'create' | 'update' | 'delete',
      resourceType: string,
      resourceId: string,
      encryptedData: EncryptedEnvelope,
      timestamp: number
    }]
  }
  Response: { success, synced: number, conflicts: [] }

GET /api/sync/pull
  Headers: Authorization: Bearer <token>
  Query: { since: timestamp, resourceTypes?: string[] }
  Response: { 
    data: [{ resourceType, resourceId, encryptedData, updatedAt }],
    cursor: timestamp
  }

GET /api/sync/status
  Headers: Authorization: Bearer <token>
  Response: { 
    lastSyncAt: timestamp,
    pendingCount: number,
    deviceCount: number
  }
```

#### Recovery

```
POST /api/recovery/setup
  Headers: Authorization: Bearer <token>
  Request: { 
    recoveryKeyHash,
    securityQuestion?,
    securityAnswerHash?,
    securityAnswerSalt?,
    encryptedHint?
  }
  Response: { success }

POST /api/recovery/verify
  Request: { email, recoveryKeyHash }
  Response: { success, tempToken? }

POST /api/recovery/reset
  Headers: Authorization: Bearer <tempToken>
  Request: { newWrappedDek, newSalt, newArgon2Params }
  Response: { success, token }

GET /api/recovery/question
  Query: { email }
  Response: { question } (rate-limited)

POST /api/recovery/answer
  Request: { email, answerHash }
  Response: { encryptedHint } (if correct)
```

### Recommended Tech Stack

#### Option 1: Supabase (Recommended for MVP)
- **Pros**: PostgreSQL, built-in auth, realtime subscriptions, edge functions
- **Cons**: Vendor lock-in, pricing at scale
- **Repo**: Single repo with Supabase migrations and edge functions

#### Option 2: Self-Hosted (Railway/Render)
- **Pros**: Full control, standard PostgreSQL, no vendor lock-in
- **Cons**: More setup, manage your own auth
- **Stack**: Fastify + PostgreSQL + Redis (for sessions)

#### Option 3: Edge-First (Cloudflare)
- **Pros**: Global edge, D1 database, zero cold starts
- **Cons**: D1 is SQLite-based (some SQL differences)
- **Stack**: Workers + D1 + KV (for sessions)

## Sync Flow

### Initial Setup (First Device)

```
1. User creates account (email + password)
2. User sets sync passphrase (can be same as account password)
3. Client derives master key from passphrase (Argon2id)
4. Client wraps existing DEK with master key
5. Client uploads wrapped DEK + salt to server
6. Client generates recovery key, shows to user
7. Client uploads recovery key hash to server
8. Sync is now enabled
```

### Adding a New Device

```
1. User logs in on new device
2. Client fetches wrapped DEK + salt from server
3. User enters sync passphrase
4. Client derives master key from passphrase
5. Client unwraps DEK
6. Client stores DEK locally
7. Client registers device with server
8. Client pulls all encrypted data
9. Client decrypts and merges with local data
```

### Ongoing Sync

```
1. User makes change on Device A
2. Client encrypts change with DEK
3. Client queues encrypted operation
4. Client pushes to server (batch or realtime)
5. Server stores encrypted blob
6. Device B pulls changes (polling or websocket)
7. Device B decrypts and applies changes
```

### Account Recovery

```
Option A: Recovery Key
1. User enters 24-word recovery key
2. Client hashes and sends to server for verification
3. Server returns temp token if hash matches
4. User sets new passphrase
5. Client derives new master key
6. Client re-wraps DEK with new master key
7. Client uploads new wrapped DEK

Option B: Security Question
1. User requests security question for email
2. Server returns question (rate-limited)
3. User submits answer hash
4. Server returns encrypted hint if correct
5. User remembers passphrase from hint
6. Normal login flow
```

## Conflict Resolution

### Last-Write-Wins (Simple)

```typescript
// Server-side merge
if (incoming.timestamp > existing.timestamp) {
  // Accept incoming
  await updateRecord(incoming)
} else {
  // Reject, return existing
  return { conflict: true, existing }
}
```

### Operational Transform (Advanced)

For rich text / collaborative editing, consider:
- Yjs (CRDT-based)
- Automerge
- Custom OT implementation

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 5 req/min per IP |
| `/recovery/question` | 3 req/hour per email |
| `/recovery/answer` | 5 attempts, then 1 hour lockout |
| `/sync/push` | 100 operations/min per account |
| `/sync/pull` | 60 req/min per account |

## Future Enhancements

1. **Realtime Sync**: WebSocket/SSE for instant updates
2. **Selective Sync**: Choose which data types to sync
3. **Shared Vaults**: Collaborate with other users (key sharing)
4. **Offline Queue**: Robust offline-first sync queue
5. **Versioning**: Full version history for all data
6. **Attachments**: Large file sync with S3/R2

## Related Files

- `lib/crypto/masterKey.ts` - Master key derivation
- `lib/crypto/recoveryKey.ts` - Recovery key generation
- `lib/crypto/keyExport.ts` - Key export/import
- `lib/crypto/deviceKey.ts` - Device key management
- `lib/crypto/aesGcm.ts` - Core encryption
- `lib/crypto/syncMode.ts` - Sync mode manager (stubs)



