# Quarry REST API Guide

The Quarry REST API allows external applications to access your knowledge base programmatically. Built on Fastify with OpenAPI 3.1 documentation.

## Quick Start

### 1. Start the API Server

```bash
# Development (runs alongside Next.js)
npm run dev

# API server runs on port 3847 by default
# Documentation: http://localhost:3847/api/v1/docs
```

### 2. Get an API Token

Navigate to your Frame.dev profile settings and generate a new API token. **Store it securely** - the full token is only shown once.

### 3. Make Your First Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3847/api/v1/health
```

## Authentication

All endpoints (except `/health`) require a valid API token.

### Token Format

Include your token in the `Authorization` header:

```
Authorization: Bearer fdev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Alternative: Use the `X-API-Token` header:

```
X-API-Token: fdev_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Token Features

- **Format**: `fdev_` prefix + 40 cryptographically secure characters
- **SHA-256 hashed**: Only the hash is stored, not the plaintext
- **Expiration**: Optional, 1-365 days
- **Usage tracking**: Last used timestamp and request count

## Rate Limiting

- **Limit**: 100 requests per minute per token
- **Headers**: Rate limit info included in all responses
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## API Endpoints

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/health` | No | Health check |
| GET | `/api/v1/stats` | Yes | Database statistics |
| GET | `/api/v1/info` | Yes | API information |

### Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/weaves` | List all weaves |
| GET | `/api/v1/weaves/:slug` | Get specific weave |
| GET | `/api/v1/looms` | List looms |
| GET | `/api/v1/strands` | List strands with filters |
| GET | `/api/v1/strands/:slug` | Get specific strand |
| GET | `/api/v1/search` | Full-text search |

### Generation (AI-powered)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/generate/flashcards` | Generate flashcards from content |
| POST | `/api/v1/generate/quiz` | Generate quiz questions |
| POST | `/api/v1/generate/glossary` | Extract glossary terms |
| POST | `/api/v1/generate/summary` | Generate content summary |

### Questions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/questions/prebuilt` | Get prebuilt questions |
| GET | `/api/v1/questions/strand/*` | Get questions for strand |
| POST | `/api/v1/questions/generate` | Generate questions dynamically |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile` | Get user profile |
| PUT | `/api/v1/profile` | Update profile |
| GET | `/api/v1/settings` | Get user settings |
| PUT | `/api/v1/settings` | Update settings |
| GET | `/api/v1/profile/stats` | Get user statistics |

### Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tokens` | List all tokens (masked) |
| POST | `/api/v1/tokens` | Create new token |
| DELETE | `/api/v1/tokens/:id` | Revoke token |
| DELETE | `/api/v1/tokens/:id/permanent` | Delete token permanently |
| GET | `/api/v1/tokens/:id/audit` | Get token audit trail |

### Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit/api` | Get API audit events |
| GET | `/api/v1/audit/api/stats` | Get audit statistics |

## Example Requests

### List Strands with Filtering

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3847/api/v1/strands?weave=my-weave&limit=10&search=react"
```

### Generate Flashcards

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"strandSlug": "my-strand", "count": 5}' \
  http://localhost:3847/api/v1/generate/flashcards
```

### Create an API Token

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label": "CI/CD Token", "expiresInDays": 30}' \
  http://localhost:3847/api/v1/tokens
```

### Revoke a Token

```bash
curl -X DELETE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Confirm-Revoke: true" \
  http://localhost:3847/api/v1/tokens/TOKEN_ID
```

### Get Token Audit Trail

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3847/api/v1/tokens/TOKEN_ID/audit?limit=20"
```

## Error Handling

All errors follow this format:

```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message",
  "details": {}
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFIRMATION_REQUIRED` | 400 | Missing confirmation header |
| `INTERNAL_ERROR` | 500 | Server error |

## Audit Logging

All API operations are logged for security and debugging:

### Logged Events

- **token_create**: Token created
- **token_validate**: Successful authentication
- **token_revoke**: Token revoked
- **token_delete**: Token deleted
- **auth_fail**: Authentication failure
- **rate_limit**: Rate limit exceeded

### Audit Data Captured

- Timestamp
- Token ID (if available)
- IP address
- User agent
- Endpoint and method
- Failure reason (if applicable)

### Query Audit Events

```bash
# Get all auth failures in the last 24 hours
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3847/api/v1/audit/api?actionName=auth_fail"

# Get audit stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3847/api/v1/audit/api/stats
```

## Billing API (Next.js Routes)

The billing API handles Stripe checkout sessions for Quarry Pro subscriptions and lifetime purchases. These routes use Bearer token authentication with sync account tokens.

### Authentication

These routes require a sync account Bearer token (different from API tokens):

```
Authorization: Bearer <sync_access_token>
```

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/billing/checkout` | Yes | Create Stripe checkout session |
| GET | `/api/v1/billing/checkout/complete` | No | Get checkout result (license key for lifetime) |
| POST | `/api/v1/billing/webhook` | Stripe | Handle Stripe webhook events |

### Create Checkout Session

```bash
POST /api/v1/billing/checkout
Authorization: Bearer <sync_token>
Content-Type: application/json

{
  "plan": "monthly" | "annual" | "lifetime",
  "successUrl": "https://your-app.com/checkout/success",
  "cancelUrl": "https://your-app.com/checkout/cancel"
}
```

**Response (200):**
```json
{
  "url": "https://checkout.stripe.com/pay/cs_xxx",
  "sessionId": "cs_xxx"
}
```

**Error Responses:**
- `400` - Invalid plan or missing URLs
- `401` - Authentication required
- `404` - Account not found
- `503` - Billing service not configured

### Complete Checkout

Called after Stripe redirects back to success URL.

```bash
GET /api/v1/billing/checkout/complete?session_id=cs_xxx
```

**Response for Lifetime Purchase (200):**
```json
{
  "success": true,
  "licenseKey": "QUARRY-XXXX-XXXX-XXXX-XXXX",
  "email": "user@example.com",
  "purchaseType": "lifetime"
}
```

**Response for Subscription (200):**
```json
{
  "success": true,
  "email": "user@example.com",
  "purchaseType": "monthly"
}
```

### Webhook

Handles Stripe webhook events for subscription management. Requires valid `stripe-signature` header.

**Events Handled:**
- `checkout.session.completed` - Generates license key for lifetime purchases
- `customer.subscription.created` - Activates premium subscription
- `customer.subscription.updated` - Updates subscription status
- `customer.subscription.deleted` - Handles cancellation/expiry

### Pricing

| Plan | Price | Mode |
|------|-------|------|
| Monthly | $9/month | Subscription |
| Annual | $79/year | Subscription |
| Lifetime | $99 (beta) | One-time payment |

## Interactive Documentation

Visit the Swagger UI for interactive API exploration:

```
http://localhost:3847/api/v1/docs
```

Features:
- Try out endpoints directly
- View request/response schemas
- Generate curl commands
- Authentication testing

## Security Best Practices

1. **Never commit tokens** - Use environment variables
2. **Rotate tokens regularly** - Revoke old tokens, create new ones
3. **Use token expiration** - Set appropriate expiry for automated systems
4. **Monitor audit logs** - Check for unusual activity
5. **Use HTTPS in production** - Never send tokens over unencrypted connections
