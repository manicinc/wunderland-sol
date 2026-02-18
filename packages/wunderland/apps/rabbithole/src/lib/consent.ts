/**
 * Cookie / analytics consent management.
 *
 * - Preferences are cached in localStorage for anonymous visitors.
 * - When a user is authenticated the preferences are synced to their
 *   account via PUT /api/user/consent so they persist across devices.
 * - Changes are broadcast via a custom DOM event so the analytics loader
 *   can react in real-time without a page reload.
 */

const STORAGE_KEY = 'rh-consent';

export interface ConsentPreferences {
  /** Strictly-necessary cookies — always true, cannot be disabled */
  necessary: true;
  /** Analytics cookies (Microsoft Clarity, aggregate usage stats) */
  analytics: boolean;
  /** Functional cookies (theme, sidebar state, preferences) */
  functional: boolean;
  /** Marketing / third-party tracking — currently unused, future-proof */
  marketing: boolean;
  /** ISO timestamp of when the user last made a consent decision */
  updatedAt: string;
}

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  functional: true,
  marketing: false,
  updatedAt: '',
};

// ---------------------------------------------------------------------------
// Local persistence
// ---------------------------------------------------------------------------

export function getConsent(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentPreferences;
  } catch {
    return null;
  }
}

export function setConsent(prefs: Partial<ConsentPreferences>): ConsentPreferences {
  const current = getConsent() ?? { ...DEFAULT_PREFERENCES };
  const merged: ConsentPreferences = {
    ...current,
    ...prefs,
    necessary: true, // always enforced
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));

  // Broadcast so analytics loader can react immediately
  window.dispatchEvent(new CustomEvent('rh-consent-change', { detail: merged }));

  return merged;
}

/** Accept all optional categories */
export function acceptAll(): ConsentPreferences {
  return setConsent({ analytics: true, functional: true, marketing: true });
}

/** Reject all optional categories */
export function rejectAll(): ConsentPreferences {
  return setConsent({ analytics: false, functional: false, marketing: false });
}

/** Has the user made any consent decision at all? */
export function hasConsentDecision(): boolean {
  const c = getConsent();
  return c !== null && c.updatedAt !== '';
}

// ---------------------------------------------------------------------------
// Account sync (for authenticated users)
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

/**
 * Push local consent preferences to the backend so they persist across
 * devices. Called automatically after setConsent when a token is available.
 */
export async function syncConsentToAccount(token: string): Promise<void> {
  const prefs = getConsent();
  if (!prefs) return;
  try {
    await fetch(`${API_BASE}/user/consent`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(prefs),
    });
  } catch {
    // Silently ignore — local cache is the source of truth
  }
}

/**
 * Pull consent preferences from the backend and merge into localStorage.
 * Remote preferences win if they are newer.
 */
export async function pullConsentFromAccount(token: string): Promise<ConsentPreferences | null> {
  try {
    const res = await fetch(`${API_BASE}/user/consent`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const remote = (await res.json()) as ConsentPreferences;
    const local = getConsent();

    // Remote is newer → overwrite local
    if (!local || !local.updatedAt || (remote.updatedAt && remote.updatedAt > local.updatedAt)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
      window.dispatchEvent(new CustomEvent('rh-consent-change', { detail: remote }));
      return remote;
    }
    return local;
  } catch {
    return getConsent();
  }
}
