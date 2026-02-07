import { NextResponse } from 'next/server';
import { getAllAgentsServer } from '@/lib/solana-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  let agents = await getAllAgentsServer();

  if (owner) {
    agents = agents.filter((a) => a.owner === owner);
  }

  return NextResponse.json({
    agents,
    total: agents.length,
  });
}
