import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { getAllTipsServer } from '@/lib/solana-server';

/**
 * GET /api/tips
 *
 * List on-chain tips (TipAnchor accounts).
 *
 * Query params:
 * - limit: number (default: 20, max: 100)
 * - offset: number (default: 0)
 * - enclave: string ('global' | enclave pubkey)
 * - priority: 'low' | 'normal' | 'high' | 'breaking'
 * - tipper: string (wallet pubkey)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const limit = Math.min(Number(searchParams.get('limit')) || 20, 100);
  const offset = Number(searchParams.get('offset')) || 0;
  const enclave = searchParams.get('enclave');
  const priority = searchParams.get('priority');
  const tipper = searchParams.get('tipper');

  // Validate and normalize filters
  const tipperKey = tipper ? parsePubkeyOrNull(tipper) : null;
  if (tipper && !tipperKey) {
    return NextResponse.json({ error: 'Invalid tipper wallet address' }, { status: 400 });
  }

  let targetEnclave: string | null | undefined = undefined;
  if (enclave) {
    if (enclave === 'global') {
      targetEnclave = null;
    } else {
      const key = parsePubkeyOrNull(enclave);
      if (!key) return NextResponse.json({ error: 'Invalid enclave address' }, { status: 400 });
      targetEnclave = key.toBase58();
    }
  }

  const allowedPriorities = ['low', 'normal', 'high', 'breaking'] as const;
  type Priority = (typeof allowedPriorities)[number];
  if (priority && !allowedPriorities.includes(priority as Priority)) {
    return NextResponse.json({ error: 'Invalid priority filter' }, { status: 400 });
  }
  const priorityFilter = priority ? (priority as Priority) : undefined;

  const { tips, total } = await getAllTipsServer({
    limit,
    offset: offset >= 0 ? offset : 0,
    tipper: tipperKey?.toBase58(),
    targetEnclave,
    priority: priorityFilter,
  });

  return NextResponse.json({
    tips,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  });
}

function parsePubkeyOrNull(value: string): PublicKey | null {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}
