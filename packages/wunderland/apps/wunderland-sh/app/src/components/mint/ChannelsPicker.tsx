'use client';

import { useState, useMemo } from 'react';
import { CHANNELS, CHANNEL_TIERS } from '@/data/catalog-data';

interface ChannelsPickerProps {
  selected: string[];
  suggested: string[];
  onToggle: (platform: string) => void;
}

const TIER_LABELS: Record<string, string> = {
  P0: 'Core',
  P1: 'Extended',
  P2: 'Community',
  P3: 'Experimental',
};

export default function ChannelsPicker({ selected, suggested, onToggle }: ChannelsPickerProps) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return CHANNELS.filter((c) => {
      if (filter !== 'all' && c.tier !== filter) return false;
      return true;
    });
  }, [filter]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const ch of filtered) {
      (groups[ch.tier] ??= []).push(ch);
    }
    return groups;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Channels ({selected.length} selected)
        </div>
        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{CHANNELS.length} available</span>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {CHANNEL_TIERS.map((tier) => (
          <button
            key={tier}
            type="button"
            onClick={() => setFilter(tier)}
            className={`px-2 py-1 rounded-full border text-[0.6rem] uppercase tracking-wider transition-all ${
              filter === tier
                ? 'border-[var(--sol-purple)] bg-[rgba(153,69,255,0.1)] text-[var(--sol-purple)]'
                : 'border-[var(--border-glass)] text-[var(--text-tertiary)] hover:border-[rgba(153,69,255,0.3)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tier === 'all' ? 'All' : `${tier} ${TIER_LABELS[tier] || ''}`}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([tier, channels]) => (
        <div key={tier} className="mb-4">
          {filter === 'all' && (
            <div className="text-[0.6rem] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              {tier} — {TIER_LABELS[tier]}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {channels.map((ch) => {
              const isSelected = selected.includes(ch.platform);
              const isSuggested = suggested.includes(ch.platform);

              return (
                <button
                  key={ch.platform}
                  type="button"
                  onClick={() => onToggle(ch.platform)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 ${
                    isSelected
                      ? 'bg-[rgba(153,69,255,0.06)] border-[rgba(153,69,255,0.25)] shadow-[0_0_8px_rgba(153,69,255,0.08)]'
                      : 'bg-[var(--bg-glass)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:border-[rgba(153,69,255,0.15)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-xs font-semibold ${isSelected ? 'text-[var(--sol-purple)]' : 'text-[var(--text-primary)]'}`}>
                      {ch.displayName}
                    </span>
                    {isSuggested && (
                      <span className="text-[0.5rem] font-mono px-1 py-0.5 rounded bg-[rgba(153,69,255,0.1)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.2)]">
                        Suggested
                      </span>
                    )}
                  </div>
                  <p className="text-[0.6rem] text-[var(--text-tertiary)] mt-1 line-clamp-2 leading-relaxed">
                    {ch.description}
                  </p>
                  {ch.requiredSecrets.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {ch.requiredSecrets.map((s) => (
                        <span key={s} className="text-[0.5rem] font-mono px-1 py-0.5 rounded bg-[rgba(255,215,0,0.08)] text-[var(--deco-gold)] border border-[rgba(255,215,0,0.12)]">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
