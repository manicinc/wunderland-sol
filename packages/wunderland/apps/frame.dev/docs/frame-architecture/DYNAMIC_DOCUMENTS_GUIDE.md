# Dynamic Documents Architecture

> *Inspired by [Embark: Dynamic Documents as Personal Software](https://www.inkandswitch.com/embark/) from Ink & Switch*

## Overview

Quarry Codex implements the **Dynamic Documents** paradigm—a vision where documents are not static containers of text, but living computational environments that combine:

- **Freeform notes** — Natural writing flow
- **Structured data** — Typed entities and relationships
- **Computations** — Spreadsheet-like formulas
- **Rich views** — Interactive visualizations

This guide explains how these concepts are implemented in Quarry Codex and how they work together to create a powerful personal knowledge management system.

---

## The Philosophy: Unbundling Applications

Traditional productivity software bundles together **data**, **computation**, and **views** into monolithic apps:

| Traditional App | Data | Computation | Views |
|-----------------|------|-------------|-------|
| Google Maps | Places, routes | Distance, ETA | Map |
| Calendar | Events | Scheduling | Timeline |
| Spreadsheet | Cells | Formulas | Grid |
| To-do List | Tasks | Filtering | Checklist |

**The Problem:** Each app owns its silo. Your calendar can't see your notes. Your map can't reference your to-do list. Knowledge is fragmented across disconnected tools.

**The Solution:** Dynamic Documents *unbundle* these components:

```
┌─────────────────────────────────────────────────────────────┐
│                    DYNAMIC DOCUMENT                          │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│  │   DATA      │   │ COMPUTATION │   │   VIEWS     │       │
│  │             │   │             │   │             │       │
│  │ • Mentions  │──▶│ • Formulas  │──▶│ • Maps      │       │
│  │ • Entities  │   │ • Functions │   │ • Calendars │       │
│  │ • Fields    │   │ • Queries   │   │ • Charts    │       │
│  └─────────────┘   └─────────────┘   └─────────────┘       │
│                                                             │
│  All within your freeform outline — you compose the app!   │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Mentions: Structured Data in Plain Text

**Mentions** link structured entities directly within your notes using the `@` symbol:

```markdown
Planning a trip to @Paris next @June-2025. 
Meeting @John-Smith at the conference.
```

Each mention resolves to a **MentionableEntity** with typed properties:

| Entity Type | Properties |
|-------------|------------|
| `place` | latitude, longitude, address |
| `date` | ISO date, relative format |
| `person` | name, email, organization |
| `tag` | color, category |
| `document` | path, title |
| `task` | status, due date, priority |

**See:** [MENTIONS_GUIDE.md](./MENTIONS_GUIDE.md) for complete syntax and examples.

---

### 2. Formulas: Computation in Documents

**Formulas** bring spreadsheet power to outlines. They read data from your document and produce computed results:

```markdown
# Travel Budget

- Flight: $450
- Hotel: $800
- Food: $300

**Total:** =ADD(GET_FIELD("Flight"), GET_FIELD("Hotel"), GET_FIELD("Food"))
```

Formulas can:
- Reference mention properties: `=GET_FIELD(@Paris, "population")`
- Call external APIs: `=WEATHER(@Paris, @June-2025)`
- Compute routes: `=ROUTE(@Paris, @London)`
- Aggregate data: `=SUM(CHILDREN("expenses"))`

**See:** [FORMULAS_GUIDE.md](./FORMULAS_GUIDE.md) for syntax and function reference.

---

### 3. Embeddable Views: Rich Visualizations

**Views** render structured data as interactive visualizations, embedded directly in your document:

````markdown
Here's our trip itinerary:

```view-map
{
  "scope": "children",
  "filter": { "type": "place" },
  "settings": { "zoom": 10 }
}
```

And the schedule:

```view-calendar
{
  "scope": "descendants",
  "filter": { "supertag": "event" }
}
```
````

Available view types:

| View | Renders | Best For |
|------|---------|----------|
| `view-map` | Interactive map with pins | Locations, routes |
| `view-calendar` | Calendar grid | Events, deadlines |
| `view-table` | Sortable table | Structured data |
| `view-chart` | Bar/line/pie charts | Metrics, trends |
| `view-list` | Styled list | Collections |

**See:** [EMBEDDABLE_VIEWS_GUIDE.md](./EMBEDDABLE_VIEWS_GUIDE.md) for configuration options.

---

### 4. Supertags: Entity Schemas

**Supertags** define property schemas for entities. When you tag a block with a supertag, it gains typed fields:

```yaml
# Supertag: #meeting
fields:
  - name: date
    type: date
    required: true
  - name: attendees
    type: mention[]
  - name: location
    type: place
  - name: duration
    type: formula
    expression: "=DURATION(@date.start, @date.end)"
```

Supertags enable:
- **Consistent structure** across similar entities
- **Computed fields** via formulas
- **View filtering** by supertag type
- **AI enrichment** suggestions

---

### 5. Context-Aware Enrichment

Quarry's **AI/NLP engine** analyzes your documents and suggests:

- **Tags** based on content
- **Categories** using hierarchy analysis
- **Views** appropriate for the data
- **Related documents** via semantic similarity
- **Entities** extracted from text

The **Oracle AI Assistant** can execute enrichment commands:

```
> "Suggest tags for this document"
> "Find documents related to machine learning"
> "Extract all people mentioned"
> "What views would work here?"
```

**See:** [ENRICHMENT_GUIDE.md](./ENRICHMENT_GUIDE.md) for Oracle commands and suggestions UI.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          USER INTERFACE                           │
├──────────────────────────────────────────────────────────────────┤
│  InlineWYSIWYGEditor    │  QuarryMetadataPanel  │  EmbeddableViews│
│  • @mention autocomplete │  • Enrichment panel   │  • MapView      │
│  • Formula blocks        │  • AI suggestions     │  • CalendarView │
│  • View code blocks      │  • Related docs       │  • ChartView    │
└──────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────┐
│                          PROCESSING LAYER                         │
├──────────────────────────────────────────────────────────────────┤
│  mentionResolver.ts     │  formulaEngine.ts     │  embeddableViews│
│  • Entity resolution    │  • Expression parser  │  • Data extract │
│  • Search/autocomplete  │  • Builtin functions  │  • View config  │
│                         │  • Context creation   │                 │
├──────────────────────────────────────────────────────────────────┤
│  contextAwareCategorization.ts  │  Oracle documentEnrichment.ts  │
│  • Hierarchy analysis           │  • Intent parsing              │
│  • Relationship scoring         │  • Action execution            │
└──────────────────────────────────────────────────────────────────┘
                                    │
┌──────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                               │
├──────────────────────────────────────────────────────────────────┤
│  codexDatabase.ts (SQLite)                                        │
│  • mentionable_entities table                                     │
│  • mentions table                                                 │
│  • blocks, strands, supertags                                     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Files Reference

| Component | File Path |
|-----------|-----------|
| **Mention Types** | `lib/mentions/types.ts` |
| **Mention Resolver** | `lib/mentions/mentionResolver.ts` |
| **Mention UI** | `components/quarry/ui/mentions/` |
| **Formula Types** | `lib/formulas/types.ts` |
| **Formula Engine** | `lib/formulas/formulaEngine.ts` |
| **Builtin Functions** | `lib/formulas/builtinFunctions.ts` |
| **View Definitions** | `lib/views/embeddableViews.ts` |
| **View Components** | `components/quarry/views/embeddable/` |
| **Supertag Manager** | `lib/supertags/supertagManager.ts` |
| **Enrichment Logic** | `lib/planner/oracle/documentEnrichment.ts` |
| **Enrichment UI** | `components/quarry/ui/enrichment/` |
| **Database Schema** | `lib/codexDatabase.ts` |

---

## Getting Started

### 1. Using @Mentions

Type `@` in any block to trigger the autocomplete menu:

```
Today I met with @John... [autocomplete appears]
```

Select an entity or create a new one. Mentions become clickable chips with type-specific icons.

### 2. Adding a Formula

Use the `/formula` command or create a code block:

````markdown
```formula
=ADD(100, 200, 50)
```
````

### 3. Embedding a View

Use `/map`, `/calendar`, `/table`, or `/chart` commands:

````markdown
```view-map
{
  "scope": "children",
  "filter": { "type": "place" }
}
```
````

### 4. Getting AI Suggestions

Open the metadata panel (right sidebar) to see:
- Suggested tags
- Recommended category
- Appropriate views
- Related documents

Or ask Oracle: *"What views would work for this document?"*

---

## Design Principles

1. **Local-First** — All processing runs client-side (WebAssembly, Transformers.js)
2. **Progressive Enhancement** — Works as plain Markdown; features layer on top
3. **Composable** — Mix and match data, formulas, and views freely
4. **Privacy-Preserving** — No data leaves your device for NLP/AI features
5. **Interoperable** — Standard Markdown exports anywhere

---

## Further Reading

- [MENTIONS_GUIDE.md](./MENTIONS_GUIDE.md) — @mention syntax and entity types
- [FORMULAS_GUIDE.md](./FORMULAS_GUIDE.md) — Formula language reference
- [EMBEDDABLE_VIEWS_GUIDE.md](./EMBEDDABLE_VIEWS_GUIDE.md) — View configuration
- [ENRICHMENT_GUIDE.md](./ENRICHMENT_GUIDE.md) — AI-powered suggestions

---

## Citation

This architecture is inspired by:

> **Embark: Dynamic Documents as Personal Software**  
> Ink & Switch Research Lab  
> [https://www.inkandswitch.com/embark/](https://www.inkandswitch.com/embark/)

The Embark paper explores how documents can become "personal software" by combining computation with natural writing. Quarry Codex adapts these ideas for a local-first, privacy-preserving knowledge management system.

