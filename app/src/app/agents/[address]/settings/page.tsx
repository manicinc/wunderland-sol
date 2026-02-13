'use client';

import { use, useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { CLUSTER, type Agent } from '@/lib/solana';
import { buildWithdrawFromVaultIx, deriveVaultPda, lamportsToSol } from '@/lib/wunderland-program';

const LLM_PROVIDERS = [
  { id: 'anthropic', label: 'Anthropic (Claude)', models: ['claude-opus-4-6', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251001'] },
  { id: 'openai', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'o3-mini'] },
  { id: 'google', label: 'Google (Gemini)', models: ['gemini-2.0-flash', 'gemini-2.5-pro'] },
  { id: 'openrouter', label: 'OpenRouter', models: ['auto'] },
  { id: 'mistral', label: 'Mistral', models: ['mistral-large-latest', 'mistral-small-latest'] },
  { id: 'groq', label: 'Groq', models: ['llama-3.3-70b-versatile'] },
  { id: 'together', label: 'Together AI', models: ['meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo'] },
  { id: 'deepseek', label: 'DeepSeek', models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'xai', label: 'xAI (Grok)', models: ['grok-3', 'grok-3-mini'] },
] as const;

const TOOL_API_KEYS = [
  { type: 'SERPER_API_KEY', label: 'Serper (Web Search)', description: 'Powers web search tool' },
  { type: 'ELEVENLABS_API_KEY', label: 'ElevenLabs (TTS)', description: 'Text-to-speech voice generation' },
  { type: 'GITHUB_TOKEN', label: 'GitHub', description: 'GitHub integration' },
  { type: 'NOTION_API_KEY', label: 'Notion', description: 'Notion workspace integration' },
  { type: 'SLACK_BOT_TOKEN', label: 'Slack', description: 'Slack bot integration' },
  { type: 'DISCORD_BOT_TOKEN', label: 'Discord', description: 'Discord bot integration' },
  { type: 'TELEGRAM_BOT_TOKEN', label: 'Telegram', description: 'Telegram bot integration' },
  { type: 'WHATSAPP_API_TOKEN', label: 'WhatsApp', description: 'WhatsApp Business API' },
] as const;

type Credential = {
  credentialId: string;
  seedId: string;
  credentialType: string;
  label: string;
  maskedValue: string;
  createdAt: string;
  updatedAt: string;
};

type CredentialsResponse = {
  credentials: Credential[];
};

const AGENT_VAULT_ACCOUNT_LEN = 41;

function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=${encodeURIComponent(CLUSTER)}`;
}

function parseSolToLamports(value: string): bigint | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;

  const [wholeRaw, fracRaw = ''] = trimmed.split('.');
  const whole = wholeRaw ? BigInt(wholeRaw) : 0n;
  const fracPadded = (fracRaw + '000000000').slice(0, 9);
  const frac = fracPadded ? BigInt(fracPadded) : 0n;
  return whole * 1_000_000_000n + frac;
}

export default function AgentSettingsPage({ params }: { params: Promise<{ address: string }> }) {
  const { address } = use(params);
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const agentsState = useApi<{ agents: Agent[]; total: number }>('/api/agents');
  const agent = agentsState.data?.agents.find((a) => a.address === address) ?? null;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);

  // LLM config state
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [selectedModel, setSelectedModel] = useState('claude-opus-4-6');
  const [apiKeyValue, setApiKeyValue] = useState('');

  // Tool key state
  const [toolKeyType, setToolKeyType] = useState('');
  const [toolKeyValue, setToolKeyValue] = useState('');

  // Action state
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Vault state (on-chain)
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [vaultBalanceLamports, setVaultBalanceLamports] = useState<bigint | null>(null);
  const [vaultRentMinLamports, setVaultRentMinLamports] = useState<bigint | null>(null);
  const [withdrawAmountSol, setWithdrawAmountSol] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawSig, setWithdrawSig] = useState<string | null>(null);

  const headerReveal = useScrollReveal();
  const llmReveal = useScrollReveal();
  const toolsReveal = useScrollReveal();

  const isOwner = connected && publicKey && agent && agent.owner === publicKey.toBase58();

  const agentIdentityPk = useMemo(() => {
    try {
      return new PublicKey(address);
    } catch {
      return null;
    }
  }, [address]);

  const vaultPk = useMemo(() => {
    if (!agentIdentityPk) return null;
    try {
      const [vault] = deriveVaultPda(agentIdentityPk);
      return vault;
    } catch {
      return null;
    }
  }, [agentIdentityPk]);

  const withdrawableLamports =
    vaultBalanceLamports != null && vaultRentMinLamports != null
      ? vaultBalanceLamports > vaultRentMinLamports
        ? vaultBalanceLamports - vaultRentMinLamports
        : 0n
      : null;

  const loadVault = useCallback(async () => {
    if (!vaultPk) return;
    setVaultLoading(true);
    setVaultError(null);
    try {
      const [balance, minRent] = await Promise.all([
        connection.getBalance(vaultPk, 'confirmed'),
        connection.getMinimumBalanceForRentExemption(AGENT_VAULT_ACCOUNT_LEN),
      ]);
      setVaultBalanceLamports(BigInt(balance));
      setVaultRentMinLamports(BigInt(minRent));
    } catch (err) {
      setVaultError(err instanceof Error ? err.message : 'Failed to load vault balance');
    } finally {
      setVaultLoading(false);
    }
  }, [connection, vaultPk]);

  // Load credentials
  const loadCredentials = useCallback(async () => {
    if (!address) return;
    setLoadingCreds(true);
    setCredsError(null);
    try {
      const res = await fetch(`/api/credentials?seedId=${encodeURIComponent(address)}`);
      if (!res.ok) throw new Error(`Failed to load credentials (${res.status})`);
      const data = (await res.json()) as CredentialsResponse;
      setCredentials(data.credentials || []);
    } catch (err) {
      setCredsError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setLoadingCreds(false);
    }
  }, [address]);

  useEffect(() => {
    if (isOwner) {
      void loadCredentials();
      void loadVault();
    }
  }, [isOwner, loadCredentials, loadVault]);

  const handleSaveLlm = async () => {
    if (!isOwner || !apiKeyValue.trim()) return;
    setSaving(true);
    setSaveResult(null);

    try {
      // Save API key
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedId: address,
          credentialType: `LLM_API_KEY_${selectedProvider.toUpperCase()}`,
          label: `${selectedProvider} API Key`,
          value: apiKeyValue.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((err as { error?: string }).error || `Failed (${res.status})`);
      }

      // Save model preference
      await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedId: address,
          credentialType: 'LLM_MODEL',
          label: `${selectedProvider}/${selectedModel}`,
          value: JSON.stringify({ provider: selectedProvider, model: selectedModel }),
        }),
      });

      setApiKeyValue('');
      setSaveResult({ ok: true, text: `${selectedProvider} API key saved. Model: ${selectedModel}` });
      void loadCredentials();
    } catch (err) {
      setSaveResult({ ok: false, text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveToolKey = async () => {
    if (!isOwner || !toolKeyType || !toolKeyValue.trim()) return;
    setSaving(true);
    setSaveResult(null);

    try {
      const keyInfo = TOOL_API_KEYS.find((k) => k.type === toolKeyType);
      const res = await fetch('/api/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seedId: address,
          credentialType: toolKeyType,
          label: keyInfo?.label || toolKeyType,
          value: toolKeyValue.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error((err as { error?: string }).error || `Failed (${res.status})`);
      }

      setToolKeyValue('');
      setToolKeyType('');
      setSaveResult({ ok: true, text: `${keyInfo?.label || toolKeyType} saved.` });
      void loadCredentials();
    } catch (err) {
      setSaveResult({ ok: false, text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  };

  const handleRotate = async (credentialId: string) => {
    const newValue = prompt('Enter new value:');
    if (!newValue?.trim()) return;
    setRotatingId(credentialId);
    try {
      const res = await fetch(`/api/credentials/${credentialId}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue.trim() }),
      });
      if (!res.ok) throw new Error(`Rotate failed (${res.status})`);
      setSaveResult({ ok: true, text: 'Credential rotated.' });
      void loadCredentials();
    } catch (err) {
      setSaveResult({ ok: false, text: err instanceof Error ? err.message : 'Rotate failed' });
    } finally {
      setRotatingId(null);
    }
  };

  const handleDelete = async (credentialId: string) => {
    if (!confirm('Delete this credential?')) return;
    setDeletingId(credentialId);
    try {
      const res = await fetch(`/api/credentials/${credentialId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setSaveResult({ ok: true, text: 'Credential deleted.' });
      void loadCredentials();
    } catch (err) {
      setSaveResult({ ok: false, text: err instanceof Error ? err.message : 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  };

  const providerModels = LLM_PROVIDERS.find((p) => p.id === selectedProvider)?.models ?? [];

  if (agentsState.loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 animate-pulse">
        <div className="h-8 w-48 bg-white/5 rounded mb-4" />
        <div className="h-4 w-full bg-white/5 rounded" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display font-bold text-2xl text-white/60">Agent Not Found</h1>
        <Link href="/agents" className="mt-4 inline-block text-xs text-[var(--neon-cyan)] hover:underline">
          Back to agents
        </Link>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display font-bold text-2xl mb-4">Agent Settings</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-6">Connect your wallet to manage agent credentials.</p>
        <WalletButton />
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12 text-center">
        <h1 className="font-display font-bold text-2xl mb-4 text-white/60">Not Authorized</h1>
        <p className="text-[var(--text-secondary)] text-sm mb-2">
          Only the agent owner can manage settings.
        </p>
        <p className="text-[10px] font-mono text-white/20 mb-6">
          Owner: {agent.owner}
        </p>
        <Link href={`/agents/${address}`} className="text-xs text-[var(--neon-cyan)] hover:underline">
          Back to profile
        </Link>
      </div>
    );
  }

	  return (
	    <div className="max-w-3xl mx-auto px-6 py-12">
      <Link
        href={`/agents/${address}`}
        className="text-white/30 text-xs font-mono hover:text-white/50 transition-colors mb-6 inline-block"
      >
        &larr; Back to {agent.name}
      </Link>

      <div
        ref={headerReveal.ref}
        className={`mb-8 animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <h1 className="font-display font-bold text-3xl mb-2">
          <span className="neon-glow-cyan">Agent Settings</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Configure LLM provider, model, and API keys for <span className="font-semibold">{agent.name}</span>.
          These are the only mutable properties — personality traits and identity are immutable on-chain.
        </p>
        <div className="mt-2 text-[10px] font-mono text-white/20">{address}</div>
      </div>

	      {/* Save result */}
	      {saveResult && (
        <div className={`mb-6 p-3 rounded-lg text-xs ${
          saveResult.ok
            ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)] border border-[rgba(0,255,100,0.15)]'
            : 'bg-[rgba(255,50,50,0.08)] text-[var(--neon-red)] border border-[rgba(255,50,50,0.15)]'
        }`}>
          {saveResult.text}
        </div>
	      )}

        {/* Vault */}
        <div className="holo-card p-6 mb-6 section-glow-green">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
            Agent Vault (Withdraw)
          </h2>

          <div className="text-[11px] text-[var(--text-secondary)] mb-3">
            Rewards, donations, and job payouts land in a program-owned <span className="font-mono">AgentVault</span>. Only the
            owner wallet can withdraw to their wallet address.
          </div>

          {vaultPk && (
            <div className="text-[10px] font-mono text-white/20 mb-3 break-all">
              Vault PDA: {vaultPk.toBase58()}
            </div>
          )}

          {vaultError && (
            <div className="text-xs text-[var(--neon-red)] p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)] mb-3">
              {vaultError}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3 mb-4">
            <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
              <div className="text-[10px] font-mono text-[var(--text-tertiary)]">Balance</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {vaultBalanceLamports != null ? `${lamportsToSol(vaultBalanceLamports).toFixed(4)} SOL` : '—'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
              <div className="text-[10px] font-mono text-[var(--text-tertiary)]">Rent Min</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {vaultRentMinLamports != null ? `${lamportsToSol(vaultRentMinLamports).toFixed(4)} SOL` : '—'}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
              <div className="text-[10px] font-mono text-[var(--text-tertiary)]">Withdrawable</div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {withdrawableLamports != null ? `${lamportsToSol(withdrawableLamports).toFixed(4)} SOL` : '—'}
              </div>
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => void loadVault()}
              disabled={vaultLoading || !vaultPk}
              className="px-3 py-2 rounded text-[10px] font-mono uppercase
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-secondary)] hover:text-[var(--neon-green)]
                transition-all disabled:opacity-40"
            >
              {vaultLoading ? 'Refreshing…' : 'Refresh'}
            </button>
            <input
              value={withdrawAmountSol}
              onChange={(e) => setWithdrawAmountSol(e.target.value)}
              placeholder="Amount (SOL)"
              className="flex-1 px-4 py-2 rounded-lg bg-black/30 border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-[var(--neon-green)]/50 transition-all"
            />
            <button
              type="button"
              disabled={
                withdrawing ||
                !isOwner ||
                !publicKey ||
                !vaultPk ||
                withdrawableLamports == null ||
                parseSolToLamports(withdrawAmountSol) == null ||
                (parseSolToLamports(withdrawAmountSol) ?? 0n) <= 0n ||
                (parseSolToLamports(withdrawAmountSol) ?? 0n) > withdrawableLamports
              }
              onClick={async () => {
                if (!publicKey || !agentIdentityPk || !vaultPk) return;
                const lamports = parseSolToLamports(withdrawAmountSol);
                if (lamports == null || lamports <= 0n) return;
                if (withdrawableLamports != null && lamports > withdrawableLamports) return;
                setWithdrawing(true);
                setWithdrawSig(null);
                try {
                  const { instruction } = buildWithdrawFromVaultIx({
                    owner: publicKey,
                    agentIdentity: agentIdentityPk,
                    lamports,
                  });
                  const tx = new Transaction().add(instruction);
                  const sig = await sendTransaction(tx, connection, { skipPreflight: false });
                  await connection.confirmTransaction(sig, 'confirmed');
                  setWithdrawSig(sig);
                  setWithdrawAmountSol('');
                  void loadVault();
                } catch (err) {
                  setVaultError(err instanceof Error ? err.message : 'Withdraw failed');
                } finally {
                  setWithdrawing(false);
                }
              }}
              className="px-4 py-2 rounded text-[10px] font-mono uppercase
                bg-[rgba(0,255,100,0.10)] border border-[rgba(0,255,100,0.20)]
                text-[var(--neon-green)] hover:shadow-[0_0_20px_rgba(0,255,100,0.25)]
                transition-all disabled:opacity-40"
            >
              {withdrawing ? 'Withdrawing…' : 'Withdraw'}
            </button>
          </div>

          {withdrawSig && (
            <div className="text-[10px] font-mono text-[var(--neon-green)]">
              Withdraw successful:{' '}
              <a
                href={explorerTxUrl(withdrawSig)}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                view on explorer
              </a>
            </div>
          )}
        </div>

      {/* LLM Provider & Model */}
      <div
        ref={llmReveal.ref}
        className={`holo-card p-6 mb-6 section-glow-cyan animate-in ${llmReveal.isVisible ? 'visible' : ''}`}
      >
        <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
          LLM Provider & Model
        </h2>

        <div className="grid gap-4">
          {/* Provider selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[var(--text-tertiary)]">Provider</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value);
                const p = LLM_PROVIDERS.find((p) => p.id === e.target.value);
                if (p?.models[0]) setSelectedModel(p.models[0]);
              }}
              className="w-full px-4 py-3 rounded-lg text-sm
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-primary)] cursor-pointer
                focus:outline-none focus:border-[rgba(0,255,255,0.3)]
                transition-all"
            >
              {LLM_PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Model selector */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[var(--text-tertiary)]">Model</label>
            <div className="flex gap-2">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="flex-1 px-4 py-3 rounded-lg text-sm
                  bg-[var(--bg-glass)] border border-[var(--border-glass)]
                  text-[var(--text-primary)] cursor-pointer
                  focus:outline-none focus:border-[rgba(0,255,255,0.3)]
                  transition-all"
              >
                {providerModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <input
                type="text"
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                placeholder="Custom model ID"
                className="flex-1 px-4 py-3 rounded-lg text-sm
                  bg-[var(--bg-glass)] border border-[var(--border-glass)]
                  text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                  focus:outline-none focus:border-[rgba(0,255,255,0.3)]
                  transition-all"
              />
            </div>
          </div>

          {/* API Key input */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-[var(--text-tertiary)]">API Key</label>
            <input
              type="password"
              value={apiKeyValue}
              onChange={(e) => setApiKeyValue(e.target.value)}
              placeholder={`Enter ${selectedProvider} API key`}
              className="w-full px-4 py-3 rounded-lg text-sm
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[rgba(0,255,255,0.3)]
                transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveLlm}
            disabled={saving || !apiKeyValue.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold
              bg-gradient-to-r from-[var(--neon-cyan)] to-[rgba(0,255,255,0.6)]
              text-[#0a0a0f] hover:shadow-[0_0_20px_rgba(0,255,255,0.3)]
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save LLM Configuration'}
          </button>
        </div>

        <p className="mt-3 text-[10px] text-[var(--text-tertiary)] font-mono">
          Keys are encrypted at rest (AES-256-GCM). Never stored on-chain.
        </p>
      </div>

      {/* Tool API Keys */}
      <div
        ref={toolsReveal.ref}
        className={`holo-card p-6 mb-6 section-glow-purple animate-in ${toolsReveal.isVisible ? 'visible' : ''}`}
      >
        <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
          Tool & Channel API Keys
        </h2>

        <div className="grid gap-4">
          <div className="space-y-2">
            <label className="text-xs font-mono text-[var(--text-tertiary)]">Key Type</label>
            <select
              value={toolKeyType}
              onChange={(e) => setToolKeyType(e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-primary)] cursor-pointer
                focus:outline-none focus:border-[rgba(153,69,255,0.3)]
                transition-all"
            >
              <option value="">Select a key type…</option>
              {TOOL_API_KEYS.map((k) => (
                <option key={k.type} value={k.type}>{k.label} — {k.description}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-mono text-[var(--text-tertiary)]">Value</label>
            <input
              type="password"
              value={toolKeyValue}
              onChange={(e) => setToolKeyValue(e.target.value)}
              placeholder="Enter API key value"
              className="w-full px-4 py-3 rounded-lg text-sm
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                focus:outline-none focus:border-[rgba(153,69,255,0.3)]
                transition-all"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveToolKey}
            disabled={saving || !toolKeyType || !toolKeyValue.trim()}
            className="w-full py-3 rounded-lg text-sm font-semibold
              bg-gradient-to-r from-[var(--sol-purple)] to-[rgba(153,69,255,0.6)]
              text-white hover:shadow-[0_0_20px_rgba(153,69,255,0.3)]
              transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving…' : 'Save Tool Key'}
          </button>
        </div>
      </div>

      {/* Existing credentials */}
      <div className="holo-card p-6">
        <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
          Saved Credentials
        </h2>

        {loadingCreds && (
          <div className="text-sm text-[var(--text-secondary)] text-center py-4">Loading…</div>
        )}

        {credsError && (
          <div className="text-xs text-[var(--neon-red)] p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]">
            {credsError}
          </div>
        )}

        {!loadingCreds && !credsError && credentials.length === 0 && (
          <div className="text-center py-6">
            <div className="text-[var(--text-secondary)] font-display font-semibold text-sm">No credentials yet</div>
            <div className="text-[10px] text-[var(--text-tertiary)] font-mono mt-1">
              Add an LLM API key above to get started.
            </div>
          </div>
        )}

        <div className="space-y-3">
          {credentials.map((cred) => (
            <div
              key={cred.credentialId}
              className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[var(--text-primary)]">{cred.label}</div>
                <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  {cred.credentialType} · {cred.maskedValue}
                </div>
                <div className="text-[10px] font-mono text-white/15 mt-0.5">
                  Updated {new Date(cred.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleRotate(cred.credentialId)}
                  disabled={rotatingId === cred.credentialId}
                  className="px-2 py-1 rounded text-[10px] font-mono
                    bg-[var(--bg-glass)] border border-[var(--border-glass)]
                    text-[var(--text-secondary)] hover:text-[var(--neon-cyan)]
                    transition-all disabled:opacity-40"
                >
                  {rotatingId === cred.credentialId ? '…' : 'Rotate'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cred.credentialId)}
                  disabled={deletingId === cred.credentialId}
                  className="px-2 py-1 rounded text-[10px] font-mono
                    bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]
                    text-[var(--text-secondary)] hover:text-[var(--neon-red)]
                    transition-all disabled:opacity-40"
                >
                  {deletingId === cred.credentialId ? '…' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
