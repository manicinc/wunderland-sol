# OpenStrand Architecture

Technical design specification for OpenStrand.

## System Overview

OpenStrand is an AI-native knowledge infrastructure for personal knowledge management. It combines local-first principles with cloud capabilities, offering AI integration and knowledge graph features.

### Design Principles

1. Local-first, cloud-ready: Data sovereignty with optional sync
2. AI-native: Built for AI integration from the ground up
3. Privacy-focused: User-controlled data and encryption
4. Extensible: Plugin architecture for customization
5. Developer-friendly: Clean APIs and SDKs

## High-Level Architecture

```
Client Applications
├── Web App (Next.js)
├── Desktop App (Electron)
└── Mobile Apps (React Native)

OpenStrand SDK
├── Core API
├── Sync Engine
└── Plugin System

Backend Services
├── Fastify API
├── Workers
└── AI Services

Data Layer
├── PostgreSQL/PGlite
├── Vector Store
└── Object Storage
```

## Data Architecture

### Core Models

#### Strand (Knowledge Atom)

```typescript
interface Strand {
  id: string;                    // UUID v7
  slug: string;
  title: string;
  content: Content;              // Polymorphic
  contentType: ContentType;      // MIME type
  
  created: Date;
  modified: Date;
  accessed: Date;
  version: number;
  
  loomId?: string;
  tags: string[];
  
  embedding?: Float32Array;
  summary?: string;
  
  links: Link[];
  backlinks: Link[];
  
  syncStatus: SyncStatus;
  syncMetadata?: SyncMetadata;
}
```

#### Loom (Collection)

```typescript
interface Loom {
  id: string;
  slug: string;
  title: string;
  description: string;
  
  parentId?: string;
  path: string;                 // Materialized path
  
  strandIds: string[];
  childLoomIds: string[];
  
  created: Date;
  modified: Date;
  color?: string;
  icon?: string;
  
  defaultView: ViewType;
  sortOrder: SortOrder;
  filters: Filter[];
}
```

#### Weave (Universe)

```typescript
interface Weave {
  id: string;
  name: string;
  description: string;
  
  ownerId: string;
  visibility: 'private' | 'shared' | 'public';
  permissions: Permission[];
  
  stats: {
    strandCount: number;
    loomCount: number;
    totalSize: number;
    lastModified: Date;
  };
  
  settings: WeaveSettings;
  aiConfig: AIConfiguration;
  syncConfig: SyncConfiguration;
}
```

### Database Schema

#### PostgreSQL Schema

```sql
CREATE TABLE weaves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE looms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weave_id UUID REFERENCES weaves(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES looms(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    path TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(weave_id, slug)
);

CREATE TABLE strands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weave_id UUID REFERENCES weaves(id) ON DELETE CASCADE,
    loom_id UUID REFERENCES looms(id) ON DELETE SET NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    content JSONB NOT NULL,
    content_text TEXT,
    content_type TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    version INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(weave_id, slug)
);

CREATE TABLE links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES strands(id) ON DELETE CASCADE,
    target_id UUID REFERENCES strands(id) ON DELETE CASCADE,
    link_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(source_id, target_id, link_type)
);

-- Performance indexes
CREATE INDEX idx_strands_weave_loom ON strands(weave_id, loom_id);
CREATE INDEX idx_strands_embedding ON strands USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_strands_content_text ON strands USING gin(to_tsvector('english', content_text));
CREATE INDEX idx_looms_path ON looms USING gist(path gist_trgm_ops);
```

#### Local Storage (PGlite)

```typescript
const db = new PGlite({
  dataDir: './openstrand-data',
  extensions: {
    pgvector: true,
    fts: true
  }
});

await db.exec(SCHEMA_SQL);
```

## Sync Architecture

### Conflict-Free Replicated Data Types

```typescript
class StrandCRDT {
  private clock: VectorClock;
  private operations: Operation[];
  
  applyLocal(op: Operation): void {
    this.clock.increment(this.replicaId);
    op.timestamp = this.clock.copy();
    this.operations.push(op);
    this.integrate(op);
  }
  
  merge(remote: Operation[]): void {
    for (const op of remote) {
      if (!this.hasOperation(op)) {
        this.operations.push(op);
        this.integrate(op);
        this.clock.merge(op.timestamp);
      }
    }
  }
}
```

### Sync Protocol

```typescript
class SyncEngine {
  async sync(remote: RemoteEndpoint): Promise<SyncResult> {
    const localRoot = await this.getMerkleRoot();
    const remoteRoot = await remote.getMerkleRoot();
    
    if (localRoot === remoteRoot) {
      return { status: 'up-to-date' };
    }
    
    const diff = await this.findDifferences(remote);
    const localChanges = await this.getChanges(diff.missing);
    const remoteChanges = await remote.getChanges(diff.extra);
    
    await this.applyChanges(remoteChanges);
    await remote.applyChanges(localChanges);
    
    return { status: 'synced', changes: diff };
  }
}
```

## AI Integration

### Embedding Pipeline

```typescript
class EmbeddingService {
  private model: EmbeddingModel;
  private cache: EmbeddingCache;
  
  async embedStrand(strand: Strand): Promise<Float32Array> {
    const cached = await this.cache.get(strand.id, strand.version);
    if (cached) return cached;
    
    const text = this.extractText(strand);
    const chunks = this.chunkText(text, 8000);
    
    const embeddings = await Promise.all(
      chunks.map(chunk => this.model.embed(chunk))
    );
    
    const combined = this.combineEmbeddings(embeddings);
    await this.cache.set(strand.id, strand.version, combined);
    
    return combined;
  }
}
```

### AI Services

```typescript
interface AIService {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  findSimilar(strand: Strand, limit: number): Promise<Strand[]>;
  chat(prompt: string, context: Context): Promise<ChatResponse>;
  generate(prompt: string, template: Template): Promise<string>;
  summarize(content: string, style: SummaryStyle): Promise<string>;
}
```

### RAG Implementation

```typescript
class RAGService {
  async answer(question: string, weave: Weave): Promise<Answer> {
    const questionEmbedding = await this.embed(question);
    
    const relevant = await this.vectorSearch(
      questionEmbedding,
      weave.id,
      { limit: 10, threshold: 0.7 }
    );
    
    const reranked = await this.rerank(question, relevant);
    const context = this.buildContext(reranked);
    
    const answer = await this.llm.complete({
      system: 'You are a helpful assistant...',
      prompt: `Context: ${context}\n\nQuestion: ${question}`,
      temperature: 0.7
    });
    
    return {
      answer: answer.text,
      sources: reranked,
      confidence: answer.confidence
    };
  }
}
```

## Plugin Architecture

### Plugin Interface

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  
  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;
  
  hooks?: {
    beforeStrandCreate?: (strand: Strand) => Promise<Strand>;
    afterStrandCreate?: (strand: Strand) => Promise<void>;
    beforeSearch?: (query: SearchQuery) => Promise<SearchQuery>;
    renderStrand?: (strand: Strand) => Promise<ReactNode>;
  };
  
  commands?: Command[];
  panels?: Panel[];
  statusBarItems?: StatusBarItem[];
}
```

### Example Plugin

```typescript
class LinkPreviewPlugin implements Plugin {
  id = 'link-preview';
  name = 'Link Preview';
  
  async activate(context: PluginContext) {
    context.registerCommand({
      id: 'link-preview.fetch',
      title: 'Fetch Link Preview',
      execute: async (url: string) => {
        return await this.fetchPreview(url);
      }
    });
    
    context.registerHook('renderStrand', async (strand) => {
      const links = this.extractLinks(strand.content);
      const previews = await Promise.all(
        links.map(link => this.fetchPreview(link))
      );
      return <LinkPreviews previews={previews} />;
    });
  }
}
```

## Security Architecture

### Encryption

```typescript
class EncryptionService {
  async encryptStrand(strand: Strand, key: CryptoKey): Promise<EncryptedStrand> {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const plaintext = JSON.stringify(strand);
    
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    );
    
    return {
      id: strand.id,
      ciphertext: base64.encode(ciphertext),
      iv: base64.encode(iv),
      algorithm: 'AES-GCM'
    };
  }
  
  async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }
}
```

### Access Control

```typescript
interface AccessControl {
  canRead(user: User, resource: Resource): boolean;
  canWrite(user: User, resource: Resource): boolean;
  canDelete(user: User, resource: Resource): boolean;
  
  grant(user: User, resource: Resource, permission: Permission): void;
  revoke(user: User, resource: Resource, permission: Permission): void;
  
  share(resource: Resource, recipient: User, permissions: Permission[]): ShareLink;
}
```

## Performance Optimizations

### Indexing

```typescript
class IndexingService {
  async indexStrand(strand: Strand): Promise<void> {
    await this.fts.index(strand.id, {
      title: strand.title,
      content: this.extractText(strand),
      tags: strand.tags
    });
    
    const embedding = await this.embedder.embed(strand);
    await this.vectorDB.upsert(strand.id, embedding);
    
    for (const link of strand.links) {
      await this.graph.addEdge(strand.id, link.targetId, link.type);
    }
  }
  
  async reindexWeave(weaveId: string): Promise<void> {
    const strands = await this.db.getStrandsByWeave(weaveId);
    
    await this.parallel(strands, async (batch) => {
      const embeddings = await this.embedder.embedBatch(batch);
      await this.vectorDB.upsertBatch(embeddings);
    }, { batchSize: 100 });
  }
}
```

### Caching

```typescript
class CacheService {
  private memory: LRUCache<string, any>;
  private disk: DiskCache;
  
  async get<T>(key: string): Promise<T | null> {
    const memoryHit = this.memory.get(key);
    if (memoryHit) return memoryHit;
    
    const diskHit = await this.disk.get(key);
    if (diskHit) {
      this.memory.set(key, diskHit);
      return diskHit;
    }
    
    return null;
  }
  
  async warmCache(weaveId: string): Promise<void> {
    const popular = await this.getPopularStrands(weaveId);
    const embeddings = await this.vectorDB.getBatch(
      popular.map(s => s.id)
    );
    
    for (const [id, embedding] of embeddings) {
      await this.set(`embedding:${id}`, embedding);
    }
  }
}
```

## Deployment Architecture

### Container Configuration

```yaml
version: '3.8'

services:
  api:
    build: ./server
    environment:
      DATABASE_URL: postgresql://...
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis
    deploy:
      replicas: 3
      
  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    
  worker:
    build: ./worker
    environment:
      QUEUE_URL: redis://redis:6379
    deploy:
      replicas: 2
```

### Scaling Strategy

1. Horizontal scaling: API servers behind load balancer
2. Read replicas for database
3. Distributed vector index
4. CDN for static assets
5. Regional data centers