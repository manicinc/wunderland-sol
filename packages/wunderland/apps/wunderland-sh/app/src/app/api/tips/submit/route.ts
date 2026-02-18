import { NextRequest, NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

// System program ID (for global tips)
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

// Tip amount tiers (in lamports)
const TIP_TIERS = {
  low: 15_000_000, // 0.015 SOL
  normal: 25_000_000, // 0.025 SOL
  high: 35_000_000, // 0.035 SOL
  breaking: 45_000_000, // 0.045 SOL
};

/**
 * POST /api/tips/submit
 *
 * Validate tip submission and return transaction parameters.
 * The client will use these to build and sign the transaction.
 *
 * Request body:
 * - contentHashHex: string (hex, 64 chars)
 * - amount: number (lamports)
 * - sourceType: 'text' | 'url'
 * - targetEnclave?: string (enclave PDA, or omit for global)
 * - tipper: string (wallet pubkey)
 * - tipNonce?: string (u64, base-10) (optional; defaults to Date.now())
 *
 * Response:
 * - valid: boolean
 * - txParams?: {
 *     contentHash: number[] (32 bytes)
 *     amount: number
 *     sourceType: number (0=text, 1=url)
 *     tipNonce: string
 *     targetEnclave: string (pubkey)
 *   }
 * - error?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, sourceType, targetEnclave, tipper } = body;
    const contentHashHex = (body?.contentHashHex || body?.contentHash || '').toString();
    const tipNonceRaw = body?.tipNonce?.toString?.() ?? '';

    // Validate content hash
    if (!contentHashHex || !/^[a-f0-9]{64}$/i.test(contentHashHex)) {
      return NextResponse.json(
        { valid: false, error: 'Invalid content hash (must be 64 hex chars)' },
        { status: 400 }
      );
    }

    // Validate amount
    if (typeof amount !== 'number' || amount < TIP_TIERS.low) {
      return NextResponse.json(
        { valid: false, error: `Minimum tip amount is ${TIP_TIERS.low} lamports (0.015 SOL)` },
        { status: 400 }
      );
    }

    // Validate source type
    if (!['text', 'url'].includes(sourceType)) {
      return NextResponse.json(
        { valid: false, error: 'Source type must be "text" or "url"' },
        { status: 400 }
      );
    }

    // Validate tipper pubkey
    try {
      new PublicKey(tipper);
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid tipper wallet address' },
        { status: 400 }
      );
    }

    // Validate target enclave if provided
    let targetEnclavePubkey = new PublicKey(SYSTEM_PROGRAM_ID);
    if (targetEnclave) {
      try {
        targetEnclavePubkey = new PublicKey(targetEnclave);
      } catch {
        return NextResponse.json(
          { valid: false, error: 'Invalid target enclave address' },
          { status: 400 }
        );
      }
    }

    // Generate tip nonce (per-wallet incrementing)
    // Must be unique per tipper; u64 LE bytes are used in PDA seeds.
    let tipNonce: bigint;
    try {
      tipNonce = tipNonceRaw ? BigInt(tipNonceRaw) : BigInt(Date.now());
    } catch {
      return NextResponse.json(
        { valid: false, error: 'Invalid tipNonce (expected base-10 u64 string)' },
        { status: 400 }
      );
    }
    if (tipNonce < 0n || tipNonce > (1n << 64n) - 1n) {
      return NextResponse.json(
        { valid: false, error: 'tipNonce out of range (must fit in u64)' },
        { status: 400 }
      );
    }

    // Convert content hash to bytes array
    const contentHashBytes = Array.from(Buffer.from(contentHashHex, 'hex'));

    // Derive priority from amount
    let priority: 'low' | 'normal' | 'high' | 'breaking' = 'low';
    if (amount >= TIP_TIERS.breaking) {
      priority = 'breaking';
    } else if (amount >= TIP_TIERS.high) {
      priority = 'high';
    } else if (amount >= TIP_TIERS.normal) {
      priority = 'normal';
    }

    return NextResponse.json({
      valid: true,
      txParams: {
        contentHash: contentHashBytes,
        amount,
        sourceType: sourceType === 'url' ? 1 : 0,
        tipNonce: tipNonce.toString(),
        targetEnclave: targetEnclavePubkey.toBase58(),
        priority,
      },
      estimatedFees: {
        accountRent: 2_000_000, // ~0.002 SOL for account creation
        transactionFee: 5_000, // ~0.000005 SOL
        total: amount + 2_005_000,
      },
    });
  } catch (err) {
    console.error('[/api/tips/submit] Error:', err);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tips/submit
 *
 * Get tip pricing tiers and limits.
 */
export async function GET() {
  return NextResponse.json({
    tiers: {
      low: {
        amount: TIP_TIERS.low,
        sol: TIP_TIERS.low / 1e9,
        priority: 'low',
        description: 'Standard visibility',
      },
      normal: {
        amount: TIP_TIERS.normal,
        sol: TIP_TIERS.normal / 1e9,
        priority: 'normal',
        description: 'Enhanced visibility',
      },
      high: {
        amount: TIP_TIERS.high,
        sol: TIP_TIERS.high / 1e9,
        priority: 'high',
        description: 'Priority placement',
      },
      breaking: {
        amount: TIP_TIERS.breaking,
        sol: TIP_TIERS.breaking / 1e9,
        priority: 'breaking',
        description: 'Breaking news priority',
      },
    },
    limits: {
      maxPerMinute: 3,
      maxPerHour: 20,
      maxContentSize: 1_000_000,
    },
    fees: {
      accountRent: 2_000_000,
      transactionFee: 5_000,
    },
  });
}
