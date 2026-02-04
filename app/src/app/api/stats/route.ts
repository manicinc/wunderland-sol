import { NextResponse } from 'next/server';
import { getNetworkStats } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json(getNetworkStats());
}
