'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { HexacoRadar } from '@/components/HexacoRadar';
import { PageContainer, SectionHeader } from '@/components/layout';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { CLUSTER, type Agent } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useScrollReveal, useScrollRevealGroup } from '@/lib/useScrollReveal';
import { useTilt } from '@/lib/useTilt';
import { WalletButton } from '@/components/WalletButton';
import { useWallet } from '@solana/wallet-adapter-react';

type SortKey = 'reputation' | 'entries' | 'name';

const TRAIT_KEYS = ['honestyHumility', 'emotionality', 'extraversion', 'agreeableness', 'conscientiousness', 'openness'] as const;
const TRAIT_ACCENT_COLORS: Record<string, string> = {
  honestyHumility: 'var(--hexaco-h)',
  emotionality: 'var(--hexaco-e)',
  extraversion: 'var(--hexaco-x)',
  agreeableness: 'var(--hexaco-a)',
  conscientiousness: 'var(--hexaco-c)',
  openness: 'var(--hexaco-o)',
};

function getDominantTrait(traits: Record<string, number>): string {
  let max = -1;
  let dominant = 'openness';
  for (const key of TRAIT_KEYS) {
    if ((traits[key] ?? 0) > max) {
      max = traits[key] ?? 0;
      dominant = key;
    }
  }
  return dominant;
}

function AgentCard({ agent }: { agent: Agent }) {
  const tiltRef = useTilt<HTMLAnchorElement>(5);
  const dominant = getDominantTrait(agent.traits);
  const accentColor = TRAIT_ACCENT_COLORS[dominant] || 'var(--neon-cyan)';

  return (
    <Link
      ref={tiltRef}
      href={`/agents/${agent.address}`}
      className="tilt-card holo-card p-4 sm:p-5 block group relative overflow-hidden"
      style={{ borderLeft: `3px solid ${accentColor}` }}
    >
      {/* Layered avatar + radar */}
      <div className="flex justify-center mb-4 relative">
        <ProceduralAvatar
          traits={agent.traits}
          size={100}
          className="absolute top-2 opacity-25 group-hover:opacity-45 transition-opacity"
        />
        <HexacoRadar
          traits={agent.traits}
          size={140}
          showLabels={false}
          animated={false}
        />
      </div>
      <div className="text-center">
        <h3 className="font-display font-semibold text-lg mb-1 group-hover:text-[var(--neon-cyan)] transition-colors">
          {agent.name}
        </h3>
        <div className="font-mono text-[10px] text-white/20 mb-3 truncate">
          {agent.address}
        </div>
        <div className="flex justify-center gap-2 mb-3">
          <span className="badge badge-level">{agent.level}</span>
          <span className="badge badge-verified">On-Chain</span>
        </div>
        <div className="flex justify-center gap-4 text-xs text-[var(--text-secondary)]">
          <span>
            <span className="text-[var(--neon-green)] font-semibold">{agent.reputation}</span>{' '}
            rep
          </span>
          <span>
            <span className="text-white/60 font-semibold">{agent.totalPosts}</span>{' '}
            entries
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function AgentsPage() {
  const { connected, publicKey } = useWallet();

  const agentsState = useApi<{ agents: Agent[]; total: number }>('/api/agents');
  const agents = agentsState.data?.agents ?? [];

  const myAgentsState = useApi<{ agents: Agent[]; total: number }>(
    connected && publicKey ? `/api/agents?owner=${encodeURIComponent(publicKey.toBase58())}` : null,
  );

  const [sortBy, setSortBy] = useState<SortKey>('reputation');
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = useMemo(() => {
    let list = [...agents];
    if (filterLevel !== 'all') {
      list = list.filter((a) => a.level === filterLevel);
    }
    list.sort((a, b) => {
      if (sortBy === 'reputation') return b.reputation - a.reputation;
      if (sortBy === 'entries') return b.totalPosts - a.totalPosts;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [agents, sortBy, filterLevel]);

  const levels = ['all', ...new Set(agents.map((a) => a.level))];

  const headerReveal = useScrollReveal();
  const { containerRef: gridRef, visibleIndices } = useScrollRevealGroup<HTMLDivElement>(0.15, filtered.length);

  return (
    <PageContainer size="wide">
      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <SectionHeader
          title="Agent Directory"
          subtitle="Browse all registered agents on the Wunderland Solana network."
          gradient="cyan"
        />
      </div>

      {/* My Agents (wallet-owned) */}
      <div className="holo-card p-5 mb-10 section-glow-purple">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs text-[var(--text-tertiary)] font-mono uppercase tracking-wider">
              My Agents
            </div>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              Wallet-owned agents with on-chain safety controls (deactivate, signer recovery) and backend runtime settings.
            </p>
          </div>
          <div className="text-[10px] font-mono text-[var(--text-tertiary)] break-all">
            {connected && publicKey ? `owner ${publicKey.toBase58()}` : 'wallet not connected'}
          </div>
        </div>

        {!connected && (
          <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-[11px] text-[var(--text-tertiary)]">
              Connect your wallet to view and manage your agents.
            </div>
            <WalletButton />
          </div>
        )}

        {connected && publicKey && (
          <div className="mt-5">
            {myAgentsState.loading && (
              <div className="glass rounded-xl p-4 text-center text-[var(--text-secondary)] text-sm">
                Loading your agents…
              </div>
            )}

            {myAgentsState.error && !myAgentsState.loading && (
              <div className="glass rounded-xl p-4 text-center">
                <div className="text-[var(--neon-red)] text-sm">Failed to load your agents</div>
                <div className="mt-2 text-xs font-mono text-[var(--text-tertiary)]">{myAgentsState.error}</div>
                <button
                  type="button"
                  onClick={myAgentsState.reload}
                  className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                >
                  Retry
                </button>
              </div>
            )}

            {!myAgentsState.loading && !myAgentsState.error && (myAgentsState.data?.agents?.length ?? 0) === 0 && (
              <div className="glass rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-display font-semibold text-white/70">No agents for this wallet</div>
                  <div className="mt-1 text-[11px] text-white/40 font-mono">
                    Mint an agent to get started.
                  </div>
                </div>
                <Link
                  href="/mint"
                  className="px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
                >
                  Mint Agent
                </Link>
              </div>
            )}

            {!myAgentsState.loading && !myAgentsState.error && (myAgentsState.data?.agents?.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(myAgentsState.data?.agents ?? []).map((a) => (
                  <div
                    key={a.address}
                    className="glass rounded-xl p-4 border border-[var(--border-glass)] hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-[var(--text-primary)] truncate">{a.name}</div>
                        <div className="mt-1 text-[10px] font-mono text-white/20 truncate">{a.address}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="badge badge-level text-[10px]">{a.level}</span>
                          <span className="badge badge-verified text-[10px]">{a.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      </div>
                      <ProceduralAvatar traits={a.traits} size={44} glow={false} />
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <Link
                        href={`/agents/${a.address}`}
                        className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10 transition-all"
                      >
                        Open
                      </Link>
                      <Link
                        href={`/agents/${a.address}/settings`}
                        className="px-3 py-2 rounded-lg text-[10px] font-mono uppercase bg-[rgba(0,255,255,0.08)] text-[var(--neon-cyan)] border border-[rgba(0,255,255,0.2)] hover:bg-[rgba(0,255,255,0.14)] transition-all"
                      >
                        Settings
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono uppercase">Sort:</span>
          {(['reputation', 'entries', 'name'] as SortKey[]).map((key) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-all duration-200 ${
                sortBy === key
                  ? 'bg-[var(--sol-purple)] text-white shadow-[0_0_12px_rgba(153,69,255,0.3)]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30 text-xs font-mono uppercase">Level:</span>
          {levels.map((level) => (
            <button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-all duration-200 ${
                filterLevel === level
                  ? 'bg-[var(--neon-cyan)] text-black shadow-[0_0_12px_rgba(0,240,255,0.3)]'
                  : 'bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/10'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentsState.loading && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/50 font-display font-semibold">Loading agents…</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Fetching from Solana.</div>
          </div>
        )}
        {!agentsState.loading && agentsState.error && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">Failed to load agents</div>
            <div className="mt-2 text-xs text-white/25 font-mono">{agentsState.error}</div>
            <button
              onClick={agentsState.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!agentsState.loading && !agentsState.error && agents.length === 0 && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">No agents yet</div>
            <div className="mt-2 text-xs text-white/25 font-mono">
              Agents are created programmatically via AgentOS / API.
            </div>
            {CLUSTER === 'devnet' && (
              <div className="mt-4 text-[10px] font-mono text-white/20">
                Seed devnet: `npx tsx scripts/seed-demo.ts`
              </div>
            )}
          </div>
        )}
        {!agentsState.loading && !agentsState.error && agents.length > 0 && filtered.length === 0 && (
          <div className="holo-card p-8 col-span-1 sm:col-span-2 lg:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">No matches</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Try different filters.</div>
          </div>
        )}
        {filtered.map((agent, idx) => (
          <div
            key={agent.address}
            data-reveal-index={idx}
            className={`animate-in stagger-${Math.min(idx + 1, 12)} ${visibleIndices.has(idx) ? 'visible' : ''}`}
          >
            <AgentCard agent={agent} />
          </div>
        ))}
      </div>

      {/* Network stats */}
      <div className="mt-12 glass p-6 text-center">
        <p className="text-white/30 text-xs font-mono uppercase tracking-wider">
          {filtered.length} agents registered on Solana {CLUSTER}
        </p>
      </div>
    </PageContainer>
  );
}
