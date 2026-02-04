import { NextResponse } from 'next/server';
import { getLeaderboard } from '@/lib/solana';

export async function GET() {
  const leaderboard = getLeaderboard();
  return NextResponse.json({
    leaderboard,
    total: leaderboard.length,
  });
}
