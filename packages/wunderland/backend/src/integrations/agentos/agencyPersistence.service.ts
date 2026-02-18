/**
 * @fileoverview Agency Persistence Service
 * @description Persists agency execution state, seat progress, and results to the database
 */

import { getAppDatabase } from '../../core/database/appDatabase.js';
import type { AgencyExecutionResult } from './MultiGMIAgencyExecutor.js';
import type { EmergentTask, EmergentRole } from './EmergentAgencyCoordinator.js';

export interface AgencyExecutionRecord {
  agencyId: string;
  userId: string;
  conversationId: string;
  goal: string;
  workflowDefinitionId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  totalCostUsd?: number;
  totalTokens?: number;
  outputFormat?: string;
  consolidatedOutput?: string;
  formattedOutput?: string;
  emergentMetadata?: string;
  error?: string;
}

export interface AgencySeatRecord {
  id: string;
  agencyId: string;
  roleId: string;
  personaId: string;
  gmiInstanceId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: number;
  completedAt?: number;
  output?: string;
  error?: string;
  usageTokens?: number;
  usageCostUsd?: number;
  retryCount: number;
  metadata?: string;
}

/**
 * Creates a new agency execution record in the database
 */
export async function createAgencyExecution(params: {
  agencyId: string;
  userId: string;
  conversationId: string;
  goal: string;
  workflowDefinitionId?: string;
}): Promise<void> {
  const db = getAppDatabase();
  await db.run(
    `INSERT INTO agency_executions (
      agency_id, user_id, conversation_id, goal, workflow_definition_id,
      status, started_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      params.agencyId,
      params.userId,
      params.conversationId,
      params.goal,
      params.workflowDefinitionId ?? null,
      'running',
      Date.now(),
    ]
  );
}

/**
 * Updates an agency execution with final results
 */
export async function updateAgencyExecution(result: AgencyExecutionResult): Promise<void> {
  const db = getAppDatabase();
  await db.run(
    `UPDATE agency_executions
    SET status = ?,
        completed_at = ?,
        duration_ms = ?,
        total_cost_usd = ?,
        total_tokens = ?,
        output_format = ?,
        consolidated_output = ?,
        formatted_output = ?,
        emergent_metadata = ?
    WHERE agency_id = ?`,
    [
      'completed',
      Date.now(),
      result.durationMs,
      result.totalUsage.totalCostUSD ?? 0,
      result.totalUsage.totalTokens,
      result.formattedOutput?.format ?? 'markdown',
      result.consolidatedOutput,
      result.formattedOutput?.content ?? null,
      result.emergentMetadata ? JSON.stringify(result.emergentMetadata) : null,
      result.agencyId,
    ]
  );
}

/**
 * Marks an agency execution as failed
 */
export async function markAgencyExecutionFailed(agencyId: string, error: string): Promise<void> {
  const db = getAppDatabase();
  await db.run(
    `UPDATE agency_executions
    SET status = ?, completed_at = ?, error = ?
    WHERE agency_id = ?`,
    ['failed', Date.now(), error, agencyId]
  );
}

/**
 * Creates a seat record for tracking individual role execution
 */
export async function createAgencySeat(params: {
  agencyId: string;
  roleId: string;
  personaId: string;
}): Promise<string> {
  const db = getAppDatabase();
  const seatId = `seat_${params.agencyId}_${params.roleId}`;
  
  await db.run(
    `INSERT INTO agency_seats (
      id, agency_id, role_id, persona_id, status, retry_count
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [seatId, params.agencyId, params.roleId, params.personaId, 'pending', 0]
  );
  
  return seatId;
}

/**
 * Updates a seat's status and metadata
 */
export async function updateAgencySeat(params: {
  seatId: string;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  gmiInstanceId?: string;
  startedAt?: number;
  completedAt?: number;
  output?: string;
  error?: string;
  usageTokens?: number;
  usageCostUsd?: number;
  retryCount?: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = getAppDatabase();
  
  const updates: string[] = [];
  const values: any[] = [];

  if (params.status) {
    updates.push('status = ?');
    values.push(params.status);
  }
  if (params.gmiInstanceId) {
    updates.push('gmi_instance_id = ?');
    values.push(params.gmiInstanceId);
  }
  if (params.startedAt) {
    updates.push('started_at = ?');
    values.push(params.startedAt);
  }
  if (params.completedAt) {
    updates.push('completed_at = ?');
    values.push(params.completedAt);
  }
  if (params.output !== undefined) {
    updates.push('output = ?');
    values.push(params.output);
  }
  if (params.error !== undefined) {
    updates.push('error = ?');
    values.push(params.error);
  }
  if (params.usageTokens !== undefined) {
    updates.push('usage_tokens = ?');
    values.push(params.usageTokens);
  }
  if (params.usageCostUsd !== undefined) {
    updates.push('usage_cost_usd = ?');
    values.push(params.usageCostUsd);
  }
  if (params.retryCount !== undefined) {
    updates.push('retry_count = ?');
    values.push(params.retryCount);
  }
  if (params.metadata) {
    updates.push('metadata = ?');
    values.push(JSON.stringify(params.metadata));
  }

  if (updates.length === 0) {
    return;
  }

  values.push(params.seatId);
  await db.run(
    `UPDATE agency_seats
    SET ${updates.join(', ')}
    WHERE id = ?`,
    values
  );
}

/**
 * Retrieves an agency execution by ID
 */
export async function getAgencyExecution(agencyId: string): Promise<AgencyExecutionRecord | null> {
  const db = getAppDatabase();
  const row = await db.get('SELECT * FROM agency_executions WHERE agency_id = ?', [agencyId]);
  
  if (!row) {
    return null;
  }

  return row as AgencyExecutionRecord;
}

/**
 * Lists agency executions for a user
 */
export async function listAgencyExecutions(userId: string, limit = 50): Promise<AgencyExecutionRecord[]> {
  const db = getAppDatabase();
  const rows = await db.all(
    `SELECT * FROM agency_executions
    WHERE user_id = ?
    ORDER BY started_at DESC
    LIMIT ?`,
    [userId, limit]
  );
  
  return rows as AgencyExecutionRecord[];
}

/**
 * Lists seats for an agency execution
 */
export async function listAgencySeats(agencyId: string): Promise<AgencySeatRecord[]> {
  const db = getAppDatabase();
  const rows = await db.all('SELECT * FROM agency_seats WHERE agency_id = ? ORDER BY started_at ASC', [agencyId]);
  return rows as AgencySeatRecord[];
}

