'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  broadcastWalletAddress,
  getWalletProvider,
  readStoredWalletAddress,
  shortAddress,
  storeWalletAddress,
} from '@/lib/wallet';

function syncWalletAddress(address: string): void {
  storeWalletAddress(address);
  broadcastWalletAddress(address);
}

function WalletIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="wallet-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="var(--neon-cyan, #00f0ff)" />
          <stop offset="50%" stopColor="var(--sol-purple, #9945ff)" />
          <stop offset="100%" stopColor="var(--neon-green, #14f195)" />
        </linearGradient>
      </defs>
      <rect x="2" y="6" width="20" height="14" rx="3" stroke="url(#wallet-grad)" strokeWidth="1.5" fill="none" />
      <path d="M6 6V5a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" stroke="url(#wallet-grad)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <rect x="15" y="11" width="5" height="4" rx="1" fill="url(#wallet-grad)" opacity="0.6" />
      <circle cx="17.5" cy="13" r="0.75" fill="currentColor" />
    </svg>
  );
}

export function WalletButton() {
  const [available, setAvailable] = useState(false);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss errors after 4 seconds
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const refreshFromProvider = useCallback(() => {
    try {
      const provider = getWalletProvider();
      if (!provider) {
        setAvailable(false);
        setAddress('');
        return;
      }
      setAvailable(true);
      const nextAddress = provider.publicKey?.toBase58() || readStoredWalletAddress();
      setAddress(nextAddress);
      syncWalletAddress(nextAddress);
    } catch {
      // Silently handle provider access errors
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => refreshFromProvider(), 100);
    const provider = getWalletProvider();
    if (!provider?.on || !provider?.removeListener) return () => clearTimeout(timer);

    const onConnect = () => refreshFromProvider();
    const onDisconnect = () => { setAddress(''); syncWalletAddress(''); };
    const onAccountChanged = () => refreshFromProvider();

    provider.on('connect', onConnect);
    provider.on('disconnect', onDisconnect);
    provider.on('accountChanged', onAccountChanged);

    return () => {
      clearTimeout(timer);
      provider.removeListener?.('connect', onConnect);
      provider.removeListener?.('disconnect', onDisconnect);
      provider.removeListener?.('accountChanged', onAccountChanged);
    };
  }, [refreshFromProvider]);

  const connectWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) { setError('No Solana wallet detected'); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await provider.connect();
      const nextAddress = res.publicKey.toBase58();
      setAddress(nextAddress);
      syncWalletAddress(nextAddress);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/reject|cancel|closed|denied/i.test(msg)) {
        setError(msg || 'Wallet connection failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = async () => {
    const provider = getWalletProvider();
    setLoading(true);
    setError(null);
    try { await provider?.disconnect(); } catch { /* ok */ }
    setAddress('');
    syncWalletAddress('');
    setLoading(false);
  };

  // No wallet — install CTA
  if (!available) {
    return (
      <a
        href="https://phantom.app"
        target="_blank"
        rel="noopener"
        className="wallet-btn wallet-btn-install group"
      >
        <span className="wallet-btn-border" />
        <span className="wallet-btn-fill" />
        <span className="wallet-btn-content">
          <WalletIcon className="wallet-btn-icon" />
          <span className="wallet-btn-label">Get Phantom</span>
        </span>
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {address ? (
        <button
          type="button"
          onClick={disconnectWallet}
          disabled={loading}
          className="wallet-btn wallet-btn-connected group"
          title={`Connected: ${address}\nClick to disconnect`}
        >
          <span className="wallet-btn-border wallet-btn-border-green" />
          <span className="wallet-btn-fill" />
          <span className="wallet-btn-content">
            <span className="wallet-btn-dot"><span className="wallet-btn-dot-live" /></span>
            <span className="wallet-btn-label">
              {loading ? 'Disconnecting…' : shortAddress(address)}
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={connectWallet}
          disabled={loading}
          className="wallet-btn wallet-btn-connect group"
        >
          <span className="wallet-btn-border" />
          <span className="wallet-btn-fill" />
          <span className="wallet-btn-content">
            <WalletIcon className="wallet-btn-icon" />
            <span className="wallet-btn-label">
              {loading ? 'Connecting…' : 'Connect'}
            </span>
          </span>
        </button>
      )}
      {error && (
        <span className="text-[10px] text-[var(--neon-red)] animate-pulse whitespace-nowrap">
          {error}
        </span>
      )}
    </div>
  );
}
