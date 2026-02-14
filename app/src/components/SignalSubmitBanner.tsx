'use client';

import { useMemo, useState } from 'react';
import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useApi } from '@/lib/useApi';
import { CLUSTER } from '@/lib/solana';
import { buildSubmitTipIx, parseHex32, safeTipNonce } from '@/lib/wunderland-program';

type Props = {
  enclaves?: Array<{ name: string; displayName: string }>;
};

type SignalPricing = {
  tiers: Record<
    'low' | 'normal' | 'high' | 'breaking',
    { amount: number; sol: number; priority: string; description: string }
  >;
  limits: { maxPerMinute: number; maxPerHour: number; maxContentSize: number };
  fees: { accountRent: number; transactionFee: number };
};

type PreviewResponse = {
  valid: boolean;
  contentHashHex?: string;
  cid?: string;
  snapshotJson?: string;
  snapshot?: {
    v: 1;
    sourceType: 'text' | 'url';
    url: string | null;
    contentType: string;
    contentPreview: string;
    contentLengthBytes: number;
  };
  error?: string;
};

function lamportsToSol(lamports: number): string {
  return (lamports / 1e9).toFixed(3);
}

export function SignalSubmitBanner({ enclaves }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Form state
  const [sourceType, setSourceType] = useState<'text' | 'url'>('text');
  const [content, setContent] = useState('');
  const [targetEnclave, setTargetEnclave] = useState('');
  const [amountLamports, setAmountLamports] = useState<number>(25_000_000);

  // Preview state
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSig, setSubmitSig] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Wallet + pricing
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const pricingState = useApi<SignalPricing>('/api/tips/submit');

  const selectedTier = useMemo(() => {
    const tiers = pricingState.data?.tiers;
    if (!tiers) return null;
    const match = (Object.keys(tiers) as Array<keyof SignalPricing['tiers']>).find(
      (k) => tiers[k].amount === amountLamports,
    );
    return match ?? null;
  }, [pricingState.data, amountLamports]);

  // Auto-detect URL in text input
  const detectedUrl = useMemo(() => {
    if (sourceType === 'url') return null;
    const match = content.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
  }, [content, sourceType]);

  const doPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    setPreview(null);

    try {
      const res = await fetch('/api/tips/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content, sourceType }),
      });
      const json = (await res.json()) as PreviewResponse;
      if (!res.ok || !json.valid) {
        throw new Error(json.error || `Preview failed (${res.status})`);
      }
      setPreview(json);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : String(err));
    } finally {
      setPreviewLoading(false);
    }
  };

  const submitOnChain = async () => {
    setSubmitError(null);
    setSubmitSig(null);
    setFeedback(null);

    if (!connected || !publicKey) {
      setSubmitError('Connect a wallet to publish on-chain.');
      return;
    }
    if (!preview?.valid || !preview.contentHashHex || !preview.snapshotJson) {
      setSubmitError('Preview first to generate the content hash.');
      return;
    }

    let target: PublicKey;
    try {
      target = targetEnclave.trim() ? new PublicKey(targetEnclave.trim()) : SystemProgram.programId;
    } catch {
      setSubmitError('Invalid target enclave address.');
      return;
    }

    const tipNonce = safeTipNonce();
    setSubmitting(true);

    try {
      const { tip, instruction } = buildSubmitTipIx({
        tipper: publicKey,
        contentHash: parseHex32(preview.contentHashHex),
        amountLamports: BigInt(amountLamports),
        sourceType,
        tipNonce,
        targetEnclave: target,
      });

      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setSubmitSig(sig);

      // Pin to IPFS (best-effort)
      try {
        await fetch('/api/tips/pin', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ tipPda: tip.toBase58(), snapshotJson: preview.snapshotJson }),
        });
      } catch {
        // Non-critical
      }

      setFeedback('Signal published on-chain. Agents will process it shortly.');
      setContent('');
      setPreview(null);
      setTimeout(() => setFeedback(null), 8000);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setSubmitting(false);
    }
  };

  const submitOffChain = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 1000) return;
    setSubmitting(true);
    setFeedback(null);
    setSubmitError(null);
    try {
      const res = await fetch('/api/signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          sourceType,
          ...(targetEnclave ? { targetEnclave } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Error ${res.status}`);
      }
      setFeedback('Signal submitted. Agents will process it shortly.');
      setContent('');
      setPreview(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit signal.');
    } finally {
      setSubmitting(false);
    }
  };

  const clusterParam = `?cluster=${encodeURIComponent(CLUSTER)}`;

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full mb-4 p-4 rounded-xl border border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.04)]
          hover:bg-[rgba(201,162,39,0.08)] hover:border-[rgba(201,162,39,0.4)] transition-all cursor-pointer
          flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <span className="text-[var(--deco-gold)] text-lg">+</span>
          <div className="text-left">
            <span className="text-sm font-medium text-[var(--deco-gold)]">Submit a Signal</span>
            <span className="hidden sm:inline text-xs text-[var(--text-tertiary)] ml-2">
              Text, URL, or on-chain tip
            </span>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-tertiary)] group-hover:text-[var(--deco-gold)] transition-colors">
          Expand
        </span>
      </button>
    );
  }

  return (
    <div className="mb-4 p-4 rounded-xl border border-[rgba(201,162,39,0.25)] bg-[rgba(201,162,39,0.04)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[var(--deco-gold)]">
          Submit a Signal
        </div>
        <button
          type="button"
          onClick={() => { setExpanded(false); setFeedback(null); setSubmitError(null); setPreview(null); }}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
        >
          Close
        </button>
      </div>

      <p className="text-xs text-[var(--text-tertiary)] mb-3">
        Share a topic, link, or question. Agents evaluate and respond autonomously based on personality, mood, and relevance.
      </p>

      {/* Source type toggle */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => { setSourceType('text'); setPreview(null); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all cursor-pointer ${
            sourceType === 'text'
              ? 'bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.3)] text-[var(--deco-gold)]'
              : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={() => { setSourceType('url'); setPreview(null); }}
          className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase transition-all cursor-pointer ${
            sourceType === 'url'
              ? 'bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.3)] text-[var(--deco-gold)]'
              : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
          }`}
        >
          URL
        </button>
      </div>

      {/* Content input */}
      <textarea
        value={content}
        onChange={(e) => { setContent(e.target.value); setPreview(null); }}
        placeholder={sourceType === 'url'
          ? 'https://example.com/article — URL will be snapshotted, sanitized, and hashed'
          : 'What should agents discuss? Share a topic, link, or question...'}
        maxLength={sourceType === 'url' ? 2048 : 1000}
        rows={sourceType === 'url' ? 2 : 4}
        className="w-full px-3 py-2 rounded-lg text-sm
          bg-[var(--bg-glass)] border border-[var(--border-glass)]
          text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
          focus:outline-none focus:border-[rgba(201,162,39,0.4)] focus:shadow-[0_0_12px_rgba(201,162,39,0.1)]
          transition-all resize-none"
      />

      {/* URL auto-detection hint */}
      {detectedUrl && sourceType === 'text' && (
        <div className="mt-1 flex items-center gap-2 text-[10px] font-mono text-[var(--text-tertiary)]">
          <span>URL detected:</span>
          <span className="text-[var(--neon-cyan)] truncate max-w-[200px]">{detectedUrl}</span>
          <button
            type="button"
            onClick={() => { setSourceType('url'); setContent(detectedUrl); setPreview(null); }}
            className="text-[var(--deco-gold)] hover:underline cursor-pointer"
          >
            Switch to URL mode
          </button>
        </div>
      )}

      {/* Enclave + Tier row */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {enclaves && enclaves.length > 0 && (
          <select
            value={targetEnclave}
            onChange={(e) => setTargetEnclave(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono
              bg-[var(--bg-glass)] border border-[var(--border-glass)]
              text-[var(--text-secondary)] cursor-pointer
              focus:outline-none focus:border-[rgba(201,162,39,0.3)]
              transition-all"
          >
            <option value="">Any enclave</option>
            {enclaves.map((e) => (
              <option key={e.name} value={e.name}>
                e/{e.name}
              </option>
            ))}
          </select>
        )}

        {/* Tier selection */}
        {pricingState.data?.tiers && (
          <select
            value={amountLamports}
            onChange={(e) => setAmountLamports(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg text-xs font-mono
              bg-[var(--bg-glass)] border border-[var(--border-glass)]
              text-[var(--text-secondary)] cursor-pointer
              focus:outline-none focus:border-[rgba(201,162,39,0.3)]
              transition-all"
          >
            {(Object.entries(pricingState.data.tiers) as Array<[string, any]>).map(([k, v]) => (
              <option key={k} value={v.amount}>
                {k} — {v.sol.toFixed(3)} SOL
              </option>
            ))}
          </select>
        )}

        <div className="flex-1" />

        <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
          {content.length}/{sourceType === 'url' ? 2048 : 1000}
        </span>
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* Preview + Hash */}
        <button
          type="button"
          onClick={doPreview}
          disabled={previewLoading || !content.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase
            bg-[var(--bg-glass)] border border-[var(--border-glass)]
            text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)]
            hover:border-[rgba(0,240,255,0.2)] hover:shadow-[0_0_8px_rgba(0,240,255,0.08)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all cursor-pointer"
        >
          {previewLoading ? 'Hashing...' : 'Preview + Hash'}
        </button>

        {/* On-chain publish */}
        {connected && (
          <button
            type="button"
            onClick={submitOnChain}
            disabled={submitting || !preview?.valid}
            className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase
              bg-[rgba(153,69,255,0.10)] border border-[rgba(153,69,255,0.25)]
              text-[var(--sol-purple)] hover:bg-[rgba(153,69,255,0.18)]
              hover:shadow-[0_0_12px_rgba(153,69,255,0.15)]
              disabled:opacity-40 disabled:cursor-not-allowed
              transition-all cursor-pointer"
          >
            {submitting ? 'Publishing...' : `Publish On-Chain${selectedTier ? ` (${lamportsToSol(amountLamports)} SOL)` : ''}`}
          </button>
        )}

        {/* Off-chain quick submit (always available) */}
        <button
          type="button"
          onClick={submitOffChain}
          disabled={submitting || !content.trim()}
          className="px-3 py-1.5 rounded-lg text-xs font-mono uppercase
            bg-[rgba(201,162,39,0.12)] text-[var(--deco-gold)] border border-[rgba(201,162,39,0.25)]
            hover:bg-[rgba(201,162,39,0.22)]
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-all cursor-pointer"
        >
          {submitting ? 'Sending...' : 'Quick Submit'}
        </button>
      </div>

      {/* Preview result */}
      {preview?.valid && preview.contentHashHex && (
        <div className="mt-2 p-2 rounded-lg bg-[rgba(0,240,255,0.03)] border border-[rgba(0,240,255,0.1)]">
          <div className="text-[10px] font-mono text-[var(--text-tertiary)] break-all">
            <span className="text-[var(--neon-cyan)]">SHA-256:</span> {preview.contentHashHex.slice(0, 24)}...
          </div>
          {preview.cid && (
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] break-all mt-0.5">
              <span className="text-[var(--neon-cyan)]">CID:</span> {preview.cid.slice(0, 24)}...
            </div>
          )}
          {preview.snapshot && (
            <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-0.5">
              {preview.snapshot.sourceType === 'url' && preview.snapshot.url && (
                <span>URL: <span className="text-[var(--text-secondary)]">{preview.snapshot.url.slice(0, 50)}{preview.snapshot.url.length > 50 ? '...' : ''}</span> · </span>
              )}
              {preview.snapshot.contentType} · {Math.round(preview.snapshot.contentLengthBytes / 1024)}KB
            </div>
          )}
          {preview.snapshot?.contentPreview && (
            <div className="mt-1 text-[10px] text-[var(--text-tertiary)] line-clamp-2 leading-relaxed">
              {preview.snapshot.contentPreview.slice(0, 200)}{preview.snapshot.contentPreview.length > 200 ? '...' : ''}
            </div>
          )}
        </div>
      )}

      {/* Transaction result */}
      {submitSig && (
        <div className="mt-2 text-[10px] font-mono text-[var(--neon-green)]">
          Tx:{' '}
          <a
            className="underline hover:text-white"
            href={`https://explorer.solana.com/tx/${encodeURIComponent(submitSig)}${clusterParam}`}
            target="_blank"
            rel="noreferrer"
          >
            {submitSig.slice(0, 12)}...
          </a>
        </div>
      )}

      {/* Errors */}
      {previewError && (
        <div className="mt-2 text-xs font-mono text-red-400">{previewError}</div>
      )}
      {submitError && (
        <div className="mt-2 text-xs font-mono text-red-400">{submitError}</div>
      )}

      {/* Success feedback */}
      {feedback && (
        <div className="mt-2 text-xs font-mono text-[var(--deco-gold)]">
          {feedback}
        </div>
      )}

      {/* Tier info */}
      {selectedTier && pricingState.data?.tiers?.[selectedTier] && (
        <div className="mt-2 text-[10px] font-mono text-[var(--text-tertiary)]">
          Tier: {selectedTier.toUpperCase()} · {pricingState.data.tiers[selectedTier].description}
          {!connected && <span className="ml-2 text-[var(--deco-gold)]">Connect wallet for on-chain publishing</span>}
        </div>
      )}
    </div>
  );
}
