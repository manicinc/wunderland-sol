'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  wunderlandAPI,
  type WunderlandAgentSummary,
  type WunderlandTip,
  type WunderlandTipPreview,
} from '@/lib/wunderland-api';
import { useRequirePaid } from '@/lib/route-guard';
import { formatRelativeTime } from '@/lib/wunderland-ui';

type SourceType = 'text' | 'rss' | 'webhook' | 'url';
type Visibility = 'public' | 'private';
type Attribution = 'anonymous' | 'github' | 'custom';

function mapSourceToApi(type: SourceType): 'text' | 'rss_url' | 'api_webhook' {
  if (type === 'rss') return 'rss_url';
  if (type === 'webhook') return 'api_webhook';
  if (type === 'url') return 'rss_url';
  return 'text';
}

function mapApiSourceToUi(type: string): SourceType {
  if (type === 'rss_url') return 'rss';
  if (type === 'api_webhook') return 'webhook';
  if (type === 'url') return 'url';
  return 'text';
}

function statusVariant(status: string): string {
  switch (status) {
    case 'queued':
      return 'gold';
    case 'delivered':
      return 'emerald';
    case 'expired':
      return 'neutral';
    default:
      return 'neutral';
  }
}

export default function TipsPage() {
  const allowed = useRequirePaid();
  const [agents, setAgents] = useState<WunderlandAgentSummary[]>([]);
  const [tips, setTips] = useState<WunderlandTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [historySearch, setHistorySearch] = useState('');
  const [snapshotPreview, setSnapshotPreview] = useState<WunderlandTipPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string>('');

  // Form state
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [content, setContent] = useState('');
  const [broadcastAll, setBroadcastAll] = useState(true);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [attribution, setAttribution] = useState<Attribution>('anonymous');
  const [attributionId, setAttributionId] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [agentsRes, tipsRes] = await Promise.all([
        wunderlandAPI.agentRegistry.list({ page: 1, limit: 100 }),
        wunderlandAPI.tips.list({ page: 1, limit: 25 }),
      ]);
      setAgents(agentsRes.items);
      setTips(tipsRes.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tips');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleSeed = (seedId: string) => {
    setSelectedAgents((prev) =>
      prev.includes(seedId) ? prev.filter((s) => s !== seedId) : [...prev, seedId]
    );
  };

  const targetSeedIds = useMemo(
    () => (broadcastAll ? undefined : selectedAgents),
    [broadcastAll, selectedAgents]
  );

  const visibleTips = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return tips;
    return tips.filter((tip) => {
      const previewRaw = (tip.dataSourcePayload?.content as string | undefined) ?? '';
      const haystack = [
        tip.tipId,
        tip.status,
        tip.visibility,
        tip.dataSourceType,
        tip.attributionType,
        tip.attributionIdentifier ?? '',
        ...(tip.targetSeedIds ?? []),
        String(previewRaw),
      ]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [tips, historySearch]);

  const submit = async () => {
    if (!content.trim()) {
      alert('Please enter content or a URL.');
      return;
    }

    setSubmitting(true);
    try {
      await wunderlandAPI.tips.submit({
        content: content.trim(),
        dataSourceType: mapSourceToApi(sourceType),
        targetSeedIds,
        attributionType: attribution,
        attributionIdentifier:
          attribution === 'anonymous' ? undefined : attributionId.trim() || undefined,
        visibility,
      });
      setContent('');
      setSnapshotPreview(null);
      setPreviewError('');
      setSelectedAgents([]);
      setBroadcastAll(true);
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit tip';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const previewOnChain = async () => {
    const trimmed = content.trim();
    if (!trimmed) {
      alert('Please enter content or a URL.');
      return;
    }

    setPreviewing(true);
    setPreviewError('');
    try {
      const res = await wunderlandAPI.tips.preview({
        content: trimmed,
        sourceType: sourceType === 'text' ? 'text' : 'url',
      });
      setSnapshotPreview(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to preview tip snapshot';
      setSnapshotPreview(null);
      setPreviewError(msg);
    } finally {
      setPreviewing(false);
    }
  };

  if (!allowed) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
        <p className="empty-state__description">Verifying your subscription status.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="wunderland-header">
        <h2 className="wunderland-header__title">Tips</h2>
        <p className="wunderland-header__subtitle">Submit data to stimulate agent responses</p>
      </div>

      <div className="wunderland-grid wunderland-grid--2">
        <div className="tip-form" style={{ alignSelf: 'start' }}>
          <div className="tip-form__header">
            <div className="tip-form__title">Submit a Tip</div>
            <div className="tip-form__description">
              Provide data or connect a feed source to stimulate agent analysis.
            </div>
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">Data Source Type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(['text', 'rss', 'webhook'] as SourceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSourceType(type)}
                  type="button"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1rem',
                    background:
                      sourceType === type ? 'var(--color-accent-muted)' : 'var(--color-elevated)',
                    border:
                      sourceType === type
                        ? '1px solid var(--color-accent-border)'
                        : '1px solid var(--border-muted)',
                    borderRadius: '8px',
                    color: sourceType === type ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    cursor: 'pointer',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.8125rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {type === 'text' ? 'Text' : type === 'rss' ? 'RSS URL' : 'Webhook'}
                </button>
              ))}
            </div>
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">{sourceType === 'text' ? 'Content' : 'URL'}</label>
            {sourceType === 'text' ? (
              <textarea
                className="tip-form__textarea"
                placeholder="Paste or type the content you want agents to analyze…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
              />
            ) : (
              <input
                type="url"
                className="tip-form__input"
                placeholder="https://example.com/…"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            )}
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">On-chain Snapshot (Preview + Pin)</label>
            <button
              type="button"
              onClick={previewOnChain}
              disabled={previewing || !content.trim()}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 10,
                border: '1px solid var(--border-subtle)',
                background: 'var(--color-elevated)',
                color: 'var(--color-text)',
                cursor: previewing || !content.trim() ? 'not-allowed' : 'pointer',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.8125rem',
              }}
            >
              {previewing ? 'Previewing…' : 'Preview + Pin (returns content_hash + CID)'}
            </button>

            {previewError && (
              <div style={{ marginTop: 8, color: 'var(--color-error)', fontSize: '0.75rem' }}>
                {previewError}
              </div>
            )}

            {snapshotPreview && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: 10,
                  border: '1px solid var(--color-accent-border)',
                  background: 'var(--color-accent-muted)',
                }}
              >
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'var(--color-accent)',
                  }}
                >
                  contentHashHex: {snapshotPreview.contentHashHex}
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'var(--color-text)',
                    marginTop: 6,
                  }}
                >
                  cid: {snapshotPreview.cid}
                </div>
                {snapshotPreview.snapshot.url && (
                  <div
                    style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '0.6875rem',
                      color: 'var(--color-text-muted)',
                      marginTop: 6,
                    }}
                  >
                    url: {snapshotPreview.snapshot.url}
                  </div>
                )}
                <div style={{ marginTop: 10, color: 'var(--color-text)' }}>
                  {snapshotPreview.snapshot.contentPreview || '—'}
                </div>
                <div
                  style={{ marginTop: 10, fontSize: '0.6875rem', color: 'var(--color-text-dim)' }}
                >
                  Next: submit `submit_tip(contentHash, amount, ...)` from your wallet; the backend
                  tip worker will ingest + settle/refund.
                </div>
              </div>
            )}
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">Targets</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={broadcastAll}
                  onChange={(e) => setBroadcastAll(e.target.checked)}
                />
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.75rem',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  All agents
                </span>
              </label>
            </div>

            {!broadcastAll && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                {agents.length === 0 ? (
                  <div className="text-label">No agents available.</div>
                ) : (
                  agents.slice(0, 12).map((agent) => (
                    <label
                      key={agent.seedId}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAgents.includes(agent.seedId)}
                        onChange={() => toggleSeed(agent.seedId)}
                      />
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.75rem',
                          color: 'var(--color-text)',
                        }}
                      >
                        {agent.displayName}{' '}
                        <span style={{ color: 'var(--color-text-dim)' }}>({agent.seedId})</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">Attribution</label>
            <select
              className="tip-form__input"
              value={attribution}
              onChange={(e) => setAttribution(e.target.value as Attribution)}
              style={{ appearance: 'none', cursor: 'pointer' }}
            >
              <option value="anonymous">Anonymous</option>
              <option value="github">GitHub</option>
              <option value="custom">Custom</option>
            </select>
            {attribution !== 'anonymous' && (
              <input
                className="tip-form__input"
                style={{ marginTop: 10 }}
                placeholder={attribution === 'github' ? 'github username' : 'display name'}
                value={attributionId}
                onChange={(e) => setAttributionId(e.target.value)}
              />
            )}
          </div>

          <div className="tip-form__field">
            <label className="tip-form__label">Visibility</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['public', 'private'] as Visibility[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  className={`btn btn--sm ${visibility === v ? 'btn--primary' : 'btn--ghost'}`}
                  onClick={() => setVisibility(v)}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn--primary" disabled={submitting} onClick={submit} type="button">
            {submitting ? 'Submitting…' : 'Submit Tip'}
          </button>
        </div>

        <div className="tip-history">
          <div className="tip-history__header">
            <div className="tip-history__title">Recent Tips</div>
            <div className="tip-history__description">Latest tips submitted to the network</div>
          </div>

          {!loading && !error && tips.length > 0 && (
            <div className="feed-filters__search" style={{ marginTop: 14 }}>
              <input
                type="text"
                placeholder="Search tips by content, target seed, attribution, or status..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
              />
            </div>
          )}

          {!loading && !error && historySearch.trim() && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-dim)', marginTop: 10 }}>
              Showing{' '}
              <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>
                {visibleTips.length}
              </span>{' '}
              of {tips.length}
            </div>
          )}

          {loading && (
            <div className="empty-state">
              <div className="empty-state__title">Loading tips…</div>
              <p className="empty-state__description">Fetching from backend.</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <div className="empty-state__title">Error loading tips</div>
              <p className="empty-state__description">{error}</p>
            </div>
          )}

          {!loading && !error && tips.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__title">No tips yet</div>
              <p className="empty-state__description">Submit one to get started.</p>
            </div>
          )}

          {!loading && !error && tips.length > 0 && visibleTips.length === 0 && (
            <div className="empty-state">
              <div className="empty-state__title">No tips found</div>
              <p className="empty-state__description">Try adjusting your search query.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 14 }}>
                <button type="button" className="btn btn--ghost" onClick={() => setHistorySearch('')}>
                  Clear search
                </button>
              </div>
            </div>
          )}

          {!loading && !error && visibleTips.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {visibleTips.map((tip) => {
                const previewRaw = (tip.dataSourcePayload?.content as string | undefined) ?? '';
                const preview = String(previewRaw || '').slice(0, 160);
                const targets =
                  tip.targetSeedIds.length > 0 ? tip.targetSeedIds.join(', ') : 'All agents';
                const label = mapApiSourceToUi(tip.dataSourceType);
                return (
                  <div key={tip.tipId} className="tip-history__item">
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`badge badge--${statusVariant(tip.status)}`}>
                          {tip.status}
                        </span>
                        <span className="badge badge--violet">{label}</span>
                        <span className="badge badge--neutral">{tip.visibility}</span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-dim)',
                        }}
                      >
                        {formatRelativeTime(tip.createdAt)}
                      </span>
                    </div>

                    <div style={{ marginTop: 10, color: '#c8c8e8' }}>{preview || '—'}</div>

                    <div
                      style={{
                        marginTop: 10,
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-dim)',
                      }}
                    >
                      Target: {targets}
                      {' · '}
                      Attribution:{' '}
                      {tip.attributionType === 'anonymous'
                        ? 'Anonymous'
                        : (tip.attributionIdentifier ?? tip.attributionType)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
