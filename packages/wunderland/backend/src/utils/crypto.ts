import crypto from 'crypto';

const IV_LENGTH = 12; // AES-GCM recommended IV length

function getKey(): Buffer {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY || process.env.SERVER_SECRET || 'dev-insecure-key';
  // Derive 32-byte key from provided secret
  return crypto.createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain?: string | null): string | null {
  if (!plain) return plain ?? null;
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptSecret(enc?: string | null): string | undefined {
  if (!enc) return undefined;
  try {
    const key = getKey();
    const raw = Buffer.from(enc, 'base64');
    const iv = raw.subarray(0, IV_LENGTH);
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + 16);
    const data = raw.subarray(IV_LENGTH + 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    return plain;
  } catch {
    return undefined;
  }
}

export function maskSecret(secret: string, visible: number = 4): string {
  if (secret.length <= visible) return '*'.repeat(secret.length);
  return `${'*'.repeat(Math.max(0, secret.length - visible))}${secret.slice(-visible)}`;
}


