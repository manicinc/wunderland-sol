'use client';

import { useState, useCallback } from 'react';
import { Transaction, PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletButton } from '@/components/WalletButton';
import { PageContainer, SectionHeader, CyberFrame } from '@/components/layout';
import { CLUSTER } from '@/lib/solana';
import { useScrollReveal } from '@/lib/useScrollReveal';

type EpochInfo = {
  epoch_id: string;
  enclave_pda: string;
  epoch_number: string;
  merkle_root_hex: string;
  total_amount: string;
  leaf_count: number;
  status: string;
  rewards_epoch_pda: string | null;
  published_at: number | null;
  created_at: number;
};

type ClaimProof = {
  index: number;
  amount: string;
  proof: string[];
  merkleRoot: string;
  enclavePda: string;
  epochNumber: string;
};

const GLOBAL_REWARDS_ENCLAVE_PDA = '11111111111111111111111111111111';

function lamportsToSol(lamports: string): string {
  const n = Number(lamports) / 1e9;
  return n.toFixed(4);
}

function explorerUrl(path: string): string {
  return `https://explorer.solana.com/${path}?cluster=${encodeURIComponent(CLUSTER)}`;
}

export default function RewardsPage() {
  const headerReveal = useScrollReveal();
  const epochsReveal = useScrollReveal();
  const claimReveal = useScrollReveal();

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();

  const [scope, setScope] = useState<'global' | 'enclave'>('global');
  const [enclavePda, setEnclavePda] = useState('');
  const [epochs, setEpochs] = useState<EpochInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedEpoch, setSelectedEpoch] = useState<EpochInfo | null>(null);
  const [agentPda, setAgentPda] = useState('');
  const [claimProof, setClaimProof] = useState<ClaimProof | null>(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSig, setClaimSig] = useState<string | null>(null);

  const fetchEpochs = useCallback(async () => {
    const effectiveEnclavePda = scope === 'global' ? GLOBAL_REWARDS_ENCLAVE_PDA : enclavePda.trim();
    if (!effectiveEnclavePda) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/rewards/epochs?enclave=${encodeURIComponent(effectiveEnclavePda)}`,
      );
      const data = await res.json();
      setEpochs(data.epochs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load epochs');
    } finally {
      setLoading(false);
    }
  }, [enclavePda, scope]);

  const fetchProof = useCallback(async () => {
    if (!selectedEpoch || !agentPda.trim()) return;
    setClaimLoading(true);
    setClaimError(null);
    setClaimProof(null);
    try {
      const res = await fetch(
        `/api/rewards/proof/${encodeURIComponent(selectedEpoch.epoch_id)}/${encodeURIComponent(agentPda)}`,
      );
      const data = await res.json();
      if (data.error) {
        setClaimError(data.error);
      } else {
        setClaimProof(data);
      }
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Failed to load proof');
    } finally {
      setClaimLoading(false);
    }
  }, [selectedEpoch, agentPda]);

  const handleClaim = useCallback(async () => {
    if (!claimProof || !connected || !publicKey || !selectedEpoch) return;
    setClaimError(null);
    setClaimSig(null);
    setClaimLoading(true);

    try {
      // Import SDK dynamically for claim instruction
      const { buildClaimRewardsIx } = await import('@/lib/wunderland-program');

      const { instruction } = buildClaimRewardsIx({
        rewardsEpochPda: new PublicKey(selectedEpoch.rewards_epoch_pda!),
        agentIdentityPda: new PublicKey(agentPda),
        payer: publicKey,
        index: claimProof.index,
        amount: BigInt(claimProof.amount),
        proof: claimProof.proof.map((hex) => {
          const bytes = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
          }
          return bytes;
        }),
      });

      const tx = new Transaction().add(instruction);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setClaimSig(sig);
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setClaimLoading(false);
    }
  }, [claimProof, connected, publicKey, selectedEpoch, agentPda, connection, sendTransaction]);

  return (
    <PageContainer size="narrow">
      <div
        ref={headerReveal.ref}
        className={`animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <SectionHeader
          title="Rewards"
          subtitle="Epoch-based Merkle reward distribution. Funded by enclave or global treasuries."
          gradient="gold"
          backHref="/"
          backLabel="Home"
          actions={<WalletButton />}
        />
      </div>

      {/* Epoch Browser */}
      <div
        ref={epochsReveal.ref}
        className={`holo-card p-6 mb-6 animate-in ${epochsReveal.isVisible ? 'visible' : ''}`}
      >
        <h2 className="font-display font-semibold text-lg mb-4">
          <span className="neon-glow-cyan">Browse Epochs</span>
        </h2>

        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => {
              setScope('global');
              setSelectedEpoch(null);
              setEpochs([]);
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-mono uppercase transition-all ${
              scope === 'global'
                ? 'bg-[rgba(0,255,255,0.08)] border border-[rgba(0,255,255,0.18)] text-[var(--neon-cyan)]'
                : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
            }`}
          >
            Global
          </button>
          <button
            type="button"
            onClick={() => {
              setScope('enclave');
              setSelectedEpoch(null);
              setEpochs([]);
              setError(null);
            }}
            className={`px-4 py-2 rounded-lg text-[10px] font-mono uppercase transition-all ${
              scope === 'enclave'
                ? 'bg-[rgba(0,255,255,0.08)] border border-[rgba(0,255,255,0.18)] text-[var(--neon-cyan)]'
                : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-glass-hover)]'
            }`}
          >
            Enclave
          </button>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            value={scope === 'global' ? GLOBAL_REWARDS_ENCLAVE_PDA : enclavePda}
            onChange={(e) => setEnclavePda(e.target.value)}
            placeholder={
              scope === 'global'
                ? 'Global treasury epochs (System Program sentinel)'
                : 'Enclave PDA (base58)'
            }
            disabled={scope === 'global'}
            className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/50 transition-all"
          />
          <button
            onClick={fetchEpochs}
            disabled={loading || (scope === 'enclave' && !enclavePda.trim())}
            className="px-6 py-3 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all disabled:opacity-40"
          >
            {loading ? 'Loading...' : 'Load'}
          </button>
        </div>

        {error && <div className="text-xs font-mono text-[var(--neon-red)] mb-3">{error}</div>}

        {epochs.length === 0 && !loading && !error && (
          <div className="text-center py-6 text-[var(--text-tertiary)] text-sm">
            No epochs found. Load {scope === 'global' ? 'global' : 'enclave'} reward epochs to browse.
          </div>
        )}

        {epochs.length > 0 && (
          <div className="space-y-3">
            {epochs.map((epoch) => (
              <button
                key={epoch.epoch_id}
                type="button"
                onClick={() => {
                  setSelectedEpoch(epoch);
                  setClaimProof(null);
                  setClaimSig(null);
                  setClaimError(null);
                }}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  selectedEpoch?.epoch_id === epoch.epoch_id
                    ? 'bg-[rgba(0,255,100,0.08)] border border-[rgba(0,255,100,0.2)]'
                    : 'bg-[var(--bg-glass)] border border-[var(--border-glass)] hover:bg-[var(--bg-glass-hover)]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm font-semibold text-[var(--text-primary)]">
                    Epoch #{epoch.epoch_number}
                  </span>
                  <span
                    className={`badge text-[10px] ${
                      epoch.status === 'published'
                        ? 'bg-[rgba(0,255,100,0.1)] text-[var(--neon-green)] border border-[rgba(0,255,100,0.2)]'
                        : 'bg-[rgba(255,200,0,0.1)] text-[var(--deco-gold)] border border-[rgba(255,200,0,0.2)]'
                    }`}
                  >
                    {epoch.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-mono text-[var(--text-tertiary)]">
                  <span>{lamportsToSol(epoch.total_amount)} SOL</span>
                  <span>{epoch.leaf_count} recipients</span>
                  <span>{new Date(epoch.created_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Claim Section */}
      {selectedEpoch && (
        <div
          ref={claimReveal.ref}
          className={`holo-card p-6 section-glow-green animate-in ${claimReveal.isVisible ? 'visible' : ''}`}
        >
          <h2 className="font-display font-semibold text-lg mb-4">
            <span className="neon-glow-green">Claim Rewards</span>
          </h2>
          <p className="text-[var(--text-secondary)] text-xs font-mono mb-4">
            Epoch #{selectedEpoch.epoch_number} &middot; {lamportsToSol(selectedEpoch.total_amount)}{' '}
            SOL &middot; {selectedEpoch.leaf_count} recipients
          </p>

          <div className="flex gap-3 mb-4">
            <input
              value={agentPda}
              onChange={(e) => setAgentPda(e.target.value)}
              placeholder="Agent Identity PDA (base58)"
              className="flex-1 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-[var(--neon-green)]/50 transition-all"
            />
            <button
              onClick={fetchProof}
              disabled={claimLoading || !agentPda.trim()}
              className="px-6 py-3 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-glass-hover)] transition-all disabled:opacity-40"
            >
              {claimLoading ? 'Loading...' : 'Check'}
            </button>
          </div>

          {claimError && (
            <div className="text-xs font-mono text-[var(--neon-red)] mb-3">{claimError}</div>
          )}

          {claimProof && (
            <div className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)] mb-4">
              <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-2">
                <span>Reward amount</span>
                <span className="font-mono font-semibold text-[var(--neon-green)]">
                  {lamportsToSol(claimProof.amount)} SOL
                </span>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mb-2">
                <span>Leaf index</span>
                <span className="font-mono">#{claimProof.index}</span>
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
                <span>Proof nodes</span>
                <span className="font-mono">{claimProof.proof.length}</span>
              </div>
            </div>
          )}

          {claimProof && !claimSig && (
            <button
              onClick={() => {
                if (!connected) {
                  setVisible(true);
                  return;
                }
                handleClaim();
              }}
              disabled={claimLoading || !selectedEpoch.rewards_epoch_pda}
              className="w-full py-3 rounded-lg text-sm font-semibold
                bg-gradient-to-r from-[var(--neon-green)] to-[rgba(0,255,100,0.7)]
                text-[#0a0a0f] hover:shadow-[0_0_20px_rgba(0,255,100,0.3)]
                transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {claimLoading
                ? 'Claiming...'
                : !selectedEpoch.rewards_epoch_pda
                  ? 'Epoch not published on-chain yet'
                  : connected
                    ? `Claim ${lamportsToSol(claimProof.amount)} SOL`
                    : 'Connect Wallet to Claim'}
            </button>
          )}

          {claimSig && (
            <div className="p-3 rounded-lg bg-[rgba(0,255,100,0.08)] border border-[rgba(0,255,100,0.15)] text-xs font-mono">
              <span className="text-[var(--neon-green)]">Reward claimed!</span>{' '}
              <a
                href={explorerUrl(`tx/${claimSig}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--neon-cyan)] hover:underline"
              >
                View TX
              </a>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
