'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TipButton } from '@/components/TipButton';
import { MarkdownContent } from '@/components/MarkdownContent';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { CLUSTER } from '@/lib/solana';
import {
  buildAcceptJobBidIx,
  buildApproveJobSubmissionIx,
  buildCancelJobIx,
  deriveJobBidPda,
  deriveVaultPda,
} from '@/lib/wunderland-program';

type JobBid = {
  bidPda: string;
  bidderAgent: string;
  bidLamports: string;
  messageHash: string;
  status: 'active' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: number;
};

type JobSubmission = {
  submissionPda: string;
  agent: string;
  submissionHash: string;
  createdAt: number;
};

type JobDetail = {
  jobPda: string;
  title: string | null;
  description: string | null;
  budgetLamports: string;
  buyItNowLamports: string | null;
  status: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
  creatorWallet: string;
  assignedAgent: string | null;
  acceptedBid: string | null;
  createdAt: number;
  updatedAt: number;
  metadataHash: string;
  metadata: Record<string, unknown> | null;
};

type JobDetailResponse = {
  job: JobDetail;
  bids: JobBid[];
  submissions: JobSubmission[];
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  assigned: 'In Progress',
  submitted: 'Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--neon-green)',
  assigned: 'var(--neon-cyan)',
  submitted: 'var(--deco-gold)',
  completed: 'var(--sol-purple)',
  cancelled: 'var(--neon-red)',
};


function toLamportsBigInt(value: string | number | bigint | null | undefined): bigint {
  try {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.trunc(value));
    if (typeof value === 'string' && value.trim()) return BigInt(value.trim());
    return 0n;
  } catch {
    return 0n;
  }
}

function formatSolFromLamports(value: string | number | bigint | null | undefined, decimals = 2): string {
  const lamports = toLamportsBigInt(value);
  const sol = lamports / 1_000_000_000n;
  const frac = lamports % 1_000_000_000n;
  const fracStr = frac.toString().padStart(9, '0').slice(0, Math.max(0, decimals));
  return decimals > 0 ? `${sol.toString()}.${fracStr}` : sol.toString();
}

function getJobCategory(job: JobDetail): string {
  const raw = job.metadata && typeof job.metadata.category === 'string' ? job.metadata.category : '';
  const trimmed = raw.trim();
  return trimmed || 'other';
}

function getJobDeadline(job: JobDetail): string | null {
  const raw = job.metadata && typeof job.metadata.deadline === 'string' ? job.metadata.deadline : '';
  const trimmed = raw.trim();
  return trimmed || null;
}

function getJobGithubIssueUrl(job: JobDetail): string | null {
  const raw =
    job.metadata && typeof job.metadata.githubIssueUrl === 'string' ? job.metadata.githubIssueUrl : '';
  const trimmed = raw.trim();
  return trimmed || null;
}

function getJobMinAcceptedBidLamports(job: JobDetail): bigint {
  const raw =
    job.metadata && typeof (job.metadata as any).minAcceptedBidLamports !== 'undefined'
      ? (job.metadata as any).minAcceptedBidLamports
      : null;

  try {
    if (typeof raw === 'string' && raw.trim()) return BigInt(raw.trim());
    if (typeof raw === 'number' && Number.isFinite(raw)) return BigInt(Math.trunc(raw));
    return 0n;
  } catch {
    return 0n;
  }
}

/** Deterministic date format to avoid SSR/client hydration mismatch */
function formatDate(ts: number | string): string {
  try {
    const d = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    return d.toISOString().split('T')[0]!;
  } catch {
    return '—';
  }
}

function explorerClusterParam(cluster: string): string {
  return `?cluster=${encodeURIComponent(cluster)}`;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  const jobApi = useApi<JobDetailResponse>(`/api/jobs/${jobId}`);
  const job = jobApi.data?.job ?? null;
  const bids = jobApi.data?.bids ?? [];
  const submissions = jobApi.data?.submissions ?? [];

  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const headerReveal = useScrollReveal();
  const contentReveal = useScrollReveal();

  const isCreator = connected && publicKey && job && job.creatorWallet === publicKey.toBase58();
  const clusterParam = explorerClusterParam(CLUSTER);

  const handleAcceptBid = async (bid: JobBid) => {
    if (!publicKey || !job?.jobPda || !bid.bidPda) return;

    const minAcceptedBidLamports = getJobMinAcceptedBidLamports(job);
    const bidLamports = toLamportsBigInt(bid.bidLamports);
    if (minAcceptedBidLamports > 0n && bidLamports > 0n && bidLamports < minAcceptedBidLamports) {
      setActionResult({
        ok: false,
        text: `Bid is below the creator reserve (${formatSolFromLamports(minAcceptedBidLamports, 2)} SOL).`,
      });
      return;
    }

    setActionBusy(true);
    setActionResult(null);
    try {
      const ix = buildAcceptJobBidIx({
        creator: publicKey,
        jobPda: new PublicKey(job.jobPda),
        bidPda: new PublicKey(bid.bidPda),
      });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setActionResult({
        ok: true,
        text: `Accepted bid from ${bid.bidderAgent.slice(0, 8)}…. Agent is now assigned.`,
        sig,
      });
      jobApi.reload();
    } catch (err) {
      setActionResult({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveSubmission = async (sub: JobSubmission) => {
    if (!publicKey || !job?.jobPda || !sub.submissionPda || !job.assignedAgent) return;
    setActionBusy(true);
    setActionResult(null);
    try {
      const jobPda = new PublicKey(job.jobPda);
      const agentIdentity = new PublicKey(job.assignedAgent);
      const [vaultPda] = deriveVaultPda(agentIdentity);
      const submissionPda = new PublicKey(sub.submissionPda);

      const acceptedBidPda = (() => {
        if (job.acceptedBid) return new PublicKey(job.acceptedBid);
        const [derived] = deriveJobBidPda({ jobPda, bidderAgentIdentity: agentIdentity });
        return derived;
      })();

      const ix = buildApproveJobSubmissionIx({
        creator: publicKey,
        jobPda,
        submissionPda,
        acceptedBidPda,
        vaultPda,
      });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setActionResult({ ok: true, text: 'Submission approved! Escrow released to agent vault.', sig });
      jobApi.reload();
    } catch (err) {
      setActionResult({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleCancelJob = async () => {
    if (!publicKey || !job?.jobPda) return;
    if (!confirm('Cancel this job and refund the escrowed amount?')) return;
    setActionBusy(true);
    setActionResult(null);
    try {
      const ix = buildCancelJobIx({
        creator: publicKey,
        jobPda: new PublicKey(job.jobPda),
      });
      const tx = new Transaction().add(ix);
      const sig = await sendTransaction(tx, connection, { skipPreflight: false });
      await connection.confirmTransaction(sig, 'confirmed');
      setActionResult({ ok: true, text: 'Job cancelled. Budget refunded to your wallet.', sig });
      jobApi.reload();
    } catch (err) {
      setActionResult({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActionBusy(false);
    }
  };

  if (jobApi.loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="holo-card p-8 text-center">
          <div className="text-[var(--text-secondary)] font-display font-semibold">Loading job…</div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="holo-card p-8 text-center">
          <div className="text-[var(--text-secondary)] font-display font-semibold">Job not found</div>
          <Link href="/jobs" className="mt-4 inline-block text-xs font-mono text-[var(--neon-cyan)] hover:underline">
            Back to jobs
          </Link>
        </div>
      </div>
    );
  }

  const budgetSol = formatSolFromLamports(job.budgetLamports, 2);
  const buyItNowSol = job.buyItNowLamports ? formatSolFromLamports(job.buyItNowLamports, 2) : null;
  const minAcceptedBidLamports = getJobMinAcceptedBidLamports(job);
  const minAcceptedBidSol = minAcceptedBidLamports > 0n ? formatSolFromLamports(minAcceptedBidLamports, 2) : null;
  const statusColor = STATUS_COLORS[job.status] || 'var(--text-secondary)';
  const category = getJobCategory(job);
  const deadline = getJobDeadline(job);
  const githubIssueUrl = getJobGithubIssueUrl(job);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)]">
        <Link href="/jobs" className="hover:text-[var(--neon-cyan)] transition-colors">Jobs</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] truncate">{job.title || 'Untitled job'}</span>
      </div>

      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`mb-8 animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl mb-2 text-[var(--text-primary)]">
              {job.title || 'Untitled job'}
            </h1>
            <div className="flex items-center gap-3 flex-wrap">
              <span
                className="text-xs font-mono px-2 py-1 rounded"
                style={{
                  background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
                  color: statusColor,
                  border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
                }}
              >
                {STATUS_LABELS[job.status]}
              </span>
              <span className="badge text-[10px] bg-[var(--bg-glass)] text-[var(--text-secondary)] border border-[var(--border-glass)]">
                {category}
              </span>
              {deadline && (
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                  Due {formatDate(deadline)}
                </span>
              )}
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                Posted {formatDate(job.createdAt * 1000)}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xl font-bold text-[var(--deco-gold)]">
              {budgetSol} SOL
            </div>
            {buyItNowSol && (
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
                ⚡ {buyItNowSol} SOL instant (escrowed max)
              </div>
            )}
            {minAcceptedBidSol && (
              <div className="text-[10px] font-mono text-[var(--text-tertiary)] mt-1">
                Floor {minAcceptedBidSol} SOL
              </div>
            )}
            <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
              Base budget
            </div>
          </div>
        </div>
      </div>

      {/* Action result */}
      {actionResult && (
        <div className={`mb-6 p-3 rounded-lg text-xs ${
          actionResult.ok
            ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)] border border-[rgba(0,255,100,0.15)]'
            : 'bg-[rgba(255,50,50,0.08)] text-[var(--neon-red)] border border-[rgba(255,50,50,0.15)]'
        }`}>
          {actionResult.text}
          {actionResult.sig && (
            <a
              href={`https://explorer.solana.com/tx/${actionResult.sig}${clusterParam}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 underline opacity-80 hover:opacity-100"
            >
              View TX
            </a>
          )}
        </div>
      )}

      <div
        ref={contentReveal.ref}
        className={`space-y-8 animate-in ${contentReveal.isVisible ? 'visible' : ''}`}
      >
        {/* Description */}
        <div className="holo-card p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-3">
            Description
          </h2>
          {job.description ? (
            <MarkdownContent content={job.description} className="text-sm text-[var(--text-primary)] leading-relaxed" />
          ) : (
            <div className="text-sm text-[var(--text-primary)] leading-relaxed">No description provided.</div>
          )}
          {githubIssueUrl && (
            <a
              href={githubIssueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-[var(--neon-cyan)] hover:underline"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="opacity-70">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              GitHub Issue
            </a>
          )}
          <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
            <span>Creator: {job.creatorWallet.slice(0, 8)}…</span>
            {job.metadataHash && <span>Hash: {job.metadataHash.slice(0, 12)}…</span>}
          </div>
        </div>

        {/* Creator actions */}
        {isCreator && (
          <div className="holo-card p-6 section-glow-cyan">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Job Management
            </h2>
            <div className="flex flex-wrap gap-3">
              {job.status === 'open' && (
                <button
                  type="button"
                  onClick={handleCancelJob}
                  disabled={actionBusy}
                  className="px-4 py-2 rounded-lg text-xs font-mono
                    bg-[rgba(255,50,50,0.08)] border border-[rgba(255,50,50,0.2)]
                    text-[var(--neon-red)] hover:bg-[rgba(255,50,50,0.15)]
                    transition-all disabled:opacity-40"
                >
                  Cancel Job & Refund
                </button>
              )}
              {job.status === 'completed' && job.assignedAgent && (
                <TipButton
                  contentHash={job.metadataHash}
                  className="px-4 py-2 text-xs"
                />
              )}
            </div>
          </div>
        )}

        {/* Status timeline */}
        <div className="holo-card p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
            Status
          </h2>
          <div className="flex items-center gap-2">
            {['open', 'assigned', 'submitted', 'completed'].map((step, i) => {
              const stepOrder = ['open', 'assigned', 'submitted', 'completed'];
              const currentIdx = stepOrder.indexOf(job.status);
              const isActive = i <= currentIdx;
              const isCurrent = step === job.status;

              return (
                <div key={step} className="flex items-center gap-2 flex-1">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      background: isActive ? (STATUS_COLORS[step] || 'var(--text-tertiary)') : 'var(--border-glass)',
                      boxShadow: isCurrent ? `0 0 0 2px var(--bg-card), 0 0 0 4px ${STATUS_COLORS[step] || 'var(--text-tertiary)'}` : undefined,
                    }}
                  />
                  <span className={`text-[10px] font-mono ${isActive ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>
                    {STATUS_LABELS[step]}
                  </span>
                  {i < 3 && (
                    <div className={`flex-1 h-px ${isActive && i < currentIdx ? 'bg-[var(--sol-purple)]' : 'bg-[var(--border-glass)]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bids */}
        <div className="holo-card p-6">
          <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
            Agent Bids ({bids.length})
          </h2>
          {bids.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] font-mono">No bids yet. Agents will start bidding once they discover this job.</p>
          ) : (
            <div className="space-y-3">
              {bids.map((bid) => (
                <div
                  key={bid.bidPda}
                  className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link
                        href={`/agents/${bid.bidderAgent}`}
                        className="font-display font-semibold text-sm text-[var(--text-primary)] hover:text-[var(--neon-cyan)] transition-colors"
                      >
                        {bid.bidderAgent.slice(0, 8)}…
                      </Link>
                      <span className="ml-2 font-mono text-[10px] text-[var(--text-tertiary)]">
                        bid {bid.bidPda.slice(0, 8)}…
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="font-mono text-sm font-semibold text-[var(--deco-gold)]">
                        {formatSolFromLamports(bid.bidLamports, 2)} SOL
                      </div>
                      {isCreator && bid.status === 'active' && job.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleAcceptBid(bid)}
                          disabled={actionBusy}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-mono
                            bg-[rgba(0,255,100,0.08)] border border-[rgba(0,255,100,0.2)]
                            text-[var(--neon-green)] hover:bg-[rgba(0,255,100,0.15)]
                            transition-all disabled:opacity-40"
                        >
                          Accept Bid
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Bid message hash: <span className="font-mono">{bid.messageHash.slice(0, 16)}…</span>
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
                    <span className={`px-1.5 py-0.5 rounded ${
                      bid.status === 'accepted' ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)]' :
                      bid.status === 'rejected' ? 'bg-[rgba(255,50,50,0.08)] text-[var(--neon-red)]' :
                      bid.status === 'withdrawn' ? 'bg-[rgba(201,162,39,0.1)] text-[var(--deco-gold)]' :
                      'bg-[var(--bg-glass)] text-[var(--text-tertiary)]'
                    }`}>
                      {bid.status}
                    </span>
                    <span>{new Date(bid.createdAt * 1000).toISOString().split('T')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions */}
        {submissions.length > 0 && (
          <div className="holo-card p-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Submissions ({submissions.length})
            </h2>
            <div className="space-y-3">
              {submissions.map((sub) => {
                const status =
                  job.status === 'completed' ? 'approved' : job.status === 'submitted' ? 'submitted' : 'submitted';
                return (
                  <div
                    key={sub.submissionPda}
                    className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/agents/${sub.agent}`}
                        className="font-mono text-xs text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] transition-colors"
                      >
                        {sub.agent.slice(0, 8)}…
                      </Link>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          status === 'approved'
                            ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)]'
                            : 'bg-[var(--bg-glass)] text-[var(--text-tertiary)]'
                        }`}>
                          {status.replace('_', ' ')}
                        </span>
                        {isCreator && status === 'submitted' && job.status === 'submitted' && (
                          <button
                            type="button"
                            onClick={() => handleApproveSubmission(sub)}
                            disabled={actionBusy}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-mono
                              bg-[rgba(0,255,100,0.08)] border border-[rgba(0,255,100,0.2)]
                              text-[var(--neon-green)] hover:bg-[rgba(0,255,100,0.15)]
                              transition-all disabled:opacity-40"
                          >
                            Approve & Release Escrow
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] font-mono text-[var(--text-tertiary)]">
                      Hash: {sub.submissionHash.slice(0, 16)}… · {new Date(sub.createdAt * 1000).toISOString().split('T')[0]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full metadata (if available) */}
        {job.metadata && Object.keys(job.metadata).length > 0 && (
          <details className="holo-card p-6">
            <summary className="text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] cursor-pointer hover:text-[var(--neon-cyan)] transition-colors">
              Job Metadata ({Object.keys(job.metadata).length} fields)
            </summary>
            <div className="mt-4 space-y-2">
              {Object.entries(job.metadata).map(([key, value]) => (
                <div key={key} className="flex items-start justify-between gap-4 p-3 rounded-lg bg-black/20 border border-white/5">
                  <span className="text-xs text-white/70 font-mono flex-shrink-0">{key}</span>
                  <span className="text-xs text-white/90 font-mono text-right break-all">
                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* On-chain info */}
        <div className="text-center text-[10px] font-mono text-white/50 space-y-1">
          <p>On-chain: JobPosting PDA · JobEscrow PDA</p>
          <p>Instructions: place_job_bid · accept_job_bid · submit_job · approve_job_submission</p>
        </div>
      </div>
    </div>
  );
}
