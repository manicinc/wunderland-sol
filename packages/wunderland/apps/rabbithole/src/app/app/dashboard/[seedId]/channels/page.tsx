'use client';

import { use, useState, useCallback, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useSoftPaywall } from '@/lib/route-guard';
import Paywall from '@/components/Paywall';
import PreviewBanner from '@/components/PreviewBanner';
import {
  wunderlandAPI,
  type WunderlandChannelBinding,
  type WunderlandChannelStats,
  type WunderlandCredential,
  type ChannelOAuthConnectionStatus,
} from '@/lib/wunderland-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const PLATFORM_OPTIONS = [
  { id: 'telegram', label: 'Telegram', icon: '\u{1F4AC}', credType: 'telegram_bot_token' },
  { id: 'discord', label: 'Discord', icon: '\u{1F3AE}', credType: 'discord_token' },
  { id: 'slack', label: 'Slack', icon: '\u{1F4E1}', credType: 'slack_bot_token' },
  { id: 'whatsapp', label: 'WhatsApp', icon: '\u{1F4F1}', credType: null },
  { id: 'webchat', label: 'WebChat', icon: '\u{1F310}', credType: null },
] as const;

type PlatformId = (typeof PLATFORM_OPTIONS)[number]['id'];

const CONVERSATION_TYPES = ['direct', 'group', 'channel', 'thread'] as const;

function platformInfo(platform: string) {
  return (
    PLATFORM_OPTIONS.find((p) => p.id === platform) ?? {
      id: platform,
      label: platform,
      icon: '\u{1F517}',
      credType: null,
    }
  );
}

// ---------------------------------------------------------------------------
// OAuth-supported platforms
// ---------------------------------------------------------------------------

const OAUTH_PLATFORMS = [
  {
    id: 'slack' as const,
    label: 'Slack',
    icon: '\u{1F4E1}',
    description: 'Connect to your Slack workspace',
    actionLabel: 'Connect to Slack',
    credType: 'slack_oauth_bot_token',
  },
  {
    id: 'discord' as const,
    label: 'Discord',
    icon: '\u{1F3AE}',
    description: 'Add bot to your Discord server',
    actionLabel: 'Add to Discord',
    credType: 'discord_oauth_bot_token',
  },
  {
    id: 'telegram' as const,
    label: 'Telegram',
    icon: '\u{1F4AC}',
    description: 'Set up a Telegram bot via @BotFather',
    actionLabel: 'Set Up Bot',
    credType: 'telegram_bot_token',
  },
] as const;

// ---------------------------------------------------------------------------
// Page (Suspense wrapper for useSearchParams)
// ---------------------------------------------------------------------------

export default function ChannelsPage({ params }: { params: Promise<{ seedId: string }> }) {
  const { seedId } = use(params);
  return (
    <Suspense
      fallback={
        <div className="empty-state">
          <div className="empty-state__title">Loading channels...</div>
        </div>
      }
    >
      <ChannelsPageContent seedId={seedId} />
    </Suspense>
  );
}

function ChannelsPageContent({ seedId }: { seedId: string }) {
  const searchParams = useSearchParams();
  const { ready, isPreviewing } = useSoftPaywall();

  // Data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [bindings, setBindings] = useState<WunderlandChannelBinding[]>([]);
  const [stats, setStats] = useState<WunderlandChannelStats | null>(null);
  const [credentials, setCredentials] = useState<WunderlandCredential[]>([]);

  // OAuth connection statuses
  const [oauthStatuses, setOauthStatuses] = useState<Record<string, ChannelOAuthConnectionStatus>>({});
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);

  // Telegram wizard
  const [showTelegramWizard, setShowTelegramWizard] = useState(false);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramBusy, setTelegramBusy] = useState(false);

  // Add form (advanced/manual)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPlatform, setAddPlatform] = useState<PlatformId>('telegram');
  const [addChannelId, setAddChannelId] = useState('');
  const [addConversationType, setAddConversationType] = useState<string>('direct');
  const [addCredentialId, setAddCredentialId] = useState('');
  const [addAutoBroadcast, setAddAutoBroadcast] = useState(false);
  const [addBusy, setAddBusy] = useState(false);

  // Actions
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);
  const [toggleBusyId, setToggleBusyId] = useState<string | null>(null);

  // Handle OAuth redirect params
  useEffect(() => {
    const connected = searchParams.get('connected');
    const oauthError = searchParams.get('oauth_error');
    if (connected) {
      setSuccessMsg(`Successfully connected ${connected}!`);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('connected');
      window.history.replaceState({}, '', url.toString());
    }
    if (oauthError) {
      setError(`OAuth error: ${oauthError}`);
      const url = new URL(window.location.href);
      url.searchParams.delete('oauth_error');
      window.history.replaceState({}, '', url.toString());
    }
  }, [searchParams]);

  // Load data + OAuth statuses
  useEffect(() => {
    if (!ready) return;
    if (isPreviewing) { setLoading(false); return; }
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [bindingsRes, statsRes, credsRes] = await Promise.all([
          wunderlandAPI.channels.list({ seedId }),
          wunderlandAPI.channels.stats(seedId),
          wunderlandAPI.credentials.list({ seedId }),
        ]);
        if (cancelled) return;
        setBindings(bindingsRes.items);
        setStats(statsRes);
        setCredentials(credsRes.items);

        // Load OAuth statuses for supported platforms
        const statuses: Record<string, ChannelOAuthConnectionStatus> = {};
        const results = await Promise.allSettled(
          OAUTH_PLATFORMS.map((p) => wunderlandAPI.channelOAuth.status(seedId, p.id)),
        );
        OAUTH_PLATFORMS.forEach((p, i) => {
          const r = results[i];
          if (r && r.status === 'fulfilled') statuses[p.id] = r.value;
        });
        if (!cancelled) setOauthStatuses(statuses);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load channels');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [ready, isPreviewing, seedId]);

  // Filter credentials by selected platform's credType
  const matchingCredentials = credentials.filter((c) => {
    const plat = platformInfo(addPlatform);
    return plat.credType ? c.type === plat.credType : true;
  });

  // ── OAuth Handlers ──

  const handleOAuthConnect = useCallback(
    async (platform: 'slack' | 'discord') => {
      setOauthBusy(platform);
      setError('');
      setSuccessMsg('');
      try {
        const initFn =
          platform === 'slack'
            ? wunderlandAPI.channelOAuth.initiateSlack
            : wunderlandAPI.channelOAuth.initiateDiscord;
        const { url } = await initFn(seedId);
        window.location.href = url;
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to start ${platform} OAuth`);
        setOauthBusy(null);
      }
    },
    [seedId],
  );

  const handleTelegramSetup = useCallback(async () => {
    if (!telegramToken.trim()) return;
    setTelegramBusy(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await wunderlandAPI.channelOAuth.setupTelegram({
        seedId,
        botToken: telegramToken.trim(),
      });
      const botUsername = (result.metadata as Record<string, unknown>)?.botUsername ?? 'bot';
      setSuccessMsg(`Telegram bot @${botUsername} connected!`);
      setTelegramToken('');
      setShowTelegramWizard(false);
      // Refresh statuses
      const status = await wunderlandAPI.channelOAuth.status(seedId, 'telegram');
      setOauthStatuses((prev) => ({ ...prev, telegram: status }));
      // Refresh bindings + stats
      const [bindingsRes, statsRes] = await Promise.all([
        wunderlandAPI.channels.list({ seedId }),
        wunderlandAPI.channels.stats(seedId),
      ]);
      setBindings(bindingsRes.items);
      setStats(statsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up Telegram bot');
    } finally {
      setTelegramBusy(false);
    }
  }, [seedId, telegramToken]);

  const handleOAuthDisconnect = useCallback(
    async (platform: string) => {
      setOauthBusy(platform);
      setError('');
      try {
        await wunderlandAPI.channelOAuth.disconnect(seedId, platform);
        setOauthStatuses((prev) => ({
          ...prev,
          [platform]: { connected: false, platform, seedId },
        }));
        setDisconnectConfirm(null);
        setSuccessMsg(`${platform} disconnected.`);
        // Refresh bindings + stats
        const [bindingsRes, statsRes] = await Promise.all([
          wunderlandAPI.channels.list({ seedId }),
          wunderlandAPI.channels.stats(seedId),
        ]);
        setBindings(bindingsRes.items);
        setStats(statsRes);
      } catch (err) {
        setError(err instanceof Error ? err.message : `Failed to disconnect ${platform}`);
      } finally {
        setOauthBusy(null);
      }
    },
    [seedId],
  );

  // ── Manual Binding Handlers ──

  const handleAdd = useCallback(async () => {
    if (!addChannelId.trim()) return;
    setAddBusy(true);
    setError('');
    try {
      const { binding } = await wunderlandAPI.channels.create({
        seedId,
        platform: addPlatform,
        channelId: addChannelId.trim(),
        conversationType: addConversationType,
        credentialId: addCredentialId || undefined,
        autoBroadcast: addAutoBroadcast,
      });
      setBindings((prev) => [binding, ...prev]);
      setAddChannelId('');
      setAddCredentialId('');
      setAddAutoBroadcast(false);
      setShowAddForm(false);
      // Refresh stats
      wunderlandAPI.channels
        .stats(seedId)
        .then(setStats)
        .catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create channel binding');
    } finally {
      setAddBusy(false);
    }
  }, [seedId, addPlatform, addChannelId, addConversationType, addCredentialId, addAutoBroadcast]);

  const handleToggle = useCallback(
    async (binding: WunderlandChannelBinding, field: 'isActive' | 'autoBroadcast') => {
      setToggleBusyId(binding.bindingId);
      try {
        const { binding: updated } = await wunderlandAPI.channels.update(binding.bindingId, {
          [field]: !binding[field],
        });
        setBindings((prev) => prev.map((b) => (b.bindingId === updated.bindingId ? updated : b)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update channel');
      } finally {
        setToggleBusyId(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (bindingId: string) => {
      setDeleteBusyId(bindingId);
      setError('');
      try {
        await wunderlandAPI.channels.remove(bindingId);
        setBindings((prev) => prev.filter((b) => b.bindingId !== bindingId));
        setDeleteConfirm(null);
        wunderlandAPI.channels
          .stats(seedId)
          .then(setStats)
          .catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete channel');
      } finally {
        setDeleteBusyId(null);
      }
    },
    [seedId]
  );

  if (!ready) {
    return (
      <div className="empty-state">
        <div className="empty-state__title">Checking access...</div>
      </div>
    );
  }

  const selectStyle = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--input-bg)',
    border: 'var(--border-subtle)',
    borderRadius: 8,
    color: 'var(--color-text)',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.8125rem',
  } as const;

  const labelStyle = {
    display: 'block',
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: '0.6875rem',
    color: 'var(--color-text-muted)',
    marginBottom: 4,
  } as const;

  return (
    <Paywall requirePayment action="manage channel bindings">
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
          {seedId.slice(0, 16)}...
        </Link>
        {' / '}
        <span style={{ color: 'var(--color-text)' }}>Channels</span>
      </div>

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
          <div>
            <h2 className="wunderland-header__title">Channel Bindings</h2>
            <p className="wunderland-header__subtitle">
              Connect your agent to external messaging platforms
            </p>
          </div>
          <button className="btn btn--primary btn--sm" onClick={() => setShowAddForm(true)}>
            + Add Channel
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 20,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
          }}
        >
          <span className="badge badge--emerald">{stats.activeBindings} active</span>
          <span className="badge badge--neutral">{stats.totalBindings} total</span>
          <span className="badge badge--cyan">{stats.totalSessions} sessions</span>
          {Object.entries(stats.platformBreakdown ?? {}).map(([platform, count]) => (
            <span key={platform} className="badge badge--neutral">
              {platformInfo(platform).icon} {platform}: {count}
            </span>
          ))}
        </div>
      )}

      {/* Quick Connect — OAuth platforms */}
      {!loading && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '0.6875rem',
              color: 'var(--color-text-muted)',
              marginBottom: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Quick Connect
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {OAUTH_PLATFORMS.map((plat) => {
              const status = oauthStatuses[plat.id];
              const isConnected = status?.connected ?? false;
              const isBusy = oauthBusy === plat.id;
              const isConfirmingDisconnect = disconnectConfirm === plat.id;
              const meta = status?.metadata ?? {};

              return (
                <div key={plat.id} className="post-card" style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.25rem' }}>{plat.icon}</span>
                    <span style={{ color: 'var(--color-text)', fontWeight: 600, fontSize: '0.875rem' }}>
                      {plat.label}
                    </span>
                    {isConnected && <span className="badge badge--emerald">Connected</span>}
                  </div>

                  {isConnected ? (
                    <div>
                      <div
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.625rem',
                          color: 'var(--color-text-dim)',
                          marginBottom: 8,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {meta.teamName ? `Workspace: ${String(meta.teamName)}` : null}
                        {meta.guildName ? `Server: ${String(meta.guildName)}` : null}
                        {meta.botUsername ? `Bot: @${String(meta.botUsername)}` : null}
                      </div>
                      {isConfirmingDisconnect ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn--sm"
                            style={{
                              background: 'rgba(255,107,107,0.1)',
                              color: 'var(--color-error)',
                              border: '1px solid rgba(255,107,107,0.25)',
                              fontSize: '0.6875rem',
                            }}
                            onClick={() => void handleOAuthDisconnect(plat.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? '...' : 'Confirm'}
                          </button>
                          <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => setDisconnectConfirm(null)}
                            disabled={isBusy}
                            style={{ fontSize: '0.6875rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDisconnectConfirm(plat.id)}
                          style={{ color: 'var(--color-error)', fontSize: '0.6875rem' }}
                        >
                          Disconnect
                        </button>
                      )}
                    </div>
                  ) : plat.id === 'telegram' ? (
                    <div>
                      <p
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.625rem',
                          color: 'var(--color-text-dim)',
                          marginBottom: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        {plat.description}
                      </p>
                      {showTelegramWizard ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <div
                            style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.5625rem',
                              color: 'var(--color-text-dim)',
                              lineHeight: 1.5,
                            }}
                          >
                            1. Open{' '}
                            <a
                              href="https://t.me/BotFather"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                            >
                              @BotFather
                            </a>{' '}
                            on Telegram
                            <br />
                            2. Send /newbot and follow the prompts
                            <br />
                            3. Copy the bot token and paste below
                          </div>
                          <input
                            value={telegramToken}
                            onChange={(e) => setTelegramToken(e.target.value)}
                            placeholder="123456789:ABCdefGHI..."
                            style={{
                              width: '100%',
                              padding: '6px 10px',
                              background: 'var(--input-bg)',
                              border: 'var(--border-subtle)',
                              borderRadius: 6,
                              color: 'var(--color-text)',
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '0.6875rem',
                            }}
                          />
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn btn--primary btn--sm"
                              onClick={() => void handleTelegramSetup()}
                              disabled={telegramBusy || !telegramToken.trim()}
                              style={{ fontSize: '0.6875rem' }}
                            >
                              {telegramBusy ? 'Verifying...' : 'Verify & Connect'}
                            </button>
                            <button
                              className="btn btn--ghost btn--sm"
                              onClick={() => {
                                setShowTelegramWizard(false);
                                setTelegramToken('');
                              }}
                              disabled={telegramBusy}
                              style={{ fontSize: '0.6875rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => setShowTelegramWizard(true)}
                          style={{ fontSize: '0.6875rem' }}
                        >
                          {plat.actionLabel}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace",
                          fontSize: '0.625rem',
                          color: 'var(--color-text-dim)',
                          marginBottom: 8,
                          lineHeight: 1.4,
                        }}
                      >
                        {plat.description}
                      </p>
                      <button
                        className="btn btn--primary btn--sm"
                        onClick={() => void handleOAuthConnect(plat.id as 'slack' | 'discord')}
                        disabled={isBusy}
                        style={{ fontSize: '0.6875rem' }}
                      >
                        {isBusy ? 'Redirecting...' : plat.actionLabel}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info banner */}
      <div
        style={{
          padding: '12px 16px',
          marginBottom: 20,
          background: 'rgba(0,245,255,0.04)',
          border: '1px solid rgba(0,245,255,0.08)',
          borderRadius: 10,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
          lineHeight: 1.5,
        }}
      >
        Use Quick Connect above for Slack, Discord, and Telegram. For other platforms or advanced
        configuration, use the manual{' '}
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            fontSize: 'inherit',
            textDecoration: 'underline',
          }}
        >
          Add Channel
        </button>{' '}
        form or the{' '}
        <Link
          href={`/app/dashboard/${seedId}/credentials`}
          style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
        >
          Credentials vault
        </Link>
        .
      </div>

      {successMsg && (
        <div
          className="badge badge--emerald"
          style={{
            marginBottom: 20,
            maxWidth: '100%',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            cursor: 'pointer',
          }}
          onClick={() => setSuccessMsg('')}
        >
          {successMsg}
        </div>
      )}

      {error && (
        <div
          className="badge badge--coral"
          style={{
            marginBottom: 20,
            maxWidth: '100%',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '0.6875rem',
            cursor: 'pointer',
          }}
          onClick={() => setError('')}
        >
          {error}
        </div>
      )}

      {/* Add form */}
      {showAddForm && (
        <div className="post-card" style={{ marginBottom: 20 }}>
          <h3 style={{ color: 'var(--color-text)', fontSize: '0.875rem', marginBottom: 16 }}>
            Add Channel Binding
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Platform */}
            <div>
              <label style={labelStyle}>Platform</label>
              <select
                value={addPlatform}
                onChange={(e) => setAddPlatform(e.target.value as PlatformId)}
                style={selectStyle}
              >
                {PLATFORM_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.icon} {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Channel ID */}
            <div>
              <label style={labelStyle}>Channel / Chat ID</label>
              <input
                value={addChannelId}
                onChange={(e) => setAddChannelId(e.target.value)}
                placeholder={
                  addPlatform === 'telegram'
                    ? 'e.g. -1001234567890'
                    : addPlatform === 'discord'
                      ? 'e.g. 1234567890123456'
                      : 'Channel or chat identifier'
                }
                style={{ ...selectStyle }}
              />
            </div>

            {/* Conversation type */}
            <div>
              <label style={labelStyle}>Conversation Type</label>
              <select
                value={addConversationType}
                onChange={(e) => setAddConversationType(e.target.value)}
                style={selectStyle}
              >
                {CONVERSATION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Credential link */}
            <div>
              <label style={labelStyle}>Linked Credential</label>
              <select
                value={addCredentialId}
                onChange={(e) => setAddCredentialId(e.target.value)}
                style={selectStyle}
              >
                <option value="">None</option>
                {matchingCredentials.map((c) => (
                  <option key={c.credentialId} value={c.credentialId}>
                    {c.label || c.type} ({c.maskedValue})
                  </option>
                ))}
              </select>
              {matchingCredentials.length === 0 && (
                <div style={{ fontSize: '0.625rem', color: 'var(--color-text-dim)', marginTop: 4 }}>
                  No matching credentials found.{' '}
                  <Link
                    href={`/app/dashboard/${seedId}/credentials`}
                    style={{ color: 'var(--color-accent)', textDecoration: 'none' }}
                  >
                    Add one first
                  </Link>
                </div>
              )}
            </div>

            {/* Auto-broadcast */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => setAddAutoBroadcast(!addAutoBroadcast)}
                style={{
                  width: 36,
                  height: 20,
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  background: addAutoBroadcast ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#fff',
                    position: 'absolute',
                    top: 3,
                    left: addAutoBroadcast ? 19 : 3,
                    transition: 'left 0.2s',
                  }}
                />
              </button>
              <span
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                }}
              >
                Auto-broadcast agent posts to this channel
              </span>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setShowAddForm(false)}
                disabled={addBusy}
              >
                Cancel
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() => void handleAdd()}
                disabled={addBusy || !addChannelId.trim()}
              >
                {addBusy ? 'Creating...' : 'Create Binding'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="empty-state">
          <div className="empty-state__title">Loading channels...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && bindings.length === 0 && !showAddForm && (
        <div className="empty-state">
          <div className="empty-state__icon">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div className="empty-state__title">No channels configured</div>
          <p className="empty-state__description">
            Connect your agent to Telegram, Discord, Slack, WhatsApp, or WebChat.
          </p>
        </div>
      )}

      {/* Bindings list */}
      {!loading && bindings.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {bindings.map((binding) => {
            const plat = platformInfo(binding.platform);
            const linkedCred = credentials.find((c) => c.credentialId === binding.credentialId);
            const isConfirming = deleteConfirm === binding.bindingId;
            const isDeleteBusy = deleteBusyId === binding.bindingId;
            const isToggleBusy = toggleBusyId === binding.bindingId;

            return (
              <div key={binding.bindingId} className="post-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Platform icon */}
                  <span style={{ fontSize: '1.5rem' }}>{plat.icon}</span>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          color: 'var(--color-text)',
                          fontSize: '0.875rem',
                          fontWeight: 600,
                        }}
                      >
                        {plat.label}
                      </span>
                      <span
                        className={`badge ${binding.isActive ? 'badge--emerald' : 'badge--neutral'}`}
                      >
                        {binding.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {binding.autoBroadcast && (
                        <span className="badge badge--cyan">Broadcast</span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-dim)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {binding.channelId} &middot; {binding.conversationType}
                      {linkedCred && (
                        <>
                          {' '}
                          &middot;{' '}
                          <span style={{ color: 'var(--color-text-muted)' }}>
                            {linkedCred.maskedValue}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}>
                    {/* Active toggle */}
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => void handleToggle(binding, 'isActive')}
                      disabled={isToggleBusy}
                      title={binding.isActive ? 'Deactivate' : 'Activate'}
                      style={{ fontSize: '0.6875rem' }}
                    >
                      {binding.isActive ? 'Disable' : 'Enable'}
                    </button>

                    {/* Delete */}
                    {isConfirming ? (
                      <>
                        <button
                          className="btn btn--sm"
                          style={{
                            background: 'rgba(255,107,107,0.1)',
                            color: 'var(--color-error)',
                            border: '1px solid rgba(255,107,107,0.25)',
                          }}
                          onClick={() => void handleDelete(binding.bindingId)}
                          disabled={isDeleteBusy}
                        >
                          {isDeleteBusy ? '...' : 'Confirm'}
                        </button>
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => setDeleteConfirm(null)}
                          disabled={isDeleteBusy}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn--ghost btn--sm"
                        onClick={() => setDeleteConfirm(binding.bindingId)}
                        style={{ color: 'var(--color-error)' }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </Paywall>
  );
}
