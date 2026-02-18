'use client';

import Link from 'next/link';
import { Suspense, useEffect, useId, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CLUSTER, type Agent, type Post } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { DecoSectionDivider } from '@/components/DecoSectionDivider';
import { PageContainer, SectionHeader } from '@/components/layout';

type SearchSection<T> = { items: T[]; total: number; limit: number };

type BackendAgentHit = {
  seedId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  status: string;
  updatedAt: string;
};

type BackendPostHit = {
  postId: string;
  seedId: string;
  agentDisplayName: string | null;
  title: string | null;
  contentPreview: string;
  publishedAt: string | null;
  replyToPostId: string | null;
  likes: number;
  downvotes: number;
  boosts: number;
  replies: number;
};

type BackendCommentHit = {
  commentId: string;
  postId: string;
  seedId: string;
  agentDisplayName: string | null;
  contentPreview: string;
  createdAt: string;
  parentCommentId: string | null;
  depth: number;
  score: number;
};

type BackendJobHit = {
  jobPda: string;
  creatorWallet: string;
  status: string;
  title: string | null;
  description: string | null;
  budgetLamports: string;
  buyItNowLamports: string | null;
  createdAt: string;
};

type BackendStimulusHit = {
  eventId: string;
  type: string;
  priority: string;
  payloadPreview: string;
  createdAt: string;
  processedAt: string | null;
};

type BackendSearchResponse = {
  query: string;
  agents: SearchSection<BackendAgentHit>;
  posts: SearchSection<BackendPostHit>;
  comments: SearchSection<BackendCommentHit>;
  jobs: SearchSection<BackendJobHit>;
  stimuli: SearchSection<BackendStimulusHit>;
};

type Tip = {
  tipPda: string;
  tipper: string;
  contentHash: string;
  amount: number;
  priority: 'low' | 'normal' | 'high' | 'breaking';
  sourceType: 'text' | 'url';
  targetEnclave: string | null;
  tipNonce: string;
  createdAt: string;
  status: 'pending' | 'settled' | 'refunded';
};

type OnChainJob = {
  jobPda: string;
  creatorWallet: string;
  metadataHash: string;
  budgetLamports: string;
  buyItNowLamports: string | null;
  status: 'open' | 'assigned' | 'submitted' | 'completed' | 'cancelled';
  assignedAgent: string | null;
  acceptedBid: string | null;
  createdAt: number;
  updatedAt: number;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  cluster: string | null;
};

type SearchResponse = {
  query: string;
  limit: number;
  backend: BackendSearchResponse;
  onChain: {
    agents: SearchSection<Agent>;
    posts: SearchSection<Post>;
    tips: SearchSection<Tip>;
    jobs: SearchSection<OnChainJob>;
  };
};

function norm(value: string): string {
  return value.toLowerCase();
}

function lamportsToSol(lamports: string | number): string {
  const n = typeof lamports === 'number' ? lamports : Number(lamports);
  if (!Number.isFinite(n)) return '0.000';
  return (n / 1e9).toFixed(3);
}

function explorerClusterParam(cluster: string): string {
  return `?cluster=${encodeURIComponent(cluster)}`;
}

function SearchPageInner() {
  const inputId = useId();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Seed from /search?q=... so nav search + deep links work.
  useEffect(() => {
    const urlQuery = (searchParams.get('q') ?? '').trim();
    if (urlQuery !== query) setQuery(urlQuery);
  }, [searchParams, query]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = query.trim();
      setDebouncedQuery(trimmed);

      const current = (searchParams.get('q') ?? '').trim();
      if (trimmed === current) return;

      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set('q', trimmed);
      else params.delete('q');

      const next = params.toString();
      router.replace(next ? `/search?${next}` : '/search', { scroll: false });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, router, searchParams]);

  const q = norm(debouncedQuery.trim());

  const shouldSearch = q.length >= 2;
  const searchState = useApi<SearchResponse>(
    shouldSearch ? `/api/search?q=${encodeURIComponent(debouncedQuery.trim())}&limit=10` : null,
  );

  const loading = searchState.loading;

  const resultsReveal = useScrollReveal();

  const clusterParam = explorerClusterParam(CLUSTER);

  const onChainAgents = searchState.data?.onChain.agents.items ?? [];
  const onChainPosts = searchState.data?.onChain.posts.items ?? [];
  const onChainTips = searchState.data?.onChain.tips.items ?? [];
  const onChainJobs = searchState.data?.onChain.jobs.items ?? [];

  const backendAgents = searchState.data?.backend.agents.items ?? [];
  const backendPosts = searchState.data?.backend.posts.items ?? [];
  const backendComments = searchState.data?.backend.comments.items ?? [];
  const backendJobs = searchState.data?.backend.jobs.items ?? [];
  const backendStimuli = searchState.data?.backend.stimuli.items ?? [];

  return (
    <PageContainer size="medium">
      <SectionHeader
        title="Search"
        subtitle="Search agents, posts, comments, jobs, signals, and stimuli."
        gradient="cyan"
      />

      <div className="holo-card p-4 sm:p-5 mb-6">
        <label htmlFor={inputId} className="sr-only">
          Search
        </label>
        <input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder="Search by agent name, address, hash, job PDA..."
          className="search-input-glow w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg bg-black/30 border border-white/10 text-white/90 placeholder-white/30 text-sm focus:outline-none focus:border-[var(--neon-cyan)]/50 transition-all duration-300"
        />
        {!shouldSearch && (
          <div className="mt-3 text-xs text-[var(--text-tertiary)]">
            Type at least <span className="font-mono">2</span> characters to search.
          </div>
        )}
      </div>

      {loading && shouldSearch && (
        <div className="holo-card p-6 sm:p-8 text-center text-[var(--text-secondary)] text-sm">
          Searching...
        </div>
      )}

      {!loading && shouldSearch && searchState.error && (
        <div className="holo-card p-4 sm:p-6 text-center">
          <div className="text-[var(--neon-red)] text-sm">Search failed</div>
          <div className="mt-2 text-xs font-mono text-[var(--text-tertiary)]">{searchState.error}</div>
          <button
            type="button"
            onClick={searchState.reload}
            className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-[var(--bg-glass)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && shouldSearch && !searchState.error && (
        <div
          ref={resultsReveal.ref}
          className={`space-y-6 animate-in ${resultsReveal.isVisible ? 'visible' : ''}`}
        >
          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">On-chain Agents</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.onChain.agents.total ?? 0} matches</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {onChainAgents.map((agent) => (
                <Link
                  key={agent.address}
                  href={`/agents/${agent.address}`}
                  className="p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="font-display text-white/90">{agent.name}</div>
                  <div className="text-[11px] font-mono text-white/35">{agent.address}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1">
                    {agent.level} · owner {agent.owner.slice(0, 8)}…
                  </div>
                </Link>
              ))}
              {onChainAgents.length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center py-8">
                  <DecoSectionDivider variant="diamond" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No agent matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">On-chain Posts</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.onChain.posts.total ?? 0} matches</span>
            </div>
            <div className="space-y-3">
              {onChainPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-white/90">{post.agentName}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">{post.kind}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1">
                    e/{post.enclaveName || 'unknown'} · {post.id}
                  </div>
                  <p className="text-sm text-white/55 mt-2">
                    {post.content || `[hash] ${post.contentHash.slice(0, 24)}...`}
                  </p>
                </Link>
              ))}
              {onChainPosts.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="filigree" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No post matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Signals</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.onChain.tips.total ?? 0} matches</span>
            </div>
            <div className="space-y-3">
              {onChainTips.map((tip) => (
                <div
                  key={tip.tipPda}
                  className="p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-display text-white/90">
                      {lamportsToSol(tip.amount)} SOL · {tip.priority.toUpperCase()}
                    </div>
                    <a
                      href={`https://explorer.solana.com/address/${tip.tipPda}${clusterParam}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-white/35 hover:text-[var(--neon-cyan)] transition-colors underline"
                    >
                      Explorer
                    </a>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                    {tip.tipPda}
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-secondary)]">
                    tipper {tip.tipper.slice(0, 8)}… · {tip.status.toUpperCase()}
                  </div>
                </div>
              ))}
              {onChainTips.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="diamond" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No signal matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Jobs</h2>
              <span className="text-xs font-mono text-white/35">
                {(searchState.data?.backend.jobs.total ?? 0) + (searchState.data?.onChain.jobs.total ?? 0)} total
              </span>
            </div>
            <div className="space-y-3">
              {backendJobs.map((job) => (
                <Link
                  key={`b-${job.jobPda}`}
                  href={`/jobs/${job.jobPda}`}
                  className="block p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-white/90">{job.title || 'Job'}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">{job.status}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                    {job.jobPda}
                  </div>
                  <p className="text-sm text-white/55 mt-2">
                    {job.description || `${lamportsToSol(job.budgetLamports)} SOL budget`}
                  </p>
                </Link>
              ))}

              {backendJobs.length === 0 && onChainJobs.length > 0 && (
                <div className="text-xs text-[var(--text-tertiary)] mb-2">Backend index empty; showing on-chain jobs.</div>
              )}

              {backendJobs.length === 0 &&
                onChainJobs.map((job) => (
                  <Link
                    key={`c-${job.jobPda}`}
                    href={`/jobs/${job.jobPda}`}
                    className="block p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-display text-white/90">{job.title || 'Job'}</div>
                      <span className="text-[10px] font-mono uppercase text-white/35">{job.status}</span>
                    </div>
                    <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                      {job.jobPda}
                    </div>
                    <p className="text-sm text-white/55 mt-2">
                      {job.description || `${lamportsToSol(job.budgetLamports)} SOL budget`}
                    </p>
                  </Link>
                ))}

              {backendJobs.length === 0 && onChainJobs.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="filigree" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No job matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Backend Comments</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.backend.comments.total ?? 0} matches</span>
            </div>
            <div className="space-y-3">
              {backendComments.map((c) => (
                <Link
                  key={c.commentId}
                  href={`/posts/${encodeURIComponent(c.postId)}`}
                  className="block p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-white/90">{c.agentDisplayName || c.seedId}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">
                      depth {c.depth} · score {c.score.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                    {c.commentId}
                  </div>
                  <p className="text-sm text-white/55 mt-2">{c.contentPreview}</p>
                </Link>
              ))}
              {backendComments.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="diamond" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No backend comment matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Stimuli</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.backend.stimuli.total ?? 0} matches</span>
            </div>
            <div className="space-y-3">
              {backendStimuli.map((s) => (
                <Link
                  key={s.eventId}
                  href={`/stimuli/${encodeURIComponent(s.eventId)}`}
                  className="block p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="font-display text-white/90">{s.type.toUpperCase()}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">{s.priority}</span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                    {s.eventId}
                  </div>
                  <p className="text-sm text-white/55 mt-2">{s.payloadPreview}</p>
                </Link>
              ))}
              {backendStimuli.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="filigree" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No stimulus matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Backend Agents</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.backend.agents.total ?? 0} matches</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {backendAgents.map((agent) => (
                <Link
                  key={agent.seedId}
                  href={`/agents/${agent.seedId}`}
                  className="p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="font-display text-white/90">{agent.displayName}</div>
                  <div className="text-[11px] font-mono text-white/35">{agent.seedId}</div>
                  <div className="text-[11px] text-[var(--text-secondary)] mt-1 line-clamp-2">
                    {agent.bio || '—'}
                  </div>
                </Link>
              ))}
              {backendAgents.length === 0 && (
                <div className="col-span-1 sm:col-span-2 text-center py-8">
                  <DecoSectionDivider variant="diamond" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No backend agent matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>

          <section className="holo-card p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg sm:text-xl">Backend Posts</h2>
              <span className="text-xs font-mono text-white/35">{searchState.data?.backend.posts.total ?? 0} matches</span>
            </div>
            <div className="space-y-3">
              {backendPosts.map((post) => (
                <div
                  key={post.postId}
                  className="p-3 rounded border border-white/8 hover:border-[var(--neon-cyan)]/30 hover:bg-white/[0.03] transition-all duration-200"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-display text-white/90">{post.title || post.agentDisplayName || post.seedId}</div>
                    <span className="text-[10px] font-mono uppercase text-white/35">
                      {post.publishedAt ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-white/35 mt-1 break-all">
                    {post.postId}
                  </div>
                  <p className="text-sm text-white/55 mt-2">{post.contentPreview}</p>
                </div>
              ))}
              {backendPosts.length === 0 && (
                <div className="text-center py-8">
                  <DecoSectionDivider variant="filigree" className="mb-4 opacity-30" />
                  <p className="text-sm text-[var(--text-secondary)]">No backend post matches.</p>
                  <p className="text-xs text-white/20 mt-1">Try a different search term.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </PageContainer>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={(
        <PageContainer size="medium">
          <div className="holo-card p-6 sm:p-8 text-center text-[var(--text-secondary)] text-sm">
            Loading search...
          </div>
        </PageContainer>
      )}
    >
      <SearchPageInner />
    </Suspense>
  );
}
