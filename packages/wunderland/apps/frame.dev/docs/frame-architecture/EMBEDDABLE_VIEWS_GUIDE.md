# Embeddable Views Guide

> Interactive visualizations rendered inline in your documents

## Overview

**Embeddable Views** transform structured data from your documents into rich, interactive visualizations. Maps show your places, calendars display your events, charts reveal your metrics—all rendered inline where you write.

---

## Basic Syntax

Views are defined as code blocks with a `view-*` language:

````markdown
```view-map
{
  "scope": "children",
  "filter": { "type": "place" }
}
```
````

The JSON configuration tells the view what data to render and how.

---

## View Types

### Map View (`view-map`)

Renders locations on an interactive map with pins and routes.

````markdown
```view-map
{
  "scope": "descendants",
  "filter": { "type": "place" },
  "settings": {
    "zoom": 12,
    "showRoutes": true,
    "clustering": true
  }
}
```
````

**Settings:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `zoom` | number | 10 | Initial zoom level (1-20) |
| `center` | [lat, lng] | auto | Map center coordinates |
| `showRoutes` | boolean | false | Draw routes between points |
| `clustering` | boolean | true | Cluster nearby markers |
| `tileStyle` | string | "default" | Map style: default, satellite, terrain |

**Data extracted:**
- Place mentions with lat/lng properties
- Blocks with `#location` supertag
- Address fields parsed to coordinates

---

### Calendar View (`view-calendar`)

Displays events on a calendar grid (month, week, or day view).

````markdown
```view-calendar
{
  "scope": "children",
  "filter": { "supertag": "event" },
  "settings": {
    "view": "month",
    "showWeekends": true
  }
}
```
````

**Settings:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `view` | string | "month" | View: month, week, day, agenda |
| `showWeekends` | boolean | true | Show Saturday/Sunday |
| `startDay` | number | 0 | Week start (0=Sun, 1=Mon) |
| `minHour` | number | 8 | Day view start hour |
| `maxHour` | number | 20 | Day view end hour |

**Data extracted:**
- Date mentions
- Blocks with date fields
- `#event` supertag blocks with start/end

---

### Table View (`view-table`)

Renders structured data as a sortable, filterable table.

````markdown
```view-table
{
  "scope": "children",
  "filter": { "supertag": "contact" },
  "settings": {
    "columns": ["name", "email", "company", "lastContact"],
    "sortBy": "name",
    "sortOrder": "asc",
    "pageSize": 20
  }
}
```
````

**Settings:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | string[] | auto | Columns to display |
| `sortBy` | string | first column | Sort column |
| `sortOrder` | string | "asc" | Sort order: asc, desc |
| `pageSize` | number | 10 | Rows per page |
| `searchable` | boolean | true | Enable search box |
| `exportable` | boolean | true | Show export button |

**Data extracted:**
- Supertag field values
- Mention properties
- Block metadata

---

### Chart View (`view-chart`)

Visualizes numeric data as bar, line, pie, or area charts.

````markdown
```view-chart
{
  "scope": "children",
  "filter": { "hasField": "value" },
  "settings": {
    "type": "bar",
    "xKey": "name",
    "yKey": "value",
    "color": "#10b981"
  }
}
```
````

**Settings:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `type` | string | "bar" | Chart: bar, line, pie, area, scatter |
| `xKey` | string | required | X-axis data key |
| `yKey` | string | required | Y-axis data key |
| `color` | string | "#3b82f6" | Primary chart color |
| `colors` | string[] | - | Colors for multiple series |
| `stacked` | boolean | false | Stack bar/area charts |
| `legend` | boolean | true | Show legend |
| `grid` | boolean | true | Show grid lines |

**Chart types:**

```
bar     ████████
        ████
        ██████

line    ─────╲
             ╲────╱
                  ╲

pie     ╭───────╮
        │   ◠   │
        ╰───────╯

area    ▄▄▄▄▄▄▄▄
        ▓▓▓▓▓▓
        ░░░░
```

---

### List View (`view-list`)

Renders items as a styled list with icons.

````markdown
```view-list
{
  "scope": "children",
  "filter": { "type": "task" },
  "settings": {
    "style": "checklist",
    "groupBy": "status",
    "showMeta": true
  }
}
```
````

**Settings:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `style` | string | "bullet" | Style: bullet, numbered, checklist, cards |
| `groupBy` | string | - | Group by field |
| `showMeta` | boolean | false | Show metadata (dates, tags) |
| `maxItems` | number | - | Limit displayed items |
| `emptyMessage` | string | "No items" | Message when empty |

---

## Configuration Options

### Scope

Determines which blocks to extract data from:

| Scope | Description |
|-------|-------------|
| `"children"` | Direct children of current block |
| `"descendants"` | All nested blocks (recursive) |
| `"siblings"` | Sibling blocks at same level |
| `"document"` | Entire document |
| `"selection"` | Currently selected blocks |

### Filter

Filters which data to include:

```json
{
  "filter": {
    "type": "place",                    // Entity type
    "supertag": "meeting",              // Has supertag
    "hasField": "date",                 // Has field
    "fieldEquals": { "status": "done" }, // Field value
    "mentions": "@John-Smith"            // Contains mention
  }
}
```

Multiple filters are combined with AND logic.

### Settings

View-specific configuration (see each view type above).

---

## Block Commands

### Quick Insert

Use slash commands to insert views:

| Command | Inserts |
|---------|---------|
| `/map` | Map view |
| `/calendar` | Calendar view |
| `/table` | Table view |
| `/chart` | Chart view |
| `/list` | List view |

### View Insert Modal

When you use a command, a modal opens with:

1. **View type selector** — Choose the visualization
2. **Scope picker** — Select data scope
3. **Filter builder** — Define filters visually
4. **Settings panel** — Configure appearance
5. **Live preview** — See the result before inserting

---

## Examples

### Trip Itinerary with Map

````markdown
# European Vacation 2025

## Destinations

- @Paris — 3 nights
- @Amsterdam — 2 nights  
- @Berlin — 3 nights
- @Prague — 2 nights
- @Vienna — 2 nights

## Route Map

```view-map
{
  "scope": "siblings",
  "filter": { "type": "place" },
  "settings": {
    "zoom": 5,
    "showRoutes": true,
    "tileStyle": "terrain"
  }
}
```

## Budget by City

```view-chart
{
  "scope": "siblings",
  "settings": {
    "type": "bar",
    "xKey": "city",
    "yKey": "budget"
  }
}
```
````

---

### Project Dashboard

````markdown
# Q3 Sprint Dashboard

## All Tasks #sprint-q3

- [x] Auth system refactor #backend
- [x] User profile redesign #frontend
- [ ] Dashboard widgets #frontend
- [ ] API documentation #docs
- [ ] Performance audit #devops

## Task Status

```view-chart
{
  "scope": "siblings",
  "filter": { "type": "task" },
  "settings": {
    "type": "pie",
    "groupBy": "status"
  }
}
```

## By Category

```view-table
{
  "scope": "siblings",
  "filter": { "supertag": "task" },
  "settings": {
    "columns": ["title", "category", "status", "assignee"],
    "groupBy": "category"
  }
}
```
````

---

### Meeting Calendar

````markdown
# Team Meetings - June 2025

## Recurring Meetings
- Weekly standup @Monday @9am #meeting
- Sprint planning @Monday @2pm #meeting  
- Retro @Friday @4pm #meeting

## One-offs
- Product review @June-15 @10am #meeting
- Stakeholder demo @June-20 @3pm #meeting
- Team offsite @June-28 #meeting

## Calendar View

```view-calendar
{
  "scope": "document",
  "filter": { "supertag": "meeting" },
  "settings": {
    "view": "month",
    "startDay": 1
  }
}
```
````

---

### Contact Directory

````markdown
# Team Directory

## Engineering
- **John Smith** #contact
  - email: john@company.com
  - role: Senior Engineer
  - location: @San-Francisco

- **Sarah Chen** #contact
  - email: sarah@company.com
  - role: Tech Lead
  - location: @New-York

## Design
- **Mike Johnson** #contact
  - email: mike@company.com
  - role: Product Designer
  - location: @Los-Angeles

## Team Table

```view-table
{
  "scope": "document",
  "filter": { "supertag": "contact" },
  "settings": {
    "columns": ["name", "role", "email", "location"],
    "sortBy": "name"
  }
}
```

## Team Locations

```view-map
{
  "scope": "document",
  "filter": { "supertag": "contact" },
  "settings": {
    "zoom": 4
  }
}
```
````

---

### Sales Metrics

````markdown
# Sales Report - Q2 2025

## Monthly Revenue
- January: $45,000
- February: $52,000
- March: $48,000
- April: $61,000
- May: $58,000
- June: $72,000

## Trend Chart

```view-chart
{
  "scope": "siblings",
  "settings": {
    "type": "line",
    "xKey": "month",
    "yKey": "revenue",
    "color": "#10b981"
  }
}
```

## By Product

| Product | Q1 | Q2 | Growth |
|---------|-----|-----|--------|
| Widget Pro | $80k | $95k | +19% |
| Widget Lite | $40k | $52k | +30% |
| Enterprise | $120k | $145k | +21% |

```view-chart
{
  "scope": "siblings",
  "filter": { "type": "table-row" },
  "settings": {
    "type": "bar",
    "xKey": "product",
    "yKey": ["q1", "q2"],
    "stacked": false
  }
}
```
````

---

## Data Extraction

Views automatically extract data from:

### 1. Mentions

```markdown
- @Paris — latitude, longitude, address
- @June-15 — date, time
- @John-Smith — name, email, role
```

### 2. Supertag Fields

```markdown
#event
- title: Team Lunch
- date: 2025-06-15
- location: @Cafe-Blue
- attendees: @John, @Sarah
```

### 3. Block Content

```markdown
- Revenue: $50,000
  → Extracts: { name: "Revenue", value: 50000 }
```

### 4. Nested Structure

```markdown
## Q1
- January: $10k
- February: $12k

## Q2  
- April: $15k
- May: $18k
```

---

## Interactivity

Views support user interaction:

| Feature | Maps | Calendar | Table | Chart | List |
|---------|------|----------|-------|-------|------|
| Click to select | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hover tooltip | ✓ | ✓ | ✓ | ✓ | - |
| Zoom/pan | ✓ | - | - | - | - |
| Sort | - | - | ✓ | - | - |
| Filter | ✓ | ✓ | ✓ | - | - |
| Export | - | - | ✓ | ✓ | - |
| Date navigation | - | ✓ | - | - | - |

---

## Styling

Views inherit your theme and can be customized:

```json
{
  "settings": {
    "theme": "dark",
    "accentColor": "#10b981",
    "borderRadius": 8,
    "shadow": true
  }
}
```

---

## API Reference

### `extractViewData(context: EmbeddableViewContext): ViewableData[]`

Extract data for a view:

```typescript
const data = extractViewData({
  scope: "children",
  filter: { type: "place" },
  strandPath: "/trips/europe",
  blockId: "destinations"
});
// Returns: [{ type: "place", name: "Paris", lat: 48.8566, lng: 2.3522 }, ...]
```

### View Components

```typescript
import { MapView, CalendarView, TableView, ChartView, ListView } from '@/components/quarry/views/embeddable';

<MapView config={config} data={data} />
<CalendarView config={config} data={data} />
<TableView config={config} data={data} />
<ChartView config={config} data={data} />
<ListView config={config} data={data} />
```

---

## Best Practices

1. **Match view to data** — Use maps for places, calendars for dates
2. **Limit scope** — Narrow scope for faster rendering
3. **Filter wisely** — Only include relevant data
4. **Keep it simple** — One view per concept
5. **Add context** — Include a title/description above views

---

## Troubleshooting

### View shows "No data"

- Check scope matches where data lives
- Verify filter criteria
- Ensure data has required properties

### View renders slowly

- Reduce scope to children vs descendants
- Add filters to limit data
- Disable clustering for small datasets

### Data not updating

- Refresh the page
- Check that source blocks haven't moved
- Verify mention entities still exist

---

## Related Guides

- [DYNAMIC_DOCUMENTS_GUIDE.md](./DYNAMIC_DOCUMENTS_GUIDE.md) — Overview
- [MENTIONS_GUIDE.md](./MENTIONS_GUIDE.md) — Place and date mentions for views
- [FORMULAS_GUIDE.md](./FORMULAS_GUIDE.md) — Computed data for charts

