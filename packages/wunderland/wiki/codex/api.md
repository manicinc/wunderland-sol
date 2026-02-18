# Quarry API Reference

REST and GraphQL APIs for accessing Quarry content.

> **🚧 Work in Progress**
>
> The Quarry API is currently under development. For immediate access to Quarry data, use our public GitHub repository at [github.com/framersai/quarry](https://github.com/framersai/quarry) where all content is freely available.

## Overview

The Quarry API provides programmatic access to the knowledge repository:

- Search across all content
- Retrieve specific strands, looms, and weaves
- Access relationship graphs
- Subscribe to content updates
- Contribute new content (authenticated)

## Authentication

### API Keys

All requests require authentication:

```http
Authorization: Bearer YOUR_API_KEY
```

Get API keys at [frame.dev/account/api](https://frame.dev/account/api)

### Rate Limits

| Tier       | Requests/Hour | Requests/Day | Burst   |
| ---------- | ------------- | ------------ | ------- |
| Free       | 100           | 1,000        | 10/min  |
| Pro        | 1,000         | 10,000       | 100/min |
| Enterprise | Unlimited     | Unlimited    | Custom  |

## REST API

### Base URL

```
https://api.frame.dev/codex/v1
```

### Endpoints

#### Search Content

```http
GET /search
```

Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| weaves | array | No | Filter by weave slugs |
| subjects | array | No | Filter by subjects |
| topics | array | No | Filter by topics |
| difficulty | string | No | Filter by difficulty |
| limit | integer | No | Results per page (default: 20, max: 100) |
| offset | integer | No | Pagination offset |

Example:

```bash
curl -X GET "https://api.frame.dev/codex/v1/search?q=machine+learning&weaves=technology&limit=10" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

Response:

```json
{
  "results": [
    {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "slug": "transformer-architecture",
      "title": "Understanding Transformer Architecture",
      "summary": "A comprehensive guide...",
      "weave": "technology",
      "loom": "machine-learning",
      "difficulty": "intermediate",
      "score": 0.95
    }
  ],
  "total": 42,
  "facets": {
    "weaves": {
      "technology": 35,
      "science": 7
    }
  }
}
```

#### Get Weave

```http
GET /weaves/{slug}
```

Example:

```bash
curl -X GET "https://api.frame.dev/codex/v1/weaves/technology" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### List Looms

```http
GET /weaves/{weave}/looms
```

Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tags | array | No | Filter by tags |
| difficulty | string | No | Filter by difficulty |

#### Get Loom

```http
GET /weaves/{weave}/looms/{loom}
```

Response includes loom metadata and strand list.

#### Get Strand

```http
GET /weaves/{weave}/looms/{loom}/strands/{strand}
```

Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| format | string | No | Response format: json, markdown, html |
| include_relationships | boolean | No | Include full relationship data |

#### Get Relationships

```http
GET /strands/{id}/relationships
```

Parameters:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| depth | integer | No | Graph traversal depth (default: 1, max: 3) |
| types | array | No | Filter by relationship types |

## GraphQL API

### Endpoint

```
https://api.frame.dev/codex/graphql
```

### Schema

```graphql
type Query {
  search(
    query: String!
    weaves: [String!]
    subjects: [String!]
    topics: [String!]
    difficulty: Difficulty
    limit: Int
    offset: Int
  ): SearchResults!

  weave(slug: String!): Weave
  loom(weave: String!, slug: String!): Loom
  strand(id: ID!): Strand

  weaves: [Weave!]!
  looms(weave: String!, tags: [String!]): [Loom!]!
  strands(weave: String!, loom: String!): [Strand!]!

  relationships(strandId: ID!, depth: Int, types: [RelationshipType!]): RelationshipGraph!
}

type Weave {
  slug: String!
  title: String!
  description: String!
  maintainedBy: Maintainer!
  license: String!
  tags: [String!]!
  looms: [Loom!]!
}

type Loom {
  slug: String!
  title: String!
  summary: String!
  tags: [String!]!
  ordering: Ordering!
  relationships: [LoomRelationship!]!
  strands: [Strand!]!
}

type Strand {
  id: ID!
  slug: String!
  title: String!
  summary: String!
  content: String!
  version: String!
  strandType: StrandType!
  contentType: String!
  difficulty: Difficulty!
  taxonomy: Taxonomy!
  relationships: [StrandRelationship!]!
  publishing: Publishing!

  # Zettelkasten workflow fields
  maturity: NoteMaturity
  qualityChecks: QualityChecks
  isMOC: Boolean
  mocConfig: MOCConfig
}

type SearchResults {
  results: [SearchResult!]!
  total: Int!
  facets: SearchFacets!
}

enum Difficulty {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  EXPERT
}

enum RelationshipType {
  PREREQUISITE
  RELATED
  FOLLOWS
  REFERENCES
  CONTRADICTS
  UPDATES
  EXTENDS
  SUPPORTS
  EXAMPLE_OF
  IMPLEMENTS
  QUESTIONS
  REFINES
  APPLIES
  SUMMARIZES
  CUSTOM
}

enum NoteMaturityStatus {
  FLEETING
  LITERATURE
  PERMANENT
  EVERGREEN
}

enum StrandType {
  FILE
  FOLDER
  SUPERNOTE
  MOC
}

type NoteMaturity {
  status: NoteMaturityStatus!
  lastRefinedAt: DateTime
  refinementCount: Int
  futureValue: String
}

type QualityChecks {
  hasContext: Boolean
  hasConnections: Boolean
  isAtomic: Boolean
  isSelfContained: Boolean
  isVerified: Boolean
  hasSources: Boolean
}

type MOCConfig {
  topic: String!
  scope: String!
  autoUpdate: Boolean
  sections: [String!]
  strandOrder: [String!]
}
```

### Example Queries

Search:

```graphql
query SearchCodex($query: String!) {
  search(query: $query, limit: 10) {
    results {
      id
      title
      summary
      weave
      loom
      difficulty
      score
    }
    total
  }
}
```

Get Strand with Relationships:

```graphql
query GetStrand($id: ID!) {
  strand(id: $id) {
    id
    title
    summary
    content
    taxonomy {
      subjects
      topics
      subtopics
    }
    relationships {
      type
      target {
        id
        title
        summary
      }
    }
  }
}
```

## Webhooks

Subscribe to content changes:

```http
POST /webhooks
Content-Type: application/json

{
  "url": "https://your-app.com/webhook",
  "events": ["strand.created", "strand.updated", "loom.created"],
  "filters": {
    "weaves": ["technology"],
    "topics": ["machine-learning"]
  }
}
```

Webhook payload:

```json
{
  "event": "strand.created",
  "timestamp": "2024-11-15T10:30:00Z",
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "slug": "new-ml-technique",
    "title": "Revolutionary ML Technique",
    "weave": "technology",
    "loom": "machine-learning"
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @framersai/codex-sdk
```

```typescript
import { CodexClient } from '@framersai/codex-sdk';

const client = new CodexClient({
  apiKey: 'YOUR_API_KEY',
});

// Search
const results = await client.search('transformer architecture', {
  weaves: ['technology'],
  limit: 10,
});

// Get specific content
const strand = await client.getStrand('technology', 'ml', 'transformers');
```

### Python

```bash
pip install frame-codex
```

```python
from frame_codex import CodexClient

client = CodexClient(api_key='YOUR_API_KEY')

# Search
results = client.search('transformer architecture',
                       weaves=['technology'],
                       limit=10)

# Get specific content
strand = client.get_strand('technology', 'ml', 'transformers')
```

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Strand with ID 'xyz123' not found",
    "details": {
      "resource_type": "strand",
      "resource_id": "xyz123"
    }
  }
}
```

### Common Error Codes

| Code                | HTTP Status | Description                  |
| ------------------- | ----------- | ---------------------------- |
| UNAUTHORIZED        | 401         | Invalid or missing API key   |
| FORBIDDEN           | 403         | Insufficient permissions     |
| RESOURCE_NOT_FOUND  | 404         | Requested resource not found |
| RATE_LIMIT_EXCEEDED | 429         | Too many requests            |
| VALIDATION_ERROR    | 400         | Invalid request parameters   |
| INTERNAL_ERROR      | 500         | Server error                 |

## Best Practices

1. Cache responses when possible
2. Use pagination for large result sets
3. Request only needed fields in GraphQL
4. Handle rate limits with exponential backoff
5. Subscribe to webhooks instead of polling
