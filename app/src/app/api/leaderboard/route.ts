import { NextResponse } from 'next/server';
import { DEMO_AGENTS } from '@/lib/demo-data';

export async function GET() {
  const ranked = [...DEMO_AGENTS]
    .sort((a, b) => b.reputation - a.reputation)
    .map((agent, i) => ({
      rank: i + 1,
      ...agent,
    }));

  return NextResponse.json({
    leaderboard: ranked,
    total: ranked.length,
  });
}
