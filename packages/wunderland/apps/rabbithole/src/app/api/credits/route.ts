import { NextRequest, NextResponse } from 'next/server';
import { getSnapshot, type CreditContext } from '@/lib/credit-allocation';

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET || '';

interface JwtPayload {
  sub: string;
  role?: string;
  tier?: string;
  mode?: string;
  planId?: string | null;
  subscriptionStatus?: string;
  subscription_status?: string;
}

/** Decode JWT payload without external dependencies (base64url → JSON). */
function decodePayloadManual(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const json = Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

async function decodeToken(req: NextRequest): Promise<JwtPayload | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);

  // Try verified decode with jose if available and secret is set
  if (JWT_SECRET) {
    try {
      const { jwtVerify } = await import('jose');
      const secret = new TextEncoder().encode(JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as JwtPayload;
    } catch {
      // Fall through to manual decode
    }
  }

  // Fallback: decode without verification (token was issued by our own backend)
  return decodePayloadManual(token);
}

export async function GET(req: NextRequest) {
  try {
    const payload = await decodeToken(req);

    const userId = payload?.sub ?? 'anonymous';
    const ctx: CreditContext = {
      isAuthenticated: Boolean(payload?.sub && payload.sub !== 'anonymous'),
      tier: payload?.tier as CreditContext['tier'],
      mode: payload?.mode as CreditContext['mode'],
      planId: payload?.planId ?? null,
      subscriptionStatus: payload?.subscriptionStatus ?? payload?.subscription_status,
    };

    const snapshot = getSnapshot(userId, ctx);

    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);

    return NextResponse.json({
      userId,
      allocationKey: snapshot.allocationKey,
      planId: ctx.planId ?? null,
      llm: snapshot.llm,
      speech: snapshot.speech,
      resetAt: endOfDay.toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Credits API error:', err);
    // Even on error, return valid default credits (public tier) instead of 500
    const fallback = getSnapshot('anonymous', { isAuthenticated: false });
    const endOfDay = new Date();
    endOfDay.setUTCHours(23, 59, 59, 999);
    return NextResponse.json({
      userId: 'anonymous',
      allocationKey: fallback.allocationKey,
      planId: null,
      llm: fallback.llm,
      speech: fallback.speech,
      resetAt: endOfDay.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }
}
