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

function PhantomIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 128 128" fill="currentColor">
      <path d="M110.6 57.1C108.2 35.1 89.5 18 66.7 18H64c-25.4 0-46 20.6-46 46v3.3c0 8.5 2.3 16.8 6.7 24.1l2.2 3.7c1.2 2 .5 4.6-1.5 5.8l-3.1 1.9c-2 1.2-2.6 3.8-1.4 5.8l.5.8c1.2 2 3.8 2.6 5.8 1.4l3.1-1.9c2-1.2 4.6-.5 5.8 1.5l.5.8c1.2 2 .5 4.6-1.5 5.8l-3.1 1.9c-2 1.2-2.6 3.8-1.4 5.8 1.2 2 3.8 2.6 5.8 1.4l38.1-23.2c2.9-1.8 6.3-2.7 9.8-2.7h3.6c18.4 0 33.3-14.9 33.3-33.3v-1.5c0-2.1-.1-4.3-.3-6.4zM51 73c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8zm30 0c-4.4 0-8-3.6-8-8s3.6-8 8-8 8 3.6 8 8-3.6 8-8 8z" />
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
          <PhantomIcon className="wallet-btn-phantom" />
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
            <PhantomIcon className="wallet-btn-phantom" />
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
