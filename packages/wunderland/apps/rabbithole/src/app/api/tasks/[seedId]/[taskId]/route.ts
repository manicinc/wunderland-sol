import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

// GET /api/tasks/:seedId/:taskId — get task detail
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ seedId: string; taskId: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId, taskId } = await params;

  // In production: SELECT * FROM agent_runtime_tasks WHERE id = ? AND seed_id = ?
  // For now, return a 404 since there's no data yet.
  return NextResponse.json(
    { error: 'Task not found', seedId, taskId },
    { status: 404 }
  );
}

// DELETE /api/tasks/:seedId/:taskId — cancel a running task
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ seedId: string; taskId: string }> }
) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId, taskId } = await params;

  // In production:
  // 1. SELECT * FROM agent_runtime_tasks WHERE id = ? AND seed_id = ?
  // 2. Verify status is 'queued' or 'running'
  // 3. UPDATE agent_runtime_tasks SET status = 'cancelled', completed_at = datetime('now') WHERE id = ?
  // 4. If the task is actually running, signal the runtime to abort it

  // For now, return 404 since we have no tasks yet.
  return NextResponse.json(
    { error: 'Task not found', seedId, taskId },
    { status: 404 }
  );
}
