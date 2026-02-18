# Accomplishment Tracking Guide

Track your completed tasks, build streaks, and visualize your productivity with Quarry's accomplishment tracking system.

## Overview

The accomplishment tracking system automatically records every task, subtask, and habit you complete. It provides:

- **Daily/Weekly/Monthly Views** - See accomplishments aggregated by time period
- **Completion Streaks** - Build and maintain streaks with gamified milestones
- **Rich Analytics** - Charts, trends, and breakdowns by project and type
- **Reflection Integration** - Auto-populate "What Got Done" in your journal

## What Gets Tracked

### Tasks
Main todo items from the Planner. When you mark a task complete, the completion timestamp is recorded.

### Subtasks
Nested checklist items within tasks. Each subtask completion is tracked separately with its own timestamp.

### Habits
Recurring tasks that build completion streaks. The system tracks your habit completion history and current streak.

## Where to Find Accomplishments

### 1. Reflect Page Sidebar
The Reflect page shows today's accomplishments in a compact panel. You can:
- View completions grouped by project
- See your current streak
- Copy completions as markdown
- Sync to your reflection's "What Got Done" section

### 2. Analytics Page
Navigate to **Analytics > Accomplishments** for comprehensive insights:
- **Completion Trend** - 30-day line chart of daily completions
- **Type Breakdown** - Tasks vs. subtasks vs. habits
- **By Project** - Which projects are getting the most work
- **Quick Stats** - Today, this week, this month, and streak

### 3. Streak Banner
A gamified banner appears when you have an active streak, showing:
- Current streak count with flame icon
- Personal best record
- Progress to next milestone (3, 7, 14, 30, 60, 90, 180, 365 days)
- "At risk" warning if you haven't completed anything today

## Using the Accomplishments Panel

### Period Toggle
Switch between Day, Week, and Month views using the toggle buttons at the top of the panel.

### Project Grouping
Accomplishments are grouped by project with expandable sections. Click a project header to expand/collapse its items.

### Quick Stats Bar
Shows at-a-glance metrics:
- **Today** - Items completed today
- **Week** - Items completed this week
- **Month** - Items completed this month
- **Streak** - Current completion streak in days

### Copy to Clipboard
Click the copy icon to copy accomplishments as markdown:
```markdown
**Project Name**
- [x] Task title
- [x] Another task

**Other**
- [x] Unassigned task
```

### Sync to Reflection
Click the sparkles icon to auto-populate your daily reflection's "What Got Done" section with today's accomplishments.

## Completion Streaks

### How Streaks Work
- Complete at least one task or subtask per day to maintain your streak
- Streaks count consecutive days with completions
- Missing a day resets your streak to zero

### Streak Milestones
Celebrate your consistency at these milestones:
- 🌱 3 days - Building momentum
- 💪 7 days - A week of wins
- ✨ 14 days - Two weeks running
- 🔥 30 days - A full month
- ⭐ 60 days - Two months of dedication
- 🌟 90 days - Three months of excellence
- 💎 180 days - Half a year strong
- 🏆 365 days - Incredible! A full year

### At-Risk Warnings
When you have an active streak but haven't completed anything today, you'll see:
- "At risk" badge on the streak banner
- Pulsing animation to draw attention
- Complete a task to secure your streak for the day

## Analytics Deep Dive

### Completion Trend Chart
A 30-day area chart showing daily completion counts. Hover for details on each day.

### Type Breakdown
A horizontal bar chart showing the proportion of:
- Tasks (emerald) - Main todo items
- Subtasks (cyan) - Nested checklist items
- Habits (purple) - Recurring task completions

### Project Distribution
See which projects are getting the most attention. The top 5 projects are shown with completion counts.

### Key Metrics
- **Daily Average** - Mean completions per day over the period
- **Best Day** - Date with the highest completion count
- **Current Streak** - Consecutive days with completions
- **Longest Streak** - Your personal best

## Technical Details

### Data Storage
Accomplishment data is stored in your local SQLite database:
- Tasks: `planner_tasks.completed_at` timestamp
- Subtasks: `planner_subtasks.completed_at` timestamp
- Habits: `habit_streaks.completion_history` array

### Real-Time Updates
The system uses a subscription pattern for real-time updates. When you complete a task, all accomplishment views update immediately without requiring a refresh.

### Privacy
All accomplishment data stays on your device. The system works 100% offline and never sends completion data to any server.

## API Reference

### Hooks

```typescript
// Get accomplishments for a date
const { accomplishments, loading, refresh, generateMarkdown } = useDailyAccomplishments('2024-01-15')

// Get accomplishments with period
const { items, stats, loading } = useAccomplishments({ date: '2024-01-15', period: 'week' })

// Get statistics
const { stats, loading } = useAccomplishmentStats({ period: 'month' })

// Get streak info
const { streak, isActiveToday, isAtRisk } = useTaskCompletionStreak()

// Get trend data
const { trend, averagePerDay, bestDay } = useCompletionTrend({ days: 30 })
```

### Service Functions

```typescript
// Get accomplishments in date range
const items = await getAccomplishmentsInRange('2024-01-01', '2024-01-31')

// Get stats for period
const stats = await getAccomplishmentStats('month', '2024-01-15')

// Generate markdown for reflection
const markdown = await generateWhatGotDoneMarkdown('2024-01-15', { groupByProject: true })

// Subscribe to completion events
const unsubscribe = subscribeToCompletions((event) => {
  console.log('Completed:', event.item.title)
})
```

## Troubleshooting

### Accomplishments not showing
1. Ensure tasks have a `completed_at` timestamp (older tasks may not)
2. Check the date range filter
3. Refresh the page to reload data

### Streak showing wrong count
1. Streaks only count days with at least one completion
2. Weekends are included (no automatic skip)
3. Check your timezone settings

### Analytics loading slowly
1. Large date ranges may take longer to aggregate
2. Try a shorter period (day vs. month)
3. Check your device's performance

## Best Practices

1. **Review daily** - Check accomplishments each evening to build awareness
2. **Set small tasks** - Break work into completable items to maintain streaks
3. **Use subtasks** - Get credit for incremental progress on larger tasks
4. **Sync to reflections** - Build a record of daily wins for retrospectives
5. **Celebrate milestones** - Take note when you hit streak milestones
