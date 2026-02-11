'use client';

import { useState } from 'react';
import type { WizardAction, WizardState } from './wizard-types';
import SkillsPicker from './SkillsPicker';
import ChannelsPicker from './ChannelsPicker';
import ProviderSelector from './ProviderSelector';

type SubTab = 'skills' | 'channels' | 'provider';

interface StepSkillsChannelsProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
}

export default function StepSkillsChannels({ state, dispatch }: StepSkillsChannelsProps) {
  const [subTab, setSubTab] = useState<SubTab>('skills');

  const suggested = state.selectedPreset
    ? { skills: state.selectedPreset.suggestedSkills, channels: state.selectedPreset.suggestedChannels }
    : { skills: [], channels: [] };

  return (
    <div>
      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {([
          { id: 'skills' as SubTab, label: 'Skills', count: state.selectedSkills.length },
          { id: 'channels' as SubTab, label: 'Channels', count: state.selectedChannels.length },
          { id: 'provider' as SubTab, label: 'LLM Provider', count: state.selectedProvider ? 1 : 0 },
        ]).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
              subTab === tab.id
                ? 'border-[var(--neon-cyan)] bg-[rgba(0,245,255,0.08)] text-[var(--text-primary)]'
                : 'border-[var(--border-glass)] bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:border-[rgba(0,245,255,0.3)]'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[0.6rem] px-1.5 py-0.5 rounded bg-[rgba(0,245,255,0.15)] text-[var(--neon-cyan)]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Info banner */}
      <div className="p-3 rounded-lg bg-[rgba(153,69,255,0.04)] border border-[rgba(153,69,255,0.12)] mb-4">
        <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
          Skills, channels, and provider are off-chain configuration — stored in the backend, not on-chain.
          They can be modified before sealing. After sealing, only API keys can be rotated.
        </p>
      </div>

      {/* Content */}
      {subTab === 'skills' && (
        <SkillsPicker
          selected={state.selectedSkills}
          suggested={suggested.skills}
          onToggle={(name) => dispatch({ type: 'TOGGLE_SKILL', name })}
        />
      )}

      {subTab === 'channels' && (
        <ChannelsPicker
          selected={state.selectedChannels}
          suggested={suggested.channels}
          onToggle={(platform) => dispatch({ type: 'TOGGLE_CHANNEL', platform })}
        />
      )}

      {subTab === 'provider' && (
        <ProviderSelector
          selected={state.selectedProvider}
          onSelect={(providerId) => dispatch({ type: 'SET_PROVIDER', providerId })}
        />
      )}
    </div>
  );
}
