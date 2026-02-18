# End-to-End Encryption Guide

Frame uses End-to-End Encryption (E2EE) to protect your data. This guide explains how it works and what it means for you.

## Overview

All your data in Frame is encrypted before it's stored. This means:

- **Your data is protected** even if your device is compromised
- **No one can read your data** except you (not even us)
- **It just works** - no setup required for local encryption

## Two Encryption Modes

### Local Mode (Default)

This is what you get out of the box:

1. When you first use Frame, a unique encryption key is automatically generated
2. This key is stored securely in your browser's IndexedDB
3. All your data is encrypted with this key before storage
4. **No passphrase needed** - the key is bound to your device

**Pros:**
- Zero friction - works automatically
- Strong encryption (AES-256-GCM)
- No passwords to remember

**Cons:**
- Data only accessible on this device
- Clearing browser data loses access to encrypted data

### Cloud Sync Mode (Coming Soon)

When you enable cloud sync:

1. You set a passphrase
2. Your device key is wrapped with a key derived from your passphrase
3. The wrapped key syncs to the server
4. Other devices can access your data with the same passphrase

**Pros:**
- Access data from multiple devices
- Passphrase recovery possible
- Same strong encryption

**Cons:**
- Requires remembering a passphrase
- More complex setup

## What Gets Encrypted

| Encrypted | Not Encrypted |
|-----------|---------------|
| Tasks and todos | Unique IDs |
| Notes and writing | Timestamps |
| Reflections | Sync metadata |
| Tags and project names | Settings structure |
| Search index | Device information |
| Embeddings | |

## How It Works

### The Encryption Process

```
Your Data
    │
    ▼
┌─────────────────┐
│ JSON Serialize  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AES-256-GCM    │◄──── Device Key
│   Encryption    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Encrypted       │
│ Envelope        │
│ (metadata +     │
│  ciphertext)    │
└────────┬────────┘
         │
         ▼
    Local Storage
```

### Device Key Protection

Your device key is protected with multiple layers:

1. **Generation:** Cryptographically random 256-bit key
2. **Wrapping:** Encrypted with a device-specific fingerprint
3. **Storage:** Stored in IndexedDB (isolated per origin)
4. **Memory:** Cached in memory during session (cleared on close)

### Encryption Algorithm: AES-256-GCM

We use AES-256-GCM because it provides:

- **256-bit key:** 2^256 possible keys (more atoms than in the universe)
- **Authenticated Encryption:** Detects any tampering with encrypted data
- **Hardware Acceleration:** Fast encryption via CPU instructions
- **Web Standard:** Native browser support via Web Crypto API

## Security Considerations

### What E2EE Protects Against

- **Data breaches:** Even if storage is compromised, data is unreadable
- **Unauthorized access:** Only you can decrypt your data
- **Eavesdropping:** Data in transit is encrypted

### What E2EE Does NOT Protect Against

- **Malware on your device:** If malware can access your browser, it can access decrypted data
- **Physical access without disk encryption:** Someone with your unlocked device can access data
- **Screen viewing:** Someone looking at your screen sees decrypted data
- **Memory attacks:** Advanced attacks could extract keys from memory

### Recommendations

1. **Enable device encryption** (FileVault on Mac, BitLocker on Windows)
2. **Use a strong device password**
3. **Lock your screen** when away
4. **Keep your browser updated**
5. **Be cautious with extensions** - they can access page content

## FAQ

### Is my data encrypted right now?

If you're using Frame in a modern browser, yes! Check the Security Settings page to see your encryption status.

### What happens if I clear my browser data?

In local mode, clearing browser data deletes your encryption key. This means:
- Encrypted data becomes **permanently unreadable**
- A new key is generated on next use
- Your old data is effectively lost

**Before clearing browser data:** Export your data from Settings if you need it.

### Can Frame employees read my data?

No. With E2EE, your data is encrypted before it leaves your device. We only see encrypted ciphertext that we cannot decrypt.

### What if I forget my passphrase (sync mode)?

We recommend saving your recovery key when you set up sync mode. Without the passphrase or recovery key, your data cannot be recovered.

### How do I know encryption is working?

1. Open Settings > Security
2. Look for the "End-to-End Encryption" section
3. Status should show "Active" with your device ID

### Can I disable encryption?

Encryption is always enabled for security. You cannot disable it, but you can export your data in plaintext format from Settings.

## Technical Details

For developers and security researchers:

### Cryptographic Primitives

| Component | Implementation |
|-----------|----------------|
| Encryption | AES-256-GCM (Web Crypto API) |
| Key Derivation (passphrase) | PBKDF2-SHA256, 100,000 iterations |
| Key Derivation (sync, future) | Argon2id |
| Random Generation | `crypto.getRandomValues()` |
| IV Length | 12 bytes (96 bits) |
| Salt Length | 16 bytes (128 bits) |
| Auth Tag | 128 bits (included in GCM) |

### Storage Format

Encrypted data is stored as an "envelope":

```json
{
  "version": 1,
  "ciphertext": "base64(IV || encrypted_data || auth_tag)",
  "encryptedAt": 1704067200000,
  "dataType": "task"
}
```

### Key Storage

- **Database:** IndexedDB (`frame-crypto`)
- **Object Store:** `keys`
- **Key Path:** `deviceId`
- **Protection:** Wrapped by device fingerprint via PBKDF2

### Source Code

The encryption implementation is open source:
- Module: `lib/crypto/`
- Tests: `__tests__/unit/lib/crypto/`

## Getting Help

If you have questions about encryption:

1. Check the FAQ section in Settings
2. Visit our [GitHub Issues](https://github.com/anthropics/frame/issues)
3. Join our [Discord community](https://discord.gg/frame)
