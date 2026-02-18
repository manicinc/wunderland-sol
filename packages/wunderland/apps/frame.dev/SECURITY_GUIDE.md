# Quarry Security Guide

This guide covers password protection, access control, and security best practices for Quarry deployments.

## Table of Contents

- [Password Protection](#password-protection)
- [Public Access Mode](#public-access-mode)
- [Deployment Security](#deployment-security)
- [Technical Implementation](#technical-implementation)
- [End-to-End Encryption](#end-to-end-encryption)
- [Best Practices](#best-practices)

---

## Password Protection

Quarry includes built-in password protection that locks your entire UI behind a secure lock screen.

### Enabling Password Protection

1. Open **Settings** (gear icon in the top bar)
2. Navigate to the **Security** tab
3. Click **Enable Password Protection**
4. Follow the 3-step confirmation process:
   - **Step 1**: Acknowledge the security warning
   - **Step 2**: Enter and confirm your password
   - **Step 3**: Final confirmation to enable

### Lock Screen Features

When password protection is enabled:

- **Full-screen lock**: Blocks all access until password is entered
- **Failed attempt protection**: 5 failed attempts triggers a 5-minute lockout
- **Security question hint**: Optional hint via security question/answer
- **Auto-lock on inactivity**: Configurable timeout (5, 10, 15, 30 minutes, or disabled)
- **Session persistence**: Stays unlocked during active browser session

### Password Recovery

If you forget your password:

1. Click "Forgot Password?" on the lock screen
2. Answer your security question to reveal the password hint
3. If you didn't set a security question, you'll need to clear browser data

> **Important**: Passwords are hashed with SHA-256 and stored locally. There is no cloud recovery option. Always set a security question!

### Disabling Password Protection

1. Open Settings → Security
2. Click **Disable Protection**
3. Enter your current password
4. Confirm the action

---

## Public Access Mode

Public Access Mode is designed for shared or public deployments where visitors should have read/limited access but cannot modify security or plugin settings.

### Enabling Public Access Mode

Set the environment variable in your deployment:

```bash
NEXT_PUBLIC_PUBLIC_ACCESS=true
```

### What Gets Locked in Public Access Mode

| Feature | Locked? | Details |
|---------|---------|---------|
| Plugin Installation | Yes | Cannot install from URL, ZIP, or registry |
| Plugin Removal | Yes | Cannot uninstall plugins |
| Security Settings | Yes | Cannot enable/disable/change password |
| Plugin Enable/Disable | No | Can toggle installed plugins |
| Plugin Configuration | No | Can modify plugin settings |
| Content Editing | No | Full editing access |

### Use Cases

- **Public documentation sites**: Share your Codex publicly without allowing modifications
- **Demo deployments**: Showcase features with locked settings
- **Team environments**: Central plugin/security management by admin

---

## Deployment Security

### GitHub Pages Deployment

> **Warning**: GitHub Pages sites are publicly accessible. Anyone with the URL can access your Quarry instance.

**If `PUBLIC_ACCESS=false` (default):**
- Anyone can enable/disable password protection
- Anyone can change the password
- Anyone can edit, publish, and delete content
- Anyone can install/remove plugins

**Recommendations for GitHub Pages:**

| Use Case | Recommendation |
|----------|----------------|
| Public documentation | Set `NEXT_PUBLIC_PUBLIC_ACCESS=true` + enable password |
| Private personal use | Deploy behind auth (Cloudflare Access, Vercel Auth) |
| Small team collaboration | Use GitHub repo permissions + `PUBLIC_ACCESS=false` |

### Vercel/Netlify Deployment

For these platforms, you have additional security options:

1. **Platform authentication**: Use Vercel Authentication or Netlify Identity
2. **Password protection**: Built-in platform password gates
3. **IP restrictions**: Limit access to specific IP ranges

### Self-Hosted Deployment

For maximum security on self-hosted deployments:

1. Deploy behind a reverse proxy with authentication (nginx + basic auth)
2. Use VPN/private network access
3. Enable Quarry's built-in password protection as a second layer

---

## Technical Implementation

### Password Hashing

- **Algorithm**: SHA-256
- **Salt**: Per-password random salt (stored with hash)
- **Storage**: IndexedDB in `fabric_security` namespace
- **Transmission**: Never transmitted; all verification is local

### Session Management

```typescript
interface SecuritySession {
  passwordHash: string       // SHA-256 hash
  salt: string              // Random salt
  securityQuestion?: string // Optional recovery question
  securityAnswer?: string   // Hashed answer
  passwordHint?: string     // Plain text hint
  failedAttempts: number    // Current failed count
  lockedOutUntil?: string   // ISO timestamp if locked
  lastUnlockedAt?: string   // Last successful unlock
  autoLockTimeout: number   // Minutes (0 = disabled)
}
```

### Lockout Mechanism

- **Threshold**: 5 failed attempts
- **Duration**: 5 minutes
- **Reset**: Automatic after lockout expires or successful unlock

---

## End-to-End Encryption

All data in Quarry is encrypted at rest using AES-256-GCM. Encryption is automatic and requires no setup.

### How It Works

1. **Device Key Generation**: On first use, a 256-bit encryption key is auto-generated
2. **Key Storage**: The key is stored in IndexedDB, wrapped by a device fingerprint
3. **Data Encryption**: All content is encrypted before storage
4. **Transparent Decryption**: Data is decrypted on access

### Encryption Details

| Component | Implementation |
|-----------|----------------|
| Algorithm | AES-256-GCM (Authenticated Encryption) |
| Key Size | 256 bits |
| IV/Nonce | 12 bytes, random per encryption |
| Key Derivation | PBKDF2-SHA256 (100,000 iterations) |
| Key Storage | IndexedDB (`frame-crypto` database) |

### What Gets Encrypted

- Tasks, notes, writing projects
- Reflections and journals
- Tags and project metadata
- Search index and embeddings
- User preferences containing sensitive data

### What's NOT Encrypted

- Unique identifiers (IDs)
- Timestamps
- Sync metadata
- Settings structure (not values)

### Encryption Status

Check your encryption status:
1. Open **Settings** > **Security**
2. Look for the "End-to-End Encryption" section
3. Status shows "Active" with your device ID when working

### Data Recovery

**Local Mode (default):**
- Encryption key is bound to your device
- Clearing browser data **permanently** loses access to encrypted data
- Export your data before clearing browser storage

**Sync Mode (coming soon):**
- Passphrase-based key derivation
- Recovery key generation for backup
- Multi-device access with same passphrase

### Security Considerations

**What E2EE protects against:**
- Data theft from storage
- Unauthorized local access
- Data breaches on sync servers (coming soon)

**What E2EE does NOT protect against:**
- Malware with browser access
- Screen viewing attacks
- Memory extraction attacks
- Physical device access without disk encryption

### Recommendations

1. **Enable device disk encryption** (FileVault, BitLocker)
2. **Don't clear browser data** without exporting first
3. **Keep browser updated** for latest security patches
4. **Combine with password protection** for defense in depth

For detailed technical information, see [ENCRYPTION.md](./ENCRYPTION.md).

---

## Best Practices

### For Personal Use

1. **Enable password protection** with a strong password
2. **Set a security question** for password hint recovery
3. **Enable auto-lock** if using on shared computers
4. **Regular backups**: Export your data regularly (JSON/ZIP)

### For Public Deployments

1. **Set `NEXT_PUBLIC_PUBLIC_ACCESS=true`** to lock settings
2. **Enable password protection** before deploying publicly
3. **Document the password** securely for admin access
4. **Consider platform authentication** for additional security

### For Team Deployments

1. **Use GitHub repository permissions** for access control
2. **Share passwords securely** (password manager, encrypted message)
3. **Set `PUBLIC_ACCESS=false`** for flexibility, or `true` if using shared credentials
4. **Establish password rotation policy** for shared accounts

### Security Checklist

- [ ] Password protection enabled
- [ ] Strong password (12+ characters, mixed case, numbers, symbols)
- [ ] Security question set for recovery
- [ ] Auto-lock configured if on shared device
- [ ] `PUBLIC_ACCESS` set appropriately for deployment type
- [ ] Platform authentication configured (if available)
- [ ] Data backup exported and stored securely

---

## Troubleshooting

### Locked Out of Your Quarry

1. **Wait for lockout to expire** (5 minutes after 5 failed attempts)
2. **Use security question** to reveal password hint
3. **Clear browser data** as last resort (loses all local data)

### Password Not Working After Update

The password hash format may have changed. Try:
1. Clear the `fabric_security` data from IndexedDB
2. Re-enable password protection

### Public Access Mode Not Working

1. Ensure environment variable is set correctly: `NEXT_PUBLIC_PUBLIC_ACCESS=true`
2. Rebuild the application (NEXT_PUBLIC_* vars are inlined at build time)
3. Clear browser cache

---

## Related Documentation

- [ENCRYPTION.md](./ENCRYPTION.md) - Detailed end-to-end encryption guide
- [ENV_VARS.md](./ENV_VARS.md) - Environment variable configuration
- [README.md](./README.md) - Getting started guide
