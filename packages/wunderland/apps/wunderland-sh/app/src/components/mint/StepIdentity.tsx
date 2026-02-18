'use client';

import { useCallback } from 'react';
import PresetSelector from '@/components/PresetSelector';
import NLDescribePanel from './NLDescribePanel';
import type { AgentPreset, WizardAction, WizardState } from './wizard-types';
import { generateRandomAgentName } from './random-names';

interface StepIdentityProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  onQuickMint: () => void;
}

export default function StepIdentity({ state, dispatch, onQuickMint }: StepIdentityProps) {
  const handlePresetSelect = (preset: AgentPreset) => {
    dispatch({ type: 'SELECT_PRESET', preset });
  };

  const handleRandomize = useCallback(() => {
    dispatch({ type: 'SET_DISPLAY_NAME', name: generateRandomAgentName() });
  }, [dispatch]);

  const nameBytes = new TextEncoder().encode(state.displayName.trim()).length;
  const nameTooLong = nameBytes > 32;

  return (
    <div className="grid gap-4">
      {/* NL Describe Panel — AI suggestions above preset selector */}
      <NLDescribePanel dispatch={dispatch} />

      <div>
        <label htmlFor="displayName" className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Display Name
        </label>
        <div className="flex gap-2 mt-2">
          <input
            id="displayName"
            value={state.displayName}
            onChange={(e) => dispatch({ type: 'SET_DISPLAY_NAME', name: e.target.value })}
            className={`search-input-glow w-full px-4 py-3 rounded-lg bg-[var(--bg-glass)] border text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-sm focus:outline-none transition-all duration-300 ${
              nameTooLong
                ? 'border-[rgba(255,50,50,0.4)] focus:border-[rgba(255,50,50,0.6)]'
                : 'border-[var(--border-glass)] focus:border-[var(--neon-cyan)]/50'
            }`}
            placeholder="My Agent"
            maxLength={64}
          />
          <button
            type="button"
            onClick={handleRandomize}
            className="shrink-0 px-3 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:border-[var(--neon-cyan)]/40 transition-all duration-200 cursor-pointer"
            title="Randomize name"
            aria-label="Generate random agent name"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.2" />
              <circle cx="4" cy="4" r="0.8" fill="currentColor" />
              <circle cx="10.5" cy="10.5" r="0.8" fill="currentColor" />
              <circle cx="13.5" cy="10.5" r="0.8" fill="currentColor" />
              <circle cx="10.5" cy="13.5" r="0.8" fill="currentColor" />
              <circle cx="13.5" cy="13.5" r="0.8" fill="currentColor" />
              <circle cx="12" cy="12" r="0.8" fill="currentColor" />
            </svg>
          </button>
        </div>
        <div className={`mt-1 text-[10px] font-mono ${nameTooLong ? 'text-[var(--neon-red)]' : 'text-[var(--text-tertiary)]'}`}>
          {nameBytes}/32 UTF-8 bytes{nameTooLong ? ' (too long!)' : ''}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
          Agent Preset
        </label>
        <PresetSelector
          onSelect={handlePresetSelect}
          selected={state.selectedPreset}
          className="mt-2"
        />
        {state.selectedPreset && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {state.selectedPreset.suggestedSkills.map((s) => (
              <span key={s} className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[rgba(0,229,255,0.08)] text-[var(--neon-cyan)] border border-[rgba(0,229,255,0.15)]">
                {s}
              </span>
            ))}
            {state.selectedPreset.suggestedChannels.map((c) => (
              <span key={c} className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[rgba(153,69,255,0.08)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.15)]">
                {c}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 text-[10px] text-[var(--text-tertiary)] font-mono">
          {state.selectedPreset
            ? 'Preset auto-fills personality, skills, and channels. Customize in later steps.'
            : 'Optional. Choose a preset to auto-fill, or configure manually.'}
        </div>
      </div>

      {/* Owner visibility toggle */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
              Owner Wallet Visibility
            </div>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
              {state.hideOwner
                ? 'Owner wallet will be hidden from the web profile. Note: on-chain data is always public on Solana.'
                : 'Owner wallet is visible on the agent profile page.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_HIDE_OWNER', hide: !state.hideOwner })}
            className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
              state.hideOwner
                ? 'bg-[rgba(153,69,255,0.3)] border border-[rgba(153,69,255,0.4)]'
                : 'bg-[var(--bg-glass)] border border-[var(--border-glass)]'
            }`}
            role="switch"
            aria-checked={state.hideOwner}
            aria-label="Hide owner wallet from profile"
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full transition-all ${
                state.hideOwner
                  ? 'left-[22px] bg-[var(--sol-purple)]'
                  : 'left-0.5 bg-[var(--text-tertiary)]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Mint CTA */}
      {state.selectedPreset && (
        <div className="p-4 rounded-xl bg-[rgba(16,255,176,0.04)] border border-[rgba(16,255,176,0.15)]">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs font-semibold text-[var(--neon-green)]">Quick Mint</div>
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1">
                Use preset defaults and skip to signer generation. You can customize skills, channels, and API keys later.
              </p>
            </div>
            <button
              type="button"
              onClick={onQuickMint}
              className="px-4 py-2.5 rounded-lg text-xs font-mono uppercase bg-[rgba(16,255,176,0.10)] text-[var(--neon-green)] border border-[rgba(16,255,176,0.25)] hover:bg-[rgba(16,255,176,0.16)] transition-all shrink-0"
            >
              Quick Mint
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
