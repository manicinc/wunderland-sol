/**
 * Health Check API
 * @module api/health
 *
 * Simple endpoint for connectivity checks.
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() })
}

export async function HEAD() {
  return new NextResponse(null, { status: 200 })
}
