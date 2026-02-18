'use client';

import { use, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { CLUSTER, type Agent } from '@/lib/solana';
import {
  WUNDERLAND_PROGRAM_ID,
  buildCancelRecoverAgentSignerIx,
  buildDeactivateAgentIx,
  buildExecuteRecoverAgentSignerIx,
  buildRequestRecoverAgentSignerIx,
  buildWithdrawFromVaultIx,
  decodeAgentSignerRecovery,
  deriveRecoveryPda,
  deriveVaultPda,
  downloadJson,
  keypairToSecretKeyJson,
  lamportsToSol,
} from '@/lib/wunderland-program';

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
  type: string;
  label: string;
  maskedValue: string;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

type CredentialsResponse = {
  items: Credential[];
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
  const { publicKey, connected, sendTransaction, signMessage } = useWallet();

  const agentState = useApi<{ agent: Agent | null }>(`/api/agents/${encodeURIComponent(address)}`);
  const agent = agentState.data?.agent ?? null;

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

  // Managed hosting onboarding (backend) — wallet-signed
  const [hostingLoading, setHostingLoading] = useState(false);
  const [hostingError, setHostingError] = useState<string | null>(null);
  const [hostingStatus, setHostingStatus] = useState<{
    onboarded: boolean;
    seedId?: string;
    agentSignerPubkey?: string;
    updatedAt?: string | null;
  }>({ onboarded: false });

  const [onboardBusy, setOnboardBusy] = useState(false);
  const [onboardError, setOnboardError] = useState<string | null>(null);
  const [onboardOk, setOnboardOk] = useState<string | null>(null);
  const [onboardSecretKeyJson, setOnboardSecretKeyJson] = useState<number[] | null>(null);
  const [onboardSignerPubkey, setOnboardSignerPubkey] = useState<string>('');
  const onboardFileRef = useRef<HTMLInputElement | null>(null);

  // On-chain safety controls (deactivate + signer recovery)
  const [chainBusy, setChainBusy] = useState<string | null>(null);
  const [chainError, setChainError] = useState<string | null>(null);
  const [chainSig, setChainSig] = useState<string | null>(null);

  const [recovery, setRecovery] = useState<{
    state: 'loading' | 'none' | 'pending' | 'error';
    recoveryPda?: string;
    newSigner?: string;
    requestedAtIso?: string;
    readyAtIso?: string;
    message?: string;
  }>({ state: 'loading' });

  const [newSignerPubkey, setNewSignerPubkey] = useState<string>('');
  const [recoveryKeypair, setRecoveryKeypair] = useState<Keypair | null>(null);

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
      setCredentials(Array.isArray(data.items) ? data.items : []);
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

  const toBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
  };

  const buildManagedHostingMessage = (agentPda: string, agentSigner: string): string => {
    return JSON.stringify({
      v: 1,
      intent: 'wunderland_onboard_managed_agent_v1',
      cluster: CLUSTER,
      programId: WUNDERLAND_PROGRAM_ID.toBase58(),
      agentPda,
      agentSigner,
    });
  };

  const loadHostingStatus = useCallback(async () => {
    if (!agentIdentityPk) return;
    setHostingLoading(true);
    setHostingError(null);
    try {
      const res = await fetch(
        `/api/agents/managed-hosting?agentIdentityPda=${encodeURIComponent(address)}`,
        { cache: 'no-store' },
      );
      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json?.ok) {
        setHostingStatus({ onboarded: false });
        setHostingError(json?.error || `Failed to load status (HTTP ${res.status})`);
        return;
      }

      setHostingStatus({
        onboarded: Boolean(json.onboarded),
        seedId: typeof json.seedId === 'string' ? json.seedId : undefined,
        agentSignerPubkey: typeof json.agentSignerPubkey === 'string' ? json.agentSignerPubkey : undefined,
        updatedAt: typeof json.updatedAt === 'string' ? json.updatedAt : null,
      });
    } catch (err) {
      setHostingStatus({ onboarded: false });
      setHostingError(err instanceof Error ? err.message : 'Failed to load status');
    } finally {
      setHostingLoading(false);
    }
  }, [address, agentIdentityPk]);

  useEffect(() => {
    if (isOwner) void loadHostingStatus();
  }, [isOwner, loadHostingStatus]);

  const openOnboardImport = () => {
    setOnboardError(null);
    setOnboardOk(null);
    onboardFileRef.current?.click();
  };

  const importOnboardKeypair = async (file: File | null) => {
    if (!file) return;
    setOnboardError(null);
    setOnboardOk(null);
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

      const normalized = secret.map((n: any) => (Number(n) || 0) & 0xff);
      const kp = Keypair.fromSecretKey(Uint8Array.from(normalized));

      setOnboardSecretKeyJson(normalized);
      setOnboardSignerPubkey(kp.publicKey.toBase58());
    } catch (err) {
      setOnboardSecretKeyJson(null);
      setOnboardSignerPubkey('');
      setOnboardError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      if (onboardFileRef.current) onboardFileRef.current.value = '';
    }
  };

  const onboardManagedHosting = async () => {
    setOnboardError(null);
    setOnboardOk(null);
    setChainError(null);
    setChainSig(null);

    try {
      if (!publicKey || !connected) throw new Error('Connect a wallet to onboard managed hosting.');
      if (!signMessage) throw new Error('Wallet does not support message signing (signMessage).');
      if (!onboardSecretKeyJson || onboardSecretKeyJson.length !== 64) {
        throw new Error('Import the agent signer keypair JSON first.');
      }

      setOnboardBusy(true);

      const kp = Keypair.fromSecretKey(Uint8Array.from(onboardSecretKeyJson));
      const agentSigner = kp.publicKey.toBase58();

      const message = buildManagedHostingMessage(address, agentSigner);
      const signatureBytes = await signMessage(new TextEncoder().encode(message));
      const signatureB64 = toBase64(signatureBytes);

      const res = await fetch('/api/agents/managed-hosting', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          ownerWallet: publicKey.toBase58(),
          agentIdentityPda: address,
          signatureB64,
          agentSignerSecretKeyJson: onboardSecretKeyJson,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || `Onboarding failed (HTTP ${res.status})`);
      }

      setOnboardOk('Managed hosting enabled. Backend signer stored encrypted.');
      await loadHostingStatus();
    } catch (err) {
      setOnboardError(err instanceof Error ? err.message : 'Onboarding failed');
    } finally {
      setOnboardBusy(false);
    }
  };

  const loadRecovery = useCallback(async () => {
    if (!agentIdentityPk) return;
    setRecovery({ state: 'loading' });
    try {
      const [recoveryPda] = deriveRecoveryPda(agentIdentityPk, WUNDERLAND_PROGRAM_ID);
      const info = await connection.getAccountInfo(recoveryPda, 'confirmed');
      if (!info) {
        setRecovery({ state: 'none' });
        return;
      }

      const decoded = decodeAgentSignerRecovery(info.data);
      setRecovery({
        state: 'pending',
        recoveryPda: recoveryPda.toBase58(),
        newSigner: decoded.newAgentSigner.toBase58(),
        requestedAtIso: new Date(Number(decoded.requestedAt) * 1000).toISOString(),
        readyAtIso: new Date(Number(decoded.readyAt) * 1000).toISOString(),
      });
    } catch (err) {
      setRecovery({
        state: 'error',
        message: err instanceof Error ? err.message : 'Failed to load recovery state',
      });
    }
  }, [connection, agentIdentityPk]);

  useEffect(() => {
    if (isOwner) void loadRecovery();
  }, [isOwner, loadRecovery]);

  const deactivateOnChain = async () => {
    if (!publicKey || !agentIdentityPk) return;
    if (!agent?.isActive) return;

    const typed = prompt('Type DEACTIVATE to permanently deactivate this agent:');
    if (typed !== 'DEACTIVATE') return;

    setChainError(null);
    setChainSig(null);
    setChainBusy('deactivate');
    try {
      const ix = buildDeactivateAgentIx({
        owner: publicKey,
        agentIdentity: agentIdentityPk,
        programId: WUNDERLAND_PROGRAM_ID,
      });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setChainSig(sig);
      agentState.reload();
      void loadRecovery();
      void loadHostingStatus();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Deactivate failed');
    } finally {
      setChainBusy(null);
    }
  };

  const generateRecoverySigner = () => {
    const kp = Keypair.generate();
    setRecoveryKeypair(kp);
    setNewSignerPubkey(kp.publicKey.toBase58());
  };

  const downloadRecoverySigner = () => {
    if (!recoveryKeypair) return;
    downloadJson(
      `wunderland-recovery-signer-${address.slice(0, 4)}.json`,
      keypairToSecretKeyJson(recoveryKeypair.secretKey),
    );
  };

  const requestRecovery = async () => {
    if (!publicKey || !agentIdentityPk) return;
    setChainError(null);
    setChainSig(null);
    setChainBusy('request_recovery');
    try {
      const newSignerStr = newSignerPubkey.trim();
      if (!newSignerStr) throw new Error('Enter a new agent signer pubkey.');
      const newSigner = new PublicKey(newSignerStr);
      const { instruction } = buildRequestRecoverAgentSignerIx({
        owner: publicKey,
        agentIdentity: agentIdentityPk,
        newAgentSigner: newSigner,
        programId: WUNDERLAND_PROGRAM_ID,
      });
      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setChainSig(sig);
      await loadRecovery();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Recovery request failed');
    } finally {
      setChainBusy(null);
    }
  };

  const executeRecovery = async () => {
    if (!publicKey || !agentIdentityPk) return;
    setChainError(null);
    setChainSig(null);
    setChainBusy('execute_recovery');
    try {
      const { instruction } = buildExecuteRecoverAgentSignerIx({
        owner: publicKey,
        agentIdentity: agentIdentityPk,
        programId: WUNDERLAND_PROGRAM_ID,
      });
      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setChainSig(sig);
      setRecoveryKeypair(null);
      setNewSignerPubkey('');
      await loadRecovery();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Recovery execution failed');
    } finally {
      setChainBusy(null);
    }
  };

  const cancelRecovery = async () => {
    if (!publicKey || !agentIdentityPk) return;
    setChainError(null);
    setChainSig(null);
    setChainBusy('cancel_recovery');
    try {
      const { instruction } = buildCancelRecoverAgentSignerIx({
        owner: publicKey,
        agentIdentity: agentIdentityPk,
        programId: WUNDERLAND_PROGRAM_ID,
      });
      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setChainSig(sig);
      await loadRecovery();
    } catch (err) {
      setChainError(err instanceof Error ? err.message : 'Recovery cancel failed');
    } finally {
      setChainBusy(null);
    }
  };

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
          type: `LLM_API_KEY_${selectedProvider.toUpperCase()}`,
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
          type: 'LLM_MODEL',
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
          type: toolKeyType,
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

  if (agentState.loading) {
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

        {/* Managed Hosting */}
        <div className="holo-card p-6 mb-6 section-glow-purple">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
                Managed Hosting (Bots)
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                Enable autonomous backend actions by storing the agent signer key encrypted on the server.
                Requires a wallet signature (<code className="font-mono">signMessage</code>) and the agent signer keypair JSON.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadHostingStatus()}
              disabled={hostingLoading}
              className="px-3 py-2 rounded text-[10px] font-mono uppercase
                bg-[var(--bg-glass)] border border-[var(--border-glass)]
                text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                transition-all disabled:opacity-40"
            >
              {hostingLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>

          {hostingError && (
            <div className="mt-4 text-xs text-[var(--neon-red)] p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]">
              {hostingError}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={`badge text-[10px] ${hostingStatus.onboarded ? 'badge-verified' : 'bg-white/5 text-white/60 border border-white/10'}`}>
              {hostingStatus.onboarded ? 'Onboarded' : 'Not onboarded'}
            </span>
            {hostingStatus.updatedAt && (
              <span className="badge bg-white/5 text-white/40 border border-white/10 text-[10px] font-mono">
                updated {new Date(hostingStatus.updatedAt).toISOString().split('T')[0]}
              </span>
            )}
            {!signMessage && (
              <span className="badge bg-[rgba(255,50,50,0.06)] text-[var(--neon-red)] border border-[rgba(255,50,50,0.15)] text-[10px] font-mono">
                wallet missing signMessage
              </span>
            )}
          </div>

          {hostingStatus.onboarded && hostingStatus.agentSignerPubkey && (
            <div className="mt-3 text-[11px] text-[var(--text-tertiary)] font-mono break-all">
              signer {hostingStatus.agentSignerPubkey}
            </div>
          )}

          {!hostingStatus.onboarded && (
            <div className="mt-5 grid gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={openOnboardImport}
                  className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)] transition-all"
                >
                  Import signer JSON
                </button>
                <input
                  ref={onboardFileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => void importOnboardKeypair(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => void onboardManagedHosting()}
                  disabled={onboardBusy || !onboardSecretKeyJson || !signMessage || !agent?.isActive}
                  className="px-4 py-2 rounded-lg text-[10px] font-mono uppercase
                    bg-[rgba(0,255,255,0.10)] border border-[rgba(0,255,255,0.20)]
                    text-[var(--neon-cyan)] hover:shadow-[0_0_20px_rgba(0,255,255,0.25)]
                    transition-all disabled:opacity-40"
                >
                  {onboardBusy ? 'Onboarding…' : 'Enable managed hosting'}
                </button>
              </div>

              {onboardSignerPubkey && (
                <div className="text-[11px] text-[var(--text-tertiary)] font-mono break-all">
                  imported signer {onboardSignerPubkey}
                </div>
              )}

              {!agent?.isActive && (
                <div className="text-[11px] text-[var(--neon-red)]">
                  This agent is inactive on-chain. Managed hosting onboarding is disabled.
                </div>
              )}

              {onboardOk && (
                <div className="text-xs text-[var(--neon-green)] p-3 rounded-lg bg-[rgba(0,255,100,0.06)] border border-[rgba(0,255,100,0.15)]">
                  {onboardOk}
                </div>
              )}

              {onboardError && (
                <div className="text-xs text-[var(--neon-red)] p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]">
                  {onboardError}
                </div>
              )}

              <div className="text-[10px] text-[var(--text-tertiary)] font-mono">
                Tip: keep the signer keypair safe. If you rotate the signer on-chain, re-onboard managed hosting with the new signer.
              </div>
            </div>
          )}
        </div>

        {/* On-chain Safety */}
        <div className="holo-card p-6 mb-6 section-glow-cyan">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
            On-chain Safety (Owner)
          </h2>

          <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-4">
            Deactivation is irreversible. Signer recovery is timelocked and lets you rotate the agent signer if the operational key is lost or compromised.
          </div>

          {chainError && (
            <div className="mb-3 text-xs text-[var(--neon-red)] p-3 rounded-lg bg-[rgba(255,50,50,0.06)] border border-[rgba(255,50,50,0.15)]">
              {chainError}
            </div>
          )}

          {chainSig && (
            <div className="mb-3 text-xs text-[var(--neon-cyan)] p-3 rounded-lg bg-[rgba(0,255,255,0.06)] border border-[rgba(0,255,255,0.15)]">
              Transaction submitted:{' '}
              <a href={explorerTxUrl(chainSig)} target="_blank" rel="noreferrer" className="underline">
                view on explorer
              </a>
            </div>
          )}

          {/* Deactivate */}
          <div className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Deactivate Agent</div>
                <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  Current status: {agent?.isActive ? 'active' : 'inactive'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void deactivateOnChain()}
                disabled={chainBusy !== null || !agent?.isActive}
                className="px-4 py-2 rounded text-[10px] font-mono uppercase
                  bg-[rgba(255,50,50,0.10)] border border-[rgba(255,50,50,0.20)]
                  text-[var(--neon-red)] hover:shadow-[0_0_20px_rgba(255,50,50,0.25)]
                  transition-all disabled:opacity-40"
              >
                {chainBusy === 'deactivate' ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>

          {/* Signer recovery */}
          <div className="mt-4 p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Signer Recovery</div>
                <div className="mt-1 text-[11px] text-[var(--text-tertiary)]">
                  {recovery.state === 'pending' && recovery.readyAtIso
                    ? `ready ${Date.now() >= new Date(recovery.readyAtIso).getTime() ? 'now' : 'at'} ${new Date(recovery.readyAtIso).toLocaleString()}`
                    : recovery.state === 'none'
                      ? 'no pending request'
                      : recovery.state === 'loading'
                        ? 'loading…'
                        : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadRecovery()}
                disabled={recovery.state === 'loading' || chainBusy !== null}
                className="px-3 py-2 rounded text-[10px] font-mono uppercase
                  bg-[var(--bg-glass)] border border-[var(--border-glass)]
                  text-[var(--text-secondary)] hover:text-[var(--text-primary)]
                  transition-all disabled:opacity-40"
              >
                Refresh
              </button>
            </div>

            {recovery.state === 'error' && (
              <div className="mt-3 text-[11px] text-[var(--neon-red)] font-mono">
                {recovery.message || 'Failed to load recovery status'}
              </div>
            )}

            {recovery.state === 'pending' ? (
              <div className="mt-3 space-y-3">
                {recovery.newSigner && (
                  <div className="text-[11px] text-[var(--text-tertiary)] font-mono break-all">
                    new_signer {recovery.newSigner}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void executeRecovery()}
                    disabled={
                      chainBusy !== null ||
                      !recovery.readyAtIso ||
                      Date.now() < new Date(recovery.readyAtIso).getTime()
                    }
                    className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase
                      bg-[rgba(0,255,255,0.06)] text-[var(--text-secondary)] border border-[rgba(0,255,255,0.2)]
                      hover:bg-[rgba(0,255,255,0.10)] transition-all disabled:opacity-40"
                  >
                    {chainBusy === 'execute_recovery' ? 'Executing…' : 'Execute'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void cancelRecovery()}
                    disabled={chainBusy !== null}
                    className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase
                      bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)]
                      hover:bg-[var(--bg-glass-hover)] transition-all disabled:opacity-40"
                  >
                    {chainBusy === 'cancel_recovery' ? 'Canceling…' : 'Cancel'}
                  </button>
                </div>
                {recovery.readyAtIso && Date.now() < new Date(recovery.readyAtIso).getTime() && (
                  <div className="text-[11px] text-[var(--text-tertiary)]">
                    Timelock not ready yet. You can execute once it matures.
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-3 grid gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={generateRecoverySigner}
                    disabled={chainBusy !== null}
                    className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase
                      bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)]
                      hover:bg-[var(--bg-glass-hover)] transition-all disabled:opacity-40"
                  >
                    Generate
                  </button>
                  <button
                    type="button"
                    onClick={downloadRecoverySigner}
                    disabled={!recoveryKeypair || chainBusy !== null}
                    className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase
                      bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)]
                      hover:bg-[var(--bg-glass-hover)] transition-all disabled:opacity-40"
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => void requestRecovery()}
                    disabled={chainBusy !== null || !newSignerPubkey.trim()}
                    className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase
                      bg-[rgba(153,69,255,0.10)] text-[var(--text-secondary)] border border-[rgba(153,69,255,0.25)]
                      hover:bg-[rgba(153,69,255,0.16)] transition-all disabled:opacity-40"
                  >
                    {chainBusy === 'request_recovery' ? 'Requesting…' : 'Request'}
                  </button>
                </div>
                <input
                  value={newSignerPubkey}
                  onChange={(e) => setNewSignerPubkey(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] text-xs font-mono focus:outline-none focus:border-[var(--neon-cyan)]/50 transition-all"
                  placeholder="New agent signer pubkey (base58)"
                  aria-label="New agent signer pubkey"
                />
                <div className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
                  After requesting, wait for the on-chain timelock, then execute. Update your runtime (or re-onboard managed hosting) to use the new signer key.
                </div>
              </div>
            )}
          </div>
        </div>

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
                  {cred.type} · {cred.maskedValue}
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
