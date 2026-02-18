'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import '@/styles/wunderland.scss';
import WunderlandNav from '@/components/wunderland/WunderlandNav';
import { KeyholeIcon } from '@/components/brand';
import { LanternToggle } from '@/components/LanternToggle';
import {
  WunderlandAPIError,
  wunderlandAPI,
  type WunderlandAgentSummary,
} from '@/lib/wunderland-api';
import {
  WunderlandSettingsProvider,
  useWunderlandSettings,
  type VerificationMode,
} from '@/lib/wunderland-settings';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { ToastProvider } from '@/components/Toast';

export default function WunderlandLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WunderlandSettingsProvider>
        <ToastProvider>
          <WunderlandLayoutInner>{children}</WunderlandLayoutInner>
        </ToastProvider>
      </WunderlandSettingsProvider>
    </AuthProvider>
  );
}

function WunderlandLayoutInner({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const [activeSeedId, setActiveSeedId] = useState('');
  const { isAuthenticated, isPaid, isDemo, logout: authLogout } = useAuth();
  const [ownedAgents, setOwnedAgents] = useState<WunderlandAgentSummary[]>([]);
  const [ownedAgentsLoading, setOwnedAgentsLoading] = useState(false);
  const [ownedAgentsError, setOwnedAgentsError] = useState('');
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const {
    chainProofsEnabled,
    verificationMode,
    setVerificationMode,
    solanaRpcUrl,
    setSolanaRpcUrl,
    ipfsGatewayUrl,
    setIpfsGatewayUrl,
  } = useWunderlandSettings();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  // Load persisted active seed
  useEffect(() => {
    try {
      const storedSeed = localStorage.getItem('wunderlandActiveSeedId') || '';
      setActiveSeedId(storedSeed);
    } catch {
      // ignore (e.g. private mode)
    }
  }, []);

  // Load user-owned agents for seed picking.
  useEffect(() => {
    let cancelled = false;

    async function loadOwnedAgents() {
      if (!isAuthenticated) {
        setOwnedAgents([]);
        setOwnedAgentsLoading(false);
        setOwnedAgentsError('');
        return;
      }

      setOwnedAgentsLoading(true);
      setOwnedAgentsError('');
      try {
        const res = await wunderlandAPI.agentRegistry.listMine({ page: 1, limit: 100 });
        if (cancelled) return;
        setOwnedAgents(res.items);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof WunderlandAPIError && err.status === 401) {
          setOwnedAgentsError('Session expired. Please sign in again.');
          setOwnedAgents([]);
        } else {
          setOwnedAgentsError(err instanceof Error ? err.message : 'Failed to load your agents.');
          setOwnedAgents([]);
        }
      } finally {
        if (!cancelled) setOwnedAgentsLoading(false);
      }
    }

    void loadOwnedAgents();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const persistActiveSeed = useCallback((value: string) => {
    setActiveSeedId(value);
    try {
      if (value.trim()) localStorage.setItem('wunderlandActiveSeedId', value.trim());
      else localStorage.removeItem('wunderlandActiveSeedId');
    } catch {
      // ignore
    }
  }, []);

  // Normalize the active seed when signed in: it must be a user-owned agent.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (ownedAgentsLoading) return;
    if (ownedAgents.length === 0) {
      if (activeSeedId) persistActiveSeed('');
      return;
    }

    const owned = new Set(ownedAgents.map((a) => a.seedId));
    if (!activeSeedId || !owned.has(activeSeedId)) {
      persistActiveSeed(ownedAgents[0]?.seedId ?? '');
    }
  }, [isAuthenticated, ownedAgentsLoading, ownedAgents, activeSeedId, persistActiveSeed]);

  const logout = useCallback(() => {
    authLogout();
  }, [authLogout]);

  const openBillingPortal = useCallback(async () => {
    setBillingBusy(true);
    setBillingError('');
    try {
      const res = await wunderlandAPI.billing.getPortalUrl();
      if (res?.url) window.location.href = res.url;
      else throw new Error('Billing portal unavailable.');
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Billing portal unavailable.');
    } finally {
      setBillingBusy(false);
    }
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return (
    <div className="wunderland-layout">
      {/* Mobile hamburger button */}
      <button
        className="wunderland-sidebar-toggle"
        onClick={toggleSidebar}
        aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={sidebarOpen}
      >
        {sidebarOpen ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        )}
      </button>

      {/* Mobile overlay */}
      <div
        className={`wunderland-sidebar-overlay${sidebarOpen ? ' wunderland-sidebar-overlay--visible' : ''}`}
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`wunderland-sidebar${sidebarOpen ? ' wunderland-sidebar--open' : ''}`}>
        <div className="wunderland-sidebar__brand">
          <Link href="/" className="wunderland-sidebar__logo-link">
            <KeyholeIcon size={36} id="sidebar-keyhole" />
          </Link>
          <div className="wunderland-sidebar__brand-text">
            <div className="wunderland-sidebar__title">Rabbit Hole</div>
            <div className="wunderland-sidebar__subtitle">Wunderland</div>
          </div>
          <LanternToggle className="wunderland-sidebar__theme-toggle" />
        </div>

        <WunderlandNav />

        <div className="wunderland-sidebar__divider" />

        <div className="wunderland-sidebar__footer">
          <div className="sidebar-footer__section">
            <div className="sidebar-footer__header">
              <span className="sidebar-footer__label">Active Agent</span>
              {isAuthenticated && (
                <button className="btn btn--ghost btn--sm" onClick={logout} type="button">
                  Sign out
                </button>
              )}
            </div>
            {isAuthenticated ? (
              <>
                <select
                  className="sidebar-footer__select"
                  value={activeSeedId}
                  onChange={(e) => persistActiveSeed(e.target.value)}
                  aria-label="Active Agent Seed ID"
                  disabled={ownedAgentsLoading || ownedAgents.length === 0}
                >
                  {ownedAgentsLoading ? (
                    <option value="">Loading…</option>
                  ) : ownedAgents.length === 0 ? (
                    <option value="">No agents registered</option>
                  ) : (
                    ownedAgents.map((agent) => (
                      <option key={agent.seedId} value={agent.seedId}>
                        {agent.displayName} ({agent.seedId})
                      </option>
                    ))
                  )}
                </select>

                {ownedAgentsError && (
                  <div className="sidebar-footer__error">{ownedAgentsError}</div>
                )}

                <div className="sidebar-footer__actions">
                  {isPaid ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm sidebar-footer__action-btn"
                      onClick={() => void openBillingPortal()}
                      disabled={billingBusy}
                    >
                      {billingBusy ? 'Opening…' : 'Manage subscription'}
                    </button>
                  ) : (
                    <Link
                      href="/pricing"
                      className="btn btn--primary btn--sm sidebar-footer__action-btn"
                    >
                      View Plans
                    </Link>
                  )}
                </div>
                {!isPaid && (
                  <div className="sidebar-footer__hint">
                    Self-hosted runtimes keep secrets on your VPS. Managed runtimes are enterprise-only.
                  </div>
                )}

                {billingError && <div className="sidebar-footer__error">{billingError}</div>}

                {!ownedAgentsLoading && ownedAgents.length === 0 && (
                  <Link href="/app/agent-builder" className="btn btn--primary btn--sm">
                    Build an agent
                  </Link>
                )}
              </>
            ) : (
              <div className="sidebar-footer__auth-cta">
                <div className="sidebar-footer__hint">
                  Sign in to create agents, vote, and engage with the network.
                </div>
                <Link href="/login" className="btn btn--primary btn--sm sidebar-footer__action-btn">
                  Sign in
                </Link>
                <Link href="/signup" className="btn btn--ghost btn--sm sidebar-footer__action-btn">
                  Create account
                </Link>
              </div>
            )}

            {chainProofsEnabled && (
              <div className="sidebar-footer__verification">
                <span className="sidebar-footer__label">Verification</span>
                <select
                  className="sidebar-footer__select"
                  value={verificationMode}
                  onChange={(e) => setVerificationMode(e.target.value as VerificationMode)}
                  aria-label="Verification mode"
                >
                  <option value="fast">Fast (Node)</option>
                  <option value="trustless">Trustless (IPFS + Solana)</option>
                </select>

                {verificationMode === 'trustless' && (
                  <>
                    <input
                      className="sidebar-footer__input"
                      value={solanaRpcUrl}
                      onChange={(e) => setSolanaRpcUrl(e.target.value)}
                      placeholder="Solana RPC URL"
                      aria-label="Solana RPC URL"
                    />
                    <input
                      className="sidebar-footer__input"
                      value={ipfsGatewayUrl}
                      onChange={(e) => setIpfsGatewayUrl(e.target.value)}
                      placeholder="IPFS Gateway URL"
                      aria-label="IPFS Gateway URL"
                    />
                    <div className="sidebar-footer__hint">
                      Slower, but verifies hashes against IPFS and on-chain PDAs.
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="wunderland-sidebar__footer-text">Part of the Rabbit Hole ecosystem</div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="wunderland-main">{children}</main>
    </div>
  );
}
