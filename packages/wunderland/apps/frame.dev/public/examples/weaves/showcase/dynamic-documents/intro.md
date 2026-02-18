---
id: dynamic-docs-intro
slug: dynamic-documents-introduction
title: "Dynamic Documents: Embark-Style Features"
version: "1.0.0"
difficulty: beginner
taxonomy:
  subjects:
    - documentation
    - productivity
  topics:
    - dynamic-documents
    - embark
tags:
  - embark
  - mentions
  - formulas
  - views
  - getting-started
relationships:
  references:
    - dynamic-docs-trip-example
    - dynamic-docs-budget-example
    - dynamic-docs-formulas-reference
publishing:
  status: published
  lastUpdated: "2024-12-31"
summary: Learn about Embark-style dynamic documents with @mentions, formulas, and rich embedded views.
---

# ✨ Dynamic Documents

Welcome to **Dynamic Documents** — our implementation of concepts from [Ink & Switch's Embark research](https://inkandswitch.com/embark). This loom demonstrates how to create rich, interactive documents that go beyond static text.

---

## What Are Dynamic Documents?

Traditional documents are static — they display text and images, but can't compute, connect, or visualize data. **Dynamic Documents** change this by adding three key features:

### 1. @Mentions — Structured Data Links

Reference places, people, dates, and other entities directly in your text:

> Planning a trip to @[San Francisco](place-sf) with @[Alice](person-alice) on @[January 15, 2025](date-jan15)

Mentions are:
- **Typed** — the system knows if it's a place, person, or date
- **Searchable** — find all documents mentioning a place
- **Interactive** — click to see details or navigate

### 2. Formulas — Spreadsheet-Style Computations

Compute values directly in your document:

```formula:simple_sum
=ADD(100, 250, 75)
```

Formulas can:
- Calculate totals, averages, distances
- Fetch live data (weather, routes)
- Reference other parts of your document

### 3. Embedded Views — Rich Visualizations

Display your data as maps, calendars, tables, and charts:

```view-map
{
  "type": "map",
  "title": "Example Locations",
  "scope": "document",
  "settings": {
    "zoom": 10,
    "showMarkers": true
  },
  "filter": { "types": ["place"] }
}
```

---

## The Embark Philosophy

This approach is inspired by the **Embark** research paper by Ink & Switch:

> *"To solve these problems, we propose an alternate way to organize software: dynamic documents where users can write down a travel plan and then gradually enrich it with interactive features."*
>
> — Paul Sonnentag, Alexander Obenauer, Geoffrey Litt (LIVE 2023)

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Unbundling Apps** | Separate data, computations, and views for flexible composition |
| **Gradual Enrichment** | Start with plain text, add interactivity as needed |
| **Liveness** | Documents update automatically when data changes |
| **User Agency** | Users compose features to meet their unique goals |

---

## Live Examples in This Loom

Explore these interactive examples:

### 🗺️ [Trip Planning Example](./trip-example.md)
A complete trip to San Francisco with:
- @mentions for all destinations
- Interactive map view
- Weather formulas
- Calendar view of events

### 💰 [Budget Tracking Example](./budget-example.md)
A monthly budget with:
- Expense and income formulas
- Automatic totals
- Chart visualization
- Table view

### 📚 [Formulas Reference](./formulas-reference.md)
Complete guide to available formulas:
- Math functions (ADD, SUBTRACT, MULTIPLY, DIVIDE)
- Data functions (WEATHER, ROUTE, DISTANCE)
- Date functions (ADD_DAYS, DAYS_BETWEEN)

---

## Quick Start

### Adding a Mention

Type `@` followed by a name to trigger autocomplete:

```
Meeting with @Alice at @Coffee Shop on @Tuesday
```

### Adding a Formula

Use the `/formula` command or type in a code block:

```formula:example
=ADD(1, 2, 3)
```

### Adding a View

Use `/map`, `/calendar`, `/table`, or `/chart` commands:

```view-calendar
{
  "type": "calendar",
  "title": "My Events",
  "scope": "document"
}
```

---

## Learn More

- 📖 [Dynamic Documents Architecture Guide](/docs/frame-architecture/DYNAMIC_DOCUMENTS_GUIDE.md)
- 📖 [Mentions Guide](/docs/frame-architecture/MENTIONS_GUIDE.md)
- 📖 [Formulas Guide](/docs/frame-architecture/FORMULAS_GUIDE.md)
- 📖 [Embeddable Views Guide](/docs/frame-architecture/EMBEDDABLE_VIEWS_GUIDE.md)
- 🔗 [Ink & Switch Embark Paper](https://inkandswitch.com/embark)

---

> 💡 **Tip:** Try editing this document! Add your own @mentions, formulas, and views to see them come alive.




