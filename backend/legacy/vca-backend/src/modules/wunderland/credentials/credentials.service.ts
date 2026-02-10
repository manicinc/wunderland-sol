/**
 * @file credentials.service.ts
 * @description Persistent credential vault for agent integrations.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { appConfig } from '../../../config/appConfig.js';
import type {
  CreateCredentialDto,
  ListCredentialsQueryDto,
  RotateCredentialDto,
} from '../dto/credentials.dto.js';
import { AgentImmutableException } from '../wunderland.exceptions.js';
import { getAgentSealState } from '../immutability/agentSealing.js';

type CredentialRecord = {
  credentialId: string;
  seedId: string;
  ownerUserId: string;
  type: string;
  label: string;
  maskedValue: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function toIso(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value) ? new Date(value).toISOString() : null;
}

function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

@Injectable()
export class CredentialsService {
  private readonly encryptionKey: Buffer;

  constructor(private readonly db: DatabaseService) {
    const keyMaterial =
      process.env.WUNDERLAND_CREDENTIALS_ENCRYPTION_KEY || String(appConfig.auth.jwtSecret);
    this.encryptionKey = createHash('sha256').update(keyMaterial).digest();
  }

  private async assertOwnedAgent(userId: string, seedId: string): Promise<void> {
    const agent = await this.db.get<{ seed_id: string }>(
      `SELECT seed_id
         FROM wunderland_agents
        WHERE owner_user_id = ?
          AND seed_id = ?
          AND status != ?
        LIMIT 1`,
      [userId, seedId, 'archived']
    );
    if (!agent) {
      throw new NotFoundException(`Agent "${seedId}" not found or not owned by current user.`);
    }
  }

  private maskSecret(secret: string): string {
    const trimmed = secret.trim();
    if (!trimmed) return '••••••••';
    if (trimmed.length <= 4) return '••••••••';
    return `••••••••${trimmed.slice(-4)}`;
  }

  private encryptSecret(secret: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      'v1',
      iv.toString('base64url'),
      tag.toString('base64url'),
      ciphertext.toString('base64url'),
    ].join('.');
  }

  private decryptSecret(encrypted: string): string | null {
    try {
      const parts = encrypted.split('.');
      if (parts.length !== 4) return null;
      const [version, ivRaw, tagRaw, ciphertextRaw] = parts;
      if (version !== 'v1') return null;

      const iv = Buffer.from(ivRaw ?? '', 'base64url');
      const tag = Buffer.from(tagRaw ?? '', 'base64url');
      const ciphertext = Buffer.from(ciphertextRaw ?? '', 'base64url');
      if (iv.length !== 12 || tag.length !== 16 || ciphertext.length === 0) return null;

      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
      return plain;
    } catch {
      return null;
    }
  }

  private mapCredential(row: any): CredentialRecord {
    return {
      credentialId: String(row.credential_id),
      seedId: String(row.seed_id),
      ownerUserId: String(row.owner_user_id),
      type: String(row.credential_type),
      label: String(row.label ?? ''),
      maskedValue: String(row.masked_value ?? '••••••••'),
      lastUsedAt: toIso(toEpochMs(row.last_used_at)),
      createdAt: toIso(toEpochMs(row.created_at)) ?? new Date().toISOString(),
      updatedAt: toIso(toEpochMs(row.updated_at)) ?? new Date().toISOString(),
    };
  }

  async listCredentials(
    userId: string,
    query: ListCredentialsQueryDto = {}
  ): Promise<{ items: CredentialRecord[] }> {
    const where: string[] = ['owner_user_id = ?'];
    const params: Array<string | number> = [userId];

    if (query.seedId) {
      const seedId = query.seedId.trim();
      await this.assertOwnedAgent(userId, seedId);
      where.push('seed_id = ?');
      params.push(seedId);
    }

    const rows = await this.db.all<any>(
      `
        SELECT
          credential_id,
          seed_id,
          owner_user_id,
          credential_type,
          label,
          masked_value,
          last_used_at,
          created_at,
          updated_at
        FROM wunderland_agent_credentials
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC
      `,
      params
    );

    return {
      items: rows.map((row) => this.mapCredential(row)),
    };
  }

  /**
   * Server-side only: returns decrypted secret values for the most-recent credential
   * rows matching each requested type. Never exposed through the public credentials API.
   */
  async getDecryptedValuesByType(
    userId: string,
    seedId: string,
    types: string[]
  ): Promise<Record<string, string | null>> {
    const normalizedSeedId = seedId.trim();
    await this.assertOwnedAgent(userId, normalizedSeedId);

    const requested = Array.from(new Set(types.map((t) => t.trim()).filter(Boolean)));
    const out: Record<string, string | null> = {};
    for (const t of requested) out[t] = null;
    if (requested.length === 0) return out;

    const placeholders = requested.map(() => '?').join(',');
    const rows = await this.db.all<{ credential_type: string; encrypted_value: string }>(
      `
        SELECT credential_type, encrypted_value
          FROM wunderland_agent_credentials
         WHERE owner_user_id = ?
           AND seed_id = ?
           AND credential_type IN (${placeholders})
         ORDER BY created_at DESC
      `,
      [userId, normalizedSeedId, ...requested]
    );

    for (const row of rows) {
      const type = String(row.credential_type);
      if (!(type in out)) continue;
      if (out[type] !== null) continue; // keep most-recent
      out[type] = this.decryptSecret(String(row.encrypted_value ?? '')) ?? null;
    }

    return out;
  }

  async createCredential(
    userId: string,
    dto: CreateCredentialDto
  ): Promise<{ credential: CredentialRecord }> {
    const seedId = dto.seedId.trim();
    await this.assertOwnedAgent(userId, seedId);
    await this.assertAgentNotSealed(seedId, ['credentials']);

    const type = dto.type.trim();
    const label = dto.label?.trim() || type;
    const value = dto.value.trim();
    const now = Date.now();
    const credentialId = this.db.generateId();

    await this.db.run(
      `
        INSERT INTO wunderland_agent_credentials (
          credential_id,
          seed_id,
          owner_user_id,
          credential_type,
          label,
          encrypted_value,
          masked_value,
          last_used_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
      `,
      [
        credentialId,
        seedId,
        userId,
        type,
        label,
        this.encryptSecret(value),
        this.maskSecret(value),
        now,
        now,
      ]
    );

    const row = await this.db.get<any>(
      `
        SELECT
          credential_id,
          seed_id,
          owner_user_id,
          credential_type,
          label,
          masked_value,
          last_used_at,
          created_at,
          updated_at
        FROM wunderland_agent_credentials
        WHERE credential_id = ?
          AND owner_user_id = ?
        LIMIT 1
      `,
      [credentialId, userId]
    );

    if (!row) {
      throw new NotFoundException('Credential could not be created.');
    }

    return { credential: this.mapCredential(row) };
  }

  async rotateCredential(
    userId: string,
    credentialId: string,
    dto: RotateCredentialDto
  ): Promise<{ credential: CredentialRecord }> {
    const now = Date.now();
    const value = dto.value.trim();

    const existing = await this.db.get<any>(
      `
        SELECT credential_id, seed_id, owner_user_id
          FROM wunderland_agent_credentials
         WHERE credential_id = ?
           AND owner_user_id = ?
         LIMIT 1
      `,
      [credentialId, userId]
    );
    if (!existing) {
      throw new NotFoundException(`Credential "${credentialId}" not found.`);
    }

    const seedId = String(existing.seed_id);
    await this.assertOwnedAgent(userId, seedId);

    await this.db.run(
      `
        UPDATE wunderland_agent_credentials
           SET encrypted_value = ?,
               masked_value = ?,
               updated_at = ?
         WHERE credential_id = ?
           AND owner_user_id = ?
      `,
      [this.encryptSecret(value), this.maskSecret(value), now, credentialId, userId]
    );

    const row = await this.db.get<any>(
      `
        SELECT
          credential_id,
          seed_id,
          owner_user_id,
          credential_type,
          label,
          masked_value,
          last_used_at,
          created_at,
          updated_at
        FROM wunderland_agent_credentials
        WHERE credential_id = ?
          AND owner_user_id = ?
        LIMIT 1
      `,
      [credentialId, userId]
    );

    if (!row) {
      throw new NotFoundException('Credential could not be rotated.');
    }

    return { credential: this.mapCredential(row) };
  }

  async deleteCredential(
    userId: string,
    credentialId: string
  ): Promise<{ credentialId: string; deleted: boolean }> {
    const existing = await this.db.get<{ credential_id: string; seed_id: string }>(
      `
        SELECT credential_id, seed_id
          FROM wunderland_agent_credentials
         WHERE credential_id = ?
           AND owner_user_id = ?
         LIMIT 1
      `,
      [credentialId, userId]
    );
    if (!existing) {
      throw new NotFoundException(`Credential "${credentialId}" not found.`);
    }
    await this.assertAgentNotSealed(String(existing.seed_id), ['credentials']);

    await this.db.run(
      'DELETE FROM wunderland_agent_credentials WHERE credential_id = ? AND owner_user_id = ?',
      [credentialId, userId]
    );

    return { credentialId, deleted: true };
  }

  private async assertAgentNotSealed(seedId: string, fields: string[]): Promise<void> {
    const state = await getAgentSealState(this.db as any, seedId);
    if (state?.isSealed) {
      throw new AgentImmutableException(seedId, fields);
    }
  }
}
