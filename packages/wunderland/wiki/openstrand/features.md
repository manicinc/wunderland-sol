# OpenStrand Features

Complete feature documentation for OpenStrand.

## Knowledge Capture

### Universal Import

OpenStrand imports from 20+ sources while preserving structure and metadata.

#### Supported Formats

| Format        | Extension    | Features Preserved               |
| ------------- | ------------ | -------------------------------- |
| Markdown      | .md          | Links, tags, frontmatter         |
| Notion        | .html, .csv  | Databases, relations, properties |
| Obsidian      | Vault folder | Plugin data, graph structure     |
| Roam Research | .json        | Block refs, queries              |
| Org-mode      | .org         | TODO states, properties          |
| OneNote       | .one         | Sections, notebooks              |
| Evernote      | .enex        | Tags, notebooks, attachments     |
| Apple Notes   | Via API      | Folders, attachments             |
| Google Docs   | Via API      | Comments, suggestions            |
| PDF           | .pdf         | Annotations, bookmarks           |
| Word          | .docx        | Styles, comments                 |
| Plain Text    | .txt         | Basic import                     |
| HTML          | .html        | Structure, links                 |
| OPML          | .opml        | Outline structure                |
| JSON          | .json        | Structured data                  |
| CSV           | .csv         | Tabular data                     |
| Images        | .jpg, .png   | EXIF data, OCR                   |
| Audio         | .mp3, .m4a   | Transcription                    |
| Video         | .mp4, .mov   | Transcription, keyframes         |
| Web Pages     | URL          | Clean article extraction         |

#### Import Example

```typescript
const importer = openstrand.createImporter();

importer.on('progress', (progress) => {
  console.log(`Importing: ${progress.current}/${progress.total}`);
});

const results = await importer.import({
  sources: [
    { path: './obsidian-vault', format: 'obsidian' },
    { path: './notion-export.zip', format: 'notion' },
    { path: './pdfs/*.pdf', format: 'pdf' },
  ],
  options: {
    preserveStructure: true,
    extractImages: true,
    generateEmbeddings: true,
    deduplication: 'content-hash',
  },
});
```

### Smart Capture

#### Quick Capture

```typescript
const capture = await openstrand.quickCapture({
  content: 'Meeting notes from discussion',
  tags: ['meeting', 'team'],
  loom: 'work-notes',
});

const enhanced = await capture.enhance({
  generateSummary: true,
  extractTasks: true,
  suggestLinks: true,
});
```

#### Web Clipper

```typescript
const clip = await openstrand.clipWeb({
  url: 'https://example.com/article',
  options: {
    fullPage: false,
    simplify: true,
    extractMetadata: true,
  },
});
```

#### Voice Notes

```typescript
const voice = await openstrand.recordVoice();

const strand = await voice.save({
  enhanceTranscription: true,
  generateSummary: true,
  detectSpeakers: true,
});
```

## Search & Discovery

### Semantic Search

Find information by meaning, not just keywords.

```typescript
const results = await vault.search('quantum computing ideas', {
  mode: 'semantic',
  filters: {
    looms: ['physics', 'research'],
    tags: ['quantum'],
    dateRange: { from: '2024-01-01' },
    contentTypes: ['text/markdown', 'application/pdf'],
  },
  includeArchived: false,
  limit: 20,
});

results.items.forEach((item) => {
  console.log(`${item.title} (${item.score})`);
  console.log(`Relevant: ${item.explanation}`);
  console.log(`Excerpts: ${item.highlights}`);
});
```

### Advanced Queries

```typescript
const query = vault
  .query()
  .where('contentType', 'equals', 'text/markdown')
  .and((q) => q.where('tags', 'contains', 'important').or('title', 'matches', /^Project/))
  .orderBy('modified', 'desc')
  .limit(50);

const results = await query.execute();

const connected = await vault
  .graph()
  .from('strand-id')
  .follow('links', { types: ['related', 'references'] })
  .depth(3)
  .where('tags', 'contains', 'quantum')
  .execute();
```

### Smart Suggestions

```typescript
const suggester = vault.createSuggester();

suggester.on('typing', async (text) => {
  const suggestions = await suggester.suggest(text, {
    links: true,
    tags: true,
    completions: true,
  });

  return suggestions;
});

const related = await strand.findRelated({
  method: 'embedding',
  limit: 10,
  threshold: 0.7,
});
```

## AI Features

### AI Assistant

Context-aware chat that understands your knowledge base.

```typescript
const chat = vault.createChat();

const response = await chat.send('Explain quantum physics concepts from my notes', {
  context: {
    looms: ['physics'],
    timeRange: 'last-month',
    includeRelated: true,
  },
  style: 'academic',
  maxTokens: 1000,
  temperature: 0.7,
});

await chat.send('Create a study guide from these concepts?');

const history = await chat.export('markdown');
```

### Content Generation

```typescript
const writer = strand.createWriter();

const continuation = await writer.continue({
  length: 'paragraph',
  style: 'match',
  creativity: 0.7,
});

const rewritten = await writer.rewrite(selectedText, {
  goal: 'clarify',
  preserveMeaning: true,
});

const generated = await vault.generate({
  template: 'meeting-notes',
  variables: {
    date: '2024-11-15',
    attendees: ['Alice', 'Bob'],
    topics: ['Q4 Planning'],
  },
});
```

### Knowledge Synthesis

```typescript
const synthesis = await vault.synthesize({
  question: 'What are the main themes in my research?',
  sources: {
    looms: ['research', 'papers'],
    minScore: 0.6,
  },
  output: {
    format: 'report',
    sections: ['overview', 'key-findings', 'connections', 'gaps'],
  },
});

const insights = await vault.analyzeGraph({
  metrics: ['centrality', 'clusters', 'bridges'],
  visualize: true,
});
```

## Zettelkasten Workflow

### Note Maturity Tracking

Track note evolution through the Zettelkasten lifecycle.

```typescript
// Set note maturity status
await strand.setMaturity({
  status: 'literature', // fleeting, literature, permanent, evergreen
  futureValue: 'high', // low, medium, high, core
});

// Promote note to next stage
await strand.promoteMaturity();

// Get notes by maturity stage
const fleeting = await vault.query().where('maturity.status', 'equals', 'fleeting').execute();

// Find notes ready for refinement
const needsReview = await vault
  .query()
  .where('maturity.status', 'equals', 'literature')
  .and('maturity.lastRefinedAt', 'olderThan', '30d')
  .execute();
```

### Link Context (Semantic Relationships)

Add meaning to your links with relationship types and context.

```typescript
// Create a typed relationship
await strand.linkTo('target-strand', {
  type: 'extends', // extends, contrasts, supports, example-of, implements, questions
  context: 'Builds on the core concepts from this foundation',
});

// Get all relationships by type
const extensions = await strand.getRelationships({
  type: 'extends',
  direction: 'outgoing',
});

// Find contrasting viewpoints
const contrasts = await vault.getRelationshipsByType('contrasts');
```

**Link Context Syntax in Markdown:**

```markdown
This concept [[target-note::extends|builds on the foundation of X]]
Here's a counterpoint [[other-note::contrasts|but this view disagrees]]
For example, see [[example-note::example-of|practical application]]
```

### Maps of Content (MOC)

Create structure notes that organize related content.

```typescript
// Create a MOC
const moc = await vault.createMOC({
  topic: 'Machine Learning',
  scope: 'topic', // subject, topic, project
  autoUpdate: true,
  sections: ['Fundamentals', 'Architectures', 'Applications'],
});

// Generate MOC from taxonomy
const generatedMocs = await vault.generateMOCs({
  level: 'topic',
  minStrands: 5,
  includeMaturity: true,
});

// Auto-update MOC when strands change
moc.on('strandAdded', async (strand) => {
  await moc.refresh();
});
```

### Quality Checks

Ensure notes meet Zettelkasten quality standards.

```typescript
// Check note quality
const quality = await strand.checkQuality();
// Returns: { hasContext, hasConnections, isAtomic, isSelfContained }

// Find notes needing improvement
const needsWork = await vault
  .query()
  .where('qualityChecks.hasConnections', 'equals', false)
  .or('qualityChecks.isSelfContained', 'equals', false)
  .execute();

// Set quality flags
await strand.setQualityChecks({
  hasContext: true,
  hasConnections: true,
  isAtomic: true,
  isSelfContained: true,
});
```

## Knowledge Graph

### Interactive Visualization

```typescript
const graph = vault.createGraph({
  renderer: 'three.js',
  dimensions: 3,

  nodeColors: {
    byProperty: 'contentType',
    scheme: 'category10',
  },

  nodeSize: {
    byProperty: 'connections',
    scale: 'log',
  },

  physics: {
    charge: -300,
    linkDistance: 50,
    gravity: 0.1,
  },

  filters: {
    minConnections: 2,
    looms: ['selected'],
    timeRange: 'last-year',
  },
});

graph.on('nodeClick', (node) => {
  vault.openStrand(node.id);
});

graph.on('nodeHover', (node) => {
  graph.highlightConnections(node);
});
```

### Graph Analysis

```typescript
const important = await vault.graph.analyze({
  metrics: {
    pageRank: true,
    betweenness: true,
    clustering: true,
  },
  top: 20,
});

const communities = await vault.graph.detectCommunities({
  algorithm: 'louvain',
  minSize: 5,
});

const path = await vault.graph.shortestPath('strand-id-1', 'strand-id-2', { maxLength: 5 });
```

## Sync & Collaboration

### Selective Sync

```typescript
await vault.configureSync({
  include: {
    looms: ['shared', 'public'],
    tags: ['sync'],
  },

  exclude: {
    tags: ['private', 'local-only'],
    contentTypes: ['application/pdf'],
  },

  encryption: {
    enabled: true,
    method: 'e2e',
    keyDerivation: 'argon2id',
  },

  conflictResolution: 'manual',
  interval: 300,
});
```

### Real-time Collaboration

```typescript
const workspace = await vault.createWorkspace('Team Research', {
  members: ['alice@example.com', 'bob@example.com'],
  permissions: {
    alice: 'admin',
    bob: 'editor',
  },
});

workspace.on('presence', (presence) => {
  console.log(`${presence.user} is editing ${presence.strand}`);
});

const session = await workspace.joinEditSession('strand-id');

session.on('change', (change) => {
  editor.applyChange(change);
});
```

## Customization

### Themes

```typescript
await openstrand.setTheme({
  name: 'midnight',
  colors: {
    background: '#0a0a0a',
    foreground: '#e0e0e0',
    primary: '#7c3aed',
    secondary: '#10b981',
  },
  fonts: {
    ui: 'Inter',
    editor: 'JetBrains Mono',
    serif: 'Crimson Text',
  },
});

await openstrand.injectCSS(`
  .strand-title {
    font-size: 1.5rem;
    font-weight: 600;
  }
`);
```

### Plugins

```typescript
await openstrand.plugins.install('@community/citation-manager');

await openstrand.plugins.configure('citation-manager', {
  style: 'apa',
  autoFormat: true,
});

const myPlugin = {
  id: 'my-plugin',
  name: 'My Custom Plugin',
  version: '1.0.0',

  activate(context) {
    context.registerCommand({
      id: 'my-plugin.hello',
      title: 'Say Hello',
      execute: () => alert('Hello!'),
    });

    context.ui.statusBar.add({
      text: 'My Plugin',
      tooltip: 'Click for options',
      onClick: () => this.showOptions(),
    });
  },
};

await openstrand.plugins.register(myPlugin);
```

### Workflows

```typescript
const workflow = await vault.createWorkflow({
  name: 'Daily Review',
  triggers: {
    schedule: '0 9 * * *',
    manual: true,
  },

  steps: [
    {
      action: 'query',
      params: {
        filter: 'modified:today',
        sort: 'modified:desc',
      },
    },
    {
      action: 'generate',
      params: {
        template: 'daily-summary',
        output: 'daily-notes',
      },
    },
    {
      action: 'notify',
      params: {
        message: 'Daily review ready',
      },
    },
  ],
});
```

## Privacy & Security

### Encryption

```typescript
await vault.enableEncryption({
  method: 'xchacha20-poly1305',
  keyDerivation: {
    algorithm: 'argon2id',
    iterations: 3,
    memory: 64 * 1024,
    parallelism: 2,
  },
});

await strand.encrypt({
  password: 'strong-password',
  hint: 'First pet + birth year',
});

const shareLink = await strand.share({
  expiresIn: '7d',
  password: 'share-password',
  permissions: ['read'],
  maxViews: 10,
});
```

### Access Control

```typescript
await loom.setPermissions({
  public: false,
  users: {
    'alice@example.com': ['read', 'write'],
    'bob@example.com': ['read'],
  },
  groups: {
    'research-team': ['read', 'write', 'share'],
  },
});

const auditLog = await vault.getAuditLog({
  actions: ['read', 'write', 'delete', 'share'],
  users: ['alice@example.com'],
  dateRange: { from: '2024-10-01' },
});
```

## Platform Features

### Cross-Platform Sync

```typescript
await openstrand.registerDevice({
  name: 'MacBook Pro',
  type: 'desktop',
  syncEnabled: true,
});

await openstrand.configureDeviceSync({
  iPhone: {
    downloadImages: false,
    offlineLooms: ['quick-notes', 'todos'],
  },
  iPad: {
    fullSync: true,
    priority: 'wifi',
  },
});
```

### Offline Mode

```typescript
const offline = openstrand.offline();

offline.on('change', (change) => {
  console.log(`Queued: ${change.type}`);
});

offline.on('online', async () => {
  const pending = await offline.getPendingChanges();
  await offline.sync();
});

offline.on('conflict', async (conflict) => {
  const resolution = await showConflictUI(conflict);
  await offline.resolve(conflict.id, resolution);
});
```
