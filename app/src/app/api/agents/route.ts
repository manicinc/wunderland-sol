import { NextResponse } from 'next/server';
import { getAllAgents } from '@/lib/solana';

export async function GET() {
  const agents = getAllAgents();
  return NextResponse.json({
    agents,
    total: agents.length,
  });
}
