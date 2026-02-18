# Taxonomy Best Practices Guide

This guide explains how the Frame.dev Codex taxonomy system works, including hierarchy rules, deduplication techniques, and best practices for organizing your knowledge base.

## Table of Contents

1. [Overview](#overview)
2. [The Three Levels](#the-three-levels)
3. [When to Use Each Level](#when-to-use-each-level)
4. [Deduplication: How It Works](#deduplication-how-it-works)
5. [Configuration Options](#configuration-options)
6. [Best Practices Checklist](#best-practices-checklist)
7. [API Reference](#api-reference)

---

## Overview

The Codex uses a **three-level taxonomy hierarchy** to organize strands (documents):

```
Subjects (Broadest)
    ↓
Topics (Mid-level)
    ↓
Tags (Most Specific)
```

Each level has different purposes, limits, and behaviors:

| Level | Purpose | Per-Doc Limit | Global Limit |
|-------|---------|---------------|--------------|
| **Subjects** | Umbrella categories | 2 | 20 |
| **Topics** | Specific domains | 5 | 100 |
| **Tags** | Granular concepts | 15 (soft) | Unlimited |

### Why Hierarchy Matters

Without hierarchy enforcement:
- You might have "AI" as a subject AND "Artificial Intelligence" as a tag
- Similar terms like "React.js", "ReactJS", and "react" could all exist separately
- The taxonomy becomes cluttered and hard to navigate

With hierarchy enforcement:
- Each concept exists at ONE level only
- Similar terms are automatically detected and deduplicated
- Your taxonomy stays clean and navigable

---

## The Three Levels

### Subjects (Broadest)

Subjects are the **top-level categories** that organize your entire codex. Think of them as the main sections of a library.

**Characteristics:**
- Very broad, encompassing many topics
- Stable over time (rarely change)
- Maximum 2 per document (default)
- Maximum 20 across entire codex (default)

**Good Examples:**
- `programming`
- `design`
- `mathematics`
- `business`
- `science`

**Bad Examples (too specific):**
- `react` → Should be a topic
- `machine-learning` → Should be a topic
- `hooks` → Should be a tag

### Topics (Mid-Level)

Topics are **domain-specific categories** within subjects. They represent specific areas of knowledge.

**Characteristics:**
- More specific than subjects
- Can evolve as your knowledge grows
- Maximum 5 per document (default)
- Maximum 100 across entire codex (default)

**Good Examples:**
- `react`, `vue`, `angular` (under programming)
- `typography`, `color-theory` (under design)
- `machine-learning`, `nlp` (under programming/science)
- `marketing`, `sales` (under business)

**Bad Examples:**
- `programming` → Too broad, should be a subject
- `useEffect` → Too specific, should be a tag

### Tags (Most Specific)

Tags are **granular labels** that describe specific concepts, techniques, or details.

**Characteristics:**
- Very specific to the document
- Can be as numerous as needed
- Soft limit of 15 per document
- No global limit

**Good Examples:**
- `hooks`, `useEffect`, `useState` (React concepts)
- `flexbox`, `grid-layout`, `responsive` (CSS techniques)
- `gradient-descent`, `backpropagation` (ML concepts)

**Bad Examples:**
- `programming` → Too broad, should be a subject
- `javascript` → Could be a topic depending on context

---

## When to Use Each Level

### Decision Tree

```
Is this concept...

├── An umbrella category that could contain many sub-areas?
│   └── ✓ Use SUBJECT (e.g., "programming", "design")
│
├── A specific domain or technology?
│   └── ✓ Use TOPIC (e.g., "react", "machine-learning")
│
└── A technique, concept, or detail specific to this document?
    └── ✓ Use TAG (e.g., "hooks", "gradient-descent")
```

### Examples by Domain

#### Software Development

| Subject | Topics | Tags |
|---------|--------|------|
| `programming` | `javascript`, `typescript`, `python` | `async-await`, `promises`, `decorators` |
| `programming` | `react`, `vue`, `svelte` | `hooks`, `composition-api`, `stores` |
| `programming` | `databases`, `sql`, `nosql` | `indexing`, `normalization`, `joins` |

#### Design

| Subject | Topics | Tags |
|---------|--------|------|
| `design` | `typography`, `ui-design`, `branding` | `serif-fonts`, `line-height`, `kerning` |
| `design` | `color-theory`, `accessibility` | `contrast-ratios`, `color-blindness` |

#### Machine Learning

| Subject | Topics | Tags |
|---------|--------|------|
| `programming` | `machine-learning`, `deep-learning` | `neural-networks`, `backpropagation` |
| `programming` | `nlp`, `computer-vision` | `transformers`, `attention`, `cnn` |

---

## Deduplication: How It Works

The taxonomy system uses multiple NLP techniques to detect duplicate or similar terms. When you add a new term, it's checked against all existing terms at all levels.

### Similarity Detection Pipeline

When you add a term like "artificial intelligence", the system checks:

```
1. EXACT MATCH
   "artificial-intelligence" == "artificial-intelligence"?
   → Score: 1.0

2. ACRONYM EXPANSION
   "ai" ↔ "artificial-intelligence"?
   → Score: 0.95 (via dictionary lookup)

3. PLURAL NORMALIZATION
   "frameworks" ↔ "framework"?
   → Score: 0.95 (singular/plural detection)

4. COMPOUND DECOMPOSITION
   "MachineLearning" ↔ "machine-learning"?
   → Score: 0.85 (CamelCase splitting)

5. LEVENSHTEIN DISTANCE
   "typscript" ↔ "typescript" (1 edit)?
   → Score: 0.9 (typo detection)

6. PHONETIC MATCHING
   "colour" ↔ "color" (same Soundex)?
   → Score: 0.7 (sound-alike detection)

7. N-GRAM JACCARD
   "javascript" ↔ "java-script" (char overlap)?
   → Score: 0.75 (fuzzy matching)

8. SUBSTRING MATCHING
   "react" in "reactjs"?
   → Score: 0.6-0.8 (prefix/suffix detection)
```

### Threshold Configuration

By default, terms with a similarity score ≥ 0.7 are considered duplicates.

| Config Preset | Threshold | Behavior |
|---------------|-----------|----------|
| **Strict** | 0.6 | Catches more duplicates, may have false positives |
| **Default** | 0.7 | Balanced detection |
| **Relaxed** | 0.85 | Only catches obvious duplicates |

### Cross-Level Prevention

A term cannot exist at multiple levels. For example:

```
If "react" exists as a TOPIC:
├── Adding "react" as a SUBJECT → ❌ Rejected (duplicate)
├── Adding "react" as a TAG → ❌ Rejected (already exists higher)
└── Adding "React.js" as a TAG → ❌ Rejected (similar to "react")
```

### Acronym Dictionary

The system includes 150+ tech acronyms that are automatically matched:

| Acronym | Expansion |
|---------|-----------|
| `ai` | `artificial-intelligence` |
| `ml` | `machine-learning` |
| `nlp` | `natural-language-processing` |
| `api` | `application-programming-interface` |
| `ui` | `user-interface` |
| `ux` | `user-experience` |
| `css` | `cascading-style-sheets` |
| `html` | `hypertext-markup-language` |
| ... | ... |

See the full list in [lib/taxonomy/acronymDictionary.ts](../lib/taxonomy/acronymDictionary.ts).

---

## Configuration Options

### Per-Document Limits

```typescript
{
  maxSubjectsPerDoc: 2,   // Maximum subjects allowed per strand
  maxTopicsPerDoc: 5,     // Maximum topics allowed per strand
  maxTagsPerDoc: 15,      // Maximum tags (soft limit) per strand
}
```

### Global Limits

```typescript
{
  maxTotalSubjects: 20,   // Maximum unique subjects in codex
  maxTotalTopics: 100,    // Maximum unique topics in codex
  // Tags have no global limit
}
```

### Similarity Options

```typescript
{
  // Basic thresholds
  levenshteinThreshold: 2,      // Max edit distance for typo detection
  substringMinLength: 4,        // Min length for substring matching

  // Enhanced NLP options
  enablePhoneticMatching: true,       // Soundex/Metaphone
  enableNgramMatching: true,          // Character n-grams
  ngramThreshold: 0.6,                // Min Jaccard similarity
  enableAcronymExpansion: true,       // AI ↔ artificial-intelligence
  enablePluralNormalization: true,    // frameworks ↔ framework
  enableCompoundDecomposition: true,  // MachineLearning ↔ machine-learning
  similarityScoreThreshold: 0.7,      // Overall similarity threshold
}
```

### Presets

| Preset | Use Case |
|--------|----------|
| **DEFAULT** | Balanced for most codexes |
| **STRICT** | Small codexes, tight control |
| **RELAXED** | Large codexes, more flexibility |

---

## Best Practices Checklist

### When Creating Strands

- [ ] **Keep subjects minimal**: Use only 1-2 subjects per strand
- [ ] **Use existing terms**: Before creating a new term, check if a similar one exists
- [ ] **Prefer topics over subjects**: If unsure, start at the topic level
- [ ] **Be specific with tags**: Tags should be unique to this document

### When Organizing Your Codex

- [ ] **Curate your subjects**: Review and consolidate subjects periodically
- [ ] **Avoid duplicating topics as tags**: If something is a topic, don't also tag it
- [ ] **Run reclassification**: Use the reclassify job to clean up periodically
- [ ] **Review dry-run results**: Always preview changes before applying

### When Importing Content

- [ ] **Preview duplicates**: Check for existing similar terms before import
- [ ] **Use batch validation**: Validate all terms at once before committing
- [ ] **Handle conflicts explicitly**: Don't auto-apply during large imports

---

## API Reference

### Validate a Term

```typescript
// POST /api/taxonomy
{
  "action": "validate",
  "term": "machine learning",
  "level": "topic"
}

// Response
{
  "success": true,
  "result": {
    "level": "topic",
    "reasoning": "New topic: \"machine-learning\" added successfully",
    "severity": "info"
  }
}
```

### Find Duplicates

```typescript
// POST /api/taxonomy
{
  "action": "find-duplicates",
  "term": "AI"
}

// Response
{
  "success": true,
  "hasDuplicates": true,
  "duplicates": {
    "subjects": [],
    "topics": [
      { "term": "artificial-intelligence", "score": 0.95, "method": "acronym" }
    ],
    "tags": []
  }
}
```

### Start Reclassification

```typescript
// POST /api/taxonomy
{
  "action": "reclassify",
  "scope": "all",
  "dryRun": true
}

// Response
{
  "success": true,
  "jobId": "job-abc123",
  "message": "Reclassification job started"
}
```

### Refresh Index

```typescript
// POST /api/taxonomy
{
  "action": "refresh-index"
}

// Response
{
  "success": true,
  "message": "Taxonomy index refreshed",
  "counts": {
    "subjects": 15,
    "topics": 87,
    "tags": 342
  }
}
```

---

## Troubleshooting

### "Too many subjects"

Your document has more subjects than the limit (default: 2).

**Solutions:**
1. Demote less relevant subjects to topics
2. Increase `maxSubjectsPerDoc` in config (not recommended)

### "Duplicate detected"

The term you're adding already exists at another level.

**Solutions:**
1. Use the existing term instead
2. Check if your term is an acronym/plural of an existing term
3. If intentional, adjust similarity threshold (not recommended)

### "Term demoted"

Your term was automatically demoted because:
- It matched a more general term at a higher level
- The global limit for that level was reached

**This is expected behavior** - the system maintains hierarchy.

---

## Related Documentation

- [Strand Architecture](./STRAND_ARCHITECTURE.md) - How strands are structured
- [NLP Guide](./NLP_GUIDE.md) - Natural Language Processing features
- [Job Queue](./JOB_QUEUE.md) - Background job processing

---

*Last updated: December 2025*
