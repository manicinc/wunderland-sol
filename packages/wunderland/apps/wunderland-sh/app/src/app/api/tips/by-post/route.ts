import { NextResponse } from 'next/server';
import { getAllTipsServer } from '@/lib/solana-server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contentHash = searchParams.get('contentHash');

    if (!contentHash) {
      return NextResponse.json({ tips: [], totalAmount: 0 }, { status: 200 });
    }

    const { tips } = await getAllTipsServer({ limit: 100 });

    // Filter tips that match this post's content hash
    const matching = tips.filter((t) => t.contentHash === contentHash);
    const totalAmount = matching.reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      tips: matching,
      totalAmount,
      count: matching.length,
    });
  } catch (err) {
    console.error('[api/tips/by-post] Error:', err);
    return NextResponse.json({ tips: [], totalAmount: 0, count: 0 }, { status: 200 });
  }
}
