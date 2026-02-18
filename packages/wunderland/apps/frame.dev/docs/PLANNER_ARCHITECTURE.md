# Quarry Planner Architecture

Technical architecture documentation for the Quarry Planner system.

## Overview

The Quarry Planner is a local-first calendar and task management system built on SQLite (via better-sqlite3/PGlite). It uses React hooks for state management and supports bidirectional Google Calendar synchronization.

## Directory Structure

```
lib/planner/
├── database.ts              # Core CRUD operations for tasks/events
├── types.ts                 # TypeScript interfaces for tasks, events, calendars
├── timelineUtils.ts         # Timeline positioning and overlap algorithms
├── taskParser.ts            # Natural language task parsing
├── projects.ts              # Project management utilities
├── holidays.ts              # Holiday data integration
├── export.ts                # Export to various formats
├── importFromStrand.ts      # Import tasks from strands
│
├── hooks/
│   ├── useCalendar.ts       # Calendar events CRUD (325 lines)
│   ├── useTasks.ts          # Task management (329 lines)
│   ├── useSubtasks.ts       # Subtask management (302 lines)
│   ├── useReminders.ts      # Reminder scheduling (523 lines)
│   ├── usePlannerPreferences.ts # User preferences (303 lines)
│   ├── useProjects.ts       # Project management (151 lines)
│   ├── useGoogleCalendarSync.ts # Google Calendar sync
│   ├── useEmbeddedTasks.ts  # Tasks embedded in strands
│   ├── useTaskTimer.ts      # Pomodoro-style timer
│   └── useTreePersistence.ts # Drag-drop tree state
│
├── habits/
│   ├── types.ts             # Habit types and interfaces
│   ├── database.ts          # Habit database operations
│   ├── useHabits.ts         # Main habits hook
│   ├── habitStreakManager.ts # Streak calculations
│   ├── recurrenceGenerator.ts # Recurrence pattern generation
│   ├── templates.ts         # Preset habit templates
│   └── index.ts             # Module exports
│
├── google/
│   └── GoogleCalendarOAuth.ts # OAuth flow for Google Calendar
│
└── oracle/
    ├── prompts.ts           # AI prompts for task suggestions
    ├── actions.ts           # AI action handlers
    ├── nlpParser.ts         # Compromise.js NLP for intent extraction (420 lines)
    ├── llmParser.ts         # Claude/OpenAI LLM integration (410 lines)
    └── index.ts             # Oracle hook and exports (460 lines)

components/quarry/ui/planner/
├── StreamlinedDayView.tsx   # Premium day view (673 lines)
├── TimelineSpine.tsx        # Vertical timeline (566 lines)
├── TimelineEventCard.tsx    # Event cards for timeline
├── WeekDayStrip.tsx         # Week navigation (277 lines)
├── EditTimeBlockModal.tsx   # Event editor (669 lines)
├── EndOfDayCountdown.tsx    # Time remaining display
├── DragDropProvider.tsx     # Drag-drop context
├── ViewSwitcher.tsx         # View mode switcher
├── PlannerTutorial.tsx      # Onboarding tour
└── ColoredTimelineBar.tsx   # Progress visualization
```

## Database Schema

### Core Tables

```sql
-- Tasks (standalone and embedded)
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT DEFAULT 'standalone',  -- 'standalone' | 'embedded' | 'event'
  status TEXT DEFAULT 'pending',        -- 'pending' | 'in_progress' | 'completed'
  priority TEXT DEFAULT 'medium',       -- 'none' | 'low' | 'medium' | 'high'
  due_date TEXT,                        -- ISO date
  due_time TEXT,                        -- HH:MM format
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  project_id TEXT,
  parent_task_id TEXT,                  -- For subtasks
  strand_id TEXT,                       -- Source strand if embedded
  position_in_strand INTEGER,
  recurrence_rule TEXT,                 -- JSON RRULE object
  tags TEXT,                            -- JSON array
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);

-- Calendar Events
CREATE TABLE calendar_events (
  id TEXT PRIMARY KEY,
  calendar_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,            -- ISO datetime
  end_time TEXT NOT NULL,              -- ISO datetime
  all_day INTEGER DEFAULT 0,
  location TEXT,
  color TEXT,
  icon TEXT,                           -- Lucide icon name
  recurrence_rule TEXT,                -- JSON RRULE
  google_event_id TEXT,                -- For sync
  etag TEXT,                           -- Google sync token
  is_deleted INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Calendars
CREATE TABLE calendars (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#4285F4',
  is_primary INTEGER DEFAULT 0,
  is_visible INTEGER DEFAULT 1,
  google_calendar_id TEXT,             -- For sync
  sync_token TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Event Reminders
CREATE TABLE event_reminders (
  id TEXT PRIMARY KEY,
  event_id TEXT,
  task_id TEXT,
  remind_at TEXT NOT NULL,             -- ISO datetime
  reminder_type TEXT DEFAULT 'notification', -- 'notification' | 'sound' | 'both'
  minutes_before INTEGER NOT NULL,
  is_sent INTEGER DEFAULT 0,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES calendar_events(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Planner Preferences
CREATE TABLE planner_preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                 -- JSON-encoded value
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Habit Tables

```sql
-- Habit Streaks
CREATE TABLE habit_streaks (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  completion_history TEXT,             -- JSON array of ISO dates
  last_completed_date TEXT,
  streak_freezes_remaining INTEGER DEFAULT 0,
  freeze_active_until TEXT,
  total_completions INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);
```

## Hook Architecture

### Hook Dependency Graph

```
usePlannerPreferences
         │
         ├──► useCalendar ──────► useReminders
         │         │
         │         └──► useGoogleCalendarSync
         │
         ├──► useTasks ──────► useSubtasks
         │         │
         │         └──► useProjects
         │
         └──► useHabits
                   │
                   └──► habitStreakManager
```

### Core Hooks

#### `usePlannerPreferences`

Manages user preferences with SQLite persistence.

```typescript
interface PlannerPreferences {
  defaultView: PlannerView           // 'day' | 'week' | 'month' | 'agenda' | 'timeline'
  weekStartsOn: 0 | 1 | 6            // Sunday, Monday, Saturday
  timeFormat: '12h' | '24h'
  workDayStart: number               // Hour 0-23
  workDayEnd: number                 // Hour 0-23
  defaultEventDuration: number       // Minutes
  defaultReminderMinutes: number
  showWeekNumbers: boolean
  hideWeekends: boolean
  showDeclinedEvents: boolean
  compactMode: boolean
  enableBrowserNotifications: boolean
  enableSoundAlerts: boolean
}
```

**Key Functions:**
- `loadPreferences()` - Load from SQLite
- `savePreference(key, value)` - Save single preference
- `resetToDefaults()` - Clear all preferences

#### `useReminders`

Browser notification system with background checking.

```typescript
interface UseRemindersOptions {
  checkInterval?: number            // Default: 30000ms (30s)
  enableSound?: boolean
  onReminder?: (notification) => void
  getEventTitle?: (eventId) => string
  getTaskTitle?: (taskId) => string
}
```

**Features:**
- Periodic check every 30 seconds
- Browser Notification API integration
- Web Audio API for sound alerts
- Multiple reminders per event

#### `useCalendar`

Calendar event management with CRUD operations.

**Key Functions:**
- `createEvent(input)` - Create new event
- `updateEvent(id, updates)` - Modify event
- `deleteEvent(id)` - Soft delete
- `getEventsForDate(date)` - Query by date
- `getEventsInRange(start, end)` - Query date range

## Timeline Algorithms

### Position Calculation (`timelineUtils.ts`)

Events are positioned as percentages within the visible day range.

```typescript
function getTimelinePosition(
  time: Date,
  dayStartHour: number,
  dayEndHour: number
): number {
  const timeHours = time.getHours() + time.getMinutes() / 60
  const totalHours = dayEndHour - dayStartHour
  const position = ((timeHours - dayStartHour) / totalHours) * 100
  return Math.max(0, Math.min(100, position))
}
```

### Height Calculation

```typescript
function getTimelineHeight(
  durationMinutes: number,
  dayStartHour: number,
  dayEndHour: number
): number {
  const totalMinutes = (dayEndHour - dayStartHour) * 60
  return (durationMinutes / totalMinutes) * 100
}
```

### TimeGrid Position Calculation (`EventBlock.tsx`)

For the Week/Day views, tasks and events are positioned using pixel-based calculations:

```typescript
function calculateTaskPosition(
  task: Task,
  startHour: number,
  slotHeight: number  // pixels per hour
): { top: number; height: number } | null {
  if (!task.dueTime) return null

  const [hours, minutes] = task.dueTime.split(':').map(Number)
  const taskMinutes = hours * 60 + minutes
  const startOffset = taskMinutes - startHour * 60

  const top = (startOffset / 60) * slotHeight
  // Use task duration if set, otherwise default to 30 minutes
  const durationMinutes = task.duration || 30
  const height = Math.max((durationMinutes / 60) * slotHeight, 20) // Minimum 20px

  return { top, height }
}
```

**Key differences from `getTimelineHeight`:**
- Returns pixel values, not percentages
- Uses `slotHeight` (typically 60px/hour) for scaling
- Enforces minimum 20px height for visibility
- Respects the task's `duration` field

### Overlap Detection

Uses interval tree algorithm to detect overlapping events:

```typescript
function detectOverlaps(items: TimelineItem[]): Map<string, string[]> {
  // Sort by start time
  const sorted = [...items].sort((a, b) =>
    a.startTime.getTime() - b.startTime.getTime()
  )

  const overlaps = new Map<string, string[]>()

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      // If j starts after i ends, no more overlaps possible
      if (sorted[j].startTime >= sorted[i].endTime) break

      // Mark as overlapping
      addOverlap(overlaps, sorted[i].id, sorted[j].id)
      addOverlap(overlaps, sorted[j].id, sorted[i].id)
    }
  }

  return overlaps
}
```

### Overlap Index for Staggering

```typescript
function getOverlapIndex(
  itemId: string,
  overlaps: Map<string, string[]>,
  items: TimelineItem[]
): number {
  const itemOverlaps = overlaps.get(itemId) || []
  if (itemOverlaps.length === 0) return 0

  // Find this item's position in the overlap group
  const sortedGroup = [itemId, ...itemOverlaps]
    .map(id => items.find(i => i.id === id)!)
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())

  return sortedGroup.findIndex(i => i.id === itemId)
}
```

## Recurrence System

### RRULE Format

Recurrence rules follow RFC 5545 (iCalendar) format:

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number              // Every N periods
  byDay?: number[]              // 0=Sun, 1=Mon, etc.
  byMonthDay?: number[]         // Day of month (1-31)
  byMonth?: number[]            // Month (1-12)
  count?: number                // Total occurrences
  until?: string                // End date (ISO)
}
```

### Occurrence Generator (`recurrenceGenerator.ts`)

```typescript
function generateOccurrences(
  rule: RecurrenceRule,
  start: Date,
  end: Date
): Date[] {
  const occurrences: Date[] = []
  let current = new Date(start)

  while (current <= end) {
    if (matchesRule(current, rule)) {
      occurrences.push(new Date(current))

      if (rule.count && occurrences.length >= rule.count) break
      if (rule.until && current >= new Date(rule.until)) break
    }

    current = advanceDate(current, rule)
  }

  return occurrences
}
```

## Habit Streak Algorithm

### Streak Calculation (`habitStreakManager.ts`)

```typescript
function calculateStreak(
  completionHistory: string[],
  frequency: HabitFrequency,
  today: string
): { current: number; longest: number } {
  if (completionHistory.length === 0) {
    return { current: 0, longest: 0 }
  }

  // Sort descending (most recent first)
  const sorted = [...completionHistory].sort().reverse()

  let current = 0
  let longest = 0
  let expectedDate = today

  for (const completion of sorted) {
    if (completion === expectedDate) {
      current++
      longest = Math.max(longest, current)
      expectedDate = getPreviousExpectedDate(expectedDate, frequency)
    } else if (completion < expectedDate) {
      // Streak broken
      break
    }
  }

  return { current, longest }
}
```

### Grace Period

Habits have a configurable grace period (default: 1 day) before streaks are broken:

```typescript
function isInGracePeriod(
  lastCompleted: string,
  gracePeriodHours: number = 24
): boolean {
  const last = new Date(lastCompleted)
  const now = new Date()
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60)
  return diffHours <= gracePeriodHours
}
```

## Google Calendar Sync

### Bidirectional Sync

```
Local Event ──────► Google Calendar API
     │                     │
     │ (push on save)      │ (poll every 5 min)
     │                     │
     └───────────────────◄─┘
             │
    Conflict Resolution
    (most recent wins)
```

### Sync Token Management

```typescript
interface SyncState {
  calendarId: string
  syncToken: string          // Google's sync token
  lastSync: string           // ISO datetime
  pendingChanges: Change[]   // Offline changes to sync
}
```

### Conflict Resolution

When both local and Google events are modified:

1. Compare `updatedAt` timestamps
2. Most recent edit wins
3. Log conflict in `sync_conflicts` table
4. User can review conflicts in settings

## Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| `←` / `→` | Navigate days |
| `↑` / `↓` | Navigate events |
| `Enter` | Open event |
| `N` | New event |
| `T` | Jump to today |
| `Escape` | Close modal |

### ARIA Labels

All interactive elements include:
- `role` attributes
- `aria-label` descriptions
- `aria-expanded` for modals
- Focus trapping in modals

### Focus Management

```typescript
const useModalAccessibility = (isOpen: boolean) => {
  // Trap focus within modal
  // Handle Escape to close
  // Prevent body scroll
  // Restore focus on close
}
```

## Performance Considerations

### Memoization

Heavy computations are memoized:
- `useMemo` for overlap detection
- `useMemo` for position calculations
- `useCallback` for event handlers

### Virtualization

Week and Month views use virtualized rendering:
- Only visible days are rendered
- Lazy loading for past events
- Skeleton loading states

### Database Optimization

- Indexed columns: `due_date`, `start_time`, `task_type`
- Soft deletes with `is_deleted` flag
- Batch operations for bulk updates

## Testing

### Test Coverage

```
__tests__/unit/planner/
├── usePlannerPreferences.test.tsx  # 42 tests
├── useReminders.test.tsx           # 32 tests
├── timelineUtils.test.ts           # Position/overlap algorithms
└── recurrenceGenerator.test.ts     # Recurrence generation
```

### Mocking Strategy

- Mock `getDatabase()` for hook tests
- Mock `Notification` API for reminder tests
- Mock `AudioContext` for sound tests

## Oracle NLP/LLM Architecture

The Oracle assistant uses a layered approach for natural language understanding:

### Provider Hierarchy

```
User Input
    │
    ▼
┌──────────────────────────────────────┐
│ LLM Parser (if enabled + API key)    │
│  ├── Claude API (preferred)          │
│  └── OpenAI API (fallback)           │
└──────────────────────────────────────┘
    │ (fallback if unavailable)
    ▼
┌──────────────────────────────────────┐
│ NLP Parser (always available)        │
│  └── Compromise.js (client-side)     │
└──────────────────────────────────────┘
    │
    ▼
ParsedTaskIntent → OracleAction → executeAction()
```

### NLP Parser (`nlpParser.ts`)

Local parsing using Compromise.js:

```typescript
interface ParsedTaskIntent {
  action: 'create' | 'update' | 'delete' | 'complete' | 'schedule' | 'query' | 'suggest'
  confidence: number        // 0-1 score
  title?: string
  dueDate?: string          // ISO date (YYYY-MM-DD)
  dueTime?: string          // 24-hour (HH:mm)
  duration?: number         // minutes
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  project?: string
  tags?: string[]
  subtasks?: string[]
  recurring?: RecurrencePattern
  rawEntities: ExtractedEntities
}
```

**Parsing capabilities:**
- Intent classification via keyword patterns
- Named entity extraction (dates, times, people, organizations)
- Relative date parsing ("tomorrow", "next Monday", "in 3 days")
- Time parsing ("3pm", "15:00", "morning", "end of day")
- Duration extraction ("30 minutes", "2 hours")
- Priority detection ("urgent", "high priority", "important")
- Subtask parsing ("with steps:", numbered lists)
- Recurring patterns ("every day", "weekly on Monday")

### LLM Parser (`llmParser.ts`)

Cloud-based parsing with Claude/OpenAI:

```typescript
interface OracleLLMConfig {
  enabled: boolean
  provider: 'claude' | 'openai' | 'auto'
  claudeApiKey?: string
  openaiApiKey?: string
  claudeModel: string      // Default: 'claude-sonnet-4-20250514'
  openaiModel: string      // Default: 'gpt-4.1-2025-04-14'
  temperature: number      // Default: 0.3
}
```

**Features:**
- Structured JSON output for reliable parsing
- Context-aware understanding
- Graceful fallback to NLP parser on error
- Config persisted in localStorage

### Configuration Storage

Oracle settings stored in localStorage:

```javascript
// Key: 'oracleLLMConfig'
{
  enabled: false,              // Default: local NLP
  provider: 'auto',            // Claude → OpenAI → NLP
  claudeApiKey: '...',
  openaiApiKey: '...',
  claudeModel: 'claude-sonnet-4-20250514',
  openaiModel: 'gpt-4.1-2025-04-14',
  temperature: 0.3
}
```

## Future Improvements

1. ~~**Natural Language Input**~~ ✓ Implemented with NLP + LLM support
2. **Smart Scheduling** - AI-powered optimal time suggestions
3. **Team Calendars** - Shared calendar support
4. **Offline Sync** - Service worker for offline support
5. **Calendar Subscriptions** - Import external .ics feeds
