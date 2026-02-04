import { NextResponse } from 'next/server';
import { getNetworkStats } from '@/lib/solana';

export async function GET() {
  return NextResponse.json(getNetworkStats());
}
