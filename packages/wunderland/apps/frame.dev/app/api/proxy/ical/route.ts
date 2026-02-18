/**
 * iCal Proxy Route
 *
 * Proxies iCal feed requests to bypass CORS restrictions.
 * Only allows fetching .ics calendar files.
 *
 * @module app/api/proxy/ical/route
 */

import { NextRequest, NextResponse } from 'next/server'

// Allowed URL patterns for security
const ALLOWED_HOSTS = [
  'calendar.google.com',
  'www.google.com',
  'outlook.office365.com',
  'outlook.live.com',
  'caldav.icloud.com',
  'p.datadoghq.com', // iCloud public calendars
  'ics.calendarlabs.com',
]

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = requestCounts.get(ip)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + RATE_WINDOW })
    return false
  }

  if (entry.count >= RATE_LIMIT) {
    return true
  }

  entry.count++
  return false
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    )
  }

  // Validate URL
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return NextResponse.json(
      { error: 'Invalid URL' },
      { status: 400 }
    )
  }

  // Check protocol
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: 'Only HTTP(S) URLs are allowed' },
      { status: 400 }
    )
  }

  // Check if host is allowed (or allow all for self-hosted)
  const isAllowedHost = ALLOWED_HOSTS.some(
    (host) => parsedUrl.hostname === host || parsedUrl.hostname.endsWith(`.${host}`)
  )

  // For security, we could enforce allowed hosts in production
  // For now, allow any host but log for monitoring
  if (!isAllowedHost) {
    console.log(`[iCalProxy] Fetching from non-standard host: ${parsedUrl.hostname}`)
  }

  // Rate limiting
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before making more requests.' },
      { status: 429 }
    )
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/calendar, application/calendar+json, */*',
        'User-Agent': 'Quarry Calendar Sync/1.0',
      },
      // Timeout after 30 seconds
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Calendar server returned ${response.status}` },
        { status: response.status }
      )
    }

    const contentType = response.headers.get('content-type') || ''

    // Validate it looks like an iCal file
    if (
      !contentType.includes('text/calendar') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/octet-stream')
    ) {
      // Still allow it, but log
      console.log(`[iCalProxy] Unexpected content-type: ${contentType}`)
    }

    const content = await response.text()

    // Basic validation that it's iCal content
    if (!content.includes('BEGIN:VCALENDAR')) {
      return NextResponse.json(
        { error: 'Response does not appear to be a valid iCalendar file' },
        { status: 400 }
      )
    }

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout' },
        { status: 504 }
      )
    }

    console.error('[iCalProxy] Fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 502 }
    )
  }
}



