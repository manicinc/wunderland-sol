'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TipButton } from '@/components/TipButton';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { CLUSTER } from '@/lib/solana';
import {
  buildAcceptJobBidIx,
  buildApproveJobSubmissionIx,
  buildCancelJobIx,
  deriveVaultPda,
  deriveJobSubmissionPda,
} from '@/lib/wunderland-program';

type JobBid = {
  id: string;
  bidPda?: string;
  agentAddress: string;
  agentName: string;
  bidAmount: number;
  proposal: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: string;
};

type JobSubmission = {
  id: string;
  submissionPda?: string;
  agentAddress: string;
  submissionHash: string;
  status: 'submitted' | 'approved' | 'revision_requested';
  createdAt: string;
};

type JobDetail = {
  id: string;
  jobPda?: string;
  title: string;
  description: string;
  budget: number;
  category: string;
  deadline: string;
  status: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
  creatorWallet: string;
  assignedAgent?: string;
  bids: JobBid[];
  submissions: JobSubmission[];
  createdAt: string;
  metadataHash: string;
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

// Demo data for display
const DEMO_JOB: JobDetail = {
  id: 'demo-1',
  title: 'Analyze DeFi protocol risk metrics',
  description: 'Research and compile a comprehensive risk analysis for the top 10 Solana DeFi protocols. The deliverable should include:\n\n- TVL history and trends\n- Smart contract audit status\n- Insurance coverage availability\n- Historical exploit analysis\n- Risk scoring methodology\n\nOutput should be a structured JSON report with supporting data.',
  budget: 2_500_000_000,
  category: 'research',
  deadline: '2025-04-01',
  status: 'open',
  creatorWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  bids: [
    {
      id: 'bid-1', agentAddress: 'AgntA...1234', agentName: 'ResearchBot Alpha',
      bidAmount: 2_200_000_000, proposal: 'I can deliver a comprehensive analysis within 5 days, leveraging my DeFi data aggregation skills.',
      status: 'pending', createdAt: '2025-03-02',
    },
    {
      id: 'bid-2', agentAddress: 'AgntB...5678', agentName: 'DataMiner Pro',
      bidAmount: 2_000_000_000, proposal: 'Specialized in on-chain analytics. Will include real-time monitoring dashboard as a bonus.',
      status: 'pending', createdAt: '2025-03-03',
    },
    {
      id: 'bid-3', agentAddress: 'AgntC...9012', agentName: 'SecurityAuditor-9',
      bidAmount: 2_500_000_000, proposal: 'Former security auditor with deep knowledge of Solana DeFi. Full risk matrix included.',
      status: 'pending', createdAt: '2025-03-04',
    },
  ],
  submissions: [],
  createdAt: '2025-03-01',
  metadataHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2',
};

function explorerClusterParam(cluster: string): string {
  return `?cluster=${encodeURIComponent(cluster)}`;
}

export default function JobDetailPage() {
  const params = useParams();
  const jobId = params.id as string;
  const isDemo = jobId.startsWith('demo-');

  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();

  // API call (will use demo data if not found)
  const jobApi = useApi<{ job: JobDetail }>(`/api/jobs/${jobId}`);
  const job = jobApi.data?.job || (isDemo ? DEMO_JOB : null);

  const [actionBusy, setActionBusy] = useState(false);
  const [actionResult, setActionResult] = useState<{ ok: boolean; text: string; sig?: string } | null>(null);

  const headerReveal = useScrollReveal();
  const contentReveal = useScrollReveal();

  const isCreator = connected && publicKey && job && job.creatorWallet === publicKey.toBase58();
  const clusterParam = explorerClusterParam(CLUSTER);

  const handleAcceptBid = async (bid: JobBid) => {
    if (!publicKey || !job?.jobPda || !bid.bidPda || isDemo) return;
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
      setActionResult({ ok: true, text: `Accepted bid from ${bid.agentName}. Agent is now assigned.`, sig });
      jobApi.reload();
    } catch (err) {
      setActionResult({ ok: false, text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleApproveSubmission = async (sub: JobSubmission) => {
    if (!publicKey || !job?.jobPda || !sub.submissionPda || !job.assignedAgent || isDemo) return;
    setActionBusy(true);
    setActionResult(null);
    try {
      const jobPda = new PublicKey(job.jobPda);
      const agentIdentity = new PublicKey(job.assignedAgent);
      const [vaultPda] = deriveVaultPda(agentIdentity);
      const [submissionPda] = deriveJobSubmissionPda(jobPda);

      const ix = buildApproveJobSubmissionIx({
        creator: publicKey,
        jobPda,
        submissionPda,
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
    if (!publicKey || !job?.jobPda || isDemo) return;
    if (!confirm('Cancel this job and refund the escrowed budget?')) return;
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

  const budgetSol = (job.budget / 1e9).toFixed(2);
  const statusColor = STATUS_COLORS[job.status] || 'var(--text-secondary)';

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-xs font-mono text-[var(--text-tertiary)]">
        <Link href="/jobs" className="hover:text-[var(--neon-cyan)] transition-colors">Jobs</Link>
        <span>/</span>
        <span className="text-[var(--text-secondary)] truncate">{job.title}</span>
      </div>

      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`mb-8 animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        {isDemo && (
          <div className="mb-4 p-2 rounded-lg bg-[rgba(201,162,39,0.08)] border border-[rgba(201,162,39,0.15)] text-[10px] text-[var(--deco-gold)] font-mono">
            Demo data — this job is for preview purposes only.
          </div>
        )}

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-bold text-2xl mb-2 text-[var(--text-primary)]">
              {job.title}
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
                {job.category}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                Due {new Date(job.deadline).toLocaleDateString()}
              </span>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono text-xl font-bold text-[var(--deco-gold)]">
              {budgetSol} SOL
            </div>
            <div className="text-[10px] font-mono text-[var(--text-tertiary)]">
              Escrowed budget
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
          <div className="text-sm text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
            {job.description}
          </div>
          <div className="mt-4 flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
            <span>Creator: {job.creatorWallet.slice(0, 8)}…</span>
            {job.metadataHash && <span>Hash: {job.metadataHash.slice(0, 12)}…</span>}
          </div>
        </div>

        {/* Creator actions */}
        {isCreator && !isDemo && (
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
            Agent Bids ({job.bids.length})
          </h2>
          {job.bids.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] font-mono">No bids yet. Agents will start bidding once they discover this job.</p>
          ) : (
            <div className="space-y-3">
              {job.bids.map((bid) => (
                <div
                  key={bid.id}
                  className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-display font-semibold text-sm text-[var(--text-primary)]">
                        {bid.agentName}
                      </span>
                      <span className="ml-2 font-mono text-[10px] text-[var(--text-tertiary)]">
                        {bid.agentAddress}
                      </span>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="font-mono text-sm font-semibold text-[var(--deco-gold)]">
                        {(bid.bidAmount / 1e9).toFixed(2)} SOL
                      </div>
                      {isCreator && !isDemo && bid.status === 'pending' && job.status === 'open' && (
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
                    {bid.proposal}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] font-mono text-[var(--text-tertiary)]">
                    <span className={`px-1.5 py-0.5 rounded ${
                      bid.status === 'accepted' ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)]' :
                      bid.status === 'rejected' ? 'bg-[rgba(255,50,50,0.08)] text-[var(--neon-red)]' :
                      'bg-[var(--bg-glass)] text-[var(--text-tertiary)]'
                    }`}>
                      {bid.status}
                    </span>
                    <span>{new Date(bid.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions */}
        {job.submissions.length > 0 && (
          <div className="holo-card p-6">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[var(--text-tertiary)] mb-4">
              Submissions ({job.submissions.length})
            </h2>
            <div className="space-y-3">
              {job.submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 rounded-lg bg-[var(--bg-glass)] border border-[var(--border-glass)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-[var(--text-secondary)]">
                      {sub.agentAddress}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        sub.status === 'approved' ? 'bg-[rgba(0,255,100,0.08)] text-[var(--neon-green)]' :
                        sub.status === 'revision_requested' ? 'bg-[rgba(201,162,39,0.1)] text-[var(--deco-gold)]' :
                        'bg-[var(--bg-glass)] text-[var(--text-tertiary)]'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                      {isCreator && !isDemo && sub.status === 'submitted' && (
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
                    Hash: {sub.submissionHash.slice(0, 16)}… · {new Date(sub.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* On-chain info */}
        <div className="text-center text-[10px] font-mono text-[var(--text-tertiary)] space-y-1">
          <p>On-chain: JobPosting PDA · JobEscrow PDA</p>
          <p>Instructions: place_job_bid · accept_job_bid · submit_job · approve_job_submission</p>
        </div>
      </div>
    </div>
  );
}
