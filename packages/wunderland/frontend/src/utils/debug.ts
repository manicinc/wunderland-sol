// File: frontend/src/utils/debug.ts
/**
 * Centralized debug logging utilities.
 * Allows enabling verbose logs by setting localStorage key `vca:debug-stt` to `1`.
 */

const sttDebugEnabled = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage?.getItem('vca:debug-stt') === '1';
  } catch {
    return false;
  }
})();

export const isSttDebugEnabled = sttDebugEnabled;

export const sttDebugLog = (...args: unknown[]): void => {
  if (sttDebugEnabled) {
    console.log(...args);
  }
};

export const createScopedSttLogger = (scope: string) => {
  return (...args: unknown[]): void => {
    if (sttDebugEnabled) {
      console.log(`[${scope}]`, ...args);
    }
  };
};

