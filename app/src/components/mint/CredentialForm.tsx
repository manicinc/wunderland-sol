'use client';

import { useState, useMemo } from 'react';
import { collectRequiredSecrets } from '@/data/catalog-data';

interface CredentialFormProps {
  selectedSkills: string[];
  selectedChannels: string[];
  selectedProvider: string | null;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export default function CredentialForm({
  selectedSkills,
  selectedChannels,
  selectedProvider,
  values,
  onChange,
}: CredentialFormProps) {
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});

  const requiredSecrets = useMemo(
    () => collectRequiredSecrets(selectedSkills, selectedChannels, selectedProvider),
    [selectedSkills, selectedChannels, selectedProvider],
  );

  if (requiredSecrets.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-[var(--text-secondary)]">No API keys required</div>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
          Your selected skills, channels, and provider don't require any API keys.
          You can proceed to the next step.
        </p>
      </div>
    );
  }

  const filledCount = requiredSecrets.filter((r) => (values[r.key] ?? '').trim().length > 0).length;

  return (
    <div>
      {/* Sealing info banner */}
      <div className="p-3 rounded-lg bg-[rgba(0,245,255,0.04)] border border-[rgba(0,245,255,0.15)] mb-4">
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          During setup, API keys can be added, rotated, or removed freely. After your agent is sealed,
          existing keys can still be <strong className="text-[var(--text-primary)]">rotated</strong> for
          operational security, but creating or deleting credential entries is locked. Everything else
          (name, personality, skills, channels) is frozen permanently when you seal.
        </p>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          API Keys ({filledCount}/{requiredSecrets.length} filled)
        </div>
        <button
          type="button"
          onClick={() => {/* skip handled by parent navigation */}}
          className="text-[10px] font-mono text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          All optional — can add later
        </button>
      </div>

      <div className="space-y-2">
        {requiredSecrets.map(({ key, source }) => {
          const show = showValues[key] ?? false;
          const value = values[key] ?? '';

          return (
            <div key={key} className="glass rounded-xl p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <code className="text-xs font-mono text-[var(--text-primary)]">{key}</code>
                <span className="text-[0.55rem] px-2 py-0.5 rounded-full bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.15)]">
                  {source}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type={show ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => onChange(key, e.target.value)}
                  placeholder={`Enter ${key}...`}
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-primary)] text-xs font-mono placeholder-[var(--text-tertiary)] outline-none focus:border-[rgba(0,245,255,0.4)] transition-colors"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowValues((prev) => ({ ...prev, [key]: !show }))}
                  className="px-2 py-2 rounded-lg text-[10px] font-mono bg-[var(--bg-glass)] text-[var(--text-tertiary)] border border-[var(--border-glass)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
                  aria-label={show ? 'Hide' : 'Show'}
                >
                  {show ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
        Credentials are stored encrypted in the backend vault (AES-256-GCM). They are never sent on-chain.
        You can skip this step and add them later via the dashboard.
      </p>
    </div>
  );
}
