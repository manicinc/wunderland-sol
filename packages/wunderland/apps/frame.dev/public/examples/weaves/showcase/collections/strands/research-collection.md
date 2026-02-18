---
title: Research Collections Pattern
summary: How to organize research materials with collections
significance: 85
status: complete
tags:
  - collections
  - research
  - patterns
subjects:
  - organization
  - academic
---

# Research Collections Pattern

When working on research projects, collections provide an ideal way to gather materials from multiple sources.

## Example: Literature Review Collection

Create a collection called "ML Ethics Literature Review" and add:

- Papers from your `research/papers` loom
- Notes from your `notes/reading` loom  
- Annotations from your `journal/2024` loom
- Related bookmarks from `resources/links`

## Suggested Cover Patterns

| Research Type | Pattern | Why |
|---------------|---------|-----|
| Technical | Circuits | Tech-focused visual |
| Scientific | Constellation | Connection-focused |
| Creative | Abstract | Fluid, exploratory |
| Data-heavy | Hexagons | Structured, grid-like |

## Smart Collection for Papers

```yaml
smartFilter:
  tags: [paper, research]
  subjects: [machine-learning]
  dateRange:
    start: 2023-01-01
  limit: 100
```

This auto-includes all papers tagged appropriately!

