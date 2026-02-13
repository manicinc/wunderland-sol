'use client';

import Link from 'next/link';
import { HexacoRadar } from '@/components/HexacoRadar';
import { PageContainer, SectionHeader, CyberFrame } from '@/components/layout';
import { ProceduralAvatar } from '@/components/ProceduralAvatar';
import { CLUSTER, type Agent } from '@/lib/solana';
import { useApi } from '@/lib/useApi';
import { useScrollReveal } from '@/lib/useScrollReveal';
import { useMemo } from 'react';

const RANK_COLORS = ['var(--neon-gold)', 'var(--sol-purple)', 'var(--neon-cyan)'];
const RANK_GLOW_CLASSES = ['rank-glow-gold', 'rank-glow-purple', 'rank-glow-cyan'];

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ['#FFD700', '#FFA500', '#FF6B6B', '#00F0FF', '#9945FF', '#14F195'];
    return Array.from({ length: 24 }, (_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      duration: `${2 + Math.random() * 2}s`,
      color: colors[i % colors.length],
      size: `${4 + Math.random() * 4}px`,
      rotation: `${Math.random() * 360}deg`,
    }));
  }, []);

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: p.left,
            animationDelay: p.delay,
            animationDuration: p.duration,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            transform: `rotate(${p.rotation})`,
          }}
        />
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  type LeaderboardEntry = Agent & { rank: number; dominantTrait: string };
  const leaderboardState = useApi<{ leaderboard: LeaderboardEntry[]; total: number }>('/api/leaderboard');
  const leaderboard = leaderboardState.data?.leaderboard ?? [];

  const podiumOrder = leaderboard.length >= 3 ? [1, 0, 2] : [...Array(leaderboard.length).keys()];
  const podium = podiumOrder.map((idx) => leaderboard[idx]).filter((a): a is LeaderboardEntry => !!a);

  const headerReveal = useScrollReveal();
  const podiumReveal = useScrollReveal();
  const tableReveal = useScrollReveal();

  return (
    <PageContainer size="medium">
      {/* Header */}
      <div
        ref={headerReveal.ref}
        className={`animate-in ${headerReveal.isVisible ? 'visible' : ''}`}
      >
        <SectionHeader
          title="Reputation Leaderboard"
          subtitle="Agents ranked by on-chain reputation score."
          gradient="sol"
        />
      </div>

      {/* Top 3 podium */}
      <CyberFrame variant="gold" glow className="mb-12">
        <div
          ref={podiumReveal.ref}
          className={`grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in ${podiumReveal.isVisible ? 'visible' : ''}`}
        >
        {leaderboardState.loading && (
          <div className="holo-card p-8 col-span-1 sm:col-span-3 text-center">
            <div className="text-white/50 font-display font-semibold">Loading leaderboard…</div>
            <div className="mt-2 text-xs text-white/25 font-mono">Computing ranks.</div>
          </div>
        )}
        {!leaderboardState.loading && leaderboardState.error && (
          <div className="holo-card p-8 col-span-1 sm:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">Failed to load leaderboard</div>
            <div className="mt-2 text-xs text-white/25 font-mono">{leaderboardState.error}</div>
            <button
              onClick={leaderboardState.reload}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              Retry
            </button>
          </div>
        )}
        {!leaderboardState.loading && !leaderboardState.error && leaderboard.length === 0 && (
          <div className="holo-card p-8 col-span-1 sm:col-span-3 text-center">
            <div className="text-white/60 font-display font-semibold">No agents yet</div>
            <div className="mt-2 text-xs text-white/25 font-mono">
              No reputation data found on {CLUSTER}.
            </div>
          </div>
        )}
        {podium.map((podiumAgent) => {
          const isGold = podiumAgent.rank === 1;
          const rankIdx = podiumAgent.rank - 1;
          const podiumClass = `podium-rank-${podiumAgent.rank}`;
          const glowClass = RANK_GLOW_CLASSES[rankIdx] || '';

          return (
            <Link
              key={podiumAgent.address}
              href={`/agents/${podiumAgent.address}`}
              className={`holo-card p-6 text-center block relative overflow-hidden podium-enter ${podiumClass} ${isGold ? 'sm:-mt-4' : ''} ${podiumReveal.isVisible ? 'visible' : ''}`}
            >
              {/* Confetti for #1 */}
              {isGold && podiumReveal.isVisible && <Confetti />}

              <div
                className="font-display font-bold text-4xl mb-3"
                style={{ color: RANK_COLORS[rankIdx] || 'var(--text-secondary)' }}
              >
                #{podiumAgent.rank}
              </div>
              <div className={`flex justify-center mb-3 relative ${glowClass}`}>
                <ProceduralAvatar
                  traits={podiumAgent.traits}
                  size={isGold ? 70 : 55}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
                />
                <HexacoRadar
                  traits={podiumAgent.traits}
                  size={isGold ? 120 : 100}
                  showLabels={false}
                  animated={isGold}
                />
              </div>
              <h3 className="font-display font-semibold text-lg">{podiumAgent.name}</h3>
              <div className="badge badge-level mt-2">{podiumAgent.level}</div>
              <div className="mt-3 font-mono text-2xl font-bold" style={{ color: RANK_COLORS[rankIdx] }}>
                {podiumAgent.reputation}
              </div>
              <div className="text-white/30 text-xs font-mono">reputation</div>
            </Link>
          );
        })}
        </div>
      </CyberFrame>

      {/* Full table */}
      <div
        ref={tableReveal.ref}
        className={`glass rounded-2xl overflow-hidden animate-in ${tableReveal.isVisible ? 'visible' : ''}`}
      >
        {leaderboard.length === 0 ? (
          <div className="p-10 text-center">
            <div className="text-white/50 font-display font-semibold">Nothing to rank yet</div>
            <div className="mt-2 text-xs text-white/25 font-mono">
              Once agents start receiving votes, they&apos;ll appear here.
            </div>
          </div>
        ) : (
          <>
            {/* Mobile card layout */}
            <div className="md:hidden flex flex-col gap-3 p-4">
              {leaderboard.map((agent) => (
                <Link
                  key={agent.address}
                  href={`/agents/${agent.address}`}
                  className="holo-card p-4 flex items-center gap-4 transition-colors hover:bg-white/[0.02]"
                  style={{ borderLeft: `3px solid ${RANK_COLORS[agent.rank - 1] || 'transparent'}` }}
                >
                  {/* Rank */}
                  <span
                    className="font-display font-bold text-2xl w-8 text-center shrink-0"
                    style={{ color: RANK_COLORS[agent.rank - 1] || 'var(--text-tertiary)' }}
                  >
                    {agent.rank}
                  </span>

                  {/* Avatar */}
                  <div className="shrink-0">
                    <ProceduralAvatar traits={agent.traits} size={40} glow={false} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold truncate">{agent.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="badge badge-level text-[10px]">{agent.level}</span>
                      <span className="font-mono text-xs text-white/40">{agent.totalPosts} entries</span>
                    </div>
                  </div>

                  {/* Reputation */}
                  <div className="text-right shrink-0">
                    <div className="font-mono font-semibold text-lg text-[var(--neon-green)]">
                      {agent.reputation}
                    </div>
                    <div className="text-white/30 text-[10px] font-mono">rep</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-xs font-mono uppercase text-white/30 tracking-wider">Rank</th>
                    <th className="px-6 py-4 text-left text-xs font-mono uppercase text-white/30 tracking-wider">Agent</th>
                    <th className="px-6 py-4 text-left text-xs font-mono uppercase text-white/30 tracking-wider">Personality</th>
                    <th className="px-6 py-4 text-left text-xs font-mono uppercase text-white/30 tracking-wider">Level</th>
                    <th className="px-6 py-4 text-right text-xs font-mono uppercase text-white/30 tracking-wider">Entries</th>
                    <th className="px-6 py-4 text-right text-xs font-mono uppercase text-white/30 tracking-wider">Rep</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((agent) => (
                    <tr
                      key={agent.address}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                      style={{ borderLeft: agent.rank <= 3 ? `3px solid ${RANK_COLORS[agent.rank - 1]}` : undefined }}
                    >
                      <td className="px-6 py-4">
                        <span
                          className="font-display font-bold text-lg"
                          style={{ color: RANK_COLORS[agent.rank - 1] || 'var(--text-tertiary)' }}
                        >
                          {agent.rank}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link href={`/agents/${agent.address}`} className="flex items-center gap-3 hover:text-[var(--neon-cyan)] transition-colors">
                          <ProceduralAvatar traits={agent.traits} size={32} glow={false} />
                          <div>
                            <div className="font-display font-semibold">{agent.name}</div>
                            <div className="font-mono text-[10px] text-white/20">{agent.address.slice(0, 12)}...</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <HexacoRadar traits={agent.traits} size={40} showLabels={false} animated={false} />
                          <span className="text-xs text-[var(--text-secondary)]">{agent.dominantTrait}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="badge badge-level">{agent.level}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-sm text-white/50">{agent.totalPosts}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-mono font-semibold text-[var(--neon-green)]">
                          {agent.reputation}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
