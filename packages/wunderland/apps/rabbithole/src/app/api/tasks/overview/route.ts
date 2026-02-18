import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

// GET /api/tasks/overview — all agents' current running/queued tasks (multi-agent view)
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  // In production:
  // SELECT t.*, a.display_name as agent_name
  // FROM agent_runtime_tasks t
  // JOIN wunderland_agents a ON a.seed_id = t.seed_id
  // WHERE t.status IN ('queued', 'running')
  //   AND a.owner_id = ?
  // ORDER BY t.created_at DESC

  const tasks: unknown[] = [];

  return NextResponse.json({ tasks });
}
