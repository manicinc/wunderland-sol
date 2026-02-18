# Sync API Compatibility Guide

This document defines the API contract required for custom sync server implementations to work with Quarry. If you're building your own sync backend, implement these endpoints and protocols.

## Overview

Quarry uses a zero-knowledge sync protocol where:
- All user data is encrypted client-side (AES-256-GCM)
- The server never sees plaintext content
- Vector clocks track causality for conflict detection
- Real-time sync uses WebSocket with message-based protocol

## Required Endpoints

### Authentication

#### POST /api/v1/auth/login

Authenticate a device and receive JWT tokens.

**Request:**
```json
{
  "email": "user@example.com",
  "deviceId": "unique-device-id",
  "deviceName": "MacBook Pro",
  "deviceType": "desktop"
}
```

**Response:**
```json
{
  "account": {
    "id": "account-uuid",
    "email": "user@example.com",
    "tier": "free",
    "deviceLimit": 3,
    "createdAt": "2024-01-15T10:00:00Z",
    "lastSyncAt": "2024-01-15T09:30:00Z"
  },
  "tokens": {
    "token": "jwt-access-token",
    "expiresAt": "2024-01-15T11:00:00Z",
    "refreshToken": "jwt-refresh-token"
  }
}
```

#### POST /api/v1/auth/refresh

Refresh an expired access token.

**Request:**
```json
{
  "refreshToken": "jwt-refresh-token"
}
```

**Response:** Same `tokens` object as login.

### Sync Operations

All sync endpoints require `Authorization: Bearer <token>` header.

#### POST /api/v1/sync/push

Push encrypted changes to the server.

**Request:**
```json
{
  "operations": [
    {
      "resourceType": "strand",
      "resourceId": "resource-uuid",
      "encryptedData": "base64-encoded-ciphertext",
      "vectorClock": { "device-1": 5, "device-2": 3 },
      "isDeleted": false
    }
  ]
}
```

**Response:**
```json
{
  "synced": 1,
  "conflicts": [
    {
      "resourceType": "strand",
      "resourceId": "resource-uuid",
      "localClock": { "device-1": 5 },
      "remoteClock": { "device-2": 6 },
      "conflictId": "conflict-uuid"
    }
  ],
  "serverTimestamp": "2024-01-15T10:00:00Z"
}
```

#### POST /api/v1/sync/pull

Pull changes since a cursor.

**Request:**
```json
{
  "since": "2024-01-01T00:00:00Z",
  "resourceTypes": ["strand", "message"],
  "limit": 100
}
```

**Response:**
```json
{
  "changes": [
    {
      "resourceType": "strand",
      "resourceId": "resource-uuid",
      "encryptedData": "base64-ciphertext",
      "vectorClock": { "device-1": 5 },
      "isDeleted": false,
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "cursor": "2024-01-15T10:00:00Z",
  "hasMore": false
}
```

#### GET /api/v1/sync/status

Get account sync status.

**Response:**
```json
{
  "accountId": "account-uuid",
  "deviceCount": 2,
  "deviceLimit": 3,
  "lastSyncAt": "2024-01-15T10:00:00Z",
  "pendingConflicts": 0,
  "tier": "free"
}
```

### Health Check

#### GET /health

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:00:00Z",
  "version": "1.0.0"
}
```

## WebSocket Protocol

Connect to `/api/v1/sync` for real-time synchronization.

### Connection URL

```
wss://your-server.com/api/v1/sync
```

### Message Format

All messages are JSON with this structure:

```typescript
interface SyncMessage {
  type: 'auth' | 'push' | 'pull' | 'ack' | 'changes' | 'error' | 'ping' | 'pong'
  payload?: unknown
  requestId?: string  // For request/response correlation
}
```

### Authentication

Send immediately after connection:

```json
{
  "type": "auth",
  "payload": {
    "token": "jwt-access-token"
  },
  "requestId": "auth-1"
}
```

Success response:
```json
{
  "type": "ack",
  "payload": {
    "success": true,
    "accountId": "account-uuid",
    "deviceId": "device-uuid"
  },
  "requestId": "auth-1"
}
```

### Push Changes

```json
{
  "type": "push",
  "payload": {
    "operations": [...]
  },
  "requestId": "push-1"
}
```

Response:
```json
{
  "type": "ack",
  "payload": {
    "synced": 1,
    "conflicts": [],
    "serverTimestamp": "2024-01-15T10:00:00Z"
  },
  "requestId": "push-1"
}
```

### Pull Changes

```json
{
  "type": "pull",
  "payload": {
    "since": "2024-01-01T00:00:00Z"
  },
  "requestId": "pull-1"
}
```

Response:
```json
{
  "type": "changes",
  "payload": {
    "changes": [...],
    "cursor": "2024-01-15T10:00:00Z",
    "hasMore": false
  },
  "requestId": "pull-1"
}
```

### Real-time Broadcast

When another device pushes changes, connected clients receive:

```json
{
  "type": "changes",
  "payload": {
    "changes": [...],
    "broadcast": true
  }
}
```

### Keepalive

Client sends:
```json
{ "type": "ping" }
```

Server responds:
```json
{ "type": "pong" }
```

## Vector Clocks

Vector clocks are used for causality tracking and conflict detection.

### Format

```json
{
  "device-uuid-1": 5,
  "device-uuid-2": 3
}
```

Each key is a device ID, each value is a monotonically increasing counter.

### Comparison

When comparing clocks A and B:

| Result | Meaning |
|--------|---------|
| `before` | A happened-before B (A < B) |
| `after` | A happened-after B (A > B) |
| `equal` | Clocks are identical |
| `concurrent` | Neither happened-before the other (conflict!) |

### Implementation

```typescript
function compareClocks(
  a: Record<string, number>,
  b: Record<string, number>
): 'before' | 'after' | 'equal' | 'concurrent' {
  let aBeforeB = false
  let bBeforeA = false

  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)])

  for (const key of allKeys) {
    const aVal = a[key] ?? 0
    const bVal = b[key] ?? 0

    if (aVal < bVal) aBeforeB = true
    if (aVal > bVal) bBeforeA = true
  }

  if (aBeforeB && !bBeforeA) return 'before'
  if (bBeforeA && !aBeforeB) return 'after'
  if (!aBeforeB && !bBeforeA) return 'equal'
  return 'concurrent'
}
```

## Encryption

### Client-Side Encryption

All `encryptedData` fields contain AES-256-GCM encrypted content:

```
[12-byte IV][ciphertext][16-byte auth tag]
```

Base64-encoded for transmission.

### Key Management

- Master key is derived from user passphrase (PBKDF2, 100k iterations)
- Master key is wrapped and stored server-side for recovery
- Server NEVER has access to unwrapped keys

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

### Required Error Codes

| Code | HTTP Status | When |
|------|-------------|------|
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `TOKEN_EXPIRED` | 401 | Token expired |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `DEVICE_LIMIT_EXCEEDED` | 403 | Too many devices |
| `CONFLICT` | 409 | Sync conflict |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Rate Limiting

Recommended limits:

| Endpoint | Limit |
|----------|-------|
| Auth endpoints | 10/minute |
| Push/Pull | 100/minute |
| WebSocket messages | 1000/minute |

## Testing Compatibility

Run these tests against your implementation:

```bash
# Health check
curl https://your-server.com/health

# Should return { "status": "healthy", ... }

# Login
curl -X POST https://your-server.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","deviceId":"test-1","deviceName":"Test","deviceType":"desktop"}'

# Should return tokens

# Push (with token)
curl -X POST https://your-server.com/api/v1/sync/push \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"operations":[]}'

# Should return { "synced": 0, "conflicts": [], ... }
```

## Reference Implementation

See the official quarry-sync repository for a complete reference:

- [GitHub: framersai/quarry-sync](https://github.com/framersai/quarry-sync)
- [Self-Hosting Guide](https://github.com/framersai/quarry-sync/blob/main/docs/SELF_HOSTING.md)
- [API Reference](https://github.com/framersai/quarry-sync/blob/main/docs/API_REFERENCE.md)
