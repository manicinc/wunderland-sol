# Analytics Architecture

> Deep dive into Quarry Codex's analytics system for tracking content growth, engagement, and user activity.

## Overview

The analytics system provides comprehensive insights into your knowledge base without relying on external services. All data stays local on your device.

### Key Features

- **100% Client-Side** - No external tracking or data collection
- **SQLite-Based Storage** - Uses IndexedDB via sql.js for persistence
- **Real-Time Updates** - Subscription pattern for live data
- **Multi-Source Aggregation** - Combines database, content store, and audit logs
- **Privacy-First** - All data remains on your device

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Analytics Dashboard                           │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Growth  │ │   Tags   │ │ Activity │ │ Research │ │Accomplishment│ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘ │
└───────┼───────────┼────────────┼────────────┼───────────────┼───────┘
        │           │            │            │               │
        └───────────┴─────┬──────┴────────────┴───────────────┘
                          │
                ┌─────────▼─────────┐
                │  analyticsService │
                │                   │
                │  getAnalyticsData │
                └─────────┬─────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
┌───────▼───────┐ ┌───────▼───────┐ ┌───────▼───────┐
│   SQLite DB   │ │ Content Store │ │  Audit Logs   │
│               │ │               │ │               │
│ - strands     │ │ - filesystem  │ │ - actions     │
│ - embeddings  │ │ - bundled     │ │ - sessions    │
│ - reading     │ │ - sources     │ │ - timestamps  │
└───────────────┘ └───────────────┘ └───────────────┘
```

## Data Model

### Database Tables

#### strands
Primary content storage with metadata.

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Unique identifier |
| path | TEXT | File path |
| title | TEXT | Strand title |
| weave_id | TEXT | Parent weave reference |
| status | TEXT | draft, published, archived |
| tags | JSON | Array of tag strings |
| subjects | JSON | Array of subjects |
| topics | JSON | Array of topics |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

#### embeddings
Vector embeddings with content metadata (fallback source).

| Column | Type | Description |
|--------|------|-------------|
| path | TEXT | File path (unique) |
| weave | TEXT | Weave name |
| loom | TEXT | Loom name |
| tags | JSON | Array of tags |
| content_type | TEXT | Content classification |
| created_at | TEXT | ISO timestamp |

#### codex_audit_log
User activity tracking.

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Auto-increment |
| session_id | TEXT | Session identifier |
| action_type | TEXT | file, content, metadata, navigation, etc. |
| action_name | TEXT | Specific action performed |
| target_path | TEXT | Affected resource |
| timestamp | TEXT | ISO timestamp |

#### reading_progress
Content engagement tracking.

| Column | Type | Description |
|--------|------|-------------|
| strand_path | TEXT | Strand identifier |
| total_read_time | INTEGER | Seconds spent reading |
| read_percentage | REAL | 0-100 completion |
| completed | INTEGER | 0 or 1 |
| last_read_at | TEXT | ISO timestamp |

## Metrics Calculation

### Growth Metrics

```typescript
interface GrowthMetrics {
  strandsOverTime: TimeSeriesPoint[]  // Daily creation counts
  totalStrands: number                 // All-time count
  strandsThisPeriod: number           // Current period count
  strandsPreviousPeriod: number       // Previous period for comparison
  growthRate: number                   // Percentage change
  byWeave: { name, count }[]          // Distribution by category
  byStatus: { status, count }[]       // Distribution by status
}
```

**Growth Rate Formula:**
```
growthRate = ((current - previous) / previous) * 100
```

### Tag Metrics

```typescript
interface TagMetrics {
  tagEvolution: { date, tags: Record<string, number> }[]
  topTags: { name, count }[]
  topSubjects: { name, count }[]
  topTopics: { name, count }[]
  totalUniqueTags: number
  totalUniqueSubjects: number
  totalUniqueTopics: number
  newTagsThisPeriod: string[]
}
```

Tags are aggregated from:
1. `strands.tags` JSON array
2. `embeddings.tags` fallback
3. Frontmatter taxonomy fields

### Activity Metrics

```typescript
interface ActivityMetrics {
  activityByDay: TimeSeriesPoint[]
  byActionType: { type, count, color }[]
  peakDay: { date, count }
  averageDaily: number
  totalActions: number
  sessionCount: number
}
```

**Action Types:**
- `file` - File operations (create, update, delete)
- `content` - Content editing
- `metadata` - Tag/property changes
- `navigation` - Page views, searches
- `learning` - Flashcard interactions
- `bookmark` - Bookmark actions

### Engagement Metrics

```typescript
interface EngagementMetrics {
  totalReadTime: number        // Total seconds
  completedStrands: number     // Fully read content
  strandsWithProgress: number  // Any reading progress
  averageReadPercentage: number
  readingByDay: TimeSeriesPoint[]
}
```

## API Reference

### Analytics Service

```typescript
// lib/analytics/analyticsService.ts

// Get all metrics for a time range
async function getAnalyticsData(range: TimeRange): Promise<AnalyticsData>

// Format seconds to human-readable
function formatDuration(seconds: number): string
// Examples: "45s", "12m", "2h 30m"

// Format date for display
function formatDate(dateStr: string, format: 'short' | 'medium' | 'long'): string
```

### Time Ranges

```typescript
type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all'

const TIME_RANGE_CONFIG = {
  week: { label: 'This Week', days: 7 },
  month: { label: 'This Month', days: 30 },
  quarter: { label: 'This Quarter', days: 90 },
  year: { label: 'This Year', days: 365 },
  all: { label: 'All Time', days: -1 },
}
```

## Real-Time Updates

The analytics system uses a subscription pattern for real-time updates:

```typescript
// lib/analytics/analyticsEvents.ts

type AnalyticsEventType =
  | 'strand-created'
  | 'strand-updated'
  | 'strand-deleted'
  | 'tag-added'
  | 'activity-logged'

// Subscribe to analytics events
function subscribeToAnalytics(callback: (event) => void): () => void

// Emit an event (triggers subscriber callbacks)
function emitAnalyticsEvent(type: AnalyticsEventType, payload: object): void
```

### React Hook

```typescript
// lib/hooks/useAnalytics.ts

interface UseAnalyticsOptions {
  timeRange: TimeRange
  autoRefresh?: boolean      // Default: true
  refreshInterval?: number   // Default: 30000ms
}

function useAnalytics(options: UseAnalyticsOptions): {
  data: AnalyticsData | null
  loading: boolean
  refresh: () => Promise<void>
  lastUpdated: Date | null
}
```

## Data Flow

### Content Creation Flow

```
User creates strand
        │
        ▼
┌─────────────────┐
│ SQLiteStore.    │
│ saveStrand()    │
├─────────────────┤
│ 1. Save to DB   │
│ 2. Emit event   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Analytics Event │
│ 'strand-created'│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useAnalytics    │
│ hook updates    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ UI re-renders   │
│ with new data   │
└─────────────────┘
```

### Query Flow

```
Dashboard loads
        │
        ▼
┌─────────────────┐
│ getAnalyticsData│
│ (timeRange)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│        Parallel Data Fetch           │
├──────────┬──────────┬───────────────┤
│  Growth  │   Tags   │   Activity    │
│ Metrics  │ Metrics  │   Metrics     │
└────┬─────┴────┬─────┴───────┬───────┘
     │          │             │
     ▼          ▼             ▼
┌─────────────────────────────────────┐
│   Check Data Sources (Priority)     │
├─────────────────────────────────────┤
│ 1. Content Store (filesystem)       │
│ 2. Strands table (database)         │
│ 3. Embeddings table (fallback)      │
└────────────────┬────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────┐
│     Aggregate & Return Data         │
└─────────────────────────────────────┘
```

## Performance Considerations

### Query Optimization

1. **Date Range Filtering** - All queries filter by date range first
2. **Parallel Execution** - Metrics fetched concurrently with `Promise.all`
3. **Content Store Priority** - Filesystem queries before database
4. **Indexed Columns** - Date and path columns are indexed

### Caching Strategy

- Analytics data is cached in React state
- 30-second polling interval for background updates
- Immediate refresh on user-triggered events

### Memory Management

- Time series data is date-bounded
- Large datasets are aggregated server-side
- Embeddings table used only as fallback
- Cumulative counts computed incrementally

## Component Structure

```
components/quarry/analytics/
├── AnalyticsPage.tsx      # Main dashboard
├── StatCard.tsx           # Metric display cards
├── TimeRangeSelector.tsx  # Period selection
├── ResearchSection.tsx    # Research tab content
├── AccomplishmentAnalytics.tsx
├── GitHistorySection.tsx  # Git commit tracking
├── UsageSection.tsx       # Usage analytics
└── charts/
    ├── AreaChart.tsx      # Time series visualization
    └── BarChart.tsx       # Comparison visualization
```

## Adding Custom Metrics

To add a new metric type:

1. **Define Types** in `lib/analytics/types.ts`:
```typescript
export interface CustomMetrics {
  yourMetric: number
  // ...
}
```

2. **Create Query Function** in `analyticsService.ts`:
```typescript
async function getCustomMetrics(range: TimeRange): Promise<CustomMetrics> {
  const db = await getDatabase()
  // Query and aggregate data
  return metrics
}
```

3. **Add to Main Function**:
```typescript
export async function getAnalyticsData(range: TimeRange) {
  const [growth, tags, activity, engagement, custom] = await Promise.all([
    getGrowthMetrics(range),
    getTagMetrics(range),
    getActivityMetrics(range),
    getEngagementMetrics(range),
    getCustomMetrics(range),  // Add here
  ])
  // ...
}
```

4. **Create UI Component** in `components/quarry/analytics/`

5. **Add Tab** to `AnalyticsPage.tsx`

## Troubleshooting

### No Data Showing

1. Verify database connection: `await getDatabase()` returns valid instance
2. Check content store: `await getContentStore()` initializes correctly
3. Review console for `[Analytics]` prefixed logs
4. Ensure content exists in strands table or content store

### Incorrect Counts

1. Time range may exclude older content
2. Content store and database may have different sources
3. Check `created_at` vs `updated_at` date fields

### Slow Loading

1. Reduce time range (week vs year)
2. Check for missing database indices
3. Review content store initialization

## Privacy & Data

- **No External Tracking** - All analytics computed locally
- **No Network Requests** - Data never leaves your device
- **User Controlled** - Data stored in IndexedDB on your device
- **Audit Optional** - Audit logging can be disabled
- **Export Available** - Data can be exported as JSON
