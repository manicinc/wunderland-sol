# Evolution Timeline Guide

The Evolution Timeline is a powerful visualization feature that displays the complete historical growth of your personal knowledge management system. It provides collapsible timeframes, activity indicators, milestone tracking, and deep insights into how your knowledge base has grown over time.

## Overview

The Evolution Timeline tracks three primary types of events:
- **Strand Creations** - When new notes/documents are added to your knowledge base
- **Git Commits** - Version control history showing code/content changes
- **Tag Additions** - New tags introduced to organize your content
- **Milestones** - Automatically detected achievements (e.g., "First 100 Strands")

## Accessing the Evolution Timeline

### Dedicated Page

Navigate to `/quarry/evolution` for the full Evolution Timeline experience. This page includes:
- **Zoom Level Controls** - Switch between Year, Quarter, Month, or Week views
- **Stat Cards** - Total strands, commits, tags, and growth rate
- **Activity Chart** - Time-series visualization of activity over time
- **Activity Heatmap** - GitHub-style contribution calendar
- **Milestones Panel** - Key achievements in your PKM journey
- **Collapsible Timeline** - Hierarchical, expandable timeline of all events

### Analytics Integration

The Evolution Timeline is also available within the Analytics page:
- **Evolution Summary Card** - Quick stats and recent milestones with a link to the full timeline
- **Evolution Tab** - Full expandable section with heatmap, mini timeline, and milestones

### Navigation

Access the Evolution Timeline from:
- **Sidebar Quick Menu** - Click the teal "Evolution" link
- **Mobile Navigation** - Available in the "More" menu
- **Analytics Page** - Via the Evolution tab and summary card

## Features

### Collapsible Timeframes

The timeline organizes events into hierarchical periods that can be expanded or collapsed:

```
▼ 2025 (Year)
  ├─ ▼ Q1 2025 (Quarter)
  │   ├─ ▼ January 2025 (Month)
  │   │   ├─ Week of Jan 1-7
  │   │   │   ├─ Created 5 new strands
  │   │   │   └─ 3 commits
  │   │   └─ Week of Jan 8-14
  │   │       └─ Added 2 tags
  │   └─ February 2025
  └─ Q2 2025
```

Each timeframe displays:
- **Activity Indicator** - Color-coded dot (green/amber/red) based on activity level
- **Stats Badges** - Quick counts for strands, commits, tags, and milestones
- **Date Range** - Formatted based on zoom level
- **Nested Events** - Individual events with icons and timestamps

### Zoom Levels

Control the granularity of the timeline:

| Level | Description | Sub-periods |
|-------|-------------|-------------|
| **Year** | Full calendar year | Quarters |
| **Quarter** | 3-month period | Months |
| **Month** | Single month | Weeks |
| **Week** | 7-day period | Individual days |

### Event Types

Each event is color-coded and icon-labeled:

| Event Type | Icon | Color | Description |
|------------|------|-------|-------------|
| Strand Created | 📄 | Emerald | New document/note added |
| Git Commit | 🔀 | Blue | Version control commit |
| Tag Added | 🏷️ | Violet | New tag introduced |
| Milestone | ✨ | Purple | Achievement unlocked |
| Content Change | 📝 | Amber | Significant content update |

### Milestones

The system automatically detects and celebrates achievements:

- **First 100 Strands** - Reached 100 total knowledge strands
- **First 500 Strands** - Reached 500 total knowledge strands
- **First 50 Commits** - Reached 50 git commits
- **First 20 Tags** - Reached 20 unique tags

Milestones appear in the timeline and are highlighted in the Milestones panel.

### Event Filtering

Use the Filter Events popover to show/hide specific event types:
- All Event Types (default)
- Strands Created only
- Git Commits only
- Tags Added only
- Milestones only
- Content Changes only

### Expand/Collapse All

Click "Expand All" to open all timeframes at once, or "Collapse All" to close them. Useful for getting a quick overview or diving into details.

## Data Sources

The Evolution Timeline aggregates data from multiple sources:

### Analytics Service
- Strand creation timestamps
- Tag additions over time
- Content growth metrics

### Git Analytics
- Commit history (date, author, message, changes)
- Branch activity

### Calculated Metrics
- Growth rate (percentage change over time)
- Cumulative totals
- Activity levels per period

## API: useEvolutionData Hook

The `useEvolutionData` hook provides all evolution data for components:

```typescript
import { useEvolutionData } from '@/components/quarry/hooks/useEvolutionData'

function MyComponent() {
  const { 
    data,        // EvolutionData object
    loading,     // boolean
    error,       // string | null
    zoomLevel,   // 'year' | 'quarter' | 'month' | 'week'
    setZoomLevel,// (level) => void
    refresh      // () => Promise<void>
  } = useEvolutionData('all')
  
  // Use data...
}
```

### EvolutionData Structure

```typescript
interface EvolutionData {
  timeSeries: { date: string; count: number; cumulative: number }[]
  totalStrands: number
  totalCommits: number
  totalTags: number
  totalMilestones: number
  periods: EvolutionPeriod[]
  milestones: EvolutionEvent[]
  growthRate: number
  sinceDate: string
}
```

## Components

### EvolutionTimeline

Main timeline container with filtering and controls:

```tsx
<EvolutionTimeline
  periods={data.periods}
  isDark={isDark}
  zoomLevel={zoomLevel}
  onNavigate={(path) => router.push(path)}
  compact={false}
/>
```

### CollapsibleTimeframe

Individual collapsible period with stats and events:

```tsx
<CollapsibleTimeframe
  period={period}
  isDark={isDark}
  zoomLevel="month"
  defaultOpen={false}
/>
```

### EvolutionSummaryCard

Compact summary widget for dashboards:

```tsx
<EvolutionSummaryCard isDark={isDark} />
```

### EvolutionSection

Expandable section for the Analytics page:

```tsx
<EvolutionSection isDark={isDark} timeRange={timeRange} />
```

## Best Practices

### Performance

- The timeline uses virtualization for large datasets
- Periods are lazily expanded to minimize rendering
- Data is cached and refreshed on demand

### Accessibility

- Keyboard navigation supported (Tab, Enter, Space)
- Screen reader labels for all interactive elements
- Color-blind friendly indicators (shapes + colors)

### Mobile

- Responsive design adapts to screen size
- Touch-friendly expand/collapse targets
- Compact mode for embedded views

## Lifecycle Decay

The Evolution page includes a **Lifecycle** tab that tracks how your notes evolve over time:

### How It Works

Notes move through three stages based on engagement:

| Stage | Description | Threshold |
|-------|-------------|-----------|
| **Fresh** 🌟 | Recently created or accessed | 0-7 days (default) |
| **Active** ⚡ | Regular use, maintained | 8-30 days (default) |
| **Faded** 🌙 | Not accessed recently | 30+ days (default) |

### Decay Score

Each note has a decay score (0-100) calculated from:
- **Time decay** - How long since last access
- **Engagement** - Views, edits, and connections
- **Weight** - Configurable blend of time vs engagement

Higher engagement slows decay, keeping valuable notes fresh longer.

### Resurface Suggestions

Faded notes with valuable connections are suggested for resurfacing. Resurfacing a note:
- Resets its stage to "Fresh"
- Records a lifecycle event
- Updates the decay score to 100

### Settings

Configure lifecycle thresholds in the Settings panel:
- **Fresh Duration** - Days before Fresh → Active (1-30)
- **Fade Duration** - Days before Active → Faded (7-90)
- **Engagement Weight** - How much activity slows decay (0-1)
- **Auto-Resurface** - Suggest faded notes during rituals
- **Resurface Limit** - Max suggestions to show

## Rituals

Rituals are special habits that integrate with the lifecycle system to help you maintain your knowledge base.

### Morning Setup Ritual

Start your day with intention:
1. **Surface relevant notes** - Notes that may help with today's work
2. **Review fading notes** - Notes about to fade that are worth revisiting
3. **Set intentions** - Capture what you want to accomplish

### Evening Reflection Ritual

Reflect on your day:
1. **Review today's work** - Notes you accessed/edited today
2. **Capture reflections** - Insights and learnings from the day
3. **Form connections** - Link related ideas together

### Setting Up Rituals

1. Go to Habits in the Planner
2. Click "New Habit"
3. Select "Rituals" category
4. Choose "Morning Setup" or "Evening Reflection"

When you complete a ritual habit, the Ritual Prompt Modal opens with:
- Notes to surface based on your activity
- Faded notes worth revisiting
- Input for intentions/reflections

## Related Features

- **Analytics Dashboard** - `/quarry/analytics`
- **Knowledge Graph** - `/quarry/graph`
- **Timeline View** - Reading history and recent activity
- **Reflect** - Daily journaling and mood tracking
- **Habits** - Streak tracking with ritual integration

## Troubleshooting

### No Evolution Data

If you see "No Evolution Data Yet":
1. Create some strands (notes/documents)
2. Make git commits to your repository
3. Add tags to organize content
4. Click Refresh to reload data

### Data Not Updating

1. Click the Refresh button in the header
2. Check that git history is accessible
3. Verify analytics service is connected

### Slow Loading

For large knowledge bases:
1. Use higher zoom levels (Year/Quarter) for overview
2. Filter to specific event types
3. Use compact mode in Analytics

