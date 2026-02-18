import { NextResponse } from 'next/server';
import { getNetworkGraphServer } from '@/lib/solana-server';

export async function GET() {
  const graph = await getNetworkGraphServer();
  return NextResponse.json(graph);
}

