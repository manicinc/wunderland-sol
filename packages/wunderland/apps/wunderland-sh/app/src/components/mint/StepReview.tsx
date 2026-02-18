'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { collectRequiredSecrets } from '@/data/catalog-data';
import { SKILLS, CHANNELS, PROVIDERS } from '@/data/catalog-data';
import { TRAIT_KEYS, TRAIT_LABELS, STEP_LABELS, type WizardState, type WizardStep } from './wizard-types';

interface StepReviewProps {
  state: WizardState;
  onMint: () => void;
  onEditStep: (step: WizardStep) => void;
  connected: boolean;
  maxReached: boolean;
  configReady: boolean;
  mintFeeSol: number | null;
  explorerClusterParam: string;
}

function SummaryCard({ label, step, onEdit, children }: {
  label: string;
  step: WizardStep;
  onEdit: (step: WizardStep) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">{label}</div>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="text-[10px] font-mono text-[var(--neon-cyan)] hover:text-[var(--text-primary)] transition-colors"
        >
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}

export default function StepReview({
  state,
  onMint,
  onEditStep,
  connected,
  maxReached,
  configReady,
  mintFeeSol,
  explorerClusterParam,
}: StepReviewProps) {
  const provider = state.selectedProvider
    ? PROVIDERS.find((p) => p.providerId === state.selectedProvider)
    : null;

  const requiredSecrets = useMemo(
    () => collectRequiredSecrets(state.selectedSkills, state.selectedChannels, state.selectedProvider),
    [state.selectedSkills, state.selectedChannels, state.selectedProvider],
  );

  const filledSecrets = requiredSecrets.filter((r) => (state.credentialValues[r.key] ?? '').trim().length > 0);

  // Post-mint success state
  if (state.mintSig) {
    return (
      <div className="grid gap-4">
        <div className="p-4 rounded-xl bg-[rgba(16,255,176,0.06)] border border-[rgba(16,255,176,0.2)]">
          <div className="text-sm font-semibold text-[var(--neon-green)]">Agent minted successfully!</div>
          <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono break-all">tx {state.mintSig}</div>

          {state.metadataPin.state === 'pinning' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono">Pinning metadata to IPFS...</div>
          )}
          {state.metadataPin.state === 'done' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono break-all">
              {state.metadataPin.cid ? `metadata_cid ${state.metadataPin.cid}` : 'metadata_cid --'}
              {state.metadataPin.pinned ? ' (pinned)' : state.metadataPin.error ? ` (not pinned: ${state.metadataPin.error})` : ' (not pinned)'}
            </div>
          )}

          {state.hostingMode === 'managed' && state.managedHosting.state === 'onboarding' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono">Managed hosting onboarding...</div>
          )}
          {state.hostingMode === 'managed' && state.managedHosting.state === 'done' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono break-all">
              managed_hosting {state.managedHosting.ok ? 'onboarded' : `failed: ${state.managedHosting.error || 'unknown'}`}
            </div>
          )}

          {state.credentialSubmission.state === 'submitting' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono">Submitting credentials...</div>
          )}
          {state.credentialSubmission.state === 'done' && (
            <div className="mt-2 text-[11px] text-[var(--text-tertiary)] font-mono">
              Credentials: {state.credentialSubmission.submitted} submitted
              {state.credentialSubmission.failed.length > 0 && (
                <span className="text-[var(--neon-red)]">
                  , {state.credentialSubmission.failed.length} failed
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={`https://explorer.solana.com/tx/${state.mintSig}${explorerClusterParam}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
          >
            View TX
          </a>
          {state.mintedAgentPda && (
            <Link
              href={`/agents/${state.mintedAgentPda}`}
              className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
            >
              View Agent
            </Link>
          )}
        </div>

        <div className="p-3 rounded-lg bg-[rgba(153,69,255,0.04)] border border-[rgba(153,69,255,0.12)]">
          <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
            Before sealing, you can adjust skills, channels, and provider settings via the dashboard.
            After sealing, only credential rotation is allowed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {/* Sealing reminder */}
      <div className="p-3 rounded-lg bg-[rgba(0,245,255,0.04)] border border-[rgba(0,245,255,0.15)]">
        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
          On-chain identity is <strong className="text-[var(--text-primary)]">immutable from mint</strong>.
          Off-chain config (skills, channels) locks at seal.
          API keys remain <strong className="text-[var(--text-primary)]">rotatable forever</strong>.
        </p>
      </div>

      {/* Identity */}
      <SummaryCard label={STEP_LABELS[1]} step={1} onEdit={onEditStep}>
        <div className="text-sm font-semibold text-[var(--text-primary)]">{state.displayName}</div>
        {state.selectedPreset && (
          <div className="text-[11px] text-[var(--text-tertiary)] font-mono mt-1">
            Preset: {state.selectedPreset.name}
          </div>
        )}
        <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
          Owner wallet: {state.hideOwner ? 'Hidden from profile' : 'Visible on profile'}
        </div>
      </SummaryCard>

      {/* Personality */}
      <SummaryCard label={STEP_LABELS[2]} step={2} onEdit={onEditStep}>
        <div className="grid grid-cols-2 gap-1">
          {TRAIT_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--text-tertiary)]">{TRAIT_LABELS[key]}</span>
              <span className="font-mono text-[var(--text-secondary)]">{Math.round(state.traits[key] * 100)}%</span>
            </div>
          ))}
        </div>
      </SummaryCard>

      {/* Skills & Channels */}
      <SummaryCard label={STEP_LABELS[3]} step={3} onEdit={onEditStep}>
        <div className="space-y-2">
          {state.selectedSkills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {state.selectedSkills.map((s) => {
                const skill = SKILLS.find((sk) => sk.name === s);
                return (
                  <span key={s} className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,245,255,0.08)] text-[var(--neon-cyan)] border border-[rgba(0,245,255,0.15)]">
                    {skill?.displayName ?? s}
                  </span>
                );
              })}
            </div>
          )}
          {state.selectedChannels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {state.selectedChannels.map((c) => {
                const ch = CHANNELS.find((ch) => ch.platform === c);
                return (
                  <span key={c} className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-[rgba(153,69,255,0.08)] text-[var(--sol-purple)] border border-[rgba(153,69,255,0.15)]">
                    {ch?.displayName ?? c}
                  </span>
                );
              })}
            </div>
          )}
          {provider && (
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono">
              Provider: {provider.displayName} ({provider.defaultModel})
            </div>
          )}
          {state.selectedSkills.length === 0 && state.selectedChannels.length === 0 && !provider && (
            <div className="text-[11px] text-[var(--text-tertiary)]">None selected (can configure later)</div>
          )}
        </div>
      </SummaryCard>

      {/* Credentials */}
      <SummaryCard label={STEP_LABELS[4]} step={4} onEdit={onEditStep}>
        <div className="text-[11px] text-[var(--text-tertiary)]">
          {requiredSecrets.length === 0
            ? 'No keys required'
            : `${filledSecrets.length}/${requiredSecrets.length} keys provided (can add later)`}
        </div>
      </SummaryCard>

      {/* Signer */}
      <SummaryCard label={STEP_LABELS[5]} step={5} onEdit={onEditStep}>
        <div className="text-[11px] font-mono text-[var(--text-secondary)] break-all">
          {state.agentSignerPubkey || 'Not set'}
        </div>
        <div className="text-[11px] text-[var(--text-tertiary)] mt-1">
          Hosting: {state.hostingMode === 'managed' ? 'Managed' : 'Self-hosted'}
        </div>
      </SummaryCard>

      {/* Mint fee */}
      {mintFeeSol !== null && (
        <div className="glass rounded-xl p-3 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Mint Fee</span>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{mintFeeSol.toFixed(2)} SOL</span>
        </div>
      )}

      {/* Errors */}
      {state.mintError && (
        <div className="p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.2)]">
          <div className="text-sm text-[var(--neon-red)]">Mint failed</div>
          <div className="mt-1 text-[11px] text-[var(--text-tertiary)] font-mono break-all">{state.mintError}</div>
        </div>
      )}

      {/* Mint button */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <div className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
          Fees are enforced on-chain. You also pay rent for the new accounts.
        </div>
        <button
          type="button"
          onClick={onMint}
          disabled={!connected || state.isMinting || maxReached || !configReady}
          className="px-5 py-3 rounded-lg text-xs font-mono uppercase bg-[rgba(var(--neon-cyan-rgb,0,255,255),0.10)] text-[var(--text-primary)] border border-[rgba(var(--neon-cyan-rgb,0,255,255),0.25)] hover:bg-[rgba(var(--neon-cyan-rgb,0,255,255),0.16)] transition-all disabled:opacity-40 disabled:hover:bg-[rgba(var(--neon-cyan-rgb,0,255,255),0.10)] shrink-0"
        >
          {state.isMinting ? 'Minting...' : maxReached ? 'Cap Reached' : 'Mint Agent'}
        </button>
      </div>
    </div>
  );
}
