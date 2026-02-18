import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale } from './i18n';

// Skip paths that should bypass locale handling
const PUBLIC_FILE = /^(\/(_next|favicon\.ico|manifest\.json|assets|robots\.txt|sitemap\.xml))/i;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ignore public files and Next.js internals
  if (PUBLIC_FILE.test(pathname)) {
    return;
  }

  // Check if the path already starts with a supported locale
  const pathnameSegments = pathname.split('/').filter(Boolean);
  const firstSegment = pathnameSegments[0];

  if (locales.includes(firstSegment as any)) {
    return;
  }

  // Rewrite to include default locale prefix
  const localePrefixed = `/${defaultLocale}${pathname.startsWith('/') ? '' : '/'}${pathname}`;
  return NextResponse.redirect(new URL(localePrefixed, request.url));
}

export const config = {
  matcher: [
    // Run on all paths except next/internal files and public files handled above
    '/((?!_next|favicon.ico|manifest.json|assets|robots.txt|sitemap.xml).*)',
  ],
};

