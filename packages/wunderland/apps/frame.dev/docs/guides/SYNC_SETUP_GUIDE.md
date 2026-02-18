# Cloud Sync Setup Guide

Enable cross-device synchronization with zero-knowledge encryption. Your data is encrypted on your device before it ever leaves — we never see your plaintext data.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Enabling Cloud Sync](#enabling-cloud-sync)
- [Managing Devices](#managing-devices)
- [Recovery Key](#recovery-key)
- [How Sync Works](#how-sync-works)
- [Troubleshooting](#troubleshooting)
- [FAQ](#faq)

---

## Overview

Quarry's cloud sync is:

- **Zero-Knowledge**: All data is encrypted with AES-256-GCM before leaving your device
- **Optional**: Works 100% offline without an account
- **Real-Time**: WebSocket-powered instant sync across devices
- **Conflict-Aware**: Vector clocks ensure consistent merging without data loss

### What Syncs

| Data Type | Synced | Notes |
|-----------|--------|-------|
| Strands (notes) | Yes | Full content, encrypted |
| Supernotes | Yes | Markdown + metadata |
| Collections | Yes | Structure + strand references |
| Tags | Yes | Auto-generated and manual |
| Settings | Yes | Preferences, themes |
| Local files | No | Images/attachments stay local |

---

## Prerequisites

Before enabling cloud sync, ensure you have:

1. **Premium License**: Cloud sync requires a Premium license
2. **Stable Internet**: Initial sync requires good connectivity
3. **Storage Space**: ~50MB free for sync cache

---

## Enabling Cloud Sync

### Step 1: Activate Your License

If you haven't already activated your Premium license:

1. Open **Settings** → **License**
2. Click **Activate License**
3. Enter your license key (format: `QUARRY-XXXX-XXXX-XXXX-XXXX`)
4. Click **Activate**

### Step 2: Create a Sync Account

1. Open **Settings** → **Sync**
2. Click **Enable Cloud Sync**
3. Choose your sign-in method:
   - **Email + Recovery Key** (recommended)
   - **Sign in with Google**
   - **Sign in with GitHub**

### Step 3: Save Your Recovery Key

**CRITICAL**: Your recovery key is the only way to decrypt your data. We cannot recover it for you.

When creating an account with email:

1. A 24-word recovery key will be displayed
2. **Write it down** on paper and store it securely
3. Optionally download as encrypted file
4. Confirm by entering 3 random words from the key

```
Example recovery key format:
abandon ability able about above absent absorb abstract absurd abuse access accident
account accuse achieve acid acoustic acquire across act action actor actress actual
```

> **Warning**: If you lose your recovery key, you will lose access to all synced data. There is no "forgot password" option.

### Step 4: Initial Sync

After account creation:

1. Quarry will encrypt and upload your local data
2. Progress bar shows upload status
3. This may take several minutes for large libraries
4. Do not close the app during initial sync

---

## Managing Devices

### Adding a New Device

1. Install Quarry on the new device
2. Open **Settings** → **Sync**
3. Click **Sign In**
4. Use the same sign-in method as before
5. Enter your recovery key when prompted
6. Quarry will download and decrypt your data

### Device Limits

| Tier | Device Limit |
|------|--------------|
| Free | 3 devices |
| Premium | Unlimited |

### Viewing Connected Devices

1. Open **Settings** → **Sync** → **Devices**
2. See all connected devices with:
   - Device name
   - Device type (Desktop/Mobile/Web)
   - Last sync time
   - Current status

### Removing a Device

1. Open **Settings** → **Sync** → **Devices**
2. Click the **X** next to the device
3. Confirm removal
4. The device will be logged out on next sync attempt

---

## Recovery Key

### What is the Recovery Key?

Your recovery key is a cryptographic seed that:

- Generates your master encryption key
- Cannot be changed once created
- Is never stored on our servers
- Is the only way to decrypt your data

### Recovering Access

If you lose access to all devices:

1. Install Quarry on a new device
2. Click **Sign In** → **I have a recovery key**
3. Enter your 24-word recovery key
4. Your data will be downloaded and decrypted

### Changing Your Recovery Key

You cannot change your recovery key. To use a new key:

1. Export all data locally (ZIP export)
2. Delete your sync account
3. Create a new account with a new recovery key
4. Import your data

---

## How Sync Works

### Encryption Flow

```
Your Device                           Our Servers
───────────                           ───────────
1. You write a note
2. Note encrypted with AES-256-GCM
   using your recovery key
3. Only encrypted blob sent ────────► 4. Encrypted blob stored
                                        (we can't read it)
5. Other device requests sync ◄────── 6. Encrypted blob sent
7. Decrypted locally with
   your recovery key
8. You see your note
```

### Conflict Resolution

When the same note is edited on multiple devices offline:

1. **Vector clocks** track edit history on each device
2. On sync, Quarry detects concurrent edits
3. **Auto-merge** if changes are in different sections
4. **Manual resolution** if changes conflict:
   - You see both versions side-by-side
   - Choose which to keep or merge manually

### Sync Frequency

| Trigger | When |
|---------|------|
| Real-time | When online, changes sync instantly via WebSocket |
| On app open | Full sync check on startup |
| On app close | Pending changes pushed before exit |
| Manual | Pull-to-refresh or sync button |

---

## Troubleshooting

### Sync Status Icons

| Icon | Meaning |
|------|---------|
| ✓ Green | Fully synced |
| ↻ Blue | Syncing in progress |
| ⚠ Yellow | Sync pending (offline) |
| ✕ Red | Sync error |

### Common Issues

#### "Sync Failed" Error

1. Check internet connection
2. Try **Settings** → **Sync** → **Force Sync**
3. If persists, check if another device has pending changes

#### "Device Limit Reached"

1. Remove unused devices from **Settings** → **Sync** → **Devices**
2. Or upgrade to Premium for unlimited devices

#### "Conflict Detected"

1. Open the strand with the conflict indicator
2. Review both versions in the conflict resolution modal
3. Choose the version to keep or merge manually

#### Slow Initial Sync

- Initial sync uploads all data; this is normal
- Subsequent syncs are incremental and fast
- Ensure stable WiFi connection
- Don't put device to sleep during initial sync

#### Data Missing After Sync

1. Check if sync completed (green checkmark)
2. Try **Settings** → **Sync** → **Force Full Sync**
3. Ensure you're signed into the same account

---

## FAQ

### Is my data encrypted?

Yes. All data is encrypted with AES-256-GCM on your device before being sent to our servers. We use zero-knowledge architecture — we literally cannot read your data.

### Can I use sync without an account?

No. Sync requires an account to identify your devices and store encrypted data. However, Quarry works perfectly offline without an account.

### What happens if I lose my recovery key?

Your data cannot be recovered. We don't have your key and cannot decrypt your data. Always keep your recovery key in a safe place.

### Is sync included in the free tier?

Sync requires a Premium license. The free Community Edition is local-only.

### Can I disable sync after enabling it?

Yes. Go to **Settings** → **Sync** → **Disable Sync**. Your local data remains, but cloud sync stops.

### Does sync use a lot of data?

Initial sync depends on your library size. After that, only changes are synced (typically <100KB per sync).

### Is there a web app?

Yes. With sync enabled, you can access your notes at `quarry.space/app` from any browser.

### How do I export my data?

Even with sync, you can always export via **Settings** → **Export** → **Full ZIP Export**. Your data is never locked in.

---

## Security Details

### Encryption Specifications

| Component | Specification |
|-----------|---------------|
| Symmetric encryption | AES-256-GCM |
| Key derivation | PBKDF2 with 100,000 iterations |
| Recovery key | BIP-39 mnemonic (256-bit entropy) |
| Transport | TLS 1.3 |

### What We Store

- Encrypted blobs (cannot be decrypted without your key)
- Account email
- Device metadata (name, type, last sync time)
- Sync cursors and vector clocks

### What We Never Store

- Your plaintext data
- Your recovery key
- Your master encryption key
- Decrypted content of any kind

---

## Getting Help

- **Documentation**: [quarry.space/docs](https://quarry.space/docs)
- **Support Email**: support@quarry.space
- **GitHub Issues**: [github.com/framersai/quarry/issues](https://github.com/framersai/quarry/issues)
