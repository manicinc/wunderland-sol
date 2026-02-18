# Frame.dev API Documentation

Integration guide for Frame ecosystem APIs powering AI agents and superintelligence.

*The OS for humans, the codex of humanity.*

> **🚧 Work in Progress**
> 
> The Frame.dev API is currently under active development. This documentation serves as a reference for planned features and is subject to change. Some endpoints may not be available yet.
> 
> For current access to Frame Codex data, visit our [GitHub repository](https://github.com/framersai/codex) where all knowledge is publicly available.

## Overview

Frame ecosystem provides APIs for building AI-powered knowledge applications:

- Developer-friendly interfaces
- Low latency, high throughput
- Industry-standard authentication
- Scalable from single users to enterprise
- Consistent patterns across services

## API Ecosystem

```
Frame.dev APIs
├── Frame Codex API (Knowledge Base)
├── OpenStrand API (PKMS)
└── Frame AI API (AI Services)

Core Services
├── Auth
├── Storage
├── Search
├── Sync
└── Analytics
```

## Getting Started

### Create Account

Sign up at [frame.dev](https://frame.dev) for API credentials.

### Get API Keys

```bash
# CLI
frame auth login
frame api-keys create --name "My App"

# Dashboard
# Visit https://frame.dev/dashboard/api-keys
```

### First Request

```bash
# Test API key
curl -X GET https://api.frame.dev/v1/status \
  -H "Authorization: Bearer YOUR_API_KEY"
```

```javascript
import { FrameClient } from '@framersai/sdk';

const client = new FrameClient({
  apiKey: 'YOUR_API_KEY'
});

const status = await client.getStatus();
```

## Available APIs

### Frame Codex API

Access the knowledge repository programmatically.

Features:
- Search across knowledge strands
- Retrieve weaves, looms, strands
- Access relationship graphs
- Subscribe to content updates

```typescript
const results = await codex.search('quantum computing', {
  weaves: ['technology'],
  limit: 10
});
```

### OpenStrand API

Build personal knowledge management applications.

Features:
- Manage vaults and strands
- AI-powered search and chat
- Real-time collaboration
- Plugin development

```typescript
const strand = await vault.strands.create({
  title: 'Meeting Notes',
  content: 'Discussion points...',
  tags: ['work', 'important']
});
```

### Frame AI API

AI services for knowledge processing.

Features:
- Text generation and completion
- Semantic search and embeddings
- Document summarization
- Knowledge synthesis

```typescript
const embeddings = await ai.embed('Understanding quantum mechanics');

const synthesis = await ai.synthesize({
  question: 'What are the key AI trends?',
  sources: ['strand-1', 'strand-2']
});
```

## Authentication

### API Key Authentication

For server-side applications.

```http
Authorization: Bearer YOUR_API_KEY
```

```typescript
const client = new FrameClient({
  apiKey: process.env.FRAME_API_KEY
});
```

### OAuth 2.0

For user-facing applications.

```typescript
const authUrl = client.oauth.getAuthorizationUrl({
  clientId: 'YOUR_CLIENT_ID',
  redirectUri: 'http://localhost:3000/callback',
  scopes: ['read:vaults', 'write:strands']
});

const tokens = await client.oauth.exchangeCode(code);
```

### JWT

For self-hosted deployments.

```typescript
const token = jwt.sign(
  { userId: '123', permissions: ['read', 'write'] },
  process.env.JWT_SECRET
);

const client = new FrameClient({
  auth: { type: 'jwt', token }
});
```

## REST API Conventions

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.frame.dev` |
| Staging | `https://staging-api.frame.dev` |
| Self-Hosted | `https://your-domain.com/api` |

### Request Format

```http
POST /v1/resource
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY

{
  "field": "value"
}
```

### Response Format

```json
{
  "data": {
    "id": "resource-id",
    "type": "resource-type",
    "attributes": {
      "field": "value"
    }
  },
  "meta": {
    "requestId": "unique-request-id",
    "timestamp": "2024-11-15T10:30:00Z"
  }
}
```

### Error Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "title",
        "code": "required",
        "message": "Title is required"
      }
    ]
  }
}
```

### Pagination

```http
GET /v1/resources?limit=20&offset=40
```

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "total": 100,
      "limit": 20,
      "offset": 40,
      "hasMore": true
    }
  }
}
```

## GraphQL API

### Endpoint

```
https://api.frame.dev/graphql
```

### Example Query

```graphql
query GetKnowledge($search: String!) {
  codexSearch(query: $search, limit: 10) {
    results {
      id
      title
      summary
      score
    }
  }
  
  myVaults {
    id
    name
    stats {
      strandCount
      totalSize
    }
  }
}
```

### Subscriptions

```graphql
subscription OnStrandUpdated($vaultId: ID!) {
  strandUpdated(vaultId: $vaultId) {
    id
    title
    modifiedAt
    modifiedBy {
      id
      name
    }
  }
}
```

## Webhooks

### Configuration

```http
POST /v1/webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["strand.created", "strand.updated"],
  "secret": "webhook-secret"
}
```

### Verification

```typescript
import crypto from 'crypto';

function verifyWebhook(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${digest}`)
  );
}
```

## Rate Limits

### Headers

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1699999999
```

### Handling

```typescript
async function makeRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options);
  
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return makeRequest(url, options);
  }
  
  return response;
}
```

## SDKs

### Official SDKs

| Language | Package | Documentation |
|----------|---------|---------------|
| JavaScript/TypeScript | `@framersai/sdk` | [Docs](./examples.md) |
| Python | `frame-sdk` | [Docs](./examples.md) |
| Go | `github.com/framersai/go-sdk` | [Docs](./examples.md) |
| Ruby | `frame-ruby` | [Docs](./examples.md) |

### Community SDKs

Available for Rust, Java, and PHP through community maintainers.

## Best Practices

### Use Idempotency Keys

```typescript
const response = await client.strands.create({
  title: 'Important Note',
  content: 'Content here'
}, {
  idempotencyKey: 'unique-operation-id'
});
```

### Implement Exponential Backoff

```typescript
async function retryWithBackoff(fn: Function, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}
```

### Batch Operations

```typescript
// Use batch operations
await client.strands.createBatch(items);

// Instead of multiple calls
for (const item of items) {
  await client.strands.create(item);
}
```

### Cache Appropriately

```typescript
const cache = new Map();

async function getCachedStrand(id: string) {
  if (cache.has(id)) {
    return cache.get(id);
  }
  
  const strand = await client.strands.get(id);
  cache.set(id, strand);
  
  setTimeout(() => cache.delete(id), 5 * 60 * 1000);
  
  return strand;
}
```

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

### Example

```typescript
try {
  const strand = await client.strands.get('invalid-id');
} catch (error) {
  if (error instanceof FrameAPIError) {
    switch (error.code) {
      case 'NOT_FOUND':
        console.log('Strand not found');
        break;
      case 'RATE_LIMITED':
        console.log(`Retry after ${error.retryAfter}s`);
        break;
    }
  }
}
```

## Support

### Resources

- Documentation: [docs.frame.dev](https://docs.frame.dev)
- API Status: [status.frame.dev](https://status.frame.dev)
- Community: [community.frame.dev](https://community.frame.dev)
- GitHub: [github.com/framersai/api-issues](https://github.com/framersai/api-issues)

### Contact

- Support: support@frame.dev
- Enterprise: enterprise@frame.dev
- Security: security@frame.dev