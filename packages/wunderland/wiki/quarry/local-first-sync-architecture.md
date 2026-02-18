# Local-First Sync & Zero-Knowledge Architecture

A comprehensive guide to local-first software, end-to-end encryption, and zero-knowledge architecture—how they evolved, how they work, and how Quarry implements them.

---

## Table of Contents

1. [History & Evolution](#history--evolution)
2. [Sync Algorithms Deep-Dive](#sync-algorithms-deep-dive)
3. [E2E Encryption & Zero-Knowledge](#e2e-encryption--zero-knowledge)
4. [How Quarry Implements These Patterns](#how-quarry-implements-these-patterns)
5. [Industry Comparison](#industry-comparison)
6. [References](#references)

---

## History & Evolution

### The Problem: Cloud-First Limitations

Traditional cloud-first applications store data on remote servers. Users must:

- Wait for network requests (spinners, latency)
- Rely on server availability (outages = unusable app)
- Trust the provider with their data (privacy concerns)
- Accept vendor lock-in (data trapped in proprietary formats)

### Timeline of Innovation

#### 1989: Operational Transform (OT)

The Grove system introduced **Operational Transform**, the first algorithm for real-time collaborative editing. OT transforms concurrent operations to maintain consistency across clients.

> "Unfortunately, implementing OT sucks. There's a million algorithms with different tradeoffs, mostly trapped in academic papers... Wave took 2 years to write." — Joseph Gentle, former Google Wave engineer

#### 2011: CRDTs Emerge

**Conflict-free Replicated Data Types** emerged from academic research, originally called WOOT (WithOut Operational Transformation). Unlike OT, CRDTs don't require a central server—they guarantee that any two replicas that have seen the same set of updates will converge to the same state.

#### 2016: Standard Notes Launches

Standard Notes pioneered **zero-knowledge encryption** for note-taking, proving that mainstream apps could offer E2E encryption without sacrificing usability.

#### 2019: The Local-First Manifesto

Ink & Switch published "[Local-First Software: You Own Your Data, in Spite of the Cloud](https://www.inkandswitch.com/essay/local-first/)" by Martin Kleppmann, Adam Wiggins, Peter van Hardenberg, and Mark McGranaghan. This paper defined **seven ideals** for local-first software:

1. **No Spinners**: Reads and writes happen instantly against local storage
2. **Your Work is Not Trapped**: Data exportable as files
3. **The Network is Optional**: Full functionality offline
4. **Seamless Collaboration**: Google Docs-style real-time editing
5. **The Long Now**: Data survives even if the software dies
6. **Security & Privacy by Default**: E2E encryption
7. **User Retains Ownership**: No vendor lock-in

#### 2024-2025: Mainstream Adoption

Apps like Linear, Figma, and Notion demonstrated that local-first architecture creates a "premium" user experience with 0ms latency and seamless collaboration. Developer interest exploded—local-first in 2024 is comparable to React in 2013.

> "At Local-First Conf 2024, Kleppmann noted benefits including: no backend engineering team needed, no 24/7 on-call rotations, no more writing network error handling code, and overall much simpler app development."

---

## Sync Algorithms Deep-Dive

### The Core Challenge

When multiple devices edit the same data concurrently, conflicts arise. Three main approaches exist:

### 1. Operational Transform (OT)

**How it works:**

- Operations (insert, delete) are transformed relative to concurrent operations
- A central server serializes operations to establish ordering
- Each client applies transformations to maintain consistency

**Characteristics:**

- ✅ Preserves user intent (semantic understanding of operations)
- ✅ Used by Google Docs, Microsoft Office Online, CKSource
- ❌ Requires central server coordination
- ❌ Complex implementation—quadratically many edge cases
- ❌ No offline-first support (needs server)

```
Client A: insert("X", pos=5)
Client B: delete(pos=3)

Server transforms A's operation:
→ insert("X", pos=4)  // Adjusted because B deleted before position 5
```

### 2. Conflict-free Replicated Data Types (CRDTs)

**How it works:**

- Data structures designed to be commutative—operations can be applied in any order
- Each element has a unique ID (often timestamp + device ID)
- Merging is deterministic: same updates → same final state

**Characteristics:**

- ✅ No central server required (peer-to-peer capable)
- ✅ Works offline, syncs when online
- ✅ Supports E2E encryption (server is just a relay)
- ✅ Strong eventual consistency guarantee
- ❌ Can produce unexpected results (intent not always preserved)
- ❌ Complex academic foundations

**Popular Libraries:**

- **Yjs**: Fast, modular, supports rich text editors (Quill, ProseMirror, Monaco)
- **Automerge**: JSON-like document model, automatic conflict resolution

```typescript
// Yjs example
import * as Y from 'yjs';

const doc = new Y.Doc();
const text = doc.getText('content');

text.insert(0, 'Hello'); // Works offline
// Syncs automatically when connection established
```

### 3. Vector Clocks

**How it works:**

- Each device maintains a counter for every known device
- When a device makes a change, it increments its own counter
- Comparing vector clocks reveals causality: happened-before, happened-after, or concurrent

**Characteristics:**

- ✅ Tracks causality without central authority
- ✅ Detects conflicts precisely
- ❌ Doesn't resolve conflicts—just detects them
- ❌ Requires separate conflict resolution strategy

```typescript
// Vector clock comparison
const clockA = { device1: 5, device2: 3 };
const clockB = { device1: 4, device2: 4 };

// Result: CONCURRENT (neither happened-before the other)
// A has higher device1, B has higher device2
```

**This is what Quarry uses** in `sql-storage-adapter`.

### Comparison Table

| Aspect              | OT          | CRDTs         | Vector Clocks       |
| ------------------- | ----------- | ------------- | ------------------- |
| Central server      | Required    | Optional      | Optional            |
| Offline support     | ❌          | ✅            | ✅                  |
| E2E encryption      | Difficult   | Native        | Native              |
| Intent preservation | ✅          | Partial       | N/A (just ordering) |
| Complexity          | High        | High          | Moderate            |
| Used by             | Google Docs | Figma, Linear | Quarry, Cassandra   |

---

## E2E Encryption & Zero-Knowledge

### What is Zero-Knowledge Architecture?

In a zero-knowledge system, the server **cannot read user data**—even if compelled by law enforcement or compromised by hackers. The server only stores ciphertext that requires the user's key to decrypt.

```
Traditional:
User → [plaintext] → Server stores → [plaintext readable by anyone with DB access]

Zero-Knowledge:
User → [encrypt locally] → [ciphertext] → Server stores → [unreadable without user's key]
```

### Encryption Algorithms Used in Note-Taking

| App                | Algorithm          | Key Derivation | Zero-Knowledge |
| ------------------ | ------------------ | -------------- | -------------- |
| **Standard Notes** | ChaCha20-Poly1305  | Argon2         | ✅             |
| **Notesnook**      | XChaCha20-Poly1305 | Argon2         | ✅             |
| **Obsidian Sync**  | AES-256-GCM        | PBKDF2         | ✅ (optional)  |
| **Joplin**         | AES-256            | N/A            | ✅ (optional)  |
| **Notion**         | None (TLS only)    | N/A            | ❌             |
| **Evernote**       | None (TLS only)    | N/A            | ❌             |
| **Quarry**         | AES-256-GCM        | PBKDF2/Argon2  | ✅             |

### Key Management Patterns

#### 1. Device-Bound Keys (Local-Only)

- Key generated on device, never leaves
- No passphrase needed for local use
- Data inaccessible if device lost (unless backed up)

```typescript
// Generate device key
const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
  'encrypt',
  'decrypt',
]);
// Store in IndexedDB, wrapped by device fingerprint
```

#### 2. Master Key Derivation (Cloud Sync)

- User provides passphrase
- Key derived using slow function (PBKDF2, Argon2)
- Same passphrase → same key on any device

```typescript
// Derive key from passphrase
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.deriveKey(
  {
    name: 'PBKDF2',
    salt,
    iterations: 100000,
    hash: 'SHA-256',
  },
  passphraseKey,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);
```

#### 3. Recovery Keys (BIP39 Mnemonic)

- 24-word phrase for account recovery
- Can reconstruct master key if passphrase forgotten
- Must be stored securely offline

```
abandon ability able about above absent absorb abstract absurd abuse
access accident account accuse achieve acid acoustic acquire across act
action actor actress actual adapt add
```

### Encryption Flow

```
Write Path:
1. User types content
2. Serialize to JSON
3. Generate random 96-bit IV
4. Encrypt with AES-256-GCM
5. Store: { ciphertext, iv, authTag }

Read Path:
1. Fetch encrypted envelope
2. Decrypt with stored key + IV
3. Verify authTag (integrity)
4. Deserialize JSON
5. Display to user
```

---

## How Quarry Implements These Patterns

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   UI Layer   │  │  Encryption  │  │   Sync Queue     │  │
│  │  (React/TUI) │  │  (AES-GCM)   │  │  (IndexedDB)     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│  ┌──────▼─────────────────▼────────────────────▼─────────┐ │
│  │                  SQLiteStore                           │ │
│  │  (IndexedDB + Vault Files + Sync Metadata)            │ │
│  └────────────────────────┬──────────────────────────────┘ │
└───────────────────────────┼─────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   Transport   │
                    │  (WS / HTTP)  │
                    └───────┬───────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                         Server                              │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Sync Service   │  │    PostgreSQL   │                  │
│  │  (Vector Clock) │  │   (encrypted    │                  │
│  │                 │  │    blobs only)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### Local Storage Layer

**File:** `apps/frame.dev/lib/content/sqliteStore.ts`

Quarry uses a **hybrid storage model**:

1. **IndexedDB** (via sql-storage-adapter): Stores metadata, sync status, search indices
2. **Vault Files**: Primary content storage as Markdown files on disk
3. **Automatic Sync**: Content read from vault on load, written on save

```typescript
// Schema (simplified)
interface StrandRecord {
  id: string;
  weaveId: string;
  loomId?: string;
  path: string;
  content: string; // Backup copy
  contentHash: string; // Change detection
  frontmatter: JSON; // YAML metadata
  status: 'draft' | 'published' | 'archived';
  tags: string[];
}

// Path mapping
// wiki/getting-started/welcome
// → weaves/wiki/looms/getting-started/strands/welcome.md
```

### Encryption Implementation

**Directory:** `apps/frame.dev/lib/crypto/`

#### AES-256-GCM Configuration

```typescript
// lib/crypto/aesGcm.ts
const SALT_LENGTH = 16; // 128 bits for PBKDF2
const IV_LENGTH = 12; // 96 bits for GCM (recommended)
const KEY_LENGTH = 256; // AES-256
const ITERATIONS = 100000; // PBKDF2 iterations

async function encryptWithKey(
  data: unknown,
  key: CryptoKey
): Promise<{ ciphertext: Uint8Array; iv: Uint8Array }> {
  const ivArray = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const jsonData = new TextEncoder().encode(JSON.stringify(data));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivArray }, key, jsonData);

  return { ciphertext: new Uint8Array(encrypted), iv: ivArray };
}
```

#### Device Key Management

```typescript
// lib/crypto/deviceKey.ts
// Device key lifecycle:
// 1. Check IndexedDB for existing key
// 2. If not found, generate new 256-bit key
// 3. Wrap key with device fingerprint
// 4. Store wrapped key in IndexedDB
// 5. Use for all data encryption

async function getOrCreateDeviceKey(): Promise<CryptoKey> {
  const existing = await storage.get('device-key');
  if (existing) return unwrapKey(existing);

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);

  await storage.set('device-key', await wrapKey(key));
  return key;
}
```

#### Transparent Encryption

```typescript
// lib/crypto/encryptedStorage.ts
// Drop-in replacement for storage with automatic encryption

const storage = new EncryptedStorage({
  namespace: 'quarry-encrypted',
  plaintextKeys: ['_*', 'sync:*', 'migration:*'], // Not encrypted
  throwOnError: false,
});

// Usage - encryption is transparent
await storage.set('secret', { password: '123' }); // Auto-encrypts
const data = await storage.get('secret'); // Auto-decrypts
```

### Sync Protocol

**Directory:** `packages/sql-storage-adapter/src/features/sync/`

#### Vector Clock Implementation

```typescript
// sync/protocol/vectorClock.ts
interface VectorClock {
  [deviceId: string]: number;
}

function tick(clock: VectorClock, deviceId: string): VectorClock {
  return { ...clock, [deviceId]: (clock[deviceId] || 0) + 1 };
}

function merge(a: VectorClock, b: VectorClock): VectorClock {
  const result = { ...a };
  for (const [device, count] of Object.entries(b)) {
    result[device] = Math.max(result[device] || 0, count);
  }
  return result;
}

function compare(a: VectorClock, b: VectorClock): 'before' | 'after' | 'concurrent' {
  let aGreater = false,
    bGreater = false;

  for (const device of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const aVal = a[device] || 0;
    const bVal = b[device] || 0;
    if (aVal > bVal) aGreater = true;
    if (bVal > aVal) bGreater = true;
  }

  if (aGreater && !bGreater) return 'after';
  if (bGreater && !aGreater) return 'before';
  return 'concurrent';
}
```

#### Transport Layer

```typescript
// sync/transport/websocketTransport.ts
// Real-time bidirectional sync

class WebSocketTransport {
  // Features:
  // - Automatic reconnection with exponential backoff
  // - Request/response correlation with message IDs
  // - Heartbeat keep-alive (ping/pong)
  // - Message compression support
  // - Per-message acknowledgement
}

// sync/transport/httpTransport.ts
// Fallback for firewalls/proxies blocking WebSocket

class HttpTransport {
  // Features:
  // - Long-polling or regular polling modes
  // - Request batching
  // - Works through corporate proxies
}
```

#### Conflict Resolution

```typescript
// sync/conflicts/conflictResolver.ts
type ConflictStrategy =
  | 'last-write-wins' // Most recent timestamp wins
  | 'local-wins' // Always prefer local changes
  | 'remote-wins' // Always prefer remote changes
  | 'merge' // Field-level merge
  | 'manual'; // Defer to UI

// Built-in field mergers
const fieldMergers = {
  lastWriteWins: (local, remote, localTime, remoteTime) =>
    localTime > remoteTime ? local : remote,
  max: (a, b) => Math.max(a, b),
  sum: (a, b) => a + b,
  union: (a, b) => [...new Set([...a, ...b])],
  concat: (a, b, sep = '\n') => `${a}${sep}${b}`,
};
```

### Sync Flow (Complete Example)

```
OFFLINE PHASE:
═══════════════════════════════════════════════════════

1. User edits strand
   → dualSyncManager.syncStrand(path, 'update')
   → Encrypt content with device key
   → Queue operation in IndexedDB
   → Update local SQLiteStore

2. Queue stores operation
   {
     id: 'sync-1704067200-xyz',
     type: 'update',
     resourceType: 'strand',
     payload: { encrypted content },
     priority: 'high',
     status: 'pending'
   }


ONLINE PHASE:
═══════════════════════════════════════════════════════

3. Network detected
   → processPendingSync()
   → Get pending operations sorted by priority

4. Push changes
   → WebSocket.send(DeltaPush)
   → Server stores encrypted blob
   → Server updates vector clock

5. Pull remote changes
   → WebSocket.send(DeltaPullRequest)
   → Receive changes since last known clock
   → Decrypt with device key

6. Conflict resolution (if needed)
   → Compare vector clocks
   → If concurrent: apply resolution strategy
   → Merge or prompt user

7. Apply and commit
   → Update local SQLiteStore
   → Update vault files
   → Mark operation completed
   → Increment vector clock
```

### Cross-Platform Support

```typescript
// sync/crossPlatformSync.ts
// Supports: Electron, Capacitor, Browser, Server

const sync = new CrossPlatformSync({
  mode: 'auto', // manual | auto | periodic | realtime | on-reconnect
  direction: 'bidirectional', // push-only | pull-only
  conflictStrategy: 'merge',
  batchSize: 100,
  mobileStorageLimit: 50 * 1024 * 1024, // 50MB for mobile

  tables: {
    strands: { priority: 'critical', conflictStrategy: 'merge' },
    drafts: { priority: 'high', conflictStrategy: 'local-wins' },
    settings: { priority: 'low', conflictStrategy: 'last-write-wins' },
  },

  onConflictDetected: async (conflict) => {
    // Can prompt UI for manual resolution
  },
});
```

---

## Industry Comparison

| Feature                 | Quarry              | Standard Notes | Obsidian | Notion      | Linear      |
| ----------------------- | ------------------- | -------------- | -------- | ----------- | ----------- |
| **Local-first**         | ✅                  | ✅             | ✅       | ❌          | ✅          |
| **E2E Encryption**      | ✅ AES-256-GCM      | ✅ ChaCha20    | Optional | ❌          | ❌          |
| **Zero-knowledge**      | ✅                  | ✅             | Partial  | ❌          | ❌          |
| **Offline support**     | ✅ Full             | ✅ Full        | ✅ Full  | Limited     | ✅ Full     |
| **Real-time sync**      | ✅ WebSocket        | ✅             | ✅       | ✅          | ✅          |
| **Sync algorithm**      | Vector Clocks       | LWW            | LWW      | Server      | Custom CRDT |
| **Conflict resolution** | Multiple strategies | LWW            | LWW      | Server wins | Auto-merge  |
| **Open source**         | ✅                  | ✅             | ❌       | ❌          | ❌          |
| **Data export**         | ✅ Markdown         | ✅             | ✅       | Limited     | Limited     |
| **Self-hostable**       | ✅                  | ✅             | N/A      | ❌          | ❌          |

### Why These Choices?

**AES-256-GCM over ChaCha20:**

- Native Web Crypto API support (no extra libraries)
- Hardware acceleration on most devices
- Widely audited and trusted

**Vector Clocks over CRDTs:**

- Simpler to implement correctly
- Works well for document-centric apps (vs. real-time text)
- Easier to reason about conflicts
- Flexible resolution strategies (not one-size-fits-all)

**Hybrid Storage (SQLite + Vault):**

- SQL for fast queries and indexing
- Files for human-readable backups
- Survives app uninstall (vault is external)
- Git-compatible for versioning

---

## References

### Foundational Papers

- [Local-First Software: You Own Your Data, in Spite of the Cloud](https://www.inkandswitch.com/essay/local-first/) - Ink & Switch (2019)
- [Conflict-free Replicated Data Types](https://crdt.tech/) - CRDT Research
- [A comprehensive study of Convergent and Commutative Replicated Data Types](https://hal.inria.fr/inria-00555588/document) - Shapiro et al. (2011)

### Libraries & Tools

- [Yjs](https://yjs.dev/) - CRDT framework
- [Automerge](https://automerge.org/) - JSON-like CRDT
- [Replicache](https://replicache.dev/) - Commercial sync framework
- [ElectricSQL](https://electric-sql.com/) - Postgres-to-SQLite sync
- [PowerSync](https://www.powersync.com/) - Postgres sync for mobile

### Industry Examples

- [How Figma's multiplayer technology works](https://www.figma.com/blog/how-figmas-multiplayer-technology-works/)
- [Linear's offline-first architecture](https://linear.app/blog/offline-first)
- [Standard Notes security whitepaper](https://standardnotes.com/security)

### Quarry Implementation Files

- `apps/frame.dev/lib/content/sqliteStore.ts` - Local storage
- `apps/frame.dev/lib/crypto/` - Encryption implementation
- `apps/frame.dev/lib/sync/` - Sync queue and routing
- `packages/sql-storage-adapter/src/features/sync/` - Core sync protocol
