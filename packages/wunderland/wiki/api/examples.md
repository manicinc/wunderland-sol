# API Code Examples

Practical examples for common use cases.

> **🚧 Work in Progress**
> 
> These code examples demonstrate planned API functionality. The Frame.dev API is under development and these examples are for reference only.

## Quick Start

### Initialize Client

JavaScript/TypeScript:
```typescript
import { FrameClient, OpenStrand } from '@framersai/sdk';

const frame = new FrameClient({
  apiKey: process.env.FRAME_API_KEY
});

const openstrand = new OpenStrand({
  apiKey: process.env.OPENSTRAND_API_KEY
});
```

Python:
```python
from frame_sdk import FrameClient, OpenStrand

frame = FrameClient(api_key=os.environ['FRAME_API_KEY'])
openstrand = OpenStrand(api_key=os.environ['OPENSTRAND_API_KEY'])
```

Go:
```go
import (
    "github.com/framersai/go-sdk/frame"
    "github.com/framersai/go-sdk/openstrand"
)

frameClient := frame.NewClient(os.Getenv("FRAME_API_KEY"))
osClient := openstrand.NewClient(os.Getenv("OPENSTRAND_API_KEY"))
```

## Knowledge Management

### Create Knowledge Base

```typescript
// Create vault
const vault = await openstrand.vaults.create({
  name: 'Research Notes',
  description: 'Personal research knowledge base',
  settings: {
    ai: {
      provider: 'openai',
      model: 'gpt-4',
      embeddings: {
        model: 'text-embedding-ada-002',
        dimensions: 1536
      }
    }
  }
});

// Create looms
const physicsLoom = await vault.looms.create({
  name: 'Physics',
  icon: '⚛️',
  color: '#4F46E5'
});

const csLoom = await vault.looms.create({
  name: 'Computer Science',
  icon: '💻',
  color: '#10B981'
});
```

### Import Existing Notes

```typescript
const importer = vault.createImporter();

// Import Obsidian vault
await importer.import({
  source: './my-obsidian-vault',
  format: 'obsidian',
  options: {
    preserveLinks: true,
    preserveTags: true,
    generateEmbeddings: true
  }
});

// Import Notion export
await importer.import({
  source: './notion-export.zip',
  format: 'notion',
  options: {
    preserveDatabases: true,
    convertToMarkdown: true
  }
});

// Batch import PDFs
const pdfFiles = await glob('./research-papers/*.pdf');
for (const file of pdfFiles) {
  await importer.import({
    source: file,
    format: 'pdf',
    options: {
      extractText: true,
      extractImages: true,
      generateSummary: true
    }
  });
}
```

### Create and Link Strands

```typescript
// Create parent strand
const quantumTheory = await vault.strands.create({
  title: 'Introduction to Quantum Theory',
  content: {
    type: 'markdown',
    data: `# Quantum Theory Basics
    
Quantum theory is the theoretical basis of modern physics...`
  },
  loomId: physicsLoom.id,
  tags: ['quantum', 'physics', 'fundamentals']
});

// Create related strand
const schrodinger = await vault.strands.create({
  title: 'Schrödinger Equation',
  content: {
    type: 'markdown',
    data: `The Schrödinger equation is a linear partial differential equation...`
  },
  loomId: physicsLoom.id,
  tags: ['quantum', 'equations']
});

// Create relationships
await vault.relationships.createLink({
  sourceId: quantumTheory.id,
  targetId: schrodinger.id,
  type: 'related',
  metadata: {
    description: 'Fundamental equation in quantum mechanics'
  }
});
```

## Search and Discovery

### Semantic Search

```typescript
// Natural language search
const searchResults = await vault.search('explain quantum entanglement', {
  mode: 'semantic',
  filters: {
    looms: [physicsLoom.id],
    dateRange: {
      from: new Date('2024-01-01')
    }
  },
  limit: 10
});

for (const result of searchResults.items) {
  console.log(`${result.title} (Score: ${result.score})`);
  console.log(`Excerpt: ${result.highlights[0]}`);
  console.log(`Explanation: ${result.explanation}\n`);
}
```

### Advanced Queries

```typescript
// Complex query
const query = vault.createQuery()
  .where('content', 'contains', 'machine learning')
  .and(q => q
    .where('tags', 'includes', 'AI')
    .or('tags', 'includes', 'ML')
  )
  .andWhere('created', '>=', '2024-01-01')
  .orderBy('relevance', 'desc')
  .limit(20);

const results = await query.execute();

// Graph traversal
const graphQuery = vault.graph()
  .start('strand-123')
  .follow('related', { direction: 'both' })
  .depth(3)
  .where('tags', 'includes', 'important')
  .execute();

// Find clusters
const clusters = await vault.graph.detectCommunities({
  algorithm: 'louvain',
  minSize: 5,
  resolution: 1.0
});
```

### Real-time Suggestions

```typescript
const suggester = vault.createSuggester();

let typingTimer;
textEditor.on('input', async (event) => {
  clearTimeout(typingTimer);
  
  typingTimer = setTimeout(async () => {
    const text = event.target.value;
    const cursorPosition = event.target.selectionStart;
    
    const suggestions = await suggester.suggest({
      text,
      position: cursorPosition,
      context: {
        currentStrand: currentStrand.id,
        recentStrands: recentlyViewed.map(s => s.id)
      },
      types: ['completions', 'links', 'tags']
    });
    
    showSuggestions(suggestions);
  }, 300);
});
```

## AI Integration

### Conversational AI

```typescript
// Create chat session
const chat = vault.createChat({
  model: 'gpt-4',
  systemPrompt: 'You are a helpful research assistant with access to my knowledge base.'
});

// Ask questions
const response = await chat.send(
  'What are the key differences between classical and quantum physics based on my notes?',
  {
    context: {
      looms: [physicsLoom.id],
      relevantStrands: 10,
      includeRelated: true
    }
  }
);

console.log(response.answer);
console.log('Sources:', response.sources.map(s => s.title));

// Follow up
const followUp = await chat.send(
  'Can you create a summary table of these differences?'
);

// Export conversation
const conversationStrand = await chat.exportAsStrand({
  title: 'Classical vs Quantum Physics Discussion',
  loom: physicsLoom.id,
  tags: ['ai-generated', 'summary']
});
```

### Content Generation

```typescript
const writer = strand.createWriter();

// Continue writing
const continuation = await writer.continue({
  prompt: 'Continue this explanation of quantum tunneling',
  length: 'paragraph',
  style: 'academic',
  temperature: 0.7
});

// Generate outline
const outline = await writer.generateOutline({
  topic: 'Introduction to Machine Learning',
  depth: 3,
  style: 'tutorial'
});

// Create study materials
const studyGuide = await vault.ai.generate({
  template: 'study-guide',
  data: {
    topic: 'Quantum Computing',
    level: 'undergraduate',
    format: 'q&a'
  },
  sources: {
    loomId: physicsLoom.id,
    minRelevance: 0.7
  }
});
```

### Knowledge Synthesis

```typescript
// Synthesize insights
const synthesis = await vault.ai.synthesize({
  question: 'What are the emerging trends in AI based on my research notes?',
  sources: {
    looms: [csLoom.id],
    dateRange: { from: '2024-01-01' },
    minStrands: 10
  },
  output: {
    format: 'report',
    sections: [
      'executive-summary',
      'key-trends',
      'supporting-evidence',
      'implications',
      'gaps-in-knowledge'
    ],
    maxLength: 2000
  }
});

// Generate knowledge map
const knowledgeMap = await vault.ai.mapKnowledge({
  loomId: csLoom.id,
  visualization: 'hierarchical',
  includeGaps: true,
  suggestConnections: true
});
```

## Analytics and Insights

### Knowledge Analytics

```typescript
// Get vault statistics
const stats = await vault.getStats();
console.log(`Total strands: ${stats.strandCount}`);
console.log(`Total connections: ${stats.linkCount}`);
console.log(`Knowledge density: ${stats.density}`);

// Analyze growth
const growth = await vault.analytics.getGrowth({
  period: 'month',
  groupBy: 'loom',
  metrics: ['strands', 'words', 'connections']
});

// Find knowledge gaps
const gaps = await vault.analytics.findGaps({
  method: 'connectivity',
  threshold: 0.3
});

console.log('Potential knowledge gaps:');
gaps.forEach(gap => {
  console.log(`- Between "${gap.area1}" and "${gap.area2}"`);
  console.log(`  Suggested topics: ${gap.suggestions.join(', ')}`);
});
```

### Personal Insights

```typescript
// Reading patterns
const readingPatterns = await vault.analytics.getReadingPatterns({
  period: 'last-30-days',
  groupBy: 'hour-of-day'
});

// Knowledge hubs
const hubs = await vault.graph.analyze({
  metric: 'betweenness-centrality',
  top: 10
});

// Learning velocity
const velocity = await vault.analytics.getLearningVelocity({
  period: 'week',
  metrics: ['strands-created', 'connections-made', 'words-written']
});

// Generate report
const report = await vault.analytics.generateReport({
  period: 'month',
  sections: [
    'summary',
    'top-topics',
    'learning-patterns',
    'knowledge-gaps',
    'recommendations'
  ],
  format: 'markdown'
});
```

## Sync and Collaboration

### Selective Sync

```typescript
// Configure sync rules
await vault.sync.configure({
  rules: [
    {
      condition: { loom: 'work-notes' },
      action: 'sync',
      encryption: true
    },
    {
      condition: { tags: ['personal', 'private'] },
      action: 'local-only'
    },
    {
      condition: { all: true },
      action: 'sync',
      encryption: false
    }
  ],
  conflictResolution: 'manual',
  syncInterval: 300
});

// Manual sync
const syncResult = await vault.sync.now({
  direction: 'both',
  dryRun: false
});

console.log(`Pushed: ${syncResult.pushed} strands`);
console.log(`Pulled: ${syncResult.pulled} strands`);
console.log(`Conflicts: ${syncResult.conflicts.length}`);
```

### Real-time Collaboration

```typescript
// Create workspace
const workspace = await vault.createWorkspace({
  name: 'Research Team',
  members: [
    { email: 'alice@example.com', role: 'editor' },
    { email: 'bob@example.com', role: 'viewer' }
  ]
});

// Join session
const session = await workspace.joinSession(strand.id);

session.on('change', (change) => {
  console.log(`${change.user} modified ${change.type}`);
  editor.applyChange(change);
});

session.on('presence', (presence) => {
  updateUserCursors(presence.users);
});

editor.on('change', (delta) => {
  session.sendChange(delta);
});

await session.leave();
```

## UI Integration

### React Components

```tsx
import { StrandViewer, VaultExplorer, KnowledgeGraph } from '@framersai/react';

function App() {
  const [vault] = useVault('vault-id');
  const [selectedStrand, setSelectedStrand] = useState(null);
  
  return (
    <div className="app">
      <VaultExplorer
        vault={vault}
        onStrandSelect={setSelectedStrand}
        showSearch
        showTags
      />
      
      <StrandViewer
        strand={selectedStrand}
        enableEdit
        showRelated
        onLink={(target) => setSelectedStrand(target)}
      />
      
      <KnowledgeGraph
        vault={vault}
        layout="force-directed"
        dimensions={3}
        onNodeClick={(node) => setSelectedStrand(node.strand)}
      />
    </div>
  );
}
```

### Vue Components

```vue
<template>
  <div class="knowledge-app">
    <knowledge-search 
      v-model="searchQuery"
      :vault-id="vaultId"
      @results="handleResults"
    />
    
    <strand-list
      :strands="strands"
      :selected="selectedStrand"
      @select="selectStrand"
    />
    
    <ai-chat
      :vault-id="vaultId"
      :context-loom="currentLoom"
      :height="400"
    />
  </div>
</template>

<script>
import { 
  KnowledgeSearch, 
  StrandList, 
  AiChat 
} from '@framersai/vue';

export default {
  components: {
    KnowledgeSearch,
    StrandList,
    AiChat
  }
};
</script>
```

## Webhook Integration

### Setup Webhooks

```typescript
// Register webhook
const webhook = await frame.webhooks.create({
  url: 'https://your-app.com/webhooks/frame',
  events: [
    'strand.created',
    'strand.updated',
    'strand.deleted',
    'ai.synthesis.completed'
  ],
  secret: 'webhook-secret-key'
});

// Express handler
app.post('/webhooks/frame', async (req, res) => {
  const signature = req.headers['x-frame-signature'];
  if (!verifyWebhookSignature(req.body, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  const event = req.body;
  
  switch (event.type) {
    case 'strand.created':
      await handleNewStrand(event.data);
      break;
      
    case 'ai.synthesis.completed':
      await notifyUser(event.data);
      break;
  }
  
  res.status(200).send('OK');
});

// Verify signature
function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(JSON.stringify(payload)).digest('hex');
  return signature === `sha256=${digest}`;
}
```

## Advanced Use Cases

### Second Brain App

```typescript
class SecondBrain {
  constructor(apiKey: string) {
    this.client = new OpenStrand({ apiKey });
    this.vault = null;
  }
  
  async initialize() {
    this.vault = await this.client.vaults.get('default') ||
                 await this.client.vaults.create({
                   name: 'My Second Brain',
                   settings: { /* ... */ }
                 });
    
    await this.setupImporters();
    await this.setupAI();
    await this.startBackgroundJobs();
  }
  
  async captureThought(text: string) {
    const enhanced = await this.vault.ai.enhance(text, {
      generateTitle: true,
      suggestTags: true,
      findRelated: true
    });
    
    const strand = await this.vault.strands.create({
      title: enhanced.title,
      content: { type: 'markdown', data: enhanced.content },
      tags: enhanced.tags,
      metadata: { source: 'quick-capture' }
    });
    
    for (const related of enhanced.related) {
      await this.vault.relationships.createLink({
        sourceId: strand.id,
        targetId: related.id,
        type: 'related'
      });
    }
    
    return strand;
  }
  
  async dailyReview() {
    const today = await this.vault.analytics.getActivity({
      period: 'today',
      includeContent: true
    });
    
    const summary = await this.vault.ai.summarize(
      today.strands.map(s => s.id),
      {
        style: 'bullets',
        includeInsights: true,
        suggestNextSteps: true
      }
    );
    
    return await this.vault.strands.create({
      title: `Daily Review - ${new Date().toLocaleDateString()}`,
      content: { type: 'markdown', data: summary },
      tags: ['daily-review', 'automated']
    });
  }
}

// Usage
const brain = new SecondBrain(process.env.API_KEY);
await brain.initialize();
await brain.captureThought('Interesting idea about quantum computing...');
await brain.dailyReview();
```

### Research Assistant

```typescript
class ResearchAssistant {
  constructor(vault: Vault) {
    this.vault = vault;
    this.arxivClient = new ArxivClient();
  }
  
  async researchTopic(topic: string) {
    const existing = await this.vault.search(topic, { limit: 50 });
    
    const gaps = await this.vault.ai.findGaps({
      topic,
      existing: existing.items
    });
    
    const papers = await this.arxivClient.search(topic, {
      limit: 10,
      sortBy: 'relevance'
    });
    
    for (const paper of papers) {
      if (this.isRelevant(paper, gaps)) {
        const strand = await this.importPaper(paper);
        
        const summary = await this.vault.ai.summarize(
          strand.id,
          { style: 'academic' }
        );
        
        await this.vault.strands.update(strand.id, {
          metadata: {
            ...strand.metadata,
            summary,
            arxivId: paper.id
          }
        });
      }
    }
    
    return await this.generateReport(topic);
  }
  
  async generateReport(topic: string) {
    const report = await this.vault.ai.generate({
      template: 'research-report',
      data: { topic },
      sections: [
        'abstract',
        'introduction',
        'literature-review',
        'key-findings',
        'gaps-and-opportunities',
        'conclusion',
        'references'
      ],
      sources: {
        search: topic,
        minRelevance: 0.7,
        includeCitations: true
      }
    });
    
    return await this.vault.strands.create({
      title: `Research Report: ${topic}`,
      content: { type: 'markdown', data: report },
      tags: ['research', 'report', 'ai-generated']
    });
  }
}
```