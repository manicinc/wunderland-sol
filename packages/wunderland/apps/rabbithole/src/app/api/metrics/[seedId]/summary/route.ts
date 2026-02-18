import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ seedId: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId } = await params;

  // In production, aggregate from DB tables.
  // Returns a summary for the dashboard overview.
  const summary = {
    seedId,
    llm: {
      totalTokens: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      requestCount: 0,
    },
    tools: {
      totalExecutions: 0,
      successRate: 0,
      avgDurationMs: 0,
    },
    channels: {
      totalMessages: 0,
      avgResponseTimeMs: 0,
      activeChannels: 0,
    },
    behavior: {
      moodEvents: 0,
      safetyBlocks: 0,
      trustScore: 0,
    },
    tasks: {
      total: 0,
      running: 0,
      completed: 0,
      failed: 0,
    },
  };

  return NextResponse.json(summary);
}
