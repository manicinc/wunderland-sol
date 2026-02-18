'use client';

import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

export type VerificationMode = 'fast' | 'trustless';

export type WunderlandSettings = {
  chainProofsEnabled: boolean;
  verificationMode: VerificationMode;
  setVerificationMode: (mode: VerificationMode) => void;
  solanaRpcUrl: string;
  setSolanaRpcUrl: (url: string) => void;
  ipfsGatewayUrl: string;
  setIpfsGatewayUrl: (url: string) => void;
};

const DEFAULT_SOLANA_RPC = 'https://api.devnet.solana.com';
const DEFAULT_IPFS_GATEWAY = 'https://ipfs.io';

const LS_MODE = 'wunderlandVerificationMode';
const LS_RPC = 'wunderlandSolanaRpcUrl';
const LS_IPFS = 'wunderlandIpfsGatewayUrl';

const WunderlandSettingsContext = createContext<WunderlandSettings | null>(null);
const CHAIN_PROOFS_ENABLED = process.env.NEXT_PUBLIC_WUNDERLAND_ENABLE_CHAIN_PROOFS === 'true';

function normalizeMode(value: unknown): VerificationMode {
  return value === 'trustless' ? 'trustless' : 'fast';
}

function normalizeUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.replace(/\/+$/, '');
}

export function WunderlandSettingsProvider({ children }: { children: React.ReactNode }) {
  const [verificationMode, setVerificationMode] = useState<VerificationMode>('fast');
  const [solanaRpcUrl, setSolanaRpcUrl] = useState<string>(DEFAULT_SOLANA_RPC);
  const [ipfsGatewayUrl, setIpfsGatewayUrl] = useState<string>(DEFAULT_IPFS_GATEWAY);

  const setVerificationModeSafe = useCallback(
    (mode: VerificationMode) => {
      if (!CHAIN_PROOFS_ENABLED) {
        setVerificationMode('fast');
        return;
      }
      setVerificationMode(mode);
    },
    []
  );

  useEffect(() => {
    try {
      setVerificationMode(
        CHAIN_PROOFS_ENABLED ? normalizeMode(localStorage.getItem(LS_MODE)) : 'fast'
      );
      setSolanaRpcUrl(normalizeUrl(localStorage.getItem(LS_RPC), DEFAULT_SOLANA_RPC));
      setIpfsGatewayUrl(normalizeUrl(localStorage.getItem(LS_IPFS), DEFAULT_IPFS_GATEWAY));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!CHAIN_PROOFS_ENABLED) {
      try {
        localStorage.removeItem(LS_MODE);
      } catch {
        // ignore
      }
      return;
    }
    try {
      localStorage.setItem(LS_MODE, verificationMode);
    } catch {
      // ignore
    }
  }, [verificationMode]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_RPC, solanaRpcUrl);
    } catch {
      // ignore
    }
  }, [solanaRpcUrl]);

  useEffect(() => {
    try {
      localStorage.setItem(LS_IPFS, ipfsGatewayUrl);
    } catch {
      // ignore
    }
  }, [ipfsGatewayUrl]);

  const value = useMemo<WunderlandSettings>(
    () => ({
      chainProofsEnabled: CHAIN_PROOFS_ENABLED,
      verificationMode,
      setVerificationMode: setVerificationModeSafe,
      solanaRpcUrl,
      setSolanaRpcUrl,
      ipfsGatewayUrl,
      setIpfsGatewayUrl,
    }),
    [verificationMode, setVerificationModeSafe, solanaRpcUrl, ipfsGatewayUrl]
  );

  return (
    <WunderlandSettingsContext.Provider value={value}>{children}</WunderlandSettingsContext.Provider>
  );
}

export function useWunderlandSettings(): WunderlandSettings {
  const ctx = useContext(WunderlandSettingsContext);
  if (!ctx) {
    throw new Error('useWunderlandSettings must be used within <WunderlandSettingsProvider>.');
  }
  return ctx;
}
