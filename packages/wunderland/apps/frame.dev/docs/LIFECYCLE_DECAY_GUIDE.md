# Lifecycle Decay Guide

Lifecycle Decay is a system that tracks how your notes evolve over time based on engagement. Instead of notes cluttering your knowledge base indefinitely, they naturally transition through stages: **Fresh** → **Active** → **Faded**. Nothing is ever deleted—faded notes can be resurfaced at any time.

## Core Philosophy

> "Notes have a lifecycle—early thoughts stay lightweight, refined ideas become more structured. Notes you don't return to automatically fade instead of silently cluttering your system."

This approach keeps your knowledge graph readable by:
- Highlighting recently engaged content
- Automatically identifying notes that may need attention
- Enabling focused work with relevant, actively used material

## Lifecycle Stages

| Stage | Icon | Description | Default Threshold |
|-------|------|-------------|-------------------|
| **Fresh** | 🌟 | Recently created or actively engaged | 0-7 days |
| **Active** | ⚡ | Regular use, maintained over time | 8-30 days |
| **Faded** | 🌙 | Not accessed recently, may need review | 30+ days |

## How Decay Works

### Decay Score

Each strand has a **decay score** from 0-100:
- **100** = Completely fresh, just accessed
- **70+** = Fresh stage
- **30-69** = Active stage  
- **<30** = Faded stage

### Decay Formula

The decay score combines **time decay** and **engagement**:

```
decayScore = (timeDecay × (1 - engagementWeight)) + (engagementScore × engagementWeight)
```

#### Time Decay
Linear decay from 100 to 0 over the fade threshold:

```typescript
timeDecay = 100 - (daysSinceAccess × (100 / fadeThresholdDays))
```

Example: With 30-day fade threshold, a note accessed 15 days ago has timeDecay = 50.

#### Engagement Score
Weighted combination of activity:

```typescript
engagementScore = 
  (normalizedViews × 0.2) +    // Views: 0-50 normalized to 0-100
  (normalizedEdits × 0.5) +    // Edits: 0-20 normalized to 0-100
  (normalizedConnections × 0.3) // Connections: 0-10 normalized to 0-100
```

Example: A note with 25 views, 10 edits, and 5 connections has engagementScore = 10 + 25 + 15 = 50.

#### Combined Score
With default 0.3 engagement weight:

```typescript
// Note accessed 15 days ago with moderate engagement
timeDecay = 50
engagementScore = 50
decayScore = (50 × 0.7) + (50 × 0.3) = 35 + 15 = 50
```

## Stage Determination

Stage is determined by both decay score and days since access:

```typescript
if (daysSinceAccess <= freshThresholdDays && decayScore >= 70) {
  return 'fresh'
}
if (decayScore < 30 || daysSinceAccess > fadeThresholdDays) {
  return 'faded'
}
return 'active'
```

## Settings Configuration

### Default Settings

```typescript
const DEFAULT_LIFECYCLE_SETTINGS = {
  freshThresholdDays: 7,    // Days before Fresh → Active
  fadeThresholdDays: 30,    // Days before Active → Faded
  engagementWeight: 0.3,    // How much activity slows decay (0-1)
  autoResurface: true,      // Suggest faded notes in rituals
  ritualReminders: true,    // Show ritual prompts
  resurfaceLimit: 5,        // Max resurface suggestions
}
```

### Workflow Examples

**Deep Research Workflow** (slow decay):
```typescript
{
  freshThresholdDays: 14,
  fadeThresholdDays: 60,
  engagementWeight: 0.5,  // High engagement keeps notes fresh longer
}
```

**Quick Notes Workflow** (fast decay):
```typescript
{
  freshThresholdDays: 3,
  fadeThresholdDays: 14,
  engagementWeight: 0.2,  // Time-based decay dominates
}
```

**Connection-Heavy Workflow**:
```typescript
{
  fadeThresholdDays: 45,
  engagementWeight: 0.4,  // Connections matter more
}
```

## Using the Lifecycle Tab

Access the Lifecycle tab from `/quarry/evolution`:

### Overview Stats
- **Total Tracked**: Number of strands with lifecycle data
- **Average Decay Score**: Health of your knowledge base
- **At Risk**: Active strands about to fade
- **To Resurface**: Suggested faded notes

### Stage Distribution Chart
Stacked area chart showing Fresh/Active/Faded distribution over time.

### Strand Lists
Collapsible sections for each stage with:
- Decay score indicator
- Days since access
- View/edit/connection counts
- Quick resurface action for faded strands

### Resurface Panel
AI-suggested faded notes worth revisiting based on:
- Connection count (well-connected notes)
- Past engagement (heavily edited notes)
- Recent activity in related topics

## API Reference

### useLifecycleData Hook

```typescript
import { useLifecycleData } from '@/components/quarry/hooks/useLifecycleData'

function MyComponent() {
  const {
    // Data
    allStrands,           // All tracked strands
    freshStrands,         // Stage = fresh
    activeStrands,        // Stage = active
    fadedStrands,         // Stage = faded
    atRiskStrands,        // About to fade
    resurfaceSuggestions, // Suggested resurfaces
    stats,                // Aggregate statistics
    timeSeries,           // For charts
    recentRituals,        // Past ritual sessions
    
    // State
    loading,
    error,
    settings,
    
    // Actions
    refresh,              // Reload all data
    recalculate,          // Batch recalculate all scores
    resurface,            // Resurface a strand
    recordEvent,          // Record view/edit/link event
    startRitual,          // Start morning/evening ritual
    completeRitual,       // Complete ritual with data
    getRitualPromptData,  // Get data for ritual modal
  } = useLifecycleData({
    settings: customSettings,  // Optional custom settings
    refreshInterval: 60000,    // Auto-refresh (0 = disabled)
    fetchOnMount: true,        // Load on mount
  })
}
```

### Lifecycle Store Functions

```typescript
import {
  getOrCreateLifecycle,
  recordLifecycleEvent,
  getAllLifecycles,
  getLifecyclesByStage,
  getAtRiskStrands,
  getResurfaceSuggestions,
  resurfaceStrand,
  recalculateAllLifecycles,
  getLifecycleStats,
  getLifecycleTimeSeries,
} from '@/lib/analytics/lifecycleStore'

// Record a view event
await recordLifecycleEvent('path/to/strand.md', 'view')

// Resurface a faded strand
await resurfaceStrand('faded/note.md', settings)

// Get strands at risk of fading
const atRisk = await getAtRiskStrands(settings, 10)
```

### Event Types

```typescript
type LifecycleEventType = 
  | 'view'           // Strand was viewed
  | 'edit'           // Strand was edited
  | 'link_added'     // Connection added
  | 'link_removed'   // Connection removed
  | 'resurfaced'     // Manually resurfaced
  | 'ritual_review'  // Reviewed during ritual
```

## Integration with Rituals

Lifecycle decay integrates with the Rituals system (see [HABIT_TRACKING_GUIDE.md](HABIT_TRACKING_GUIDE.md)):

### Morning Ritual
Surfaces relevant notes for your day:
- Recently active strands with high engagement
- Fading notes worth revisiting
- Capture intentions for the day

### Evening Ritual  
Reflects on the day's work:
- Shows what you worked on today
- Mark notes as reviewed (resets decay)
- Capture reflections and insights

### Ritual Review Effect
When you mark a note as "reviewed" during a ritual:
1. A `ritual_review` event is recorded
2. The `lastAccessedAt` is updated
3. Decay score recalculates (typically back to fresh)

## Best Practices

### 1. Regular Ritual Practice
Morning/evening rituals naturally keep your knowledge base healthy by surfacing fading notes.

### 2. Use Connections
Well-connected notes are more likely to be suggested for resurfacing. Link related ideas!

### 3. Adjust Thresholds
If too many notes are fading, increase `fadeThresholdDays`. If the graph is cluttered, decrease it.

### 4. Trust the Fade
Faded notes aren't gone—they're just quieter. The system surfaces them when they become relevant again.

### 5. Review At-Risk
Check the "At Risk" section periodically. These are notes about to fade that might deserve attention.

## Database Schema

The lifecycle system uses SQLite:

```sql
CREATE TABLE strand_lifecycle (
  strand_path TEXT PRIMARY KEY,
  stage TEXT NOT NULL DEFAULT 'fresh',
  decay_score REAL NOT NULL DEFAULT 100,
  last_accessed_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  edit_count INTEGER NOT NULL DEFAULT 0,
  connection_count INTEGER NOT NULL DEFAULT 0,
  engagement_score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE lifecycle_events (
  id TEXT PRIMARY KEY,
  strand_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  metadata TEXT
);

CREATE TABLE ritual_sessions (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  surfaced_strands TEXT,
  reviewed_strands TEXT,
  intentions TEXT,
  reflections TEXT,
  connections_formed TEXT
);
```

## Troubleshooting

### Notes Not Decaying
1. Check that lifecycle tracking is initialized
2. Verify events are being recorded (check `lifecycle_events` table)
3. Try "Recalculate" in the Lifecycle tab

### Too Many Faded Notes
1. Increase `fadeThresholdDays` in settings
2. Increase `engagementWeight` to reward active notes
3. Use rituals to systematically review important notes

### Resurface Suggestions Empty
1. Build more connections between notes
2. Wait for notes to accumulate engagement history
3. Check that faded notes exist with `connectionCount > 0`

### Performance Issues
1. Use `recalculateAllLifecycles` sparingly (batch operation)
2. Disable auto-refresh or increase interval
3. Consider archiving truly obsolete content

## Related Documentation

- [EVOLUTION_TIMELINE_GUIDE.md](EVOLUTION_TIMELINE_GUIDE.md) - Timeline visualization
- [HABIT_TRACKING_GUIDE.md](HABIT_TRACKING_GUIDE.md) - Rituals and habits
- [ANALYTICS_ARCHITECTURE.md](ANALYTICS_ARCHITECTURE.md) - Analytics system overview

