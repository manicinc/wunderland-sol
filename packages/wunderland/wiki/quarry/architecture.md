# Frame.dev Architecture

Technical architecture for Frame.dev's AI-powered knowledge infrastructure.

## System Architecture

Frame.dev uses a layered architecture optimized for scalability and AI operations.

```
Client Layer
├── Web Applications
├── Native Applications
└── API Clients

API Gateway
├── Authentication
├── Rate Limiting
└── Load Balancing

Core Services
├── Knowledge Service
├── AI Service
└── Integration Service

Data Layer
├── PostgreSQL (PGlite for local)
├── Vector Store (pgvector)
└── Object Storage
```

## Core Components

### Knowledge Service

Manages all knowledge operations using a graph database approach.

```typescript
interface KnowledgeService {
  // Core operations
  createStrand(data: StrandData): Promise<Strand>;
  linkStrands(source: UUID, target: UUID, type: LinkType): Promise<Link>;

  // Search & retrieval
  search(query: string, options: SearchOptions): Promise<SearchResults>;
  getRelated(strandId: UUID, depth: number): Promise<KnowledgeGraph>;

  // Versioning
  createBranch(name: string): Promise<Branch>;
  merge(source: Branch, target: Branch): Promise<MergeResult>;
}
```

Key features:

- Property graph on PostgreSQL
- Multi-format content ingestion
- Vector embeddings with pgvector
- Git-like version control for knowledge

### AI Service

Handles AI/ML operations and model orchestration.

Components:

- Model registry for tracking available models
- Inference pipeline optimized for low latency
- RAG (Retrieval-Augmented Generation) engine
- Fine-tuning capabilities

Processing flow:

```
Query → Embedding → Vector Search → Context Assembly → LLM → Response
```

### Integration Service

Connects to external data sources:

- Document formats: Markdown, Notion, Obsidian, Roam
- Code repositories: GitHub, GitLab
- Media: Images, audio, video with transcription
- APIs: REST, GraphQL, webhooks

## Data Models

### Strand

```typescript
interface Strand {
  id: UUID;
  slug: string;
  title: string;
  content: {
    raw: string;
    processed: any;
    embeddings?: Float32Array;
  };
  metadata: {
    version: string;
    contentType: ContentType;
    created: Date;
    modified: Date;
  };
  taxonomy: {
    subjects: string[];
    topics: string[];
    tags: string[];
  };
  relationships: Relationship[];
}
```

### Loom

```typescript
interface Loom {
  id: UUID;
  slug: string;
  title: string;
  summary: string;
  strands: UUID[];
  ordering: OrderingType;
  metadata: LoomMetadata;
}
```

### Weave

```typescript
interface Weave {
  slug: string;
  title: string;
  description: string;
  looms: Map<string, Loom>;
  maintainer: string;
  license: string;
}
```

## Security Architecture

### Authentication

- OAuth 2.0 / OpenID Connect
- JWT tokens for sessions
- Role-based access control
- API key management

### Data Security

- Encryption at rest (AES-256)
- TLS 1.3 for communications
- End-to-end encryption options
- Zero-knowledge architecture for private vaults

### Privacy

- Local-first defaults
- Selective sync
- Data portability
- GDPR compliance

## Deployment Architecture

### Cloud-Native Design

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frame-knowledge-service
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: service
          image: framersai/knowledge-service:latest
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: url
```

### Scaling Strategy

- Horizontal scaling for API services
- Read replicas for database
- CDN for static assets
- Edge computing for low latency

## API Design

### REST

```http
# Create strand
POST /api/v1/strands
Content-Type: application/json

{
  "title": "Knowledge Title",
  "content": "Content here",
  "taxonomy": {
    "subjects": ["AI", "Knowledge Management"]
  }
}

# Search
GET /api/v1/search?q=AI+architecture&limit=10
```

### GraphQL

```graphql
query SearchKnowledge($query: String!, $limit: Int) {
  search(query: $query, limit: $limit) {
    strands {
      id
      title
      summary
      relationships {
        type
        target {
          id
          title
        }
      }
    }
  }
}
```

## Event-Driven Architecture

```typescript
interface KnowledgeEvent {
  type: 'strand.created' | 'strand.updated' | 'strand.linked';
  timestamp: Date;
  payload: any;
  metadata: EventMetadata;
}

eventBus.on('strand.created', async (event) => {
  await indexingService.index(event.payload);
  await notificationService.notify(event.payload.author);
});
```

## Monitoring

- Application metrics via Prometheus
- Distributed tracing with OpenTelemetry
- Log aggregation using ELK stack
- Health checks at `/health` endpoint
