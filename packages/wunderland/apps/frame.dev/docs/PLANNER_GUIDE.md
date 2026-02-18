# Quarry Planner Guide

The Quarry Planner is a comprehensive calendar and task management system integrated into the Quarry Codex knowledge repository. It combines timeline-based day planning with task management, habit tracking, and Google Calendar synchronization.

## Overview

The planner provides multiple views for organizing your time:
- **Streamlined Day View** - Premium vertical timeline with animated event cards
- **Day View** - Traditional hourly grid
- **Week View** - 7-day spread with time blocks
- **Month View** - Calendar grid with event indicators
- **Agenda View** - List-based chronological view

## Getting Started

### Accessing the Planner

Open the planner from the Quarry navigation sidebar or use the keyboard shortcut:
- **Mac**: `Cmd + Shift + P`
- **Windows/Linux**: `Ctrl + Shift + P`

### Creating Your First Time Block

1. Click on any time slot in the timeline
2. Enter a title for your event
3. Optionally set:
   - Duration (default: 1 hour)
   - Color (via color picker)
   - Icon (choose from 50+ Lucide icons)
   - Recurrence (daily, weekly, monthly, yearly)
4. Click **Save**

### Navigating Views

Use the **ViewSwitcher** component to change between views:
- Click the view icons in the toolbar
- Or use keyboard shortcuts:
  - `D` - Day view
  - `W` - Week view
  - `M` - Month view
  - `A` - Agenda view

## Features

### Streamlined Day View

The flagship view features a vertical timeline spine with events displayed on alternating sides:

```
     9 AM ──●── [ Morning standup     ]
             │
    10 AM ──●──                       [ Code review ]
             │
    11 AM ──●── [ Team sync          ]
             │
    12 PM ──●── NOW ───────────────────
```

**Features:**
- Current time indicator with "NOW" marker
- Animated event cards with smooth transitions
- Overlap detection and staggered display
- Quick-add buttons on each hour slot
- Day phase icons (sunrise, sun, sunset, moon)

### Time Block Editing

The **EditTimeBlockModal** provides comprehensive editing:

| Field | Description |
|-------|-------------|
| Title | Event name (required) |
| Icon | 50+ Lucide icons for visual categorization |
| Color | Full color picker with preset palette |
| All Day | Toggle for all-day events |
| Start/End Time | Time pickers with 15-min intervals |
| Duration | Auto-calculated or manually set |
| Recurrence | None, Daily, Weekly, Monthly, Yearly, Custom |
| Calendar | Select destination calendar (Google integration) |

### Week Strip Navigation

The **WeekDayStrip** provides quick access to any day:
- Horizontal scrollable week display
- Activity indicators (dots) for days with events
- Today highlighting
- Click to jump to any day

### Drag & Drop

Events can be rescheduled by dragging:
1. Click and hold an event card
2. Drag vertically to a new time
3. Release to confirm

**Resize events** by dragging the top or bottom edge of an event card.

### Reminders & Notifications

Configure reminders in Settings > Planner:

| Option | Description |
|--------|-------------|
| Default Reminder | Time before events to notify |
| Browser Notifications | Push notifications via browser API |
| Sound Alerts | Audio notification for reminders |

**Reminder intervals available:**
- At time of event
- 5, 10, 15, 30 minutes before
- 1 hour, 1 day before

### Overlap Detection

When events overlap, the planner:
1. Detects conflicting time ranges
2. Displays events with horizontal offset (staggered)
3. Shows overlap badges with count
4. Provides the **OverlappingTasksPopup** for quick review

## Planner Settings

Configure your planner in **Settings > Planner Settings**:

### View Preferences

| Setting | Options |
|---------|---------|
| Default View | Day, Week, Month, Agenda, Timeline |
| Week Starts On | Sunday, Monday, Saturday |
| Time Format | 12-hour (1:00 PM) or 24-hour (13:00) |

### Work Hours

Define your typical work schedule:
- **Start Hour**: When your workday begins (default: 9 AM)
- **End Hour**: When your workday ends (default: 5 PM)

The timeline will highlight work hours and show end-of-work countdowns.

### Display Options

| Setting | Description |
|---------|-------------|
| Show Week Numbers | Display ISO week numbers |
| Hide Weekends | Remove Sat/Sun from week view |
| Show Declined Events | Include events you declined |
| Compact Mode | Reduce padding for more items |

## Habit Tracking

The planner includes a habit tracking system for recurring behaviors:

### Creating Habits

1. Create a task with recurrence
2. Mark as "Habit" type
3. Set frequency: Daily, Weekly, or Weekdays

### Streak Tracking

The system automatically tracks:
- **Current Streak**: Consecutive completions
- **Longest Streak**: All-time best
- **Completion Rate**: Percentage over time

**Grace periods** allow missing occasional days without breaking streaks:
- Daily habits: 1 day grace
- Weekly habits: 2 days grace

### Streak Freezes

Use **Streak Freezes** to pause tracking (e.g., vacation):
- Each freeze protects one day
- Earn freezes through consistent completion
- Limited to 3 freezes at a time

## Oracle AI Assistant

The Oracle is an AI-powered task management assistant integrated into the Ask interface. It supports both local NLP (Compromise.js) and cloud-based LLM (Claude/OpenAI) for natural language understanding.

### Accessing Oracle

1. Open the **Ask Interface** (`Cmd/Ctrl + K`)
2. Select the **Planner** tab
3. Type natural language commands

### Understanding Modes

Oracle operates in two modes:

| Mode | Provider | Features | API Key Required |
|------|----------|----------|-----------------|
| **Local NLP** | Compromise.js | Basic intent parsing, dates, times | No |
| **AI-Powered** | Claude/OpenAI | Advanced understanding, context-aware | Yes |

### Capabilities

| Command Type | Example | Notes |
|--------------|---------|-------|
| Create Tasks | "Add review quarterly report for tomorrow at 2pm" | Extracts title, date, time |
| Natural Scheduling | "I need to finish the proposal by Friday" | Parses relative dates |
| Duration | "30 minute standup" | Understands duration |
| Priority | "High priority: fix the bug" | Detects priority levels |
| Subtasks | "Project with steps: research, design, build" | Parses subtask lists |
| Find Time | "When am I free for 2 hours?" | Queries calendar |
| Prioritize | "What should I work on?" | Suggests focus |
| Timebox | "Timebox my day" | Creates scheduled timeline |

### Natural Language Parsing

Oracle uses NLP to extract:

- **Dates**: "tomorrow", "next Monday", "in 3 days", "January 15"
- **Times**: "3pm", "15:00", "morning", "noon", "end of day"
- **Durations**: "30 minutes", "2 hours", "half hour"
- **Priority**: "urgent", "high priority", "important"
- **Tags**: "#work", "#personal" (from hashtags)
- **Recurrence**: "every day", "weekly", "on weekdays"

### Confirmation Flow

Oracle requires confirmation before making changes:

```
You: "Add task 'Finish report' due Friday at 2pm for Project Alpha"

Oracle: I'll create a task "Finish report" due Friday, Jan 3 at 2 PM in Project Alpha.

        [Confirm] [Cancel]
```

### Quick Suggestions

The Planner tab shows suggested actions:
- "What should I focus on?"
- "Add a task 'Review emails' for today"
- "Timebox my day"
- "When am I free for 2 hours?"

### Oracle Settings

Configure Oracle in **Settings > Planner > Oracle AI Assistant**:

#### AI-Powered Mode

Enable to use Claude or OpenAI instead of local NLP:

| Setting | Description |
|---------|-------------|
| **Enable AI Mode** | Toggle between local NLP and cloud LLM |
| **Provider Preference** | Auto (fallback), Claude Only, OpenAI Only |
| **Claude API Key** | Your Anthropic API key |
| **OpenAI API Key** | Your OpenAI API key |
| **Model Selection** | Choose specific model (e.g., Claude Sonnet 4) |
| **Temperature** | Creativity level (0 = precise, 1 = creative) |

#### Provider Fallback

In Auto mode, Oracle tries providers in order:
1. Claude (if key configured)
2. OpenAI (if key configured)
3. Local NLP (always available)

#### Power Features Toggle

Enable/disable Oracle in **Settings > Planner > Power Features**:
- **Oracle AI Assistant**: Toggle on/off

For more about the Ask interface and RAG features, see [ASK_INTERFACE_GUIDE.md](./ASK_INTERFACE_GUIDE.md).

## Google Calendar Integration

Sync your Quarry planner with Google Calendar for two-way updates.

### Setup

1. Go to **Settings > Integrations > Google Calendar**
2. Click **Connect Google Account**
3. Authorize Quarry to access your calendars
4. Select which calendars to sync

For detailed setup, see [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md).

### Sync Behavior

| Direction | Behavior |
|-----------|----------|
| Google → Quarry | Events appear in planner within 5 minutes |
| Quarry → Google | Changes sync immediately on save |
| Conflicts | Most recent edit wins; conflicts logged |

### Offline Support

The planner works offline with local-first architecture:
- Changes saved to local database immediately
- Syncs to Google when connection restored
- Conflict resolution handled automatically

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `N` | Create new event |
| `T` | Jump to today |
| `←` / `→` | Previous/Next day |
| `D` | Day view |
| `W` | Week view |
| `M` | Month view |
| `Escape` | Close modal/popup |

## Accessibility

The planner includes comprehensive accessibility features:

- **Keyboard Navigation**: All actions accessible via keyboard
- **Screen Reader Support**: ARIA labels throughout
- **Focus Trapping**: Modals trap focus appropriately
- **Click Outside to Close**: Modals close on backdrop click
- **Escape to Close**: Standard modal dismissal

All modals use the `useModalAccessibility` hook providing:
- `closeOnEscape: true`
- `closeOnClickOutside: true`
- `trapFocus: true`
- `lockScroll: true`

## Database Schema

The planner uses SQLite (via sql.js) with these tables:

### planner_tasks

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| title | TEXT | Task title |
| status | TEXT | pending, in_progress, completed, cancelled |
| priority | TEXT | low, medium, high, urgent |
| due_date | TEXT | ISO date (YYYY-MM-DD) |
| due_time | TEXT | Time (HH:mm) |
| duration | INTEGER | Duration in minutes |
| recurrence_rule | TEXT | JSON recurrence pattern |
| google_event_id | TEXT | Synced Google event ID |

### planner_events

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| title | TEXT | Event title |
| start_datetime | TEXT | ISO datetime |
| end_datetime | TEXT | ISO datetime |
| all_day | INTEGER | Boolean flag |
| color | TEXT | Hex color code |
| location | TEXT | Event location |
| attendees | TEXT | JSON array |

### planner_preferences

| Column | Type | Description |
|--------|------|-------------|
| key | TEXT | Preference key |
| value | TEXT | JSON value |

### event_reminders

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary key |
| event_id | TEXT | Foreign key |
| remind_at | TEXT | ISO datetime |
| minutes_before | INTEGER | Minutes before event |
| is_sent | INTEGER | Already triggered |

## Architecture

### Component Hierarchy

```
StreamlinedDayView
├── WeekDayStrip
├── TimelineSpine
│   ├── HourMarker (per hour)
│   ├── CurrentTimeIndicator
│   └── TimelineEventCard (per event)
├── EditTimeBlockModal
├── OverlappingTasksPopup
└── EndOfDayCountdown
```

### Hooks

| Hook | Purpose |
|------|---------|
| `usePlannerPreferences` | User settings persistence |
| `useTasks` | Task CRUD operations |
| `useCalendar` | Calendar event management |
| `useReminders` | Notification scheduling |
| `useSubtasks` | Nested task items |
| `useProjects` | Project/area categories |
| `useGoogleCalendarSync` | Google Calendar integration |

### Utility Modules

| Module | Purpose |
|--------|---------|
| `timelineUtils.ts` | Positioning, overlap detection, icon mapping |
| `recurrenceGenerator.ts` | Recurrence pattern generation |
| `habitStreakManager.ts` | Streak calculations |
| `export.ts` | ICS, JSON, CSV, PDF export |

## Export Formats

Export your planner data in multiple formats:

| Format | Description |
|--------|-------------|
| ICS | iCalendar format for any calendar app |
| JSON | Full data backup with metadata |
| CSV | Spreadsheet-compatible |
| PDF | Printable view (browser print dialog) |

## Troubleshooting

### Events Not Syncing

1. Check internet connection
2. Verify Google Calendar authorization in Settings
3. Look for sync errors in Settings > Integrations
4. Try manual refresh with "Sync Now" button

### Notifications Not Working

1. Check browser notification permissions
2. Enable notifications in Settings > Planner > Notifications
3. Ensure the browser tab isn't in background power-saving mode

### Time Zone Issues

The planner uses your local timezone by default. For events from Google Calendar:
- Events display in their original timezone
- All-day events span the full day locally
- Timezone is stored per-event for accuracy

## Related Documentation

- [Google Calendar Setup](./GOOGLE_CALENDAR_SETUP.md)
- [Strand Architecture](./STRAND_ARCHITECTURE.md) (for embedding tasks in notes)
- [Import/Export Guide](./IMPORT_EXPORT_README.md)
