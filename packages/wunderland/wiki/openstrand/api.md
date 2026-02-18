# OpenStrand API Reference

API documentation for OpenStrand SDK.

## Getting Started

### Installation

```bash
npm install @openstrand/sdk
# or
yarn add @openstrand/sdk
# or
pnpm add @openstrand/sdk
```

### Basic Usage

```typescript
import { OpenStrand } from '@openstrand/sdk';

const openstrand = new OpenStrand({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.openstrand.ai',
});

const vault = await openstrand.createVault({
  name: 'My Knowledge Base',
  description: 'Personal knowledge management',
});

const strand = await vault.strands.create({
  title: 'My First Note',
  content: 'This is my first note in OpenStrand!',
  tags: ['welcome', 'tutorial'],
});
```

## Core Concepts

### Authentication

```typescript
// API Key
const client = new OpenStrand({
  apiKey: process.env.OPENSTRAND_API_KEY,
});

// OAuth
const client = new OpenStrand({
  oauth: {
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    redirectUri: 'http://localhost:3000/callback',
  },
});

// JWT (self-hosted)
const client = new OpenStrand({
  auth: {
    type: 'jwt',
    token: await getJWTToken(),
  },
});
```

### Error Handling

```typescript
try {
  const strand = await vault.strands.get('non-existent-id');
} catch (error) {
  if (error instanceof OpenStrandError) {
    console.error(`Error ${error.code}: ${error.message}`);

    switch (error.code) {
      case 'NOT_FOUND':
        // Handle not found
        break;
      case 'UNAUTHORIZED':
        // Refresh token
        break;
      case 'RATE_LIMITED':
        const retryAfter = error.retryAfter;
        // Retry after delay
        break;
    }
  }
}
```

## Vault API

### Vault Management

```typescript
class VaultAPI {
  async list(options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created' | 'modified' | 'name';
  }): Promise<PaginatedResponse<Vault>>;

  async create(data: {
    name: string;
    description?: string;
    settings?: VaultSettings;
  }): Promise<Vault>;

  async get(id: string): Promise<Vault>;

  async update(id: string, data: Partial<Vault>): Promise<Vault>;

  async delete(id: string): Promise<void>;

  async getStats(id: string): Promise<VaultStats>;

  async export(id: string, format: 'json' | 'markdown' | 'opml'): Promise<Blob>;

  async import(id: string, data: File | Blob, options?: ImportOptions): Promise<ImportResult>;
}
```

### Vault Settings

```typescript
interface VaultSettings {
  ai: {
    provider: 'openai' | 'anthropic' | 'local';
    model: string;
    temperature: number;
    embeddings: {
      model: string;
      dimensions: number;
    };
  };

  sync: {
    enabled: boolean;
    interval: number;
    encryption: boolean;
    conflictResolution: 'manual' | 'latest' | 'merge';
  };

  privacy: {
    telemetry: boolean;
    crashReports: boolean;
    encryption: 'none' | 'transit' | 'e2e';
  };
}
```

## Strand API

### Strand Management

```typescript
class StrandAPI {
  async create(data: {
    title: string;
    content: Content;
    contentType?: string;
    loomId?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  }): Promise<Strand>;

  async get(
    id: string,
    options?: {
      includeContent?: boolean;
      includeRelationships?: boolean;
      includeVersions?: boolean;
    }
  ): Promise<Strand>;

  async update(
    id: string,
    data: {
      title?: string;
      content?: Content;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<Strand>;

  async delete(id: string): Promise<void>;

  async list(options?: {
    loomId?: string;
    tags?: string[];
    contentType?: string;
    search?: string;
    limit?: number;
    offset?: number;
    orderBy?: StrandOrderBy;
  }): Promise<PaginatedResponse<Strand>>;

  async getVersions(id: string): Promise<StrandVersion[]>;

  async revert(id: string, version: number): Promise<Strand>;
}
```

### Content Types

```typescript
// Text content
const textStrand = await vault.strands.create({
  title: 'Text Note',
  content: {
    type: 'text',
    data: 'Plain text content',
  },
});

// Markdown
const mdStrand = await vault.strands.create({
  title: 'Markdown Note',
  content: {
    type: 'markdown',
    data: '# Heading\n\n**markdown** content',
  },
});

// Structured
const structuredStrand = await vault.strands.create({
  title: 'Structured Data',
  content: {
    type: 'json',
    data: {
      name: 'John Doe',
      age: 30,
      interests: ['coding', 'reading'],
    },
  },
});

// Binary
const imageStrand = await vault.strands.create({
  title: 'Profile Picture',
  content: {
    type: 'file',
    data: imageFile,
    mimeType: 'image/jpeg',
  },
});
```

## Loom API

### Loom Management

```typescript
class LoomAPI {
  async create(data: {
    name: string;
    description?: string;
    parentId?: string;
    color?: string;
    icon?: string;
    settings?: LoomSettings;
  }): Promise<Loom>;

  async get(
    id: string,
    options?: {
      includeStrands?: boolean;
      includeChildren?: boolean;
      includeStats?: boolean;
    }
  ): Promise<Loom>;

  async update(id: string, data: Partial<Loom>): Promise<Loom>;

  async delete(
    id: string,
    options?: {
      deleteStrands?: boolean;
    }
  ): Promise<void>;

  async list(options?: {
    parentId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<PaginatedResponse<Loom>>;

  async move(id: string, newParentId: string | null): Promise<Loom>;

  async getPath(id: string): Promise<Loom[]>;
}
```

### Loom Organization

```typescript
const projectLoom = await vault.looms.create({
  name: 'My Project',
  icon: '📁',
});

const researchLoom = await vault.looms.create({
  name: 'Research',
  parentId: projectLoom.id,
  icon: '🔬',
});

const notesLoom = await vault.looms.create({
  name: 'Meeting Notes',
  parentId: projectLoom.id,
  icon: '📝',
});

const path = await vault.looms.getPath(notesLoom.id);
// Returns: [projectLoom, notesLoom]
```

## Relationship API

### Link Management

```typescript
class RelationshipAPI {
  async createLink(data: {
    sourceId: string;
    targetId: string;
    type: LinkType;
    metadata?: Record<string, any>;
  }): Promise<Link>;

  async getLinks(
    strandId: string,
    options?: {
      direction?: 'outgoing' | 'incoming' | 'both';
      types?: LinkType[];
      limit?: number;
    }
  ): Promise<Link[]>;

  async deleteLink(id: string): Promise<void>;

  async getRelated(
    strandId: string,
    options?: {
      depth?: number;
      types?: LinkType[];
      limit?: number;
    }
  ): Promise<RelatedStrand[]>;

  async findPath(
    sourceId: string,
    targetId: string,
    options?: {
      maxDepth?: number;
      types?: LinkType[];
    }
  ): Promise<StrandPath[]>;
}
```

### Link Types (Enhanced with Zettelkasten Semantics)

```typescript
enum LinkType {
  // Classic relationship types
  REFERENCE = 'reference',
  RELATED = 'related',
  PARENT = 'parent',
  CHILD = 'child',
  NEXT = 'next',

  // Zettelkasten semantic relationships
  EXTENDS = 'extends', // Builds upon, expands
  CONTRASTS = 'contrasts', // Opposing viewpoint
  SUPPORTS = 'supports', // Provides evidence for
  EXAMPLE_OF = 'example-of', // Concrete instance of concept
  IMPLEMENTS = 'implements', // Practical application
  QUESTIONS = 'questions', // Raises doubts about
  REFINES = 'refines', // Improves upon
  APPLIES = 'applies', // Uses in different context
  SUMMARIZES = 'summarizes', // Condenses content
  PREREQUISITE = 'prerequisite', // Must understand first
  FOLLOWS = 'follows', // Comes after in sequence
  CONTRADICTS = 'contradicts', // Directly conflicts with
  UPDATES = 'updates', // Supersedes previous version
  CUSTOM = 'custom',
}

// Create link with semantic context
await vault.relationships.createLink({
  sourceId: strand1.id,
  targetId: strand2.id,
  type: LinkType.EXTENDS,
  metadata: {
    context: 'Builds on foundation concepts from this strand',
  },
});
```

## Zettelkasten Workflow API

### Note Maturity

Track note progression through the Zettelkasten lifecycle.

```typescript
enum NoteMaturityStatus {
  FLEETING = 'fleeting', // Quick capture, unprocessed
  LITERATURE = 'literature', // Processed from sources
  PERMANENT = 'permanent', // Refined, connected
  EVERGREEN = 'evergreen', // Core concepts, frequently updated
}

interface NoteMaturity {
  status: NoteMaturityStatus;
  lastRefinedAt?: Date;
  refinementCount?: number;
  futureValue?: 'low' | 'medium' | 'high' | 'core';
}

class MaturityAPI {
  async setMaturity(strandId: string, maturity: NoteMaturity): Promise<Strand>;
  async promoteMaturity(strandId: string): Promise<Strand>;
  async getByMaturity(status: NoteMaturityStatus, options?: QueryOptions): Promise<Strand[]>;
  async getStaleNotes(olderThan: string, status?: NoteMaturityStatus): Promise<Strand[]>;
}

// Set maturity
await vault.maturity.setMaturity(strand.id, {
  status: 'permanent',
  futureValue: 'high',
});

// Promote to next stage
await vault.maturity.promoteMaturity(strand.id);

// Get all fleeting notes needing processing
const fleeting = await vault.maturity.getByMaturity('fleeting');
```

### Quality Checks

Ensure notes meet Zettelkasten quality standards.

```typescript
interface NoteQualityChecks {
  hasContext?: boolean; // Explains why content matters
  hasConnections?: boolean; // Links to related notes
  isAtomic?: boolean; // Focused on single idea
  isSelfContained?: boolean; // Understandable without context
  isVerified?: boolean; // Reviewed for accuracy
  hasSources?: boolean; // Cites sources
}

class QualityAPI {
  async checkQuality(strandId: string): Promise<NoteQualityChecks>;
  async setQualityChecks(strandId: string, checks: NoteQualityChecks): Promise<Strand>;
  async getNeedsImprovement(checks: (keyof NoteQualityChecks)[]): Promise<Strand[]>;
}

// Check quality
const quality = await vault.quality.checkQuality(strand.id);

// Find notes missing connections
const disconnected = await vault.quality.getNeedsImprovement(['hasConnections']);
```

### Maps of Content (MOC)

Create structure notes that organize related content.

```typescript
interface MOCConfig {
  topic: string;
  scope: 'subject' | 'topic' | 'project' | 'custom';
  autoUpdate?: boolean;
  sections?: string[];
  strandOrder?: string[];
}

class MOCAPI {
  async create(config: MOCConfig): Promise<Strand>;
  async generate(options: {
    level: 'subject' | 'topic';
    term?: string;
    minStrands?: number;
  }): Promise<Strand[]>;
  async refresh(mocId: string): Promise<Strand>;
  async listMOCs(options?: QueryOptions): Promise<Strand[]>;
}

// Create MOC manually
const moc = await vault.moc.create({
  topic: 'Machine Learning',
  scope: 'topic',
  autoUpdate: true,
  sections: ['Fundamentals', 'Architectures', 'Applications'],
});

// Auto-generate MOCs from taxonomy
const generated = await vault.moc.generate({
  level: 'topic',
  minStrands: 5,
});
```

## Search API

### Search Operations

```typescript
class SearchAPI {
  async search(
    query: string,
    options?: {
      vaultId?: string;
      loomIds?: string[];
      tags?: string[];
      contentTypes?: string[];
      dateRange?: DateRange;
      limit?: number;
      offset?: number;
      threshold?: number;
    }
  ): Promise<SearchResults>;

  async searchKeywords(keywords: string[], options?: SearchOptions): Promise<SearchResults>;

  async advancedSearch(filters: {
    must?: SearchClause[];
    should?: SearchClause[];
    mustNot?: SearchClause[];
    filter?: FilterClause[];
  }): Promise<SearchResults>;

  async findSimilar(
    strandId: string,
    options?: {
      limit?: number;
      threshold?: number;
      inLoom?: string;
    }
  ): Promise<SimilarityResult[]>;

  async suggest(
    prefix: string,
    options?: {
      types?: ('strands' | 'tags' | 'looms')[];
      limit?: number;
    }
  ): Promise<Suggestions>;
}
```

### Search Examples

```typescript
// Semantic search
const results = await vault.search('quantum computing applications', {
  loomIds: ['physics'],
  threshold: 0.7,
  limit: 20,
});

// Advanced search
const advanced = await vault.search.advancedSearch({
  must: [{ field: 'content', contains: 'machine learning' }],
  should: [
    { field: 'tags', contains: 'AI' },
    { field: 'tags', contains: 'ML' },
  ],
  filter: [
    { field: 'created', gte: '2024-01-01' },
    { field: 'contentType', equals: 'text/markdown' },
  ],
});

// Find similar
const similar = await vault.search.findSimilar(strand.id, {
  limit: 10,
  threshold: 0.8,
});
```

## AI API

### AI Operations

```typescript
class AIAPI {
  async chat(
    messages: ChatMessage[],
    options?: {
      context?: {
        strandIds?: string[];
        loomIds?: string[];
        search?: string;
        limit?: number;
      };
      model?: string;
      temperature?: number;
      maxTokens?: number;
      stream?: boolean;
    }
  ): Promise<ChatResponse | AsyncIterable<ChatChunk>>;

  async generate(
    prompt: string,
    options?: {
      template?: string;
      variables?: Record<string, any>;
      outputFormat?: 'text' | 'markdown' | 'json';
      maxTokens?: number;
    }
  ): Promise<GeneratedContent>;

  async summarize(
    strandIds: string[],
    options?: {
      style?: 'brief' | 'detailed' | 'bullets';
      maxLength?: number;
    }
  ): Promise<Summary>;

  async extract(
    strandId: string,
    schema: {
      [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'array';
        description?: string;
        required?: boolean;
      };
    }
  ): Promise<ExtractedData>;

  async analyzeConnections(strandIds: string[]): Promise<ConnectionAnalysis>;
}
```

### AI Examples

```typescript
// Chat with context
const response = await vault.ai.chat(
  [{ role: 'user', content: 'What do my notes say about quantum entanglement?' }],
  {
    context: {
      loomIds: ['physics'],
      search: 'quantum entanglement',
      limit: 10,
    },
    temperature: 0.7,
    stream: true,
  }
);

// Stream response
for await (const chunk of response) {
  process.stdout.write(chunk.content);
}

// Generate content
const studyGuide = await vault.ai.generate('Create a study guide for {{topic}}', {
  variables: { topic: 'Machine Learning' },
  outputFormat: 'markdown',
  maxTokens: 2000,
});

// Extract structured data
const extracted = await vault.ai.extract(strand.id, {
  mainTopic: {
    type: 'string',
    description: 'Main topic',
  },
  keyPoints: {
    type: 'array',
    description: 'Key points',
  },
  sentiment: {
    type: 'string',
    description: 'Sentiment: positive/negative/neutral',
  },
});
```

## Sync API

### Sync Operations

```typescript
class SyncAPI {
  async getStatus(): Promise<SyncStatus>;

  async sync(options?: {
    force?: boolean;
    direction?: 'push' | 'pull' | 'both';
  }): Promise<SyncResult>;

  async getHistory(options?: { limit?: number; since?: Date }): Promise<SyncEvent[]>;

  async getConflicts(): Promise<SyncConflict[]>;

  async resolveConflict(
    conflictId: string,
    resolution: 'local' | 'remote' | 'merge'
  ): Promise<void>;

  async configure(settings: SyncSettings): Promise<void>;
}
```

## Plugin API

### Plugin Development

```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;
  description?: string;

  activate(context: PluginContext): Promise<void>;
  deactivate(): Promise<void>;

  commands?: Command[];
  hooks?: PluginHooks;
  ui?: UIContributions;
  settings?: SettingsSchema;
}

interface PluginContext {
  vault: VaultAPI;
  strands: StrandAPI;
  ai: AIAPI;

  storage: PluginStorage;
  events: EventEmitter;

  showMessage(message: string, type?: 'info' | 'warning' | 'error'): void;
  showInputBox(options: InputBoxOptions): Promise<string | undefined>;

  registerCommand(command: Command): Disposable;
  registerHook(event: string, handler: Function): Disposable;
}
```

### Plugin Example

```typescript
const citationPlugin: Plugin = {
  id: 'citation-manager',
  name: 'Citation Manager',
  version: '1.0.0',
  author: 'OpenStrand Community',

  async activate(context: PluginContext) {
    context.registerCommand({
      id: 'citation.insert',
      title: 'Insert Citation',
      execute: async () => {
        const doi = await context.showInputBox({
          prompt: 'Enter DOI',
          placeholder: '10.1234/example',
        });

        if (doi) {
          const citation = await this.fetchCitation(doi);
          // Insert into current strand
        }
      },
    });

    context.registerHook('beforeStrandSave', async (strand) => {
      strand.content = await this.formatCitations(strand.content);
      return strand;
    });
  },
};
```

## WebSocket API

### Real-time Updates

```typescript
const ws = openstrand.connect();

ws.on('strand:created', (strand) => {
  console.log('New strand:', strand.title);
});

ws.on('strand:updated', (strand) => {
  console.log('Updated:', strand.title);
});

ws.on('sync:progress', (progress) => {
  console.log(`Sync: ${progress.percent}%`);
});

// Collaborative session
const session = await ws.joinSession('strand-id');

session.on('user:joined', (user) => {
  console.log(`${user.name} joined`);
});

session.on('cursor:moved', (cursor) => {
  updateCursorPosition(cursor);
});

session.on('content:changed', (change) => {
  applyChange(change);
});
```

## SDK Configuration

### Advanced Configuration

```typescript
const openstrand = new OpenStrand({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.openstrand.ai',
  version: 'v1',

  timeout: 30000,
  retries: 3,
  retryDelay: 1000,

  cache: {
    enabled: true,
    ttl: 300,
    storage: 'memory',
  },

  debug: {
    enabled: true,
    logLevel: 'info',
    logRequests: true,
    logResponses: false,
  },

  headers: {
    'X-Custom-Header': 'value',
  },

  interceptors: {
    request: async (config) => {
      // Modify request
      return config;
    },
    response: async (response) => {
      // Process response
      return response;
    },
    error: async (error) => {
      // Handle errors
      throw error;
    },
  },
});
```
