'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import {
  wunderlandAPI,
  type WunderlandCall,
  type WunderlandCallStats,
  type WunderlandAgentProfile,
} from '@/lib/wunderland-api';
import { VOICE_CATALOG, type VoiceCatalogEntry } from '@/lib/catalog-data';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROVIDERS = [
  { id: 'twilio', label: 'Twilio' },
  { id: 'telnyx', label: 'Telnyx' },
  { id: 'plivo', label: 'Plivo' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateBadgeClass(state: string): string {
  const s = state.toLowerCase();
  if (s === 'running' || s === 'active' || s === 'in_progress') return 'badge badge--emerald';
  if (s === 'completed' || s === 'ended') return 'badge badge--neutral';
  if (s === 'error' || s === 'failed') return 'badge badge--coral';
  return 'badge badge--neutral';
}

function directionLabel(direction: string): string {
  return direction === 'inbound' ? 'IN' : 'OUT';
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === 0) return '--';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------

function PhoneIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function PhoneIncomingIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 2 16 8 22 8" />
      <line x1="23" y1="1" x2="16" y2="8" />
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function PhoneOutgoingIcon() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 7 23 1 17 1" />
      <line x1="16" y1="8" x2="23" y2="1" />
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function VoiceCallsPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  const { ready, isPreviewing } = useSoftPaywall();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [calls, setCalls] = useState<WunderlandCall[]>([]);
  const [stats, setStats] = useState<WunderlandCallStats | null>(null);
  const [agentName, setAgentName] = useState<string>('');

  // Voice configuration state
  const [voiceProvider, setVoiceProvider] = useState<'openai' | 'elevenlabs'>('openai');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('nova');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [savingVoice, setSavingVoice] = useState(false);
  const [voiceSaved, setVoiceSaved] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (isPreviewing) { setLoading(false); return; }
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [callsRes, statsRes, agentRes] = await Promise.all([
          wunderlandAPI.voice.list({ seedId }),
          wunderlandAPI.voice.stats(seedId),
          wunderlandAPI.agentRegistry.get(seedId),
        ]);
        if (cancelled) return;
        setCalls(callsRes.items);
        setStats(statsRes);
        setAgentName(agentRes.agent.displayName || seedId.slice(0, 16));

        // Initialize voice config from agent profile
        const vc = agentRes.agent.voiceConfig;
        if (vc) {
          setVoiceProvider((vc.provider as 'openai' | 'elevenlabs') || 'openai');
          setSelectedVoiceId(vc.voiceId || 'nova');
          if (vc.customParams) {
            setStability((vc.customParams.stability as number) ?? 0.5);
            setSimilarityBoost((vc.customParams.similarity_boost as number) ?? 0.75);
          }
          // Check if it's a custom voice ID (not in catalog)
          const inCatalog = VOICE_CATALOG.some(
            (v) => v.provider === vc.provider && v.voiceId === vc.voiceId
          );
          if (!inCatalog && vc.voiceId) {
            setCustomVoiceId(vc.voiceId);
          }
        }
      } catch (err) {
        if (cancelled) return;
        // Still try to show what we can
        setError(err instanceof Error ? err.message : 'Failed to load voice data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  return (
    <Paywall requirePayment action="manage voice call providers">
      <PreviewBanner visible={isPreviewing} />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Breadcrumb */}
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-dim)',
          marginBottom: 16,
        }}
      >
        <Link
          href="/app/dashboard"
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          Dashboard
        </Link>
        {' / '}
        <Link
          href={`/app/dashboard/${seedId}`}
          style={{ color: 'var(--color-text-muted)', textDecoration: 'none' }}
        >
          {agentName || seedId.slice(0, 16)}
        </Link>
        {' / '}
        <span style={{ color: 'var(--color-text)' }}>Voice Calls</span>
      </div>

      {/* Header */}
      <div className="wunderland-header">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--color-text-muted)' }}>
              <PhoneIcon size={22} />
            </span>
            <div>
              <h2 className="wunderland-header__title">Voice Call Management</h2>
              <p className="wunderland-header__subtitle">
                Call history and provider status for {agentName || seedId.slice(0, 16)}
              </p>
            </div>
          </div>
          <Link
            href={`/app/dashboard/${seedId}`}
            className="btn btn--ghost btn--sm"
            style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.75rem' }}
          >
            Back to Agent
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="badge badge--coral"
          style={{
            marginBottom: 20,
            maxWidth: '100%',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading voice data...</div>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats Section */}
          {stats && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}
            >
              <div className="post-card" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  Total Calls
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  {stats.totalCalls}
                </div>
              </div>
              <div className="post-card" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  Active Now
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: stats.activeCalls > 0 ? '#10ffb0' : 'var(--color-text)',
                  }}
                >
                  {stats.activeCalls}
                </div>
              </div>
              <div className="post-card" style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '0.625rem',
                    color: 'var(--color-text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    marginBottom: 6,
                  }}
                >
                  Avg Duration
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: 'var(--color-text)',
                  }}
                >
                  {formatDuration(stats.avgDurationMs)}
                </div>
              </div>
            </div>
          )}

          {/* Provider Status Section */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <ServerIcon />
              Provider Status
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {PROVIDERS.map((provider) => {
                const count = stats?.providerBreakdown?.[provider.id] ?? 0;
                const isConfigured = count > 0;
                return (
                  <div key={provider.id} className="post-card">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: 'var(--color-text)',
                          }}
                        >
                          {provider.label}
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.625rem',
                            color: 'var(--color-text-dim)',
                            marginTop: 2,
                          }}
                        >
                          {count} call{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <span className={isConfigured ? 'badge badge--emerald' : 'badge badge--neutral'}>
                        {isConfigured ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Voice Configuration Section */}
          <VoiceConfigSection
            seedId={seedId}
            voiceProvider={voiceProvider}
            setVoiceProvider={setVoiceProvider}
            selectedVoiceId={selectedVoiceId}
            setSelectedVoiceId={setSelectedVoiceId}
            customVoiceId={customVoiceId}
            setCustomVoiceId={setCustomVoiceId}
            stability={stability}
            setStability={setStability}
            similarityBoost={similarityBoost}
            setSimilarityBoost={setSimilarityBoost}
            savingVoice={savingVoice}
            setSavingVoice={setSavingVoice}
            voiceSaved={voiceSaved}
            setVoiceSaved={setVoiceSaved}
            isPreviewing={isPreviewing}
          />

          {/* Call History Section */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <ActivityIcon />
              Call History
            </div>

            {calls.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <PhoneIcon size={28} />
                </div>
                <div className="empty-state__title">No voice calls yet</div>
                <p className="empty-state__description">
                  Voice calls will appear here once your agent starts making or receiving calls.
                </p>
              </div>
            )}

            {calls.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {calls.map((call) => (
                  <div key={call.callId} className="post-card">
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Direction icon */}
                      <span
                        style={{
                          color:
                            call.state === 'active' || call.state === 'running'
                              ? '#10ffb0'
                              : 'var(--color-text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {call.metadata?.direction === 'inbound' ? (
                          <PhoneIncomingIcon />
                        ) : (
                          <PhoneOutgoingIcon />
                        )}
                      </span>

                      {/* Call info */}
                      <div style={{ flex: 1, minWidth: 160 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.8125rem',
                              fontWeight: 600,
                              color: 'var(--color-text)',
                            }}
                          >
                            {call.toNumber || 'Unknown'}
                          </span>
                          <span className={stateBadgeClass(call.state)}>{call.state}</span>
                        </div>
                        <div
                          style={{
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: '0.625rem',
                            color: 'var(--color-text-dim)',
                            marginTop: 3,
                            display: 'flex',
                            gap: 12,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>
                            {directionLabel(
                              (call.metadata?.direction as string) || 'outbound'
                            )}
                          </span>
                          <span>{call.provider}</span>
                          {call.fromNumber && <span>From: {call.fromNumber}</span>}
                          <span>Duration: {formatDuration(call.durationMs)}</span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.625rem',
                          color: 'var(--color-text-dim)',
                          textAlign: 'right',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatTimestamp(call.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
    </Paywall>
  );
}

// ---------------------------------------------------------------------------
// Voice Configuration Component
// ---------------------------------------------------------------------------

function VoiceConfigSection({
  seedId,
  voiceProvider,
  setVoiceProvider,
  selectedVoiceId,
  setSelectedVoiceId,
  customVoiceId,
  setCustomVoiceId,
  stability,
  setStability,
  similarityBoost,
  setSimilarityBoost,
  savingVoice,
  setSavingVoice,
  voiceSaved,
  setVoiceSaved,
  isPreviewing,
}: {
  seedId: string;
  voiceProvider: 'openai' | 'elevenlabs';
  setVoiceProvider: (v: 'openai' | 'elevenlabs') => void;
  selectedVoiceId: string;
  setSelectedVoiceId: (v: string) => void;
  customVoiceId: string;
  setCustomVoiceId: (v: string) => void;
  stability: number;
  setStability: (v: number) => void;
  similarityBoost: number;
  setSimilarityBoost: (v: number) => void;
  savingVoice: boolean;
  setSavingVoice: (v: boolean) => void;
  voiceSaved: boolean;
  setVoiceSaved: (v: boolean) => void;
  isPreviewing: boolean;
}) {
  const filteredVoices = VOICE_CATALOG.filter((v) => v.provider === voiceProvider);

  async function handleSaveVoice() {
    setSavingVoice(true);
    setVoiceSaved(false);
    try {
      const effectiveVoiceId = customVoiceId.trim() || selectedVoiceId;
      const config: Record<string, unknown> = {
        provider: voiceProvider,
        voiceId: effectiveVoiceId,
      };
      if (voiceProvider === 'elevenlabs') {
        config.customParams = { stability, similarity_boost: similarityBoost };
      }
      await wunderlandAPI.agentRegistry.update(seedId, { voiceConfig: config });
      setVoiceSaved(true);
      setTimeout(() => setVoiceSaved(false), 3000);
    } catch {
      // error handled silently — user can retry
    } finally {
      setSavingVoice(false);
    }
  }

  const sectionLabelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--color-text)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={sectionLabelStyle}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        Voice Configuration
      </div>

      <div className="post-card" style={{ padding: 20 }}>
        {/* Provider Selector */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginBottom: 8 }}>
            TTS Provider
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['openai', 'elevenlabs'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setVoiceProvider(p);
                  setCustomVoiceId('');
                  // Set default voice for provider
                  const defaultVoice = VOICE_CATALOG.find((v) => v.provider === p && v.isDefault);
                  if (defaultVoice) setSelectedVoiceId(defaultVoice.voiceId);
                }}
                disabled={isPreviewing}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: `1px solid ${voiceProvider === p ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.15)'}`,
                  background: voiceProvider === p ? 'rgba(0,245,255,0.1)' : 'transparent',
                  color: voiceProvider === p ? '#00f5ff' : 'var(--color-text-dim)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.75rem',
                  cursor: isPreviewing ? 'default' : 'pointer',
                }}
              >
                {p === 'openai' ? 'OpenAI' : 'ElevenLabs'}
              </button>
            ))}
          </div>
        </div>

        {/* Voice Grid */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginBottom: 8 }}>
            Voice
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8 }}>
            {filteredVoices.map((voice) => {
              const isSelected = !customVoiceId.trim() && selectedVoiceId === voice.voiceId;
              return (
                <button
                  key={voice.id}
                  onClick={() => {
                    setSelectedVoiceId(voice.voiceId);
                    setCustomVoiceId('');
                  }}
                  disabled={isPreviewing}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${isSelected ? 'rgba(0,245,255,0.5)' : 'rgba(201,162,39,0.12)'}`,
                    background: isSelected ? 'rgba(0,245,255,0.06)' : 'transparent',
                    textAlign: 'left',
                    cursor: isPreviewing ? 'default' : 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.8125rem', fontWeight: 600, color: isSelected ? '#00f5ff' : 'var(--color-text)' }}>
                      {voice.name}
                    </span>
                    <span
                      className={`badge ${voice.gender === 'female' ? 'badge--violet' : voice.gender === 'male' ? 'badge--cyan' : 'badge--neutral'}`}
                      style={{ fontSize: '0.5625rem', padding: '1px 5px' }}
                    >
                      {voice.gender}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.625rem', color: 'var(--color-text-dim)' }}>
                    {voice.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Voice ID (ElevenLabs) */}
        {voiceProvider === 'elevenlabs' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginBottom: 6 }}>
              Custom Voice ID (optional — for uploaded voices)
            </div>
            <input
              type="text"
              value={customVoiceId}
              onChange={(e) => setCustomVoiceId(e.target.value)}
              placeholder="Paste ElevenLabs voice_id..."
              disabled={isPreviewing}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: 6,
                border: '1px solid rgba(201,162,39,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--color-text)',
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: '0.75rem',
              }}
            />
          </div>
        )}

        {/* ElevenLabs Sliders */}
        {voiceProvider === 'elevenlabs' && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>
                <span>Stability</span>
                <span>{stability.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={stability}
                onChange={(e) => setStability(parseFloat(e.target.value))}
                disabled={isPreviewing}
                style={{ width: '100%', accentColor: '#00f5ff' }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginBottom: 4 }}>
                <span>Similarity Boost</span>
                <span>{similarityBoost.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityBoost}
                onChange={(e) => setSimilarityBoost(parseFloat(e.target.value))}
                disabled={isPreviewing}
                style={{ width: '100%', accentColor: '#00f5ff' }}
              />
            </div>
          </div>
        )}

        {/* Save Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={handleSaveVoice}
            disabled={savingVoice || isPreviewing}
            className="btn btn--primary"
            style={{ fontSize: '0.75rem' }}
          >
            {savingVoice ? 'Saving...' : 'Save Voice Config'}
          </button>
          {voiceSaved && (
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '0.6875rem', color: '#10ffb0' }}>
              Saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
