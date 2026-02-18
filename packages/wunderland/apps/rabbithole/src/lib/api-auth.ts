import { NextRequest, NextResponse } from 'next/server';

const API_BASE = (
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:3001/api'
).replace(/\/+$/, '');

export interface AuthenticatedUser {
  id: string;
  email: string;
}

/**
 * Validate a JWT bearer token by calling the backend /auth endpoint.
 * Returns the authenticated user or null if invalid.
 */
export async function getAuthenticatedUser(
  req: NextRequest
): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  try {
    const res = await fetch(`${API_BASE}/auth`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return {
      id: body.user?.id ?? body.id,
      email: body.user?.email ?? body.email,
    };
  } catch {
    return null;
  }
}

/**
 * Return a 401 JSON response.
 */
export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 });
}
