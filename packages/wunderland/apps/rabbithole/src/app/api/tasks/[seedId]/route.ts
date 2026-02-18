import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'all';
type TaskType = 'llm_inference' | 'tool_execution' | 'workflow' | 'cron_run';

function isValidStatus(s: string): s is TaskStatus {
  return ['queued', 'running', 'completed', 'failed', 'cancelled', 'all'].includes(s);
}

// GET /api/tasks/:seedId — list tasks for an agent
export async function GET(req: NextRequest, { params }: { params: Promise<{ seedId: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId } = await params;
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'all';
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10) || 50, 200);

  if (!isValidStatus(status)) {
    return NextResponse.json({ error: 'Invalid status. Use: queued, running, completed, failed, cancelled, all' }, { status: 400 });
  }

  // In production, query agent_runtime_tasks table.
  // For now return empty list — the runtime engine will populate tasks.
  const tasks: unknown[] = [];

  return NextResponse.json({ seedId, status, limit, tasks });
}

// POST /api/tasks/:seedId — create a new task (used by runtime engine)
export async function POST(req: NextRequest, { params }: { params: Promise<{ seedId: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId } = await params;

  let body: { taskType?: TaskType; title?: string; description?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.taskType || !body.title) {
    return NextResponse.json({ error: 'taskType and title are required' }, { status: 400 });
  }

  // One-agent-one-task enforcement:
  // In production, check if agent already has a running task.
  // SELECT COUNT(*) FROM agent_runtime_tasks WHERE seed_id = ? AND status = 'running'
  // If count > 0, reject with 409.
  const existingRunningCount = 0; // placeholder — query DB in production
  if (existingRunningCount > 0) {
    return NextResponse.json(
      { error: 'Agent is already running a task. Cancel or wait for completion.' },
      { status: 409 }
    );
  }

  const task = {
    id: randomUUID(),
    seedId,
    taskType: body.taskType,
    status: 'queued' as const,
    title: body.title,
    description: body.description ?? null,
    progress: 0,
    resultSummary: null,
    errorMessage: null,
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  // In production: INSERT INTO agent_runtime_tasks

  return NextResponse.json({ task }, { status: 201 });
}
