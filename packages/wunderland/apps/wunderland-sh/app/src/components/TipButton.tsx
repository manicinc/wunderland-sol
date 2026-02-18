'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { buildSubmitTipIx, parseHex32, safeTipNonce } from '@/lib/wunderland-program';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { CLUSTER } from '@/lib/solana';

const TIP_TIERS = [
  { key: 'low', label: '0.015 SOL', amount: 15_000_000, desc: 'Standard' },
  { key: 'normal', label: '0.025 SOL', amount: 25_000_000, desc: 'Enhanced' },
  { key: 'high', label: '0.035 SOL', amount: 35_000_000, desc: 'Priority' },
  { key: 'breaking', label: '0.045 SOL', amount: 45_000_000, desc: 'Breaking' },
] as const;

interface TipButtonProps {
  contentHash: string;
  enclavePda?: string;
  className?: string;
}

export function TipButton({ contentHash, enclavePda, className = '' }: TipButtonProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();

  // Close on outside click
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setModalOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modalOpen]);

  // Close on ESC
  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [modalOpen]);

  const handleOpen = useCallback(() => {
    if (!connected) {
      setWalletModalVisible(true);
      return;
    }
    setResult(null);
    setModalOpen(true);
  }, [connected, setWalletModalVisible]);

  const handleSubmit = useCallback(async () => {
    if (!publicKey || submitting) return;
    setSubmitting(true);
    setResult(null);

    try {
      const tier = TIP_TIERS[selectedTier];

      // Preview to get content hash for the tip message
      const previewRes = await fetch('/api/tips/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message || `Tip for post ${contentHash.slice(0, 12)}`,
          sourceType: 'text',
        }),
      });
      const preview = await previewRes.json() as { valid: boolean; contentHashHex?: string; error?: string };

      if (!preview.valid || !preview.contentHashHex) {
        setResult({ ok: false, text: preview.error || 'Preview failed' });
        return;
      }

      // Determine target enclave
      let target: PublicKey;
      try {
        target = enclavePda ? new PublicKey(enclavePda) : SystemProgram.programId;
      } catch {
        target = SystemProgram.programId;
      }

      // Build and send the on-chain transaction
      const tipNonce = safeTipNonce();
      const { tip, instruction } = buildSubmitTipIx({
        tipper: publicKey,
        contentHash: parseHex32(preview.contentHashHex),
        amountLamports: BigInt(tier.amount),
        sourceType: 'text',
        tipNonce,
        targetEnclave: target,
      });

      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');

      // Pin snapshot to IPFS (best-effort)
      try {
        await fetch('/api/tips/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipPda: tip.toBase58(),
            snapshotJson: JSON.stringify({
              v: 1,
              sourceType: 'text',
              url: null,
              contentType: 'text/plain',
              contentPreview: message || `Tip for post ${contentHash.slice(0, 12)}`,
              contentLengthBytes: (message || `Tip for post ${contentHash.slice(0, 12)}`).length,
            }),
          }),
        });
      } catch {
        // Non-critical: IPFS pinning failure
      }

      setResult({
        ok: true,
        text: `Tip of ${tier.label} sent on-chain!`,
        sig,
      });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSubmitting(false);
    }
  }, [publicKey, submitting, selectedTier, message, contentHash, enclavePda, connection, sendTransaction]);

  const clusterParam = `?cluster=${encodeURIComponent(CLUSTER)}`;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`group/tip inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono
          text-[var(--text-tertiary)] hover:text-[var(--deco-gold)] hover:bg-[rgba(201,162,39,0.08)]
          transition-all cursor-pointer ${className}`}
        title={connected ? 'Tip this post' : 'Connect wallet to tip'}
      >
        <svg className="group-hover/tip:animate-[wiggle_0.4s_ease-in-out]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
        <span>Tip<span className="opacity-0 group-hover/tip:opacity-100 transition-opacity">!</span></span>
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div
            ref={modalRef}
            className="relative w-full max-w-sm rounded-xl overflow-hidden
              bg-[rgba(10,10,15,0.98)] backdrop-blur-xl
              border border-[var(--border-glass)]
              shadow-[0_16px_64px_rgba(0,0,0,0.5),0_0_24px_rgba(153,69,255,0.1)]"
          >
            {/* Header */}
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <h3 className="font-display font-semibold text-base text-[var(--text-primary)]">
                Tip Post
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              {/* Post reference */}
              <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
                Post: {contentHash.slice(0, 16)}…
              </div>

              {/* Tier selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                  Amount
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIP_TIERS.map((tier, i) => (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setSelectedTier(i)}
                      className={`px-3 py-2.5 rounded-lg text-left transition-all ${
                        selectedTier === i
                          ? 'bg-[rgba(201,162,39,0.12)] border border-[rgba(201,162,39,0.3)] text-[var(--deco-gold)]'
                          : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{tier.label}</div>
                      <div className="text-[10px] opacity-70">{tier.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional message */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)]">
                  Message <span className="normal-case">(optional)</span>
                </label>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Great post!"
                  maxLength={280}
                  className="w-full px-3 py-2 rounded-lg text-sm
                    bg-[var(--bg-glass)] border border-[var(--border-glass)]
                    text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]
                    focus:outline-none focus:border-[rgba(201,162,39,0.3)]
                    transition-all"
                />
              </div>

              {/* Fee summary */}
              <div className="p-3 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]">
                <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                  <span>Tip amount</span>
                  <span className="font-mono">{TIP_TIERS[selectedTier].label}</span>
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1">
                  <span>Account rent</span>
                  <span className="font-mono">~0.002 SOL</span>
                </div>
                <div className="flex justify-between text-xs text-[var(--text-primary)] font-semibold mt-2 pt-2 border-t border-[var(--border-glass)]">
                  <span>Total</span>
                  <span className="font-mono text-[var(--deco-gold)]">
                    ~{((TIP_TIERS[selectedTier].amount + 2_005_000) / 1e9).toFixed(3)} SOL
                  </span>
                </div>
              </div>

              {/* Result message */}
              {result && (
                <div className={`p-3 rounded-lg text-xs ${
                  result.ok
                    ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)] border border-[rgba(0,255,100,0.15)]'
                    : 'bg-[rgba(255,50,50,0.08)] text-[var(--neon-red)] border border-[rgba(255,50,50,0.15)]'
                }`}>
                  {result.text}
                  {result.sig && (
                    <a
                      href={`https://explorer.solana.com/tx/${result.sig}${clusterParam}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline opacity-80 hover:opacity-100"
                    >
                      View TX
                    </a>
                  )}
                </div>
              )}

              {/* Submit */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full py-3 rounded-lg text-sm font-semibold
                  bg-gradient-to-r from-[var(--deco-gold)] to-[rgba(201,162,39,0.8)]
                  text-[#0a0a0f] hover:shadow-[0_0_20px_rgba(201,162,39,0.3)]
                  transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? 'Signing…' : `Send ${TIP_TIERS[selectedTier].label} Tip`}
              </button>

              <p className="text-[10px] text-[var(--text-tertiary)] text-center font-mono">
                70% platform treasury · 30% enclave treasury (Merkle rewards)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
