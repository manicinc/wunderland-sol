# Habit Tracking Guide

> Complete guide to gamified habit tracking with streaks, grace periods, and achievements in Quarry Codex.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Creating Habits](#creating-habits)
- [Understanding Streaks](#understanding-streaks)
- [Grace Periods](#grace-periods)
- [Streak Freezes](#streak-freezes)
- [Achievements](#achievements)
- [Templates](#templates)
- [Rituals](#rituals)
- [API Reference](#api-reference)
- [Components Reference](#components-reference)
- [FAQ](#faq)

---

## Overview

The habit tracking system combines:

1. **Streak Tracking** - Visual motivation through consecutive completions
2. **Grace Periods** - Forgiveness for missed days without breaking streaks
3. **Streak Freezes** - Protection for planned breaks or emergencies
4. **Gamification** - XP, achievements, and milestones
5. **Templates** - 40+ pre-built habits across 8 categories

```
[Create Habit] → [Daily Completions] → [Streak Building]
                                              ↓
                                   [Grace Period Protection]
                                              ↓
                                   [Achievements Unlocked]
```

### Key Features

| Feature | Description |
|---------|-------------|
| Streak Counter | Days of consecutive completions |
| Grace Periods | 1-3 days forgiveness based on frequency |
| Streak Freezes | Pause streak without breaking it |
| Milestones | Special achievements at 7, 30, 100+ days |
| Categories | Health, Learning, Productivity, and more |

---

## Quick Start

### 1. Create Your First Habit

From the Planner or Codex dashboard, click **"Add Habit"**:

1. Choose from templates or create custom
2. Set your frequency (daily, weekly, weekdays)
3. Optionally set a preferred time
4. Start building your streak!

### 2. Complete Habits Daily

- Check off habits as you complete them
- See your streak grow with each completion
- Get notifications when you're in grace period

### 3. Track Progress

- View current streaks on habit cards
- Check your longest streak ever
- Earn achievements for milestones

---

## Creating Habits

### From Templates

The template library includes 40+ pre-built habits organized by category:

- **Health**: Exercise, hydration, sleep, nutrition
- **Learning**: Reading, language practice, skill development
- **Productivity**: Planning, deep work, inbox zero
- **Mindfulness**: Meditation, journaling, gratitude
- **Social**: Connecting with friends and family
- **Creative**: Writing, art, music practice
- **Finance**: Expense tracking, budget reviews

Each template includes:
- Sensible default frequency
- Suggested preferred time
- Motivational tips
- Estimated duration

### Custom Habits

Create a custom habit with:

```typescript
{
  title: "My Custom Habit",
  frequency: "daily" | "weekly" | "weekdays",
  category: "health" | "learning" | "productivity" | ...,
  preferredTime: "07:00",  // Optional
  targetCount: 1,          // Completions per occurrence
  motivation: "Why I'm building this habit"
}
```

### Frequency Options

| Frequency | Description | Grace Period |
|-----------|-------------|--------------|
| Daily | Every day | 1 day |
| Weekly | Once per week | 3 days |
| Weekdays | Monday-Friday only | 1 day |
| Custom | Specific days | 2 days |

---

## Understanding Streaks

### How Streaks Work

A streak represents consecutive successful completions:

```
Day 1: Complete ✓ → Streak: 1
Day 2: Complete ✓ → Streak: 2
Day 3: Complete ✓ → Streak: 3
Day 4: Miss ✗     → Grace Period Active
Day 5: Complete ✓ → Streak: 4 (saved!)
```

### Streak Status Types

| Status | Description | Visual |
|--------|-------------|--------|
| Active | Completed today | Green flame |
| In Grace | Not completed, still protected | Orange flame |
| Frozen | Freeze active | Blue snowflake |
| Broken | Missed beyond grace period | Gray flame |

### Milestones

Special achievements unlock at key streak milestones:

- **7 days** - One Week Warrior
- **14 days** - Two Week Champion
- **30 days** - Monthly Master
- **60 days** - Two Month Titan
- **100 days** - Century Achiever
- **365 days** - Year-Long Legend

---

## Grace Periods

Grace periods provide forgiveness for occasional missed days:

### How Grace Periods Work

1. You miss a day
2. System checks if you're within grace period
3. If yes, streak is preserved
4. Complete the next day to continue

```
Last completed: Monday
Today: Wednesday (1 day grace used)
Status: "1 day left to maintain streak"
```

### Grace Period by Frequency

| Habit Type | Grace Period | Example |
|------------|--------------|---------|
| Daily | 1 day | Miss 1 day, streak safe |
| Weekly | 3 days | Miss up to 3 days after due |
| Weekdays | 1 day | Miss 1 weekday, streak safe |
| Custom | 2 days | Miss up to 2 days |

### Grace Period Warnings

When you enter a grace period, you'll see:
- Orange border on habit card
- "X days left" warning badge
- Notification reminder (if enabled)

---

## Streak Freezes

Streak freezes protect your streak during planned absences or emergencies.

### How Freezes Work

1. Each habit starts with **1 freeze**
2. Activate before your streak breaks
3. Streak pauses for the freeze duration
4. Earn additional freezes through achievements

### Using a Freeze

1. Tap the menu (⋮) on a habit card
2. Select "Use Freeze"
3. Freeze activates for 24 hours
4. Your streak is protected

### Freeze Rules

- **Timing**: Use before grace period expires
- **Duration**: 24 hours of protection
- **Replenishment**: Earn new freezes via achievements
- **Stacking**: Cannot stack multiple freezes

### Earning Freezes

You can earn additional freezes by:
- Reaching streak milestones
- Completing habit achievements
- Maintaining perfect weeks

---

## Achievements

The habit tracking system integrates with the achievement system:

### Habit-Specific Achievements

| Achievement | Requirement | Reward |
|-------------|-------------|--------|
| First Steps | Complete your first habit | 50 XP |
| Week One | 7-day streak | 100 XP |
| Habit Master | Complete 100 total habits | 500 XP |
| Perfect Week | Complete all daily habits for 7 days | 200 XP |
| Streak Saver | Successfully use a streak freeze | 50 XP |
| Century Club | Reach a 100-day streak | 1000 XP |
| Habit Collector | Create habits in 5 categories | 150 XP |

### XP Rewards

| Action | XP Earned |
|--------|-----------|
| Complete a habit | 10 XP |
| Reach 7-day streak | 50 XP |
| Reach 30-day streak | 200 XP |
| Break personal best streak | 100 XP |

---

## Templates

### Template Categories

#### Health (6 habits)
- Morning water
- 30-minute exercise
- 10,000 steps
- Healthy breakfast
- 8 hours sleep
- No phone first hour

#### Learning (3 habits)
- Read 30 minutes
- Language practice
- Skill practice

#### Productivity (4 habits)
- Plan your day
- Inbox zero
- Deep work session
- Evening review

#### Mindfulness (4 habits)
- 10-minute meditation
- Gratitude journal (3 entries)
- Breathing exercises
- Daily journaling

#### Social (2 habits)
- Reach out to a friend
- Give a genuine compliment

#### Creative (2 habits)
- Write 500 words
- Sketch or draw

#### Finance (2 habits)
- Log daily expenses
- No impulse purchases

### Using Templates

```typescript
import { getTemplateById, getAllTemplates, searchTemplates } from '@/lib/planner/habits/templates'

// Get a specific template
const exercise = getTemplateById('exercise-30min')

// Search templates
const healthHabits = searchTemplates('health')

// Get all templates
const all = getAllTemplates() // 40+ habits
```

---

## Rituals

Rituals are special habits that integrate with the **Lifecycle Decay** system to help you maintain your knowledge base through intentional daily practices.

### What Makes Rituals Special

Unlike regular habits, rituals:
- **Surface relevant notes** from your knowledge base
- **Track note lifecycle** by marking reviewed content as "fresh"
- **Capture intentions and reflections** for daily planning
- **Integrate with the Evolution page** for lifecycle analytics

### Available Ritual Templates

| Ritual | Frequency | Purpose |
|--------|-----------|---------|
| Morning Setup | Daily | Review intentions, surface relevant notes |
| Evening Reflection | Daily | Capture insights, mark notes as reviewed |
| Weekly Knowledge Review | Weekly | Resurface faded notes, form connections |
| Deep Focus Session | Daily | Surface notes related to current project |

### Morning Setup Ritual

The morning ritual helps you start your day intentionally:

1. **Surface Relevant Notes** - Notes that may help with today's work
2. **Review Fading Notes** - Notes about to fade that deserve attention
3. **Set Intentions** - Capture what you want to accomplish

When you complete the morning ritual, the system:
- Records a `ritual_review` event for reviewed notes
- Resets decay scores for marked notes
- Stores your intentions for evening reference

### Evening Reflection Ritual

The evening ritual helps you close your day:

1. **Review Today's Work** - Notes you accessed or edited today
2. **Capture Reflections** - Insights and learnings from the day
3. **Form Connections** - Link related ideas that emerged

When you complete the evening ritual, the system:
- Marks reviewed notes as fresh
- Stores reflections in the ritual session
- Updates engagement scores

### Setting Up Rituals

1. Go to the **Habits** section in the Planner
2. Click **"New Habit"**
3. Select the **"Rituals"** category
4. Choose your ritual template
5. Confirm creation

### The Ritual Prompt Modal

When you complete a ritual habit, a special modal appears:

```
┌─────────────────────────────────────┐
│  ☀️ Morning Setup                   │
│  Start your day with intention      │
├─────────────────────────────────────┤
│  📄 Notes for Today                 │
│  □ Project Roadmap                  │
│  □ Meeting Notes - Q4 Planning      │
│  □ Research: AI Ethics              │
├─────────────────────────────────────┤
│  🕐 Worth Revisiting                │
│  □ Old Idea: Neural Networks        │
│  □ Draft: Blog Post Outline         │
├─────────────────────────────────────┤
│  ✨ Set Your Intentions             │
│  [Add an intention...]              │
│  • Focus on project milestone       │
│  • Review team feedback             │
├─────────────────────────────────────┤
│  [Skip]           [Complete Ritual] │
└─────────────────────────────────────┘
```

### Ritual API

```typescript
import { 
  getRitualTemplates, 
  isRitualTemplate,
  getTemplateById 
} from '@/lib/planner/habits/templates'

// Get all ritual templates
const rituals = getRitualTemplates()

// Check if a template is a ritual
const morning = getTemplateById('ritual-morning-setup')
if (isRitualTemplate(morning)) {
  // This template will show the ritual modal
}
```

### Lifecycle Integration

Rituals integrate with the Lifecycle Decay system:

```typescript
// When a ritual is completed, reviewed strands are updated
const { startRitual, completeRitual } = useLifecycleData()

// Start a morning ritual session
const session = await startRitual('morning')

// Complete with reviewed strands and intentions
await completeRitual(session.id, {
  reviewedStrands: ['note1.md', 'note2.md'],
  intentions: ['Focus on project', 'Review feedback'],
})
```

See [LIFECYCLE_DECAY_GUIDE.md](./LIFECYCLE_DECAY_GUIDE.md) for full lifecycle documentation.

---

## API Reference

### Hooks

#### useHabits

Main hook for habit management:

```typescript
import { useHabits } from '@/lib/planner/habits/useHabits'

const {
  habits,           // All habits with streaks
  todayHabits,      // Habits due today
  isLoading,
  error,
  stats,            // Aggregate statistics

  // Actions
  createHabit,      // Create new habit
  deleteHabit,      // Delete habit
  completeHabit,    // Mark complete
  uncompleteHabit,  // Undo completion
  isCompletedToday, // Check completion
  useFreeze,        // Activate streak freeze

  // Queries
  getHabitsAtRisk,  // Habits in grace period
  getTopStreaks,    // Highest streak habits
  refresh,          // Reload from database
} = useHabits(options)
```

#### Options

```typescript
interface UseHabitsOptions {
  category?: string      // Filter by category
  frequency?: HabitFrequency  // Filter by frequency
}
```

#### Stats Object

```typescript
interface HabitStats {
  totalHabits: number
  activeStreaks: number
  totalCompletions: number
  averageStreak: number
  longestCurrentStreak: number
  longestEverStreak: number
  habitsAtRisk: number
  completedToday: number
  totalToday: number
}
```

### Streak Manager Functions

```typescript
import {
  createInitialStreak,
  recordCompletion,
  getStreakStatus,
  calculateStreakBroken,
  useStreakFreeze,
  calculateHabitStats,
} from '@/lib/planner/habits/habitStreakManager'
```

#### recordCompletion

```typescript
const result = recordCompletion(streak, frequency)
// Returns:
{
  newStreak: number
  previousStreak: number
  updatedStreak: HabitStreak
  alreadyCompleted: boolean
  streakBroken: boolean
  milestone?: number  // 7, 30, 100, etc.
}
```

#### getStreakStatus

```typescript
const status = getStreakStatus(streak, frequency)
// Returns:
{
  isActive: boolean
  inGracePeriod: boolean
  isFrozen: boolean
  daysUntilBroken: number
  currentStreak: number
}
```

---

## Components Reference

### HabitCard

Displays a single habit with streak visualization:

```tsx
import { HabitCard } from '@/components/quarry/ui/HabitCard'

<HabitCard
  habit={habitWithStreak}
  isCompletedToday={true}
  onComplete={() => completeHabit(habit.id)}
  onUncomplete={() => uncompleteHabit(habit.id)}
  onDelete={() => deleteHabit(habit.id)}
  onUseFreeze={() => useFreeze(habit.id)}
  compact={false}
  showDetails={false}
/>
```

### HabitDashboard

Main dashboard showing all habits and stats:

```tsx
import { HabitDashboard } from '@/components/quarry/ui/HabitDashboard'

<HabitDashboard />
```

---

## FAQ

### How do I recover a broken streak?

Unfortunately, once a streak is broken (missed beyond grace period), it resets to zero. Start fresh and build it back up!

### Can I edit a habit's frequency?

Currently, changing frequency requires deleting and recreating the habit. Future versions will support editing.

### Why didn't my streak freeze work?

Freezes must be activated **before** the grace period expires. If you're already past the grace period, the streak is broken.

### How many habits should I track?

Start with 3-5 habits. Too many can be overwhelming. You can always add more once you've established a routine.

### Can I backfill missed completions?

No, completions must be recorded on the actual day. This maintains the integrity of streak tracking.

### Do weekday habits count weekends?

No, weekday habits (Mon-Fri) don't require weekend completions. The grace period only applies to missed weekdays.

### How do I earn more streak freezes?

Freezes are earned through achievements like reaching streak milestones or completing habit challenges.

---

## Best Practices

### Starting Out

1. **Start small** - Pick 3 easy habits to build the tracking habit
2. **Set reminders** - Use preferred times for notifications
3. **Stack habits** - Link new habits to existing routines
4. **Be specific** - "Exercise 30 min" beats "Exercise more"

### Maintaining Streaks

1. **Never miss twice** - Use grace periods wisely
2. **Save freezes** - Don't use them unnecessarily
3. **Morning wins** - Complete habits early when motivation is high
4. **Track progress** - Review stats weekly

### Recovering from Breaks

1. **Don't give up** - A broken streak is a fresh start
2. **Reflect** - Why did the streak break?
3. **Adjust** - Maybe the habit was too ambitious
4. **Restart immediately** - Don't wait for "perfect" timing

---

## Troubleshooting

### Habit not showing in today's list

- Check the frequency setting
- For weekday habits, ensure it's a weekday
- For weekly habits, check which day it's scheduled

### Streak shows 0 but I completed yesterday

- Verify the completion was saved (check history)
- Grace period may have expired
- Check if a freeze was active

### Can't use streak freeze

- You may have no freezes remaining
- A freeze might already be active
- Check if the streak is already broken

---

## Related Documentation

- [PLANNER_GUIDE.md](./PLANNER_GUIDE.md) - Task management and scheduling
- [LEARNING_SYSTEM_GUIDE.md](./LEARNING_SYSTEM_GUIDE.md) - Spaced repetition and flashcards
- [Achievement System](../components/quarry/ui/AchievementSystem.tsx) - XP and achievements
