import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, unauthorized } from '@/lib/api-auth';

export const runtime = 'nodejs';

type MetricType = 'llm' | 'tools' | 'channels' | 'behavior';
type TimeRange = '24h' | '7d' | '30d';

const RANGE_SQL: Record<TimeRange, string> = {
  '24h': "datetime('now', '-1 day')",
  '7d': "datetime('now', '-7 days')",
  '30d': "datetime('now', '-30 days')",
};

function isValidRange(r: string): r is TimeRange {
  return r === '24h' || r === '7d' || r === '30d';
}

function isValidType(t: string): t is MetricType {
  return t === 'llm' || t === 'tools' || t === 'channels' || t === 'behavior';
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ seedId: string }> }) {
  const user = await getAuthenticatedUser(req);
  if (!user) return unauthorized();

  const { seedId } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'llm';
  const range = url.searchParams.get('range') ?? '7d';

  if (!isValidType(type)) {
    return NextResponse.json({ error: 'Invalid type. Use: llm, tools, channels, behavior' }, { status: 400 });
  }
  if (!isValidRange(range)) {
    return NextResponse.json({ error: 'Invalid range. Use: 24h, 7d, 30d' }, { status: 400 });
  }

  // Note: In production, this would query the actual DB.
  // For now, return the schema structure with empty data.
  // The backend will populate these tables as agents run.

  const sinceSQL = RANGE_SQL[range];

  const response: Record<string, unknown> = { seedId, type, range };

  switch (type) {
    case 'llm':
      response.data = {
        usage: [],        // rows from agent_llm_usage
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCostUsd: 0,
        avgLatencyMs: 0,
        modelBreakdown: {},
        providerBreakdown: {},
      };
      break;
    case 'tools':
      response.data = {
        executions: [],   // rows from agent_tool_executions
        totalExecutions: 0,
        successRate: 0,
        avgDurationMs: 0,
        toolBreakdown: {},
      };
      break;
    case 'channels':
      response.data = {
        activity: [],     // rows from agent_channel_activity
        totalMessages: 0,
        avgResponseTimeMs: 0,
        platformBreakdown: {},
      };
      break;
    case 'behavior':
      response.data = {
        events: [],       // rows from agent_behavior_events
        moodHistory: [],
        trustHistory: [],
        safetyEvents: [],
        styleAdaptations: [],
      };
      break;
  }

  return NextResponse.json(response);
}
