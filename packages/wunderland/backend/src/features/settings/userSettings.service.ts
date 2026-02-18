import type { StorageAdapter } from '@framers/sql-storage-adapter';
import { getAppDatabase } from '../../core/database/appDatabase';
import { encryptSecret, maskSecret, decryptSecret } from '../../utils/crypto';

export type ProviderKey = 'openai' | 'anthropic';

export interface ProviderSettings {
  apiKey?: string | null; // Plain when inbound; encrypted when stored
  model?: string | null;
}

export interface UserSettingsPayload {
  providers?: Partial<Record<ProviderKey, ProviderSettings>>;
  limits?: { rpm?: number | null };
}

export interface UserSettingsRecord {
  user_id: string;
  data: string; // JSON string
  updated_at: number;
}

async function ensureSchema(adapter: StorageAdapter): Promise<void> {
  await adapter.exec(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
}

function readEnvDefaults() {
  return {
    providers: {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || undefined,
        model: process.env.OPENAI_MODEL || process.env.OPENAI_DEFAULT_MODEL || undefined,
      },
      anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY || undefined,
        model: process.env.ANTHROPIC_MODEL || process.env.ANTHROPIC_DEFAULT_MODEL || undefined,
      },
    },
  } as UserSettingsPayload;
}

export async function getEffectiveUserSettings(userId: string) {
  const adapter = getAppDatabase();
  await ensureSchema(adapter);

  const row = await adapter.get<UserSettingsRecord>(`SELECT user_id, data, updated_at FROM user_settings WHERE user_id = ?`, [userId]);
  const env = readEnvDefaults();

  const userData: UserSettingsPayload | undefined = row ? (JSON.parse(row.data) as UserSettingsPayload) : undefined;

  const providers: Record<ProviderKey, any> = { openai: {}, anthropic: {} };
  (Object.keys(providers) as ProviderKey[]).forEach((provider) => {
    const envApiKey = env.providers?.[provider]?.apiKey;
    const envModel = env.providers?.[provider]?.model;

    const userProvider = userData?.providers?.[provider];
    const decryptedKey = userProvider?.apiKey ? decryptSecret(userProvider.apiKey) : undefined;

    providers[provider] = {
      apiKey: {
        set: Boolean(decryptedKey || envApiKey),
        masked: decryptedKey ? maskSecret(decryptedKey) : envApiKey ? maskSecret(envApiKey) : undefined,
        source: decryptedKey ? 'user' : envApiKey ? 'env' : 'none',
      },
      model: {
        value: userProvider?.model ?? envModel ?? undefined,
        source: userProvider?.model ? 'user' : envModel ? 'env' : 'none',
      },
    };
  });

  return {
    providers,
    limits: userData?.limits ?? { rpm: null },
    updatedAt: row?.updated_at ?? null,
  };
}

export async function upsertUserSettings(userId: string, payload: UserSettingsPayload) {
  const adapter = getAppDatabase();
  await ensureSchema(adapter);

  const existingRow = await adapter.get<UserSettingsRecord>(`SELECT user_id, data, updated_at FROM user_settings WHERE user_id = ?`, [userId]);
  const existing: UserSettingsPayload = existingRow ? (JSON.parse(existingRow.data) as UserSettingsPayload) : {};

  const next: UserSettingsPayload = { ...existing };
  if (payload.providers) {
    next.providers = { ...(existing.providers || {}) } as any;
    for (const [provider, cfg] of Object.entries(payload.providers)) {
      const p = provider as ProviderKey;
      next.providers![p] = next.providers![p] || {};
      if (cfg) {
        if (cfg.apiKey !== undefined) {
          // Null clears the stored key
          next.providers![p]!.apiKey = cfg.apiKey === null ? null : encryptSecret(cfg.apiKey);
        }
        if (cfg.model !== undefined) {
          next.providers![p]!.model = cfg.model;
        }
      }
    }
  }

  if (payload.limits) {
    next.limits = { ...(existing.limits || {}), ...payload.limits };
  }

  const serialized = JSON.stringify(next);
  const now = Date.now();

  if (existingRow) {
    await adapter.run(`UPDATE user_settings SET data = ?, updated_at = ? WHERE user_id = ?`, [serialized, now, userId]);
  } else {
    await adapter.run(`INSERT INTO user_settings (user_id, data, updated_at) VALUES (?, ?, ?)`, [userId, serialized, now]);
  }

  return { ok: true, updatedAt: now };
}


