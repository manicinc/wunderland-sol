# Authentication Guide

Secure access to Frame.dev APIs.

> **🚧 Work in Progress**
> 
> The Frame.dev API authentication system is currently under development. This documentation describes planned authentication methods and is subject to change.

## Overview

Frame.dev supports multiple authentication methods:

1. **API Keys** - Simple tokens for server-side applications
2. **OAuth 2.0** - Standard flow for user authorization
3. **JWT Tokens** - For self-hosted deployments
4. **Session Tokens** - For browser-based applications

## API Key Authentication

### When to Use

- Server-side applications
- CLI tools
- Automated scripts
- Internal services

### Getting API Keys

Via Dashboard:
1. Log in to [frame.dev](https://frame.dev)
2. Navigate to Dashboard → API Keys
3. Click "Create New Key"
4. Set permissions and expiry
5. Copy the key (shown only once)

Via CLI:
```bash
# Install CLI
npm install -g @framersai/cli

# Login
frame auth login

# Create API key
frame api-keys create \
  --name "Production API" \
  --permissions "read:all,write:strands" \
  --expires "2025-12-31"
```

### Using API Keys

HTTP Header:
```http
GET /v1/vaults
Authorization: Bearer frm_live_1234567890abcdef
```

cURL:
```bash
curl -X GET https://api.frame.dev/v1/vaults \
  -H "Authorization: Bearer frm_live_1234567890abcdef"
```

SDK:
```typescript
import { FrameClient } from '@framersai/sdk';

const client = new FrameClient({
  apiKey: process.env.FRAME_API_KEY
});
```

### API Key Types

| Prefix | Type | Usage |
|--------|------|-------|
| `frm_live_` | Production | Production environments |
| `frm_test_` | Test | Testing and development |
| `frm_restricted_` | Restricted | Limited permissions |

### Key Rotation

```typescript
const newKey = await client.apiKeys.rotate('key_id', {
  expiresIn: '90d',
  maintainPermissions: true
});

process.env.FRAME_API_KEY = newKey.secret;
```

## OAuth 2.0 Authentication

### When to Use

- User-facing applications
- Third-party integrations
- Mobile/desktop apps
- Browser extensions

### OAuth Flow

```
Client                                Frame.dev
  │                                       │
  │  1. Authorization Request             │
  │─────────────────────────────────────>│
  │                                       │
  │  2. User Authorization                │
  │<─────────────────────────────────────│
  │                                       │
  │  3. Authorization Code                │
  │<─────────────────────────────────────│
  │                                       │
  │  4. Exchange Code for Token           │
  │─────────────────────────────────────>│
  │                                       │
  │  5. Access Token                      │
  │<─────────────────────────────────────│
```

### Implementation

1. Register Application:
```http
POST /v1/oauth/applications
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "name": "My App",
  "redirectUris": [
    "http://localhost:3000/callback",
    "https://myapp.com/callback"
  ],
  "scopes": ["read:vaults", "write:strands"]
}
```

2. Authorization Request:
```typescript
const authUrl = new URL('https://frame.dev/oauth/authorize');
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('scope', 'read:vaults write:strands');
authUrl.searchParams.append('state', generateState());

window.location.href = authUrl.toString();
```

3. Handle Callback:
```typescript
app.get('/callback', async (req, res) => {
  const { code, state } = req.query;
  
  if (state !== savedState) {
    return res.status(400).send('Invalid state');
  }
  
  const response = await fetch('https://api.frame.dev/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI
    })
  });
  
  const { access_token, refresh_token } = await response.json();
  await saveTokens(access_token, refresh_token);
});
```

4. Use Access Token:
```typescript
const client = new FrameClient({
  accessToken: access_token
});

// Or with HTTP
fetch('https://api.frame.dev/v1/vaults', {
  headers: {
    'Authorization': `Bearer ${access_token}`
  }
});
```

### Token Refresh

```typescript
async function refreshAccessToken(refreshToken: string) {
  const response = await fetch('https://api.frame.dev/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    })
  });
  
  return response.json();
}
```

### Scopes

| Scope | Description |
|-------|-------------|
| `read:vaults` | Read vault information |
| `write:vaults` | Create and modify vaults |
| `read:strands` | Read strands |
| `write:strands` | Create and modify strands |
| `read:profile` | Read user profile |
| `write:profile` | Modify user profile |
| `admin` | Full administrative access |

## JWT Authentication

### When to Use

- Self-hosted deployments
- Custom authentication systems
- Service-to-service communication
- Microservices architecture

### JWT Structure

Header:
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id"
}
```

Payload:
```json
{
  "sub": "user-id",
  "iss": "https://your-auth-server.com",
  "aud": "https://api.frame.dev",
  "exp": 1640995200,
  "iat": 1640991600,
  "permissions": ["read:vaults", "write:strands"]
}
```

### Creating JWTs

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  {
    sub: userId,
    permissions: ['read:vaults', 'write:strands'],
    metadata: {
      organization: 'acme-corp',
      role: 'admin'
    }
  },
  privateKey,
  {
    algorithm: 'RS256',
    expiresIn: '1h',
    issuer: 'https://your-auth-server.com',
    audience: 'https://api.frame.dev'
  }
);
```

### Using JWTs

```typescript
const client = new FrameClient({
  auth: {
    type: 'jwt',
    token: jwtToken
  }
});

// Or with HTTP
fetch('https://api.frame.dev/v1/vaults', {
  headers: {
    'Authorization': `Bearer ${jwtToken}`
  }
});
```

### JWT Validation

Frame.dev validates JWTs by:
1. Verifying signature with public key
2. Checking expiration
3. Validating issuer and audience
4. Verifying permissions

## Session Authentication

### When to Use

- Browser-based applications
- First-party web apps
- Server-side rendered apps

### Creating Sessions

```typescript
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  const response = await fetch('https://api.frame.dev/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const { sessionToken } = await response.json();
  
  res.cookie('frame_session', sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
});
```

### Using Sessions

```typescript
// Include session cookie
fetch('https://api.frame.dev/v1/vaults', {
  credentials: 'include'
});

// Or with SDK
const client = new FrameClient({
  auth: {
    type: 'session',
    sessionToken: req.cookies.frame_session
  }
});
```

## Security Best Practices

### Secure Storage

Never store tokens in:
- localStorage (XSS vulnerable)
- sessionStorage (XSS vulnerable)
- Plain text files
- Version control

Secure storage options:
- Environment variables (server-side)
- Secure key management services
- Encrypted databases
- HttpOnly cookies (browser)

### Token Rotation

```typescript
class TokenManager {
  private refreshTimer: NodeJS.Timer;
  
  async initialize() {
    await this.refreshToken();
    
    this.refreshTimer = setInterval(
      () => this.refreshToken(),
      50 * 60 * 1000 // 50 minutes
    );
  }
  
  async refreshToken() {
    const newToken = await this.oauth.refresh();
    await this.secureStore.save(newToken);
  }
}
```

### Least Privilege

```typescript
// Request only necessary scopes
const client = new FrameClient({
  apiKey: process.env.FRAME_API_KEY,
  scopes: ['read:vaults'] // Not 'admin' unless needed
});
```

### Request Signing

```typescript
import crypto from 'crypto';

function signRequest(method: string, path: string, body: any) {
  const timestamp = Date.now();
  const message = `${method}\n${path}\n${timestamp}\n${JSON.stringify(body)}`;
  
  const signature = crypto
    .createHmac('sha256', API_SECRET)
    .update(message)
    .digest('hex');
  
  return {
    'X-Frame-Signature': signature,
    'X-Frame-Timestamp': timestamp
  };
}
```

## Error Handling

### Common Auth Errors

| Error Code | Description | Solution |
|------------|-------------|----------|
| `INVALID_TOKEN` | Token is malformed | Check token format |
| `EXPIRED_TOKEN` | Token has expired | Refresh or get new token |
| `INSUFFICIENT_SCOPE` | Missing required permissions | Request additional scopes |
| `INVALID_CREDENTIALS` | Wrong username/password | Verify credentials |
| `RATE_LIMITED` | Too many auth attempts | Wait and retry |

### Example

```typescript
try {
  await client.vaults.list();
} catch (error) {
  if (error.code === 'EXPIRED_TOKEN') {
    const newToken = await refreshToken();
    client.setToken(newToken);
    await client.vaults.list();
  } else if (error.code === 'INSUFFICIENT_SCOPE') {
    const authUrl = getAuthUrl(['additional:scope']);
    window.location.href = authUrl;
  }
}
```

## Testing Authentication

### Test Endpoints

```http
# Verify token
GET /v1/auth/verify
Authorization: Bearer YOUR_TOKEN

# Get token info
GET /v1/auth/token-info
Authorization: Bearer YOUR_TOKEN

# List permissions
GET /v1/auth/permissions
Authorization: Bearer YOUR_TOKEN
```

### Test Tokens

For development:
```bash
# Generate test token
frame auth test-token \
  --scopes "read:vaults,write:strands" \
  --expires "24h"
```