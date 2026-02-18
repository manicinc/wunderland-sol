/**
 * Template Matcher
 * Matches templates to user goals and preferences
 * @module lib/setup/templateMatcher
 */

import type {
  GoalType,
  OrganizationMethod,
  TemplateRecommendation,
} from '@/components/quarry/ui/setup/types'

// ============================================================================
// TEMPLATE DATABASE
// ============================================================================

export interface TemplateDefinition {
  id: string
  name: string
  category: string
  description: string
  tags: string[]
  goals: GoalType[]
  organizations: OrganizationMethod[]
  content: string
}

const TEMPLATE_DATABASE: TemplateDefinition[] = [
  // Productivity Templates
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    category: 'Productivity',
    description: 'Structured template for meeting notes with attendees and action items',
    tags: ['meeting', 'notes', 'work', 'collaboration'],
    goals: ['productivity', 'projects'],
    organizations: ['by-project', 'gtd', 'para'],
    content: `# Meeting Notes

## Meeting Info
- **Date:** {{date}}
- **Time:** {{time}}
- **Attendees:**

## Agenda
1.

## Discussion
-

## Action Items
- [ ]

## Next Steps

`,
  },
  {
    id: 'daily-note',
    name: 'Daily Note',
    category: 'Productivity',
    description: 'Daily planning and reflection template',
    tags: ['daily', 'planning', 'reflection'],
    goals: ['productivity', 'journaling'],
    organizations: ['chronological', 'gtd'],
    content: `# {{date}}

## Focus for Today
1.
2.
3.

## Tasks
- [ ]

## Notes

## Reflection

`,
  },
  {
    id: 'quick-capture',
    name: 'Quick Capture',
    category: 'Productivity',
    description: 'Rapid note capture for inbox processing',
    tags: ['inbox', 'capture', 'quick'],
    goals: ['productivity', 'task-management'],
    organizations: ['gtd'],
    content: `# Quick Capture - {{timestamp}}

## Note


## Context


## Next Action
- [ ]

`,
  },

  // Learning Templates
  {
    id: 'lecture-notes',
    name: 'Lecture Notes',
    category: 'Learning',
    description: 'Cornell-style lecture notes with summary section',
    tags: ['lecture', 'study', 'notes', 'education'],
    goals: ['learning'],
    organizations: ['by-topic', 'zettelkasten'],
    content: `# Lecture Notes: {{title}}

**Course:**
**Date:** {{date}}
**Instructor:**

---

## Key Concepts
|Cue Column|Notes|
|----------|-----|
| | |

---

## Summary

---

## Questions

---

## Action Items
- [ ] Review notes
- [ ]

`,
  },
  {
    id: 'book-summary',
    name: 'Book Summary',
    category: 'Learning',
    description: 'Template for capturing book insights',
    tags: ['book', 'reading', 'summary'],
    goals: ['learning', 'knowledge-base'],
    organizations: ['by-topic', 'zettelkasten'],
    content: `# Book Summary: {{title}}

## Book Info
- **Author:**
- **Published:**
- **Genre:**

## Summary


## Key Ideas
1.
2.
3.

## Favorite Quotes
>

## How This Applies to Me


## Rating: /5

`,
  },
  {
    id: 'concept-map',
    name: 'Concept Map',
    category: 'Learning',
    description: 'Map relationships between concepts',
    tags: ['concept', 'mapping', 'learning'],
    goals: ['learning', 'research'],
    organizations: ['zettelkasten'],
    content: `# Concept: {{title}}

## Definition


## Related Concepts
- [[]]
- [[]]

## Examples


## Questions

`,
  },

  // Journaling Templates
  {
    id: 'daily-journal',
    name: 'Daily Journal',
    category: 'Journaling',
    description: 'Morning and evening reflection prompts',
    tags: ['journal', 'daily', 'reflection'],
    goals: ['journaling'],
    organizations: ['chronological'],
    content: `# Journal - {{date}}

## Morning
**How am I feeling?**


**What am I grateful for?**
1.
2.
3.

**Intentions for today:**


---

## Evening
**What went well today?**


**What could have gone better?**


**What did I learn?**


`,
  },
  {
    id: 'weekly-reflection',
    name: 'Weekly Reflection',
    category: 'Journaling',
    description: 'Weekly review and planning template',
    tags: ['weekly', 'review', 'reflection'],
    goals: ['journaling', 'productivity'],
    organizations: ['chronological', 'gtd'],
    content: `# Week of {{date}}

## Wins This Week
1.
2.
3.

## Challenges


## Lessons Learned


## Focus for Next Week


## Habit Tracking
| Habit | M | T | W | T | F | S | S |
|-------|---|---|---|---|---|---|---|
|       |   |   |   |   |   |   |   |

`,
  },
  {
    id: 'gratitude-log',
    name: 'Gratitude Log',
    category: 'Journaling',
    description: 'Daily gratitude practice',
    tags: ['gratitude', 'daily', 'wellbeing'],
    goals: ['journaling'],
    organizations: ['chronological'],
    content: `# Gratitude - {{date}}

## Three Things I'm Grateful For
1.
2.
3.

## Why?


## One Kind Thing I Did/Witnessed


`,
  },

  // Project Templates
  {
    id: 'project-brief',
    name: 'Project Brief',
    category: 'Projects',
    description: 'Project overview with goals and timeline',
    tags: ['project', 'planning', 'brief'],
    goals: ['projects', 'productivity'],
    organizations: ['by-project', 'para'],
    content: `# Project: {{title}}

## Overview


## Goals
-

## Stakeholders
-

## Timeline
| Phase | Start | End | Status |
|-------|-------|-----|--------|
|       |       |     |        |

## Success Criteria
- [ ]

## Resources
-

## Risks
-

`,
  },
  {
    id: 'decision-record',
    name: 'Decision Record',
    category: 'Projects',
    description: 'Document important project decisions',
    tags: ['decision', 'record', 'documentation'],
    goals: ['projects'],
    organizations: ['by-project', 'para'],
    content: `# Decision: {{title}}

**Date:** {{date}}
**Status:** Proposed | Accepted | Deprecated | Superseded

## Context


## Decision


## Consequences
### Positive
-

### Negative
-

## Alternatives Considered
1.
2.

`,
  },

  // Research Templates
  {
    id: 'research-note',
    name: 'Research Note',
    category: 'Research',
    description: 'Structured research note with methodology',
    tags: ['research', 'note', 'academic'],
    goals: ['research'],
    organizations: ['by-topic', 'zettelkasten'],
    content: `# Research Note: {{title}}

## Question/Hypothesis


## Methodology


## Findings


## Analysis


## Conclusions


## References
-

## Related Notes
- [[]]

`,
  },
  {
    id: 'literature-review',
    name: 'Literature Review',
    category: 'Research',
    description: 'Template for reviewing academic papers',
    tags: ['literature', 'paper', 'review', 'academic'],
    goals: ['research', 'learning'],
    organizations: ['by-topic', 'zettelkasten'],
    content: `# Paper Review: {{title}}

## Citation


## Summary


## Key Findings
1.
2.
3.

## Methodology


## Strengths


## Limitations


## My Thoughts


## How This Relates to My Research


`,
  },

  // Writing Templates
  {
    id: 'story-outline',
    name: 'Story Outline',
    category: 'Writing',
    description: 'Three-act story structure template',
    tags: ['story', 'outline', 'writing', 'creative'],
    goals: ['creative-writing'],
    organizations: ['by-project'],
    content: `# Story Outline: {{title}}

## Premise


## Characters
- **Protagonist:**
- **Antagonist:**
- **Supporting:**

---

## Act 1: Setup
### Hook


### Inciting Incident


### First Plot Point


---

## Act 2: Confrontation
### Rising Action


### Midpoint


### Dark Moment


---

## Act 3: Resolution
### Climax


### Resolution


---

## Themes
-

`,
  },
  {
    id: 'character-profile',
    name: 'Character Profile',
    category: 'Writing',
    description: 'Detailed character development template',
    tags: ['character', 'profile', 'writing', 'creative'],
    goals: ['creative-writing'],
    organizations: ['by-project'],
    content: `# Character: {{name}}

## Basic Info
- **Full Name:**
- **Age:**
- **Occupation:**

## Physical Description


## Personality


## Background


## Goals


## Fears


## Relationships
-

## Character Arc


`,
  },

  // Knowledge Base Templates
  {
    id: 'wiki-page',
    name: 'Wiki Page',
    category: 'Knowledge',
    description: 'Standard wiki page with sections',
    tags: ['wiki', 'knowledge', 'reference'],
    goals: ['knowledge-base'],
    organizations: ['by-topic'],
    content: `# {{title}}

## Overview


## Details


## Examples


## See Also
- [[]]

## References
-

`,
  },
  {
    id: 'how-to-guide',
    name: 'How-To Guide',
    category: 'Knowledge',
    description: 'Step-by-step instructional guide',
    tags: ['how-to', 'guide', 'tutorial'],
    goals: ['knowledge-base'],
    organizations: ['by-topic'],
    content: `# How To: {{title}}

## Overview


## Prerequisites
-

## Steps
1.
2.
3.

## Tips
-

## Troubleshooting
| Problem | Solution |
|---------|----------|
|         |          |

## Related
- [[]]

`,
  },

  // Task Management Templates
  {
    id: 'task-list',
    name: 'Task List',
    category: 'Tasks',
    description: 'Simple task list with checkboxes',
    tags: ['task', 'list', 'todo'],
    goals: ['task-management', 'productivity'],
    organizations: ['gtd'],
    content: `# Tasks - {{date}}

## High Priority
- [ ]

## Normal
- [ ]

## Low Priority
- [ ]

## Completed
- [x]

`,
  },
  {
    id: 'weekly-plan',
    name: 'Weekly Plan',
    category: 'Tasks',
    description: 'Weekly planning and goal setting',
    tags: ['weekly', 'plan', 'goals'],
    goals: ['task-management', 'productivity'],
    organizations: ['gtd', 'chronological'],
    content: `# Week Plan - {{week}}

## Big 3 Goals
1.
2.
3.

## By Day

### Monday
- [ ]

### Tuesday
- [ ]

### Wednesday
- [ ]

### Thursday
- [ ]

### Friday
- [ ]

## Notes

`,
  },
  {
    id: 'goal-tracker',
    name: 'Goal Tracker',
    category: 'Tasks',
    description: 'Track progress toward goals',
    tags: ['goal', 'tracker', 'progress'],
    goals: ['task-management'],
    organizations: ['para'],
    content: `# Goal: {{title}}

## Target
**What:**
**By When:**
**Why:**

## Milestones
- [ ]
- [ ]
- [ ]

## Progress Log
| Date | Update | Progress |
|------|--------|----------|
|      |        |          |

## Obstacles


## Resources Needed


`,
  },
]

// ============================================================================
// MATCHER FUNCTIONS
// ============================================================================

export interface MatchOptions {
  goals: GoalType[]
  organizationMethod: OrganizationMethod | null
  maxResults?: number
}

export function matchTemplates(options: MatchOptions): TemplateRecommendation[] {
  const { goals, organizationMethod, maxResults = 10 } = options

  const scored = TEMPLATE_DATABASE.map(template => {
    let score = 0
    let matchReasons: string[] = []

    // Score based on goal matches
    for (const goal of goals) {
      if (template.goals.includes(goal)) {
        score += 0.4
        matchReasons.push(`Matches ${goal} goal`)
      }
    }

    // Score based on organization method
    if (organizationMethod && template.organizations.includes(organizationMethod)) {
      score += 0.3
      matchReasons.push(`Works with ${organizationMethod} organization`)
    }

    // Normalize score
    const normalizedScore = Math.min(1, score)

    return {
      id: template.id,
      name: template.name,
      category: template.category,
      description: template.description,
      matchScore: normalizedScore,
      matchReason: matchReasons[0] || 'General purpose template',
    }
  })

  // Filter and sort
  return scored
    .filter(t => t.matchScore > 0.1)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults)
}

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATE_DATABASE.find(t => t.id === id)
}

export function getTemplateContent(id: string): string {
  const template = getTemplateById(id)
  return template?.content || ''
}

export function getAllTemplates(): TemplateDefinition[] {
  return TEMPLATE_DATABASE
}

export function getTemplatesByCategory(category: string): TemplateDefinition[] {
  return TEMPLATE_DATABASE.filter(t => t.category === category)
}

export function getTemplatesByGoal(goal: GoalType): TemplateDefinition[] {
  return TEMPLATE_DATABASE.filter(t => t.goals.includes(goal))
}

export function searchTemplates(query: string): TemplateDefinition[] {
  const q = query.toLowerCase()
  return TEMPLATE_DATABASE.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q)) ||
    t.category.toLowerCase().includes(q)
  )
}
