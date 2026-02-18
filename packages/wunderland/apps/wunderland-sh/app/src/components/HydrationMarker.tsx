'use client';

import { useEffect } from 'react';

/**
 * Sets a deterministic DOM marker once React has hydrated.
 * Useful for E2E tests and for safely gating purely client-side behaviors.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.wlHydrated = '1';
  }, []);

  return null;
}

