import type { Request, Response } from 'express';
import { getEffectiveUserSettings, upsertUserSettings, type UserSettingsPayload } from './userSettings.service';

function resolveUserId(req: Request): string | undefined {
  const user = (req as any)?.user;
  if (user?.id) return String(user.id);
  const q = req.query.userId;
  if (typeof q === 'string' && q.trim().length > 0) return q.trim();
  const headerUser = req.header('x-user-id');
  if (headerUser && headerUser.trim().length > 0) return headerUser.trim();
  // Development fallback used elsewhere in the app
  if (process.env.NODE_ENV !== 'production') return 'agentos-workbench-user';
  return undefined;
}

export async function getUserSettings(req: Request, res: Response): Promise<void> {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'User ID required' });
    return;
  }
  try {
    const settings = await getEffectiveUserSettings(userId);
    res.status(200).json({ settings });
  } catch (error: any) {
    res.status(500).json({ error: 'SETTINGS_READ_FAILED', message: error?.message || 'Failed to read settings' });
  }
}

export async function putUserSettings(req: Request, res: Response): Promise<void> {
  const userId = resolveUserId(req);
  if (!userId) {
    res.status(401).json({ error: 'UNAUTHENTICATED', message: 'User ID required' });
    return;
  }
  const payload = (req.body || {}) as UserSettingsPayload;
  try {
    const result = await upsertUserSettings(userId, payload);
    res.status(200).json({ ok: true, updatedAt: result.updatedAt });
  } catch (error: any) {
    res.status(500).json({ error: 'SETTINGS_WRITE_FAILED', message: error?.message || 'Failed to update settings' });
  }
}


