// File: backend/src/features/system/system.routes.ts
/**
 * @file system.routes.ts
 * @description Provides diagnostic routes for system-level status checks (LLM availability, etc.).
 */

import type { Request, Response } from 'express';
import { getLlmBootstrapStatus } from '../../core/llm/llm.status.js';
import { getAppDatabase } from '../../core/database/appDatabase.js';

export function getLlmStatus(req: Request, res: Response): void {
  try {
    const status = getLlmBootstrapStatus();
    const httpStatus = status.ready ? 200 : 503;

    if (httpStatus !== 200) {
      console.warn('[System] LLM status check not ready.', {
        code: status.code,
        message: status.message,
        providers: status.providers,
      });
    } else if (process.env.NODE_ENV !== 'production') {
      console.debug('[System] LLM status ready.', { timestamp: status.timestamp });
    }

    res.status(httpStatus).json({
      status: status.ready ? 'ready' : 'unavailable',
      ...status,
    });
  } catch (error: any) {
    console.error('[System] Failed to read LLM bootstrap status:', error);
    res.status(500).json({
      status: 'error',
      code: 'STATUS_READ_FAILED',
      message: 'Unable to read LLM bootstrap status.',
      error: error?.message ?? 'UNKNOWN_ERROR',
    });
  }
}

/**
 * Returns the active storage adapter and its capability flags.
 *
 * Response shape:
 * - status: 'ok' | 'degraded'
 * - kind: adapter identifier (e.g., 'postgres', 'better-sqlite3', 'sqljs', 'capacitor')
 * - capabilities: string[] of supported features (e.g., 'persistence')
 * - persistence: boolean convenience flag
 * - message?: diagnostics when in degraded mode
 */
export function getStorageStatus(req: Request, res: Response): void {
  try {
    const adapter = getAppDatabase();
    const capabilities = Array.from(adapter.capabilities.values());
    const persistence = adapter.capabilities.has('persistence');

    res.status(200).json({
      status: 'ok',
      kind: adapter.kind,
      capabilities,
      persistence,
    });
  } catch (error: any) {
    res.status(200).json({
      status: 'degraded',
      kind: 'unknown',
      capabilities: [],
      persistence: false,
      message: 'Storage adapter not initialised yet. Backend will fall back to in-memory if needed.',
    });
  }
}
