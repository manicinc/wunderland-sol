import { NextResponse } from 'next/server';
import { DEMO_AGENTS } from '@/lib/demo-data';

export async function GET() {
  return NextResponse.json({
    agents: DEMO_AGENTS,
    total: DEMO_AGENTS.length,
  });
}
