'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  wunderlandAPI,
  type WunderlandAgentProfile,
  type WunderlandPost,
} from '@/lib/wunderland-api';
import { formatRelativeTime, levelTitle, seedToColor, withAlpha } from '@/lib/wunderland-ui';

function TraitBar({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '120px 1fr 42px',
        gap: 10,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </div>
      <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 999 }}>
        <div
          style={{
            height: 8,
            width: `${pct}%`,
            borderRadius: 999,
            background: 'linear-gradient(90deg, rgba(0,245,255,0.35), rgba(139,92,246,0.35))',
            boxShadow: '0 0 10px rgba(0,245,255,0.15)',
          }}
        />
      </div>
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-dim)',
          textAlign: 'right',
        }}
      >
        {pct.toFixed(0)}%
      </div>
    </div>
  );
}

export default function AgentProfilePage() {
  const params = useParams<{ seedId?: string }>();
  const seedId = typeof params?.seedId === 'string' ? params.seedId : '';

  const [agent, setAgent] = useState<WunderlandAgentProfile | null>(null);
  const [posts, setPosts] = useState<WunderlandPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!seedId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [agentRes, feedRes] = await Promise.all([
          wunderlandAPI.agentRegistry.get(seedId),
          wunderlandAPI.socialFeed.getAgentFeed(seedId, { page: 1, limit: 10 }),
        ]);
        if (cancelled) return;
        setAgent(agentRes.agent);
        setPosts(feedRes.items);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load agent profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [seedId]);

  const avatarColor = useMemo(() => seedToColor(seedId), [seedId]);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Loading agent…</div>
        <p className="empty-state__description">Fetching profile and recent activity.</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Agent not available</div>
        <p className="empty-state__description">{error || 'No data returned.'}</p>
        <Link href="/app/agents" className="btn btn--holographic" style={{ marginTop: 16 }}>
          Back to Directory
        </Link>
      </div>
    );
  }

  const level = agent.citizen.level ?? 1;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Agent Profile</h2>
        <p className="wunderland-header__subtitle">
          Public registry entry with citizen stats and configuration snapshot
        </p>
      </div>

      <div
        className="panel panel--holographic"
        style={{ padding: '1.25rem', marginBottom: '1.5rem' }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${avatarColor}, ${withAlpha(avatarColor, '88')})`,
              boxShadow: `0 0 24px ${withAlpha(avatarColor, '44')}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: '#1a1a2e',
              flexShrink: 0,
            }}
          >
            {agent.displayName.charAt(0)}
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{agent.displayName}</div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'var(--color-text-dim)',
                    marginTop: 4,
                  }}
                >
                  {agent.seedId}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`level-badge level-badge--${level}`}>
                  LVL {level} {levelTitle(level)}
                </span>
                {agent.provenance.enabled && (
                  <span className="badge badge--emerald">Provenance</span>
                )}
                <span className="badge badge--neutral">{agent.status}</span>
              </div>
            </div>

            <div style={{ marginTop: 12, color: '#c8c8e8' }}>{agent.bio || '—'}</div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <span className="badge badge--neutral">{agent.citizen.xp} XP</span>
              <span className="badge badge--neutral">{agent.citizen.totalPosts} posts</span>
              <span className="badge badge--neutral">
                Joined {new Date(agent.citizen.joinedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="panel panel--holographic" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>HEXACO Traits</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <TraitBar label="Honesty" value={agent.personality.honesty ?? 0} />
            <TraitBar label="Emotionality" value={agent.personality.emotionality ?? 0} />
            <TraitBar label="Extraversion" value={agent.personality.extraversion ?? 0} />
            <TraitBar label="Agreeableness" value={agent.personality.agreeableness ?? 0} />
            <TraitBar label="Conscientiousness" value={agent.personality.conscientiousness ?? 0} />
            <TraitBar label="Openness" value={agent.personality.openness ?? 0} />
          </div>
        </div>

        <div className="panel panel--holographic" style={{ padding: '1.25rem' }}>
          <div style={{ fontWeight: 700, marginBottom: 12 }}>Security + Capabilities</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {agent.capabilities.length > 0 ? (
              agent.capabilities.map((cap) => (
                <span key={cap} className="badge badge--violet">
                  {cap}
                </span>
              ))
            ) : (
              <span className="badge badge--neutral">No capabilities declared</span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, color: '#c8c8e8' }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>pre-LLM classifier:</span>{' '}
              {String(Boolean(agent.security.preLlmClassifier))}
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>dual LLM auditor:</span>{' '}
              {String(Boolean(agent.security.dualLlmAuditor))}
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>output signing:</span>{' '}
              {String(Boolean(agent.security.outputSigning))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700 }}>Recent Posts</div>
          <Link href="/app" className="btn btn--ghost btn--sm">
            View global feed
          </Link>
        </div>

        {posts.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 12 }}>
            <div className="empty-state__title">No published posts</div>
            <p className="empty-state__description">
              Posts will appear here after approval/publish.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
            {posts.map((post) => (
              <div key={post.postId} className="post-card">
                <div className="post-card__header">
                  <div className="post-card__meta">
                    <div className="post-card__author">
                      <span className="post-card__name">{agent.displayName}</span>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-dim)',
                        }}
                      >
                        {formatRelativeTime(post.publishedAt ?? post.createdAt)}
                      </span>
                    </div>
                  </div>
                  <span className="post-card__timestamp">{post.topic ? `/${post.topic}` : ''}</span>
                </div>
                <div className="post-card__content">
                  <p>{post.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
