'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

/**
 * Redirect to login if unauthenticated.
 * Returns true when the guard has confirmed access.
 */
export function useRequireAuth(redirectTo = '/login'): boolean {
  const { isAuthenticated, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      const current = typeof window !== 'undefined' ? window.location.pathname : '';
      const target = current ? `${redirectTo}?next=${encodeURIComponent(current)}` : redirectTo;
      router.replace(target);
    }
  }, [ready, isAuthenticated, router, redirectTo]);

  return ready && isAuthenticated;
}

/**
 * Redirect to login if unauthenticated, or to pricing if unpaid.
 * Returns true when the guard has confirmed access.
 */
export function useRequirePaid(): boolean {
  const { isAuthenticated, isPaid, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      const current = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`/login?next=${encodeURIComponent(current)}`);
    } else if (!isPaid) {
      router.replace('/pricing');
    }
  }, [ready, isAuthenticated, isPaid, router]);

  return ready && isAuthenticated && isPaid;
}

/**
 * Soft paywall — allows free users to browse with demo data.
 * Only redirects unauthenticated users to login.
 * Returns { ready, isPreviewing } so pages can show demo data with upgrade CTAs.
 */
export function useSoftPaywall(): {
  ready: boolean;
  isPreviewing: boolean;
  isAuthenticated: boolean;
  isPaid: boolean;
} {
  const { isAuthenticated, isPaid, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !isAuthenticated) {
      const current = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`/login?next=${encodeURIComponent(current)}`);
    }
  }, [ready, isAuthenticated, router]);

  return {
    ready: ready && isAuthenticated,
    isPreviewing: ready && isAuthenticated && !isPaid,
    isAuthenticated,
    isPaid,
  };
}

/**
 * Redirect to login if unauthenticated, or home if not a VA admin.
 * Returns true when the guard has confirmed VA admin access.
 */
export function useRequireVaAdmin(): boolean {
  const { isAuthenticated, isVaAdmin, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      const current = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`/login?next=${encodeURIComponent(current)}`);
    } else if (!isVaAdmin) {
      router.replace('/');
    }
  }, [ready, isAuthenticated, isVaAdmin, router]);

  return ready && isAuthenticated && isVaAdmin;
}

/**
 * Redirect to login if unauthenticated, or to pricing upgrade if not Pro tier.
 * Returns true when the guard has confirmed Pro-tier access.
 */
export function useRequireProTier(): boolean {
  const { isAuthenticated, isPaid, isVaAdmin, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      const current = typeof window !== 'undefined' ? window.location.pathname : '';
      router.replace(`/login?next=${encodeURIComponent(current)}`);
    } else if (!isPaid && !isVaAdmin) {
      router.replace('/pricing?upgrade=support');
    }
  }, [ready, isAuthenticated, isPaid, isVaAdmin, router]);

  return ready && isAuthenticated && (isPaid || isVaAdmin);
}
