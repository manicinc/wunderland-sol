# Security & Privacy Features

Quarry takes your privacy seriously. This document explains how we protect your data.

## Overview

Quarry is designed with a **local-first, privacy-by-default** architecture:

- ✅ All data stored locally on your device
- ✅ End-to-end encryption for sensitive data
- ✅ Zero telemetry or tracking
- ✅ Optional AI features — you control when data leaves your device
- ✅ Full offline functionality

## End-to-End Encryption (E2EE)

### What Gets Encrypted

All sensitive data is encrypted using **AES-256-GCM** before storage:

| Data Type | Encrypted | Notes |
|-----------|-----------|-------|
| Notes & Strands | ✅ | Full content encryption |
| Tasks & Habits | ✅ | Including metadata |
| Reflections | ✅ | Journaling data |
| Settings | ✅ | API keys, preferences |
| Search Index | ✅ | Semantic embeddings |
| Attachments | ✅ | Images, files |

### How It Works

```
┌────────────────────────────────────────────────────┐
│                   YOUR DEVICE                       │
├────────────────────────────────────────────────────┤
│                                                     │
│   Your Data ──► AES-256-GCM ──► Encrypted Blob     │
│                      ▲                              │
│                      │                              │
│               Device Key (auto-generated)           │
│                      │                              │
│                      ▼                              │
│               Stored in IndexedDB                   │
│               (protected by device fingerprint)     │
│                                                     │
└────────────────────────────────────────────────────┘
```

### Key Management

1. **Device Key**: Auto-generated 256-bit AES key on first use
2. **Storage**: Encrypted and stored in browser's IndexedDB
3. **Protection**: Wrapped using a device-specific fingerprint
4. **No User Action Required**: Encryption just works

### Technical Details

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Size**: 256 bits
- **IV/Nonce**: 12 bytes, randomly generated per encryption
- **Authentication Tag**: 16 bytes (128 bits)
- **Implementation**: Web Crypto API (native browser)

## Local-First Architecture

### Your Data Stays Local

```
┌─────────────────┐     ┌─────────────────┐
│   Your Device   │     │    Internet     │
├─────────────────┤     ├─────────────────┤
│                 │     │                 │
│  ✅ SQLite DB   │     │  ❌ No sync*    │
│  ✅ Encryption  │     │  ❌ No upload   │
│  ✅ Search      │     │  ❌ No tracking │
│  ✅ NLP/AI      │     │                 │
│                 │     │                 │
└─────────────────┘     └─────────────────┘

* Cloud sync coming soon (with E2EE)
```

### What Requires Internet?

| Feature | Requires Internet | Notes |
|---------|-------------------|-------|
| Core app | ❌ No | Fully offline |
| Search | ❌ No | Local semantic search |
| Knowledge graph | ❌ No | Computed locally |
| NLP extraction | ❌ No | Local processing |
| AI Chat (Claude/OpenAI) | ✅ Yes | Opt-in, uses your API key |
| AI Chat (Ollama) | ❌ No | Runs locally |
| Image generation | ✅ Yes | When using cloud APIs |
| License verification | ✅ Once | Initial activation only |

## AI & Data Sharing

### You Control What Leaves Your Device

1. **Default**: No data sent anywhere
2. **Opt-In AI**: Only when you explicitly use AI features
3. **Your API Keys**: You provide and control API access
4. **Local Alternative**: Ollama runs entirely on your machine

### When You Use Cloud AI

```
┌─────────────────┐          ┌─────────────────┐
│   Your Device   │   ──►    │   AI Provider   │
├─────────────────┤          ├─────────────────┤
│                 │          │                 │
│  • Your prompt  │  HTTPS   │  Claude/OpenAI  │
│  • Context you  │   ──►    │                 │
│    explicitly   │          │  Response sent  │
│    include      │   ◄──    │  back to you    │
│                 │          │                 │
└─────────────────┘          └─────────────────┘
```

**What's sent**: Only the specific text you're asking about
**What's NOT sent**: Your entire knowledge base, other notes, personal data

### Using Ollama (Fully Local AI)

```bash
# Install Ollama
brew install ollama

# Pull a model
ollama pull llama3.2

# Use in Quarry - no internet needed!
```

Configure in Settings → AI → Local (Ollama)

## Password Protection

### Optional App Lock

Protect access to Quarry with a password:

1. Go to **Settings** → **Security & Privacy**
2. Enable **Password Protection**
3. Set a strong password
4. Choose auto-lock timeout (1 min to never)

### Auto-Lock

- Screen lock triggers app lock
- Configurable timeout
- Biometric unlock (on supported devices)

## Data Portability

### You Own Your Data

- **Export**: JSON, Markdown, HTML, PDF
- **No Lock-In**: Standard file formats
- **Full Access**: Query your SQLite database directly
- **Backup**: Copy the data folder anytime

### Export Encryption Keys

For backup or device transfer:

1. Go to **Settings** → **Security & Privacy** → **End-to-End Encryption**
2. Click **Export Keys**
3. Set a strong export password
4. Save the `.quarry-key` file securely
5. Import on another device with the same password

## Cloud Sync (Coming Soon)

### Zero-Knowledge Architecture

When Quarry Sync launches:

```
┌─────────────────┐          ┌─────────────────┐
│   Your Device   │          │  Quarry Cloud   │
├─────────────────┤          ├─────────────────┤
│                 │          │                 │
│  Encrypt with   │   ──►    │  Stores ONLY    │
│  your key       │          │  encrypted blob │
│                 │   ◄──    │                 │
│  Decrypt with   │          │  Can't read     │
│  your key       │          │  your data      │
│                 │          │                 │
└─────────────────┘          └─────────────────┘
```

- **Your passphrase**: Never leaves your device
- **Server sees**: Only encrypted blobs
- **We can't read**: Your data, even if we wanted to
- **Recovery**: 24-word mnemonic you control

## Best Practices

### Recommended Security Settings

1. ✅ Enable password protection for shared devices
2. ✅ Use auto-lock (5 minutes recommended)
3. ✅ Export and safely store encryption keys
4. ✅ Use Ollama for maximum privacy
5. ✅ Regular backups of your data folder

### API Key Safety

- Store API keys in Quarry's encrypted settings
- Never share your API keys
- Use restricted/scoped keys when possible
- Rotate keys periodically

## Privacy Policy

### We Don't Collect

- ❌ Personal information
- ❌ Usage analytics
- ❌ Crash reports
- ❌ Your content
- ❌ Anything, really

### What We Know

- Your email (if you purchased Premium)
- License key (for activation)
- That's it

## Open Source

Quarry's encryption and security code is open source. Audit it yourself:

- [`lib/crypto/`](../lib/crypto/) - Encryption implementation
- [`lib/crypto/aesGcm.ts`](../lib/crypto/aesGcm.ts) - Core AES-256-GCM
- [`lib/crypto/deviceKey.ts`](../lib/crypto/deviceKey.ts) - Key management
- [`lib/crypto/envelope.ts`](../lib/crypto/envelope.ts) - High-level API

## FAQ

### Is my data really encrypted?

Yes. All sensitive data is encrypted with AES-256-GCM before storage. The encryption key is auto-generated and stored securely on your device.

### Can Quarry see my notes?

No. Your data never leaves your device unless you explicitly use cloud AI features. Even then, only the specific text you're querying is sent.

### What if I lose my device?

Your encrypted data is tied to your device key. Without cloud sync, you'd need a backup. When Quarry Sync launches, you'll have a recovery key for cross-device access.

### Is the AI reading my notes?

Only if you explicitly ask it to. The AI features are opt-in, and you control exactly what context to include in each query.

### Can I verify the encryption myself?

Yes! The code is open source. You can inspect `lib/crypto/` or even run your own security audit.

---

*Last updated: January 2026*



