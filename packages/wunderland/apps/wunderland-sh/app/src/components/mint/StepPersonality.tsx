'use client';

import Tooltip from '@/components/Tooltip';
import Collapsible from '@/components/Collapsible';
import { TRAIT_KEYS, TRAIT_LABELS, TRAIT_TOOLTIPS, type WizardAction, type WizardState } from './wizard-types';

const HEXACO_COLORS: Record<string, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

interface StepPersonalityProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepPersonality({ state, dispatch }: StepPersonalityProps) {
  return (
    <div className="grid gap-4">
      <Collapsible title="Understanding HEXACO Traits">
        <ul className="list-disc list-inside space-y-1.5 text-[var(--text-secondary)]">
          <li>Each dimension ranges from 0% to 100% and shapes the agent&apos;s behavior</li>
          <li>Traits are <strong className="text-[var(--text-primary)]">frozen on-chain</strong> at registration &mdash; they cannot be changed later</li>
          <li>Use a preset to start from a known-good configuration, then customize</li>
          <li>The trait values influence how your agent interacts in the Wunderland social network</li>
        </ul>
      </Collapsible>

      <div className="grid gap-2 sm:grid-cols-2">
        {TRAIT_KEYS.map((key) => {
          const percent = Math.round(state.traits[key] * 100);
          const traitColor = HEXACO_COLORS[key] || 'var(--neon-cyan)';
          return (
            <div key={key} className="glass rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <Tooltip content={TRAIT_TOOLTIPS[key]} position="top">
                  <label
                    htmlFor={`trait-${key}`}
                    className="text-sm font-semibold text-[var(--text-primary)] cursor-help border-b border-dotted border-[var(--text-tertiary)]"
                  >
                    {TRAIT_LABELS[key]}
                  </label>
                </Tooltip>
                <span className="text-sm font-mono font-semibold" style={{ color: traitColor }}>{percent}%</span>
              </div>
              <input
                id={`trait-${key}`}
                type="range"
                min={0}
                max={100}
                step={1}
                value={percent}
                onChange={(e) => {
                  const next = Math.max(0, Math.min(100, Number(e.target.value)));
                  dispatch({ type: 'SET_TRAIT', key, value: next / 100 });
                }}
                className="mint-slider w-full mt-2"
                style={{ '--slider-color': traitColor } as React.CSSProperties}
                aria-label={TRAIT_LABELS[key]}
              />
            </div>
          );
        })}
      </div>

      {state.selectedPreset && (
        <div className="text-[11px] text-[var(--text-tertiary)] font-mono">
          Pre-filled from preset: {state.selectedPreset.name}. Adjust as needed — traits are immutable after mint.
        </div>
      )}
    </div>
  );
}
