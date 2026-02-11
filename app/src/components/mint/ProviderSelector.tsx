'use client';

import { PROVIDERS } from '@/data/catalog-data';

interface ProviderSelectorProps {
  selected: string | null;
  onSelect: (providerId: string | null) => void;
}

export default function ProviderSelector({ selected, onSelect }: ProviderSelectorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          LLM Provider
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{PROVIDERS.length} available</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {PROVIDERS.map((p) => {
          const isSelected = selected === p.providerId;
          const noKey = p.requiredSecrets.length === 0;

          return (
            <button
              key={p.providerId}
              type="button"
              onClick={() => onSelect(isSelected ? null : p.providerId)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
                isSelected
                  ? 'bg-[rgba(16,255,176,0.06)] border-[rgba(16,255,176,0.25)] shadow-[0_0_8px_rgba(16,255,176,0.08)]'
                  : 'bg-[var(--bg-glass)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:border-[rgba(16,255,176,0.15)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--neon-green)]' : 'text-[var(--text-primary)]'}`}>
                  {p.displayName}
                </span>
                {noKey && (
                  <span className="text-[0.5rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(16,255,176,0.1)] text-[var(--neon-green)] border border-[rgba(16,255,176,0.2)]">
                    No key needed
                  </span>
                )}
              </div>
              <p className="text-[0.6rem] text-[var(--text-tertiary)] mt-1 line-clamp-1 leading-relaxed">
                {p.description}
              </p>
              <div className="mt-1.5 text-[0.55rem] font-mono text-[var(--text-tertiary)]">
                {p.defaultModel}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
