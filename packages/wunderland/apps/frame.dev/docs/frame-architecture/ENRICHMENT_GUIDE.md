# Document Enrichment Guide

> AI/NLP-powered suggestions and Oracle commands for intelligent document enhancement

## Overview

**Document Enrichment** leverages Quarry's client-side AI and NLP capabilities to analyze your documents and suggest improvements. All processing runs locally—your data never leaves your device.

---

## Enrichment Features

### 1. Suggested Tags

AI analyzes document content and suggests relevant tags:

```
┌─────────────────────────────────────────┐
│ 📝 Suggested Tags                       │
├─────────────────────────────────────────┤
│ + machine-learning     (confidence: 92%)│
│ + neural-networks      (confidence: 87%)│
│ + python               (confidence: 84%)│
│ + data-science         (confidence: 78%)│
└─────────────────────────────────────────┘
```

**How it works:**
1. Extract keywords using TF-IDF
2. Match against existing taxonomy
3. Use embeddings to find semantic matches
4. Rank by confidence score

### 2. Category Suggestions

Context-aware categorization using document hierarchy:

```
┌─────────────────────────────────────────┐
│ 📂 Suggested Category                   │
├─────────────────────────────────────────┤
│ Engineering > Machine Learning > Tutorials│
│                                         │
│ Reasoning: Document discusses neural    │
│ network training with code examples.    │
│ Similar to 3 other docs in this category│
└─────────────────────────────────────────┘
```

**Context signals used:**
- Document content analysis
- Parent folder structure
- Related document categories
- Entity and mention types

### 3. View Suggestions

AI recommends appropriate views based on data types:

```
┌─────────────────────────────────────────┐
│ 👁️ Suggested Views                      │
├─────────────────────────────────────────┤
│ 🗺️ Map View                             │
│    5 places detected                    │
│                                         │
│ 📅 Calendar View                        │
│    8 events with dates                  │
│                                         │
│ 📊 Chart View                           │
│    Numeric data suitable for bar chart  │
└─────────────────────────────────────────┘
```

**Detection heuristics:**
- Place mentions → Map view
- Date mentions/events → Calendar view
- Numeric values → Chart view
- Structured lists → Table view
- Task items → List view

### 4. Related Documents

Semantic search finds related content:

```
┌─────────────────────────────────────────┐
│ 🔗 Related Documents                    │
├─────────────────────────────────────────┤
│ Neural Network Basics        (sim: 0.89)│
│ TensorFlow Tutorial          (sim: 0.84)│
│ Deep Learning Notes          (sim: 0.81)│
│ ML Project Ideas             (sim: 0.76)│
└─────────────────────────────────────────┘
```

**Matching methods:**
- Vector similarity (embeddings)
- Shared tags and categories
- Linked mentions
- Co-referenced entities

### 5. Entity Extraction

NLP extracts structured entities from text:

```
┌─────────────────────────────────────────┐
│ 🏷️ Extracted Entities                   │
├─────────────────────────────────────────┤
│ 👤 People: John Smith, Dr. Sarah Chen   │
│ 📍 Places: San Francisco, MIT           │
│ 📅 Dates: June 15, next Monday          │
│ 🏢 Orgs: Google, OpenAI                 │
│ 💻 Tech: Python, TensorFlow, PyTorch    │
└─────────────────────────────────────────┘
```

---

## Enrichment UI

### Metadata Panel

The right sidebar shows enrichment suggestions:

```
┌─────────────────────────────────────────┐
│ Document Metadata                       │
├─────────────────────────────────────────┤
│ Tags: #ml #python                       │
│ Category: Engineering/ML                │
├─────────────────────────────────────────┤
│ 🤖 AI Suggestions                       │
│                                         │
│ Suggested Tags                          │
│ [+ deep-learning] [+ tensorflow]        │
│                                         │
│ Suggested Category                      │
│ [→ Tutorials/ML]                        │
│                                         │
│ Suggested Views                         │
│ [📊 Add Chart] [📋 Add Table]           │
│                                         │
│ Related Documents                       │
│ • Neural Network Basics                 │
│ • TensorFlow Tutorial                   │
└─────────────────────────────────────────┘
```

### Dashboard Widget

The Enrichment Suggestions widget shows documents needing attention:

```
┌─────────────────────────────────────────┐
│ 💡 Enrichment Suggestions               │
├─────────────────────────────────────────┤
│ 5 documents have suggestions            │
│                                         │
│ [All] [Tags] [Categories] [Views]       │
│                                         │
│ • ML Tutorial Notes                     │
│   +3 tags, +1 view suggested            │
│                                         │
│ • Q3 Planning Doc                       │
│   +2 tags, category change              │
│                                         │
│ • Travel Itinerary                      │
│   +1 view (map) suggested               │
└─────────────────────────────────────────┘
```

---

## Oracle AI Commands

The Oracle AI Assistant understands enrichment commands in natural language.

### Tag Suggestions

```
> "Suggest tags for this document"
> "What tags should I add?"
> "Find relevant tags"
```

**Response:**
```
Based on the content, I suggest these tags:
• #machine-learning (92% confidence)
• #python (87% confidence)  
• #tutorial (84% confidence)

[Apply All] [Select Tags]
```

### Category Suggestions

```
> "What category fits this document?"
> "Suggest a category"
> "Where should this doc go?"
```

**Response:**
```
I recommend: Engineering > Machine Learning > Tutorials

Reasoning: This document contains code examples and 
step-by-step instructions for training neural networks.
It's similar to 3 other documents in this category.

[Apply Category] [Browse Categories]
```

### Entity Extraction

```
> "Extract all people mentioned"
> "Find dates in this document"
> "What places are referenced?"
```

**Response:**
```
Found 5 people mentions:
• @John-Smith (3 occurrences)
• @Sarah-Chen (2 occurrences)
• @Dr-Alan-Turing (1 occurrence)

[Create Mentions] [Ignore]
```

### View Suggestions

```
> "What views would work for this document?"
> "Suggest visualizations"
> "How can I display this data?"
```

**Response:**
```
Based on your data, I recommend:

📍 Map View - You have 5 place mentions
   → Shows trip destinations on interactive map

📅 Calendar View - 8 date references found
   → Displays events on monthly calendar

📊 Bar Chart - Numeric budget data detected
   → Visualizes spending by category

[Insert Map] [Insert Calendar] [Insert Chart]
```

### Related Documents

```
> "Find related documents"
> "What else is similar to this?"
> "Show connected notes"
```

**Response:**
```
Documents related to "ML Tutorial Notes":

1. Neural Network Fundamentals (89% similar)
   - Shared concepts: backpropagation, gradients
   
2. TensorFlow Getting Started (84% similar)
   - Both are Python ML tutorials
   
3. Deep Learning Project (81% similar)
   - References same concepts

[Open] [Link] [Compare]
```

### Document Analysis

```
> "Analyze this document"
> "What can you tell me about this content?"
> "Summarize and suggest improvements"
```

**Response:**
```
📊 Document Analysis

Content: 1,200 words about neural network training
Reading time: ~5 minutes
Complexity: Intermediate

Suggestions:
• Add #deep-learning and #backpropagation tags
• Move to Tutorials/ML category
• Insert a diagram view for the architecture
• Link to "Neural Network Basics" as prerequisite

Quality score: 7.5/10
- Good: Clear examples, structured sections
- Improve: Add summary, more cross-references

[Apply All Suggestions]
```

### Batch Enrichment

```
> "Enrich all documents in this folder"
> "Suggest tags for recent documents"
> "Find uncategorized notes"
```

---

## Enrichment Actions

### Available Actions

| Action | Description | Command |
|--------|-------------|---------|
| `enrichDocument` | Full analysis with all suggestions | "Enrich this document" |
| `extractMentions` | Find and create entity mentions | "Extract mentions" |
| `suggestTags` | Tag recommendations | "Suggest tags" |
| `suggestCategory` | Category recommendation | "Suggest category" |
| `findRelated` | Find similar documents | "Find related" |
| `suggestViews` | View recommendations | "Suggest views" |
| `evaluateFormula` | Compute formula result | "Calculate =ADD(1,2)" |
| `analyzeContent` | Deep content analysis | "Analyze content" |

### Action Execution

Actions return structured results:

```typescript
interface EnrichmentResult {
  action: string;
  success: boolean;
  data: {
    suggestions: Suggestion[];
    entities: Entity[];
    analysis: Analysis;
  };
  message: string;
}
```

---

## NLP Pipeline

### Processing Steps

```
Document Text
     │
     ▼
┌─────────────────┐
│ Tokenization    │ Break into words/sentences
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Entity Extract  │ NER for people, places, dates
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Keyword Extract │ TF-IDF for important terms
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Embedding       │ Vector representation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Classification  │ Category/tag prediction
└────────┬────────┘
         │
         ▼
   Suggestions
```

### Technologies Used

| Component | Technology |
|-----------|------------|
| Tokenization | Wink NLP |
| Entity Recognition | Transformers.js (NER model) |
| Embeddings | Transformers.js (all-MiniLM-L6-v2) |
| Classification | Custom classifier on embeddings |
| Summarization | Transformers.js (BART/T5) |

All models run client-side via WebAssembly—no server calls.

---

## Context-Aware Categorization

### Hierarchy Analysis

The categorization system considers document structure:

```typescript
interface ContextAwareCategorizationInput {
  content: string;
  existingCategory?: string;
  parentPath?: string;
  siblingCategories?: string[];
  relatedDocuments?: RelatedDocument[];
  hierarchyAnalysis?: HierarchyAnalysis;
}
```

### Scoring Factors

| Factor | Weight | Description |
|--------|--------|-------------|
| Content match | 40% | Text similarity to category description |
| Hierarchy fit | 25% | Alignment with parent/sibling categories |
| Relationship context | 20% | Categories of linked documents |
| Entity types | 15% | Mention types (places → Travel, dates → Events) |

### Example Scoring

```
Document: "Trip to Paris next June"

Categories considered:
┌─────────────────────────────────────────────────────────┐
│ Category              │ Content │ Hierarchy │ Total    │
├───────────────────────┼─────────┼───────────┼──────────┤
│ Travel/Europe         │ 0.85    │ 0.90      │ 0.87     │ ✓
│ Personal/Plans        │ 0.60    │ 0.70      │ 0.64     │
│ Travel/General        │ 0.80    │ 0.65      │ 0.74     │
└─────────────────────────────────────────────────────────┘
```

---

## Integration Points

### Automatic Enrichment

Enrichment runs automatically on:

- **Document save** — Background analysis after edits
- **Import** — Process new documents on import
- **Idle time** — Batch process during inactivity

### Manual Triggers

- **Metadata panel** — Click "Refresh suggestions"
- **Block context menu** — Right-click → "Enrich"
- **Oracle command** — Natural language request
- **Keyboard shortcut** — `Cmd/Ctrl + Shift + E`

### API Access

```typescript
// Get suggestions for a document
const suggestions = await getEnrichmentSuggestions(strandPath);

// Apply a suggestion
await applySuggestion(suggestion);

// Run full enrichment
const result = await enrichDocument(strandPath, {
  extractMentions: true,
  suggestTags: true,
  suggestCategory: true,
  findRelated: true
});
```

---

## Examples

### Enriching a Meeting Note

**Before:**
```markdown
# Team Meeting June 15

Discussed project timeline with John and Sarah.
Need to deploy to production by end of month.
Budget is $50,000 for infrastructure.
```

**After Enrichment:**
```markdown
---
tags: [meeting, project-planning, infrastructure]
category: Work/Meetings
---

# Team Meeting @June-15-2025

Discussed project timeline with @John-Smith and @Sarah-Chen.
Need to deploy to production by @June-30-2025.
Budget is $50,000 for infrastructure.

## Related
- @Q2-Roadmap
- @Infrastructure-Plan
```

### Enriching a Travel Document

**Oracle interaction:**
```
> "Enrich this travel doc"

🤖 I've analyzed your document:

Extracted Entities:
• 3 places: Paris, Louvre, Eiffel Tower
• 5 dates: June 15-22, departure times
• 2 people: Marie Dubois, Jean Pierre

Suggestions:
• Add tags: #travel #paris #vacation
• Category: Personal/Travel/Europe
• Insert: Map view (3 locations), Calendar view (7 events)

[Apply All] [Review Each]
```

---

## Privacy & Performance

### Local Processing

All enrichment runs client-side:
- Models loaded via WebAssembly
- No API calls for NLP
- Data stays on device

### Performance Tips

1. **Batch processing** — Enrich multiple docs at once
2. **Limit scope** — Analyze specific sections vs entire docs
3. **Cache embeddings** — Reuse computed vectors
4. **Background processing** — Run during idle time

### Storage

Enrichment results are cached locally:

```
IndexedDB
├── enrichment_cache
│   ├── suggestions (per document)
│   ├── embeddings (vector cache)
│   └── entity_cache (extracted entities)
```

---

## Configuration

### Enrichment Settings

```typescript
interface EnrichmentConfig {
  autoEnrich: boolean;          // Run on save
  minConfidence: number;        // Suggestion threshold (0-1)
  maxSuggestions: number;       // Limit per category
  enabledFeatures: {
    tags: boolean;
    categories: boolean;
    views: boolean;
    related: boolean;
    entities: boolean;
  };
}
```

### Customize via Settings

```
Settings > AI & NLP > Enrichment

☑ Auto-enrich on save
☑ Show suggestions in sidebar
  Minimum confidence: [0.7]
  Max suggestions: [5]

Features:
☑ Tag suggestions
☑ Category suggestions  
☑ View suggestions
☑ Related documents
☑ Entity extraction
```

---

## Best Practices

1. **Review before applying** — Check suggestions fit your intent
2. **Build taxonomy first** — Better suggestions with existing structure
3. **Use consistent naming** — Helps entity matching
4. **Link related docs** — Improves relationship suggestions
5. **Train on your content** — System learns from your patterns

---

## Troubleshooting

### Suggestions not appearing

- Check enrichment is enabled in settings
- Ensure document has sufficient content
- Verify NLP models loaded (check console)

### Low quality suggestions

- Add more content/context
- Build out your tag taxonomy
- Link related documents
- Wait for system to learn patterns

### Performance issues

- Reduce auto-enrich frequency
- Process large docs manually
- Clear enrichment cache

---

## Related Guides

- [DYNAMIC_DOCUMENTS_GUIDE.md](./DYNAMIC_DOCUMENTS_GUIDE.md) — Overview
- [MENTIONS_GUIDE.md](./MENTIONS_GUIDE.md) — Entity extraction and mentions
- [../NLP_GUIDE.md](../NLP_GUIDE.md) — NLP architecture details
- [../PLANNER_GUIDE.md](../PLANNER_GUIDE.md) — Oracle AI Assistant

