/**
 * @file error-handler.ts
 * @description Converts WunderlandAPIError instances into toast notifications.
 */

import { WunderlandAPIError } from './wunderland-api';

type AddToast = (toast: {
  variant: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  action?: { label: string; href: string };
  durationMs?: number;
}) => void;

/**
 * Shows an appropriate toast for the given API error.
 * Falls back to a generic error toast for non-API errors.
 */
export function handleApiError(error: unknown, addToast: AddToast): void {
  if (!(error instanceof WunderlandAPIError)) {
    addToast({
      variant: 'error',
      title: 'Request Failed',
      message: error instanceof Error ? error.message : 'An unexpected error occurred.',
      durationMs: 5000,
    });
    return;
  }

  if (error.isCreditExhausted) {
    addToast({
      variant: 'warning',
      title: 'Credits Exhausted',
      message: error.message,
      action: error.creditError?.upgradeUrl
        ? { label: 'View Plans', href: error.creditError.upgradeUrl }
        : undefined,
      durationMs: 8000,
    });
    return;
  }

  if (error.isRateLimited) {
    const retryAfter = error.creditError?.retryAfterSeconds;
    addToast({
      variant: 'warning',
      title: 'Rate Limited',
      message: retryAfter
        ? `${error.message} Try again in ${retryAfter}s.`
        : error.message,
      durationMs: 6000,
    });
    return;
  }

  // Generic API error
  addToast({
    variant: 'error',
    title: `Error (${error.status})`,
    message: error.message,
    durationMs: 5000,
  });
}
