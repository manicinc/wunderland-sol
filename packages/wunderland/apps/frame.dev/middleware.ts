/**
 * Next.js Middleware for Domain-Specific Routing
 *
 * On quarry.space domain:
 * - /app/* → rewrites to /quarry/* (app pages)
 * - / → rewrites to /quarry/landing (homepage)
 * - /about, /faq, etc. → rewrites to /quarry/about, /quarry/faq (marketing pages)
 *
 * On frame.dev domain:
 * - All paths work as-is (no rewriting)
 */

import { NextRequest, NextResponse } from 'next/server'

// Marketing/info pages that stay at root on quarry.space (no /app/ prefix)
const MARKETING_PAGES = [
  'landing',
  'about',
  'faq',
  'privacy',
  'waitlist',
  'api',
  'api-docs',
  'api-playground',
  'architecture',
  'self-host',
  'changelog',
  'costs',
  'canvas-showcase',
]

// Check if hostname is quarry.space domain
function isQuarryDomain(hostname: string): boolean {
  return (
    hostname === 'quarry.space' ||
    hostname.endsWith('.quarry.space') ||
    hostname === 'quarry.dev' ||
    hostname.endsWith('.quarry.dev')
  )
}

export function middleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl

  // Only apply rewrites on quarry.space domain
  if (!isQuarryDomain(hostname)) {
    return NextResponse.next()
  }

  // Skip API routes, static files, and Next.js internals
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/static/') ||
    pathname.includes('.') // files with extensions
  ) {
    return NextResponse.next()
  }

  // Root path → /quarry/landing
  if (pathname === '/' || pathname === '') {
    const url = request.nextUrl.clone()
    url.pathname = '/quarry/landing'
    return NextResponse.rewrite(url)
  }

  // /app/* → /quarry/* (app pages)
  if (pathname.startsWith('/app/') || pathname === '/app') {
    const url = request.nextUrl.clone()
    url.pathname = pathname.replace(/^\/app/, '/quarry')
    return NextResponse.rewrite(url)
  }

  // Marketing pages at root → /quarry/page
  // e.g., /about → /quarry/about, /faq → /quarry/faq
  const firstSegment = pathname.split('/')[1]
  if (firstSegment && MARKETING_PAGES.includes(firstSegment)) {
    const url = request.nextUrl.clone()
    url.pathname = '/quarry' + pathname
    return NextResponse.rewrite(url)
  }

  // Document/strand paths: anything that looks like a document path
  // e.g., /some-document → /quarry/some-document
  // But skip if it's already a /quarry path
  if (!pathname.startsWith('/quarry') && !pathname.startsWith('/blog') && !pathname.startsWith('/docs')) {
    const url = request.nextUrl.clone()
    url.pathname = '/quarry' + pathname
    return NextResponse.rewrite(url)
  }

  return NextResponse.next()
}

export const config = {
  // Match all paths except static files
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)',
  ],
}
