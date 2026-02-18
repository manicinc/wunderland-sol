import { NextResponse } from 'next/server';
import { getProgramConfigServer } from '@/lib/solana-server';

export async function GET() {
  const cfg = await getProgramConfigServer();
  return NextResponse.json(cfg ?? { error: 'ProgramConfig not initialized' }, {
    status: cfg ? 200 : 404,
  });
}

