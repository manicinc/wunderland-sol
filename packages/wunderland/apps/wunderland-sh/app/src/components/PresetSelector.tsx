'use client';

import { useState, useRef, useEffect } from 'react';
import type { AgentPreset, TraitsState } from '@/components/mint/wizard-types';
import { ROLE_PRESETS, PERSONALITY_PRESETS } from '@/data/agent-presets';

export type { AgentPreset, TraitsState };

/* ── HEXACO colour keys for the trait dot visualisation ── */
const TRAIT_KEYS: (keyof TraitsState)[] = [
  'honestyHumility', 'emotionality', 'extraversion',
  'agreeableness', 'conscientiousness', 'openness',
];
const TRAIT_COLORS: Record<keyof TraitsState, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

/* ── Trait dot bar ── */
function TraitDots({ traits }: { traits: TraitsState }) {
  return (
    <div className="flex gap-1 mt-1">
      {TRAIT_KEYS.map((key) => (
        <div
          key={key}
          className="rounded-full"
          style={{
            width: 6,
            height: 6,
            background: TRAIT_COLORS[key],
            opacity: 0.3 + traits[key] * 0.7,
          }}
          title={`${key}: ${Math.round(traits[key] * 100)}%`}
        />
      ))}
    </div>
  );
}

/* ── Component ── */
interface PresetSelectorProps {
  onSelect: (preset: AgentPreset) => void;
  selected?: AgentPreset | null;
  className?: string;
}

export default function PresetSelector({ onSelect, selected, className = '' }: PresetSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside dismiss
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-lg
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-secondary)] text-sm font-medium
          hover:bg-[var(--bg-glass-hover)] hover:border-[rgba(153,69,255,0.2)]
          transition-all duration-200"
      >
        <span>{selected ? selected.name : 'Choose a preset...'}</span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute z-50 left-0 right-0 mt-2 rounded-xl overflow-hidden
            border border-[var(--border-glass)]
            bg-[var(--bg-surface)] backdrop-blur-xl
            shadow-[0_8px_32px_rgba(0,0,0,0.15),0_0_16px_rgba(153,69,255,0.06)]
            max-h-[380px] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {/* Agent Roles */}
          <div className="px-3 pt-3 pb-1">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Agent Roles
            </div>
            {ROLE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all duration-150
                  ${selected?.id === p.id
                    ? 'bg-[rgba(153,69,255,0.12)] border border-[rgba(153,69,255,0.25)]'
                    : 'hover:bg-[var(--bg-glass-hover)] border border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <TraitDots traits={p.traits} />
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="mx-3 border-t border-[var(--border-glass)]" />

          {/* Personality Types */}
          <div className="px-3 pt-2 pb-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
              Personality Types
            </div>
            {PERSONALITY_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => { onSelect(p); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all duration-150
                  ${selected?.id === p.id
                    ? 'bg-[rgba(153,69,255,0.12)] border border-[rgba(153,69,255,0.25)]'
                    : 'hover:bg-[var(--bg-glass-hover)] border border-transparent'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                  <TraitDots traits={p.traits} />
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { ALL_PRESETS } from '@/data/agent-presets';
