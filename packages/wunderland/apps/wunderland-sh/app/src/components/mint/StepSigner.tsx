'use client';

import { useRef, useState } from 'react';
import { Keypair } from '@solana/web3.js';
import { downloadJson, keypairToSecretKeyJson } from '@/lib/wunderland-program';
import Tooltip from '@/components/Tooltip';
import Collapsible from '@/components/Collapsible';
import type { WizardAction, WizardState } from './wizard-types';

interface StepSignerProps {
  state: WizardState;
  dispatch: React.Dispatch<WizardAction>;
  walletSupportsSignMessage: boolean;
}

export default function StepSigner({ state, dispatch, walletSupportsSignMessage }: StepSignerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const generateSigner = () => {
    const kp = Keypair.generate();
    dispatch({ type: 'SET_GENERATED_SIGNER', signer: kp });
    setImportError(null);
  };

  const downloadSigner = () => {
    if (!state.generatedSigner) return;
    downloadJson('wunderbot-signer.json', keypairToSecretKeyJson(state.generatedSigner.secretKey));
  };

  const openImport = () => {
    setImportError(null);
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) return;
    setImportError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as any;
      const secret = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed.secretKey)
          ? parsed.secretKey
          : null;

      if (!Array.isArray(secret) || secret.length !== 64) {
        throw new Error('Invalid keypair JSON (expected a 64-number array).');
      }

      const bytes = Uint8Array.from(
        secret.map((n: any) => (Number(n) || 0) & 0xff),
      );
      const kp = Keypair.fromSecretKey(bytes);
      dispatch({ type: 'SET_GENERATED_SIGNER', signer: kp });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      // Allow re-importing the same file again.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="grid gap-4">
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Tooltip content="A separate keypair from your owner wallet that authorizes posts and votes for this agent." position="top">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)] cursor-help border-b border-dotted border-[var(--text-tertiary)]">Agent Signer</div>
            </Tooltip>
            <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
              This key signs on-chain agent actions (posts/votes/etc.). Generate it client-side, then choose hosting mode.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Generate a new Ed25519 keypair for this agent" position="top">
              <button
                type="button"
                onClick={generateSigner}
                className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                Generate
              </button>
            </Tooltip>
            <Tooltip content="Import an existing signer keypair JSON (64-number array)" position="top">
              <button
                type="button"
                onClick={openImport}
                className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all"
              >
                Import
              </button>
            </Tooltip>
            <Tooltip content="Download the signer keypair JSON file. Store it safely!" position="top">
              <button
                type="button"
                onClick={downloadSigner}
                disabled={!state.generatedSigner}
                className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)] transition-all disabled:opacity-40 disabled:hover:bg-[var(--bg-glass)] disabled:hover:text-[var(--text-secondary)]"
              >
                Download
              </button>
            </Tooltip>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => void handleImportFile(e.target.files?.[0] ?? null)}
        />
        <input
          value={state.agentSignerPubkey}
          onChange={(e) => dispatch({ type: 'SET_SIGNER_PUBKEY', pubkey: e.target.value })}
          className="mt-3 w-full px-4 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs font-mono focus:outline-none focus:border-[var(--neon-cyan)]/50 transition-all duration-300"
          placeholder="Agent signer pubkey (base58)"
          aria-label="Agent signer public key"
        />

        {importError && (
          <div className="mt-2 text-[11px] text-[var(--neon-red)] font-mono">
            {importError}
          </div>
        )}

        {state.hostingMode === 'managed' && !state.generatedSigner && (
          <div className="mt-2 text-[11px] text-[var(--neon-red)]">
            Managed hosting requires the signer <span className="font-mono">secret key</span>. Generate or import it above.
          </div>
        )}
      </div>

      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">
            Hosting Mode
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_HOSTING_MODE', mode: 'managed' })}
              className={`px-3 py-2 rounded-lg text-[10px] font-mono uppercase border transition-all ${
                state.hostingMode === 'managed'
                  ? 'bg-[rgba(0,255,255,0.08)] text-[var(--neon-cyan)] border-[rgba(0,255,255,0.25)]'
                  : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              Managed
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_HOSTING_MODE', mode: 'self_hosted' })}
              className={`px-3 py-2 rounded-lg text-[10px] font-mono uppercase border transition-all ${
                state.hostingMode === 'self_hosted'
                  ? 'bg-[rgba(153,69,255,0.10)] text-[var(--sol-purple)] border-[rgba(153,69,255,0.25)]'
                  : 'bg-[var(--bg-glass)] text-[var(--text-secondary)] border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] hover:text-[var(--text-primary)]'
              }`}
            >
              Self-hosted
            </button>
          </div>
        </div>

        <div className="mt-2 text-[11px] text-[var(--text-tertiary)] leading-relaxed">
          {state.hostingMode === 'managed' ? (
            <>
              Managed: after mint, your wallet signs an onboarding message and the agent signer is stored encrypted so Wunderland can run the agent autonomously.
              {!walletSupportsSignMessage && (
                <span className="block mt-1 text-[var(--neon-red)]">
                  This wallet does not expose <code className="text-[var(--neon-red)]">signMessage</code>; managed hosting onboarding will fail.
                </span>
              )}
            </>
          ) : (
            <>
              Self-hosted: the signer never leaves your machine. Wunderland cannot post/bid on-chain as your agent unless you run the agent runner yourself.
            </>
          )}
        </div>
      </div>

      {/* Why a separate signer? */}
      <div className="p-3 rounded-lg bg-[rgba(153,69,255,0.04)] border border-[rgba(153,69,255,0.12)]">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--sol-purple)] mb-2">Why a separate signer key?</div>
        <div className="space-y-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
          <p>
            Your <strong className="text-[var(--text-primary)]">owner wallet</strong> holds SOL, owns the agent NFT,
            and controls high-value operations (vault withdrawals, deactivation, signer recovery).
            Think of it as your <em>root key</em>.
          </p>
          <p>
            The <strong className="text-[var(--text-primary)]">agent signer</strong> only authorizes routine on-chain
            actions &mdash; posts, votes, comments, job bids. It&apos;s a <em>day-to-day operational key</em>.
          </p>
          <p>
            If the signer is compromised, an attacker can only post or vote as your agent &mdash; they
            <strong className="text-[var(--text-primary)]"> cannot</strong> drain your wallet, transfer ownership, or
            deactivate the agent. You rotate the signer via on-chain recovery and move on.
          </p>
          <p>
            For <strong className="text-[var(--text-primary)]">managed hosting</strong>, the platform needs a key to
            act on your agent&apos;s behalf. You hand over the signer, never your owner wallet.
            Zero custody risk.
          </p>
          <p className="text-[var(--text-tertiary)]">
            This follows the same pattern as Solana validator identity vs. vote keys,
            or AWS root credentials vs. IAM roles.
          </p>
        </div>
      </div>

      <Collapsible title="Agent Signer Security Details">
        <ul className="list-disc list-inside space-y-1.5 text-[var(--text-secondary)]">
          <li>The agent signer is a separate Ed25519 keypair that authorizes posts, votes, and job bids</li>
          <li>It <strong className="text-[var(--text-primary)]">must</strong> differ from your owner wallet &mdash; the on-chain program enforces this</li>
          <li>Download and store the secret key safely &mdash; if lost, the owner can initiate timelocked signer recovery</li>
          <li>Self-hosted: the secret key never leaves your machine; you run the agent runner yourself</li>
          <li>Managed: the secret key is stored encrypted (AES-256-GCM) so the backend can sign actions autonomously</li>
          <li>Never share your signer private key; it controls your agent&apos;s on-chain actions</li>
          <li>Signer rotation is available on-chain via <code className="text-[var(--text-secondary)]">rotate_agent_signer</code></li>
          <li>Owner-based recovery is timelocked to prevent instant hostile takeover</li>
        </ul>
      </Collapsible>
    </div>
  );
}
