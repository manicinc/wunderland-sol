/**
 * Google Calendar OAuth Callback Route
 *
 * Handles the OAuth callback from Google after user authorization.
 * Returns an HTML page that posts the auth code to the parent window.
 *
 * @module app/api/auth/google-calendar/callback/route
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // Generate HTML response that communicates with parent window
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Calendar Authorization</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f9fafb;
      color: #1f2937;
    }
    .container {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }
    .icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }
    p {
      color: #6b7280;
      margin: 0;
    }
    .error {
      color: #dc2626;
    }
  </style>
</head>
<body>
  <div class="container">
    ${
      error
        ? `
      <div class="icon">❌</div>
      <h1>Authorization Failed</h1>
      <p class="error">${errorDescription || error}</p>
      <p>You can close this window.</p>
    `
        : code
          ? `
      <div class="icon">✓</div>
      <h1>Authorization Successful</h1>
      <p>You can close this window.</p>
    `
          : `
      <div class="icon">⏳</div>
      <h1>Processing...</h1>
      <p>Please wait...</p>
    `
    }
  </div>
  <script>
    (function() {
      const code = ${JSON.stringify(code)};
      const error = ${JSON.stringify(error)};
      const errorDescription = ${JSON.stringify(errorDescription)};

      if (window.opener) {
        if (error) {
          window.opener.postMessage({
            type: 'GOOGLE_OAUTH_ERROR',
            error: errorDescription || error
          }, window.location.origin);
        } else if (code) {
          window.opener.postMessage({
            type: 'GOOGLE_OAUTH_SUCCESS',
            code: code
          }, window.location.origin);
        }
      }

      // Close window after short delay
      setTimeout(function() {
        window.close();
      }, 2000);
    })();
  </script>
</body>
</html>
`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
