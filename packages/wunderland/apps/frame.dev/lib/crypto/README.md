# E2EE Crypto Module

End-to-End Encryption for Frame. All data encrypted locally with zero friction.

## Quick Start

```typescript
import { encrypt, decrypt, isReady } from '@/lib/crypto'

// Check availability and encrypt
if (await isReady()) {
  const result = await encrypt({ secret: 'data' })
  if (result.success) {
    // Store result.envelope
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Your Application                         │
├─────────────────────────────────────────────────────────────┤
│  encrypt(data) / decrypt(envelope)  │  useEncryptedStorage  │
├─────────────────────────────────────────────────────────────┤
│                    Envelope Layer                            │
│         (JSON serialization + metadata wrapper)              │
├─────────────────────────────────────────────────────────────┤
│                   AES-256-GCM Layer                          │
│              (Web Crypto API encryption)                     │
├─────────────────────────────────────────────────────────────┤
│                   Device Key Layer                           │
│    (Auto-generated, stored in IndexedDB, cached in memory)   │
└─────────────────────────────────────────────────────────────┘
```

## Two Modes

### Local Mode (Default)
- Auto-generates a device encryption key on first use
- Key stored in IndexedDB, wrapped by device fingerprint
- Zero user interaction required
- Data stays on device

### Sync Mode (Coming Soon)
- User sets a passphrase
- Passphrase derives master key via Argon2id
- Device key wrapped by master key
- Syncs encrypted data across devices

## API Reference

### High-Level API

```typescript
// Encrypt any JSON-serializable data
const result = await encrypt({ secret: 'data' })
// Returns: { success: true, envelope: EncryptedEnvelope } | { success: false, error: string }

// Decrypt back to original type
const decrypted = await decrypt<MyType>(envelope)
// Returns: { success: true, data: MyType } | { success: false, error: string }

// Check if crypto is available
const ready = await isReady() // Returns: boolean
```

### React Hooks

```typescript
import { useEncryptedStorage, useEncryptionStatus } from '@/lib/crypto'

// Monitor encryption status
function StatusBadge() {
  const { status, loading } = useEncryptionStatus()
  if (loading) return <Spinner />
  return <Badge>{status?.mode}</Badge>
}

// Use encrypted storage with React state
function SecureNotes() {
  const { value, setValue, loading } = useEncryptedStorage<string[]>('notes', [])

  const addNote = (note: string) => setValue([...value, note])

  return <NotesList notes={value} onAdd={addNote} />
}

// Simple value hook
const [apiKey, setApiKey] = useEncryptedValue('api-key', '')
```

### Storage Adapter

```typescript
import { EncryptedStorage, getEncryptedStorage } from '@/lib/crypto'

// Get singleton instance
const storage = getEncryptedStorage()

// Basic operations (auto-encrypt/decrypt)
await storage.set('user-prefs', { theme: 'dark' })
const prefs = await storage.get('user-prefs', {})
await storage.remove('user-prefs')

// Exclude keys from encryption (metadata, sync info)
const storage = getEncryptedStorage({
  plaintextKeys: ['_metadata', 'sync:*']
})

// Export all data (decrypted)
const backup = await storage.exportDecrypted()

// Import and re-encrypt
await storage.importData(backup)
```

### Low-Level Crypto

```typescript
import {
  generateRandomKey,
  encryptWithKey,
  decryptWithKey,
  encryptWithPassphrase,
  decryptWithPassphrase,
  randomBytes,
  randomId,
} from '@/lib/crypto'

// Generate and use raw keys
const key = await generateRandomKey()
const encrypted = await encryptWithKey('secret', key)
const decrypted = await decryptToStringWithKey(encrypted, key)

// Passphrase-based encryption (for backups)
const encrypted = await encryptWithPassphrase('data', 'user-password')
const decrypted = await decryptToStringWithPassphrase(encrypted, 'user-password')

// Utilities
const bytes = randomBytes(32)  // Uint8Array(32)
const id = randomId(16)        // '3a7f9c2b1e4d8a6f' (32 hex chars)
```

### Configuration

```typescript
import {
  getEncryptionStatus,
  getFeatureFlags,
  setFeatureFlags,
  isEncryptionEnabledFor,
} from '@/lib/crypto'

// Get UI status
const status = await getEncryptionStatus()
// { active: true, mode: 'local', message: '...', deviceId: '...' }

// Feature flags for gradual rollout
const flags = getFeatureFlags()
// { encryptTasks: true, encryptNotes: true, ... }

// Enable/disable per data type
setFeatureFlags({ encryptSearch: false })

// Check if enabled for specific type
if (isEncryptionEnabledFor('encryptTasks')) {
  // Encrypt task data
}
```

## Envelope Format

All encrypted data is wrapped in an `EncryptedEnvelope`:

```typescript
interface EncryptedEnvelope {
  version: 1                    // Format version
  ciphertext: string            // Base64(IV + encrypted data)
  encryptedAt: number           // Unix timestamp
  dataType?: string             // Optional type hint
}
```

## Browser Compatibility

Requires:
- Web Crypto API (`crypto.subtle`)
- IndexedDB (for key storage)

Supported in all modern browsers. Falls back gracefully on server-side or unsupported environments.

## Security Model

### Threat Model
- **Protects against:** Data theft, unauthorized local access
- **Does not protect against:** Malware with browser access, physical device theft without disk encryption

### Key Storage
- Device key stored in IndexedDB database `frame-crypto`
- Key wrapped (encrypted) using device fingerprint
- Never exposed to JavaScript beyond crypto operations

### Cryptographic Primitives
| Component | Algorithm |
|-----------|-----------|
| Encryption | AES-256-GCM (AEAD) |
| Key Derivation | PBKDF2-SHA256 (100,000 iterations) |
| Random | `crypto.getRandomValues()` |
| IV/Nonce | 12 bytes, random per encryption |
| Salt | 16 bytes, random per passphrase |

## Testing

```bash
# Run crypto module tests
npm run test:unit -- __tests__/unit/lib/crypto/

# With coverage
npm run test:coverage -- __tests__/unit/lib/crypto/
```

## Files

```
lib/crypto/
├── index.ts           # Public API exports
├── types.ts           # Type definitions
├── aesGcm.ts          # Core AES-256-GCM functions
├── deviceKey.ts       # Device key management
├── envelope.ts        # Envelope encryption
├── encryptedStorage.ts # Storage adapter
├── config.ts          # Configuration/preferences
├── hooks.ts           # React hooks
└── syncMode.ts        # Cloud sync stubs (future)
```

## Future: Cloud Sync

When implemented, cloud sync will:
1. Prompt for passphrase on first sync setup
2. Derive master key using Argon2id
3. Wrap device key with master key
4. Upload wrapped key to server
5. Enable multi-device sync with same passphrase
