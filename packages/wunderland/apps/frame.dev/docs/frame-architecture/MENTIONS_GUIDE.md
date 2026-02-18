# @Mentions Guide

> Link structured data directly within your notes using the `@` symbol

## Overview

**Mentions** are inline references to structured entities—people, places, dates, documents, and more. They transform plain text into a connected knowledge graph where every reference is clickable, queryable, and computable.

---

## Basic Syntax

Type `@` followed by the entity name:

```markdown
Meeting with @John-Smith about @Project-Alpha on @2025-06-15.
```

The autocomplete menu appears as you type, showing matching entities.

---

## Entity Types

### Person (`@person`)

Reference people in your knowledge base:

```markdown
@John-Smith scheduled a review.
@Dr-Sarah-Chen will present the findings.
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Full name |
| `email` | string | Email address |
| `organization` | string | Company/org |
| `role` | string | Job title |

### Place (`@place`)

Reference locations with geographic data:

```markdown
The conference is in @San-Francisco.
Dinner at @Blue-Bottle-Coffee.
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `latitude` | number | GPS latitude |
| `longitude` | number | GPS longitude |
| `address` | string | Full address |
| `city` | string | City name |
| `country` | string | Country |

### Date (`@date`)

Reference dates and times:

```markdown
Due by @2025-06-30.
Meeting @next-Monday at @3pm.
```

**Formats supported:**
- ISO: `@2025-06-15`
- Relative: `@tomorrow`, `@next-week`, `@in-3-days`
- Named: `@Monday`, `@June-2025`
- Time: `@3pm`, `@14:30`

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `iso` | string | ISO 8601 format |
| `relative` | string | Human-readable |
| `timestamp` | number | Unix timestamp |

### Document (`@document`)

Reference other strands/documents:

```markdown
See @Meeting-Notes-2025-06-01 for context.
Related to @Project-Roadmap.
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `path` | string | Document path |
| `title` | string | Document title |
| `id` | string | Unique ID |

### Tag (`@tag`)

Reference taxonomy tags:

```markdown
This is about @machine-learning and @neural-networks.
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `name` | string | Tag name |
| `category` | string | Parent category |
| `color` | string | Display color |

### Task (`@task`)

Reference actionable items:

```markdown
Blocked by @fix-auth-bug.
After @deploy-v2 is complete.
```

**Properties:**
| Property | Type | Description |
|----------|------|-------------|
| `status` | string | pending/done/blocked |
| `priority` | string | low/medium/high/critical |
| `dueDate` | date | Due date |
| `assignee` | person | Assigned to |

---

## Creating New Entities

When you type a mention that doesn't exist, the autocomplete offers:

```
┌─────────────────────────────────┐
│ 🔍 "John Doe"                   │
├─────────────────────────────────┤
│ + Create person "John Doe"      │
│ + Create tag "John Doe"         │
│ + Create document "John Doe"    │
└─────────────────────────────────┘
```

Select an option to create the entity with that type.

---

## Mention Resolution

Mentions are resolved in this order:

1. **Exact match** — Entity name matches exactly
2. **Fuzzy match** — Similar names (handles typos)
3. **Type inference** — Guess type from context
4. **Create new** — Offer to create if not found

### Resolution Examples

| Input | Resolved To | Type |
|-------|-------------|------|
| `@John-Smith` | John Smith (person) | Exact |
| `@Jon-Smith` | John Smith (person) | Fuzzy |
| `@2025-06-15` | June 15, 2025 | Date parse |
| `@tomorrow` | [computed date] | Relative |
| `@Paris` | Paris, France | Place lookup |

---

## Using Mentions in Formulas

Mentions can be referenced in formulas to access their properties:

```markdown
=GET_FIELD(@Paris, "latitude")      // Returns: 48.8566
=GET_FIELD(@John-Smith, "email")    // Returns: john@example.com
=ROUTE(@Paris, @London)             // Returns: distance, duration
=WEATHER(@Paris, @tomorrow)         // Returns: weather forecast
```

---

## Using Mentions in Views

Views can filter and display mention data:

````markdown
Show all places mentioned in this document:

```view-map
{
  "scope": "descendants",
  "filter": { "type": "place" }
}
```

Show all people and their roles:

```view-table
{
  "scope": "children",
  "filter": { "type": "person" },
  "columns": ["name", "role", "organization"]
}
```
````

---

## UI Components

### Autocomplete Menu

Triggered by typing `@`:

```
┌─────────────────────────────────┐
│ 👤 John Smith                   │
│    person · john@example.com    │
├─────────────────────────────────┤
│ 📍 Paris                        │
│    place · France               │
├─────────────────────────────────┤
│ 📅 Tomorrow                     │
│    date · June 16, 2025         │
└─────────────────────────────────┘
```

**Keyboard shortcuts:**
- `↑/↓` — Navigate options
- `Enter` — Select
- `Esc` — Close menu
- `Tab` — Autocomplete first match

### Mention Chip

Resolved mentions display as styled chips:

```
┌──────────────────┐
│ 👤 John Smith    │  ← Clickable chip
└──────────────────┘
```

**Chip features:**
- Type-specific icon
- Hover tooltip with properties
- Click to view/edit entity
- Right-click for context menu

---

## Database Schema

Mentions are stored in SQLite:

```sql
-- Mentionable entities
CREATE TABLE mentionable_entities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,        -- person, place, date, etc.
  name TEXT NOT NULL,
  properties TEXT,           -- JSON object
  created_at INTEGER,
  updated_at INTEGER
);

-- Mention instances (links)
CREATE TABLE mentions (
  id TEXT PRIMARY KEY,
  block_id TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  position INTEGER,          -- Character offset
  raw_text TEXT,             -- Original @text
  FOREIGN KEY (entity_id) REFERENCES mentionable_entities(id)
);
```

---

## API Reference

### `resolveMention(text: string): Promise<ResolvedMention | null>`

Resolve mention text to a structured entity:

```typescript
const mention = await resolveMention("John Smith");
// Returns: { entity: { id: "...", type: "person", name: "John Smith", ... }, confidence: 0.95 }
```

### `searchMentionableEntities(query: string, options?): Promise<MentionableEntity[]>`

Search for entities matching a query:

```typescript
const results = await searchMentionableEntities("par", { 
  types: ["place"], 
  limit: 10 
});
// Returns: [{ id: "...", type: "place", name: "Paris", ... }, ...]
```

### `createMentionableEntity(data: Partial<MentionableEntity>): Promise<MentionableEntity>`

Create a new mentionable entity:

```typescript
const person = await createMentionableEntity({
  type: "person",
  name: "Jane Doe",
  properties: { email: "jane@example.com" }
});
```

---

## Examples

### Trip Planning Document

```markdown
# Paris Trip Planning

## Overview
Traveling to @Paris from @June-15-2025 to @June-22-2025.
Flying from @San-Francisco via @Air-France.

## Itinerary

### Day 1: Arrival
- Land at @CDG-Airport at @10am
- Take train to @Hotel-Le-Marais
- Dinner with @Marie-Dubois at @Cafe-de-Flore

### Day 2: Sightseeing
- Morning: @Louvre-Museum
- Lunch: @Les-Deux-Magots
- Afternoon: @Eiffel-Tower

## Budget
- Flight: $800
- Hotel: =MULTIPLY(7, 150)  // 7 nights × $150
- Food: =MULTIPLY(7, 80)    // 7 days × $80/day

**Total:** =ADD(800, MULTIPLY(7, 150), MULTIPLY(7, 80))
```

### Meeting Notes

```markdown
# Product Review - @2025-06-15

**Attendees:** @John-Smith, @Sarah-Chen, @Mike-Johnson

## Discussed
- @Project-Alpha timeline (see @Q3-Roadmap)
- Blocked by @infrastructure-upgrade
- @Sarah-Chen to follow up with @engineering-team

## Action Items
- [ ] @John-Smith: Update @Project-Alpha specs by @Friday
- [ ] @Mike-Johnson: Review @security-audit results
- [ ] @Sarah-Chen: Schedule @stakeholder-review for @next-week

## Related
- @Previous-Review-Notes
- @Technical-Spec-v2
```

---

## Best Practices

1. **Consistent naming** — Use the same name format (`First-Last` or `FirstLast`)
2. **Create entities first** — For frequently used entities, create them before referencing
3. **Use types intentionally** — Don't mix person and tag mentions for the same concept
4. **Link related docs** — Reference @documents to build a knowledge graph
5. **Leverage properties** — Add email, location, dates to entities for richer queries

---

## Troubleshooting

### Mention not resolving

- Check spelling matches an existing entity
- Entity might have been deleted
- Try the full name vs. nickname

### Wrong entity selected

- Right-click the chip → "Change to..."
- Or delete and re-type with more specific text

### Autocomplete not appearing

- Ensure you typed `@` at a word boundary
- Check that the editor has focus
- Reload the page if issues persist

---

## Related Guides

- [DYNAMIC_DOCUMENTS_GUIDE.md](./DYNAMIC_DOCUMENTS_GUIDE.md) — Overview
- [FORMULAS_GUIDE.md](./FORMULAS_GUIDE.md) — Using mentions in formulas
- [EMBEDDABLE_VIEWS_GUIDE.md](./EMBEDDABLE_VIEWS_GUIDE.md) — Filtering views by mentions

