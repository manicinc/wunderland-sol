/**
 * Google OAuth Callback Handler
 * @module app/api/auth/google/callback
 *
 * Handles the OAuth 2.0 redirect from Google's authorization server.
 * Sends the authorization code to the opener window via postMessage.
 */

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // Build the HTML response that will communicate with the opener window
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Google OAuth Callback</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .error {
      color: #e74c3c;
    }
  </style>
</head>
<body>
  <div class="container">
    ${
      error
        ? `
      <div class="error">
        <h2>Authentication Failed</h2>
        <p>${error === 'access_denied' ? 'You denied access to your Google account.' : 'An error occurred during authentication.'}</p>
        <p>This window will close automatically.</p>
      </div>
    `
        : `
      <div class="spinner"></div>
      <p>Completing authentication...</p>
    `
    }
  </div>

  <script>
    (function() {
      // Check if we have an opener window
      if (!window.opener) {
        console.error('No opener window found');
        setTimeout(() => window.close(), 3000);
        return;
      }

      const error = ${JSON.stringify(error)};
      const code = ${JSON.stringify(code)};
      const state = ${JSON.stringify(state)};

      // Send message to opener window
      if (error) {
        window.opener.postMessage(
          {
            type: 'google-oauth-error',
            error: error,
            errorDescription: '${searchParams.get('error_description') || 'Authentication failed'}'
          },
          window.location.origin
        );
      } else if (code) {
        window.opener.postMessage(
          {
            type: 'google-oauth-success',
            code: code,
            state: state
          },
          window.location.origin
        );
      } else {
        window.opener.postMessage(
          {
            type: 'google-oauth-error',
            error: 'missing_code',
            errorDescription: 'No authorization code received'
          },
          window.location.origin
        );
      }

      // Close the popup after a short delay
      setTimeout(() => {
        window.close();
      }, 500);
    })();
  </script>
</body>
</html>
  `

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html',
    },
  })
}
