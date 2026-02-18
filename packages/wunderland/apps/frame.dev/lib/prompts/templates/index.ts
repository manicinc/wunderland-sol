/**
 * Prompt Template System
 * @module lib/prompts/templates
 *
 * Loads and manages pre-filled template content for prompts.
 * Templates provide example content to help users get started.
 */

import type { PromptCategory } from '@/lib/codex/prompts'
import type { MoodState } from '@/lib/codex/mood'

/**
 * Template metadata from frontmatter
 */
export interface TemplateMetadata {
  id: string
  title: string
  category: PromptCategory
  mood?: MoodState[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime?: string
}

/**
 * Parsed template with content
 */
export interface PromptTemplate extends TemplateMetadata {
  content: string // Markdown content (without frontmatter)
  rawContent: string // Full content including frontmatter
}

/**
 * Template registry - maps prompt IDs to their templates
 */
const TEMPLATE_REGISTRY: Record<string, string> = {
  // Reflection templates
  'r1': `---
id: r1
title: Lesson Learned
category: reflection
mood: [reflective]
difficulty: beginner
estimatedTime: 10 min
---

# What lesson took you the longest to learn?

*Take a moment to reflect on the wisdom that came through experience.*

## The Lesson

The lesson that took me the longest to learn was...

## Why It Took So Long

Looking back, I think I resisted this truth because...

## How I Finally Learned It

The moment it clicked was when...

## How It Changed Me

Now that I understand this, I approach things differently by...

---

> **Reflection tip:** Don't judge your past self. Every lesson arrives exactly when we're ready to receive it.
`,

  'r2': `---
id: r2
title: Moment of Change
category: reflection
mood: [reflective, curious]
difficulty: intermediate
estimatedTime: 15 min
---

# A Moment That Changed Everything

*Some moments are so powerful they shift our entire perspective.*

## Setting the Scene

It happened when I was...

The situation was...

## The Moment Itself

What I witnessed/experienced/realized was...

## The Shift

Before this moment, I believed...

After, I understood...

## Lasting Impact

This experience still influences me today because...

---

> **Writing tip:** Focus on the sensory details. What did you see, hear, feel?
`,

  // Creative templates
  'c1': `---
id: c1
title: The Unnamed Feeling
category: creative
mood: [creative]
difficulty: beginner
estimatedTime: 5 min
---

# A Word for the Unnamed

*Some feelings are so specific they haven't found their name yet.*

## The New Word

**[Your Word]** _(pronunciation)_

## Definition

The feeling of...

## Usage Examples

- "She felt a wave of [word] when..."
- "There's a specific [word] that comes with..."
- "I recognized the [word] immediately."

## Origin Story

This word comes from the combination of...

---

> **Creative tip:** Think of very specific situations. The more particular, the more universal it becomes.
`,

  'c3': `---
id: c3
title: Letter to Future Tech
category: creative
mood: [creative]
difficulty: intermediate
estimatedTime: 15 min
---

# Dear Technology of 2074,

*A letter to an invention that doesn't exist yet.*

---

Dear [Name of Future Technology],

By the time someone reads this, you will have changed everything about how we...

Right now, in my time, we're still struggling with...

I imagine when you finally arrive, people will wonder how we ever lived without you, just like we can't imagine life before...

What I hope you'll help us solve:

1.
2.
3.

What I hope you'll preserve:

1.
2.
3.

I wonder if your creators will know how much you mean to people like me who are waiting for you.

With anticipation,
[Your name]

---

> **Creative tip:** Think about what frustrates you today. What solution would feel like magic?
`,

  // Personal templates
  'pe1': `---
id: pe1
title: A Tradition That Matters
category: personal
mood: [reflective, relaxed]
difficulty: beginner
estimatedTime: 10 min
---

# [Name of Your Tradition]

*A ritual that carries meaning beyond its actions.*

## What We Do

Every [time/occasion], we...

The specific steps are:

1.
2.
3.

## How It Started

This tradition began when...

The person who started it was...

## What It Means

On the surface, it's just...

But underneath, it represents...

## Passing It On

I hope to continue this tradition by...

What I want the next generation to understand about it is...

---

> **Writing tip:** Include the small details - the smells, sounds, specific objects involved.
`,

  'pe2': `---
id: pe2
title: My Perfect Day
category: personal
mood: [creative, relaxed]
difficulty: beginner
estimatedTime: 10 min
---

# A Perfect Day (No Constraints)

*If money, time, and obligations were no object...*

## Morning

I wake up at...

The first thing I do is...

For breakfast, I...

## Midday

The main activity of my day is...

I'm surrounded by...

## Afternoon

I spend the afternoon...

The weather is...

## Evening

As the day winds down, I...

For dinner, I...

## Night

The perfect ending to this day is...

I fall asleep feeling...

---

> **Reflection:** What parts of this perfect day could you bring into your real life?
`,

  // Exploration templates
  'e3': `---
id: e3
title: Wikipedia Rabbit Hole
category: exploration
mood: [curious, relaxed]
difficulty: beginner
estimatedTime: 15 min
---

# Down the Rabbit Hole

*Document your journey through interconnected knowledge.*

## Starting Point

I began with: [Topic]

I was curious about this because...

## The Journey

**Stop 1:** [Topic]
- Key fact:
- This led me to...

**Stop 2:** [Topic]
- Key fact:
- This led me to...

**Stop 3:** [Topic]
- Key fact:
- This led me to...

**Stop 4:** [Topic]
- Key fact:
- Final destination because...

## Connections I Discovered

The surprising link between [first topic] and [last topic] is...

## What I Learned

The most interesting thing I discovered was...

I want to explore further:
- [ ]
- [ ]

---

> **Exploration tip:** Follow whatever genuinely interests you. There's no wrong path.
`,

  // Learning templates
  'l1': `---
id: l1
title: Weekly Learning Summary
category: learning
mood: [focused, curious]
difficulty: beginner
estimatedTime: 10 min
---

# This Week I Learned

*Capturing fresh knowledge before it fades.*

## The Big Idea

The most interesting thing I learned this week was...

## Where I Learned It

I discovered this through: [book/article/conversation/experience/video]

## Why It Matters

This knowledge is valuable because...

## How It Connects

This relates to other things I know about...

## What I'll Do With It

I can apply this by...

## Questions It Raised

Learning this made me wonder:
- [ ]
- [ ]

---

> **Learning tip:** Teaching others is the best way to solidify new knowledge. Share this with someone.
`,

  // Technical templates
  't1': `---
id: t1
title: Process Documentation
category: technical
mood: [focused]
difficulty: beginner
estimatedTime: 15 min
---

# How I [Process Name]

*Documenting what I do so I don't have to remember it.*

## Overview

This process is for when you need to...

**Time required:**
**Tools needed:**

## Prerequisites

Before starting, make sure you have:
- [ ]
- [ ]
- [ ]

## Steps

### 1. [First Step]

Details:

### 2. [Second Step]

Details:

### 3. [Third Step]

Details:

## Troubleshooting

**If [problem]:** Try...

**If [problem]:** Try...

## Notes

Things to remember:
-
-

---

> **Documentation tip:** Write this as if you'll read it in 6 months with no memory of creating it.
`,

  // More reflection templates
  'nr3': `---
id: nr3
title: Childhood Career Moment
category: reflection
mood: [reflective, curious]
difficulty: intermediate
estimatedTime: 20 min
---

# The Moment That Set My Path

*Looking back to find where it all began.*

## The Memory

I was [age] years old when...

The setting was...

## What Happened

The specific moment I remember is...

I felt...

## The Connection

At the time, I didn't know it, but this moment connected to my future because...

## Looking Back Now

With hindsight, I can see that this early experience planted seeds of...

The skills or interests it sparked:
1.
2.
3.

---

> **Reflection tip:** Don't force the connection. Sometimes the smallest moments have the biggest influence.
`,

  'nr6': `---
id: nr6
title: The New You
category: reflection
mood: [reflective, excited]
difficulty: beginner
estimatedTime: 10 min
---

# Something the Old Me Would Never Believe

*Celebrating growth and change.*

## The Surprise

Something I do now that past-me would never believe:

## The Old Me

Back then, I would have said...

My beliefs about this were...

## What Changed

The shift happened when...

The people or experiences that influenced this change:
-
-

## The New Normal

Now this is just part of who I am because...

---

> **Writing tip:** Be specific. What exactly would shock your younger self?
`,

  'nr9': `---
id: nr9
title: Building Resilience
category: reflection
mood: [reflective, energetic]
difficulty: intermediate
estimatedTime: 15 min
---

# The Experience That Made Me Stronger

*Finding strength through adversity.*

## The Challenge

The experience that tested me was...

It happened when...

## In the Moment

What made it so difficult:
1.
2.

My thoughts at the time:

## How I Got Through

The actions I took:
-
-

The support that helped:
-
-

## The Lesson

What this taught me about myself:

How it changed my approach to challenges:

## Strength Today

Now when I face difficulty, I remember...

---

> **Reflection tip:** Resilience isn't about not struggling—it's about growing through the struggle.
`,

  // Practical templates
  'npr1': `---
id: npr1
title: Skill Documentation
category: practical
mood: [focused]
difficulty: intermediate
estimatedTime: 25 min
---

# How to [Your Skill]

*A guide to something I've learned to do well.*

## Overview

This skill is useful for...

**Time to learn:**
**Prerequisites:**

## Why This Matters

I use this skill when...

The benefits are:
-
-

## Step-by-Step Guide

### Step 1: [Foundation]

Start by...

**Key tip:**

### Step 2: [Building]

Next...

**Common mistake to avoid:**

### Step 3: [Refinement]

Finally...

## Practice Exercise

Try this:

## Resources

-
-

---

> **Teaching tip:** Write as if explaining to yourself from before you learned this.
`,

  'npr2': `---
id: npr2
title: Troubleshooting Guide
category: practical
mood: [focused]
difficulty: intermediate
estimatedTime: 20 min
---

# Troubleshooting: [Problem Type]

*Solving this so I never have to figure it out again.*

## The Problem

When you see:

This usually means:

## Quick Fixes

Try these first:
- [ ]
- [ ]
- [ ]

## Deeper Diagnosis

### Check 1: [Thing to check]

How to check:

If this is the issue, fix it by:

### Check 2: [Thing to check]

How to check:

If this is the issue, fix it by:

## Root Causes

The underlying reasons this happens:
1.
2.

## Prevention

To avoid this in the future:
-
-

## When to Escalate

Get help if:
-
-

---

> **Documentation tip:** Include the symptoms that led you astray, not just the solution.
`,

  'npr7': `---
id: npr7
title: Ideal Workflow
category: practical
mood: [focused]
difficulty: intermediate
estimatedTime: 20 min
---

# My Workflow for [Creative Task]

*Documenting my process when it's working well.*

## Overview

This workflow is for when I need to...

**Best conditions:**
**Time needed:**

## Preparation

Before starting, I need:
- [ ]
- [ ]
- [ ]

My mental state should be:

## The Process

### Phase 1: [Opening]

I start by...

This takes about:

### Phase 2: [Core Work]

The main activity is...

My rhythm is:

### Phase 3: [Closing]

I wrap up by...

## Triggers & Rituals

What gets me into flow:
-
-

What breaks my focus:
-
-

## Variations

When I have less time:

When I'm not feeling it:

---

> **Productivity tip:** The best workflow is the one you'll actually follow.
`,

  'npr8': `---
id: npr8
title: Dream Trip Packing
category: practical
mood: [relaxed, excited]
difficulty: beginner
estimatedTime: 15 min
---

# Packing for [Destination]

*Everything I'd bring and why.*

## The Trip

**Destination:**
**Duration:**
**Purpose:**

## Essentials

Items I'd never leave without:
- [ ] Why:
- [ ] Why:
- [ ] Why:

## Clothing

| Item | Quantity | Rationale |
|------|----------|-----------|
|      |          |           |
|      |          |           |

## Special Items

Things specific to this trip:
- [ ]
- [ ]

## What I'm Leaving Behind

Things I usually pack but won't this time:
-
-

Why:

## The One Splurge

If I could add one unnecessary item:

---

> **Travel tip:** You'll wear 20% of what you pack 80% of the time.
`,

  // Creative templates
  'nc2': `---
id: nc2
title: Dramatic Mundane
category: creative
mood: [creative, energetic]
difficulty: intermediate
estimatedTime: 15 min
---

# [Boring Moment], Reimagined

*Finding the extraordinary in the ordinary.*

## The Mundane Reality

Today, I [simple action]:

The actual setting:

## The Dramatic Version

The fluorescent lights hummed their electric hymn as I...

The stakes felt impossibly high because...

Every detail mattered:
-
-
-

## The Inner Monologue

My thoughts raced:

## The Climax

The moment of truth came when...

## The Resolution

And then, just like that...

---

> **Creative tip:** The key is specificity. Make the mundane feel like the most important thing in the world.
`,

  'nc3': `---
id: nc3
title: Meal & Conflict
category: creative
mood: [creative]
difficulty: intermediate
estimatedTime: 20 min
---

# The Meal We Shared

*Where food and feelings collided.*

## The Meal

The dish:

The setting:

The occasion:

## The Sensory Details

How it looked:

How it smelled:

How it tasted:

## The People

Who was there:
-
-

The mood at the table:

## The Conflict

Beneath the surface:

The moment tension appeared:

What was said:

What was left unsaid:

## The Aftermath

How the meal ended:

What I remember most:

---

> **Writing tip:** Food memories are emotional memories. Let both unfold together.
`,

  // Philosophical templates
  'p1': `---
id: p1
title: Contrarian Belief
category: philosophical
mood: [reflective, curious]
difficulty: advanced
estimatedTime: 20 min
---

# Something Everyone Believes That I Think Is Wrong

*Exploring an unpopular opinion with genuine reasoning.*

## The Common Belief

Most people believe that...

This belief is widespread because...

## My Alternative View

I think differently because...

The evidence I see:
1.
2.
3.

## Steelmanning the Opposition

The strongest arguments for the common belief are:
1.
2.

I take these seriously, but I still disagree because...

## Why This Matters

If I'm right, the implications are...

If I'm wrong, I would need to see... to change my mind.

## Living With Disagreement

Holding this unpopular view affects my life by...

---

> **Thinking tip:** The goal isn't to be contrarian, but to be honestly curious about why you see things differently.
`,

  // More philosophical templates
  'nph1': `---
id: nph1
title: The Meaning of Love
category: philosophical
mood: [reflective, grateful]
difficulty: intermediate
estimatedTime: 20 min
---

# What Does It Mean to Say "I Love You"?

*Exploring the deepest human connection.*

## The Words

When I say "I love you" to someone, what I really mean is...

The feeling behind those words is...

## First Memory of Love

The first time I felt truly loved was when...

I was [age] years old...

The person was...

What they did that made me feel loved:

## How Love Has Changed

My understanding of love has evolved:

**As a child:** I thought love meant...

**As a teenager:** I believed love was...

**Now:** I understand love as...

## The Question Beneath

What makes love different from other deep feelings?

What are we actually communicating when we say these words?

---

> **Reflection tip:** Don't reach for easy answers. Sit with the uncertainty.
`,

  'nph2': `---
id: nph2
title: Endings and Beginnings
category: philosophical
mood: [reflective]
difficulty: intermediate
estimatedTime: 15 min
---

# An Ending That Became a Beginning

*In the circle of life, beginnings are preceded by endings.*

## The Ending

What ended:

When it ended:

How I felt in that moment:

## The Space Between

After the ending, there was a period of...

I didn't know yet that...

## The Beginning

What began:

The connection between the ending and the beginning:

## Looking Back

If the ending hadn't happened, the beginning couldn't have...

What I understand now about endings:

---

> **Philosophical note:** Every door that closes creates space for a new one to open.
`,

  'nph3': `---
id: nph3
title: Guilt and Shame
category: philosophical
mood: [reflective, anxious]
difficulty: advanced
estimatedTime: 25 min
---

# What Makes Me Feel Guilty?

*Exploring a moment I am ashamed of.*

## The Memory

There's a moment I carry with me...

It happened when...

## What Happened

The situation was...

What I did (or didn't do):

## The Weight

Why this moment still troubles me:

What I wish I had done differently:

## Understanding

At the time, I was dealing with...

I now understand that I...

## Moving Forward

To release this guilt, I might need to...

What would it take to forgive myself?

---

> **Deep work:** Shame thrives in secrecy. Writing about it begins to loosen its grip.
`,

  // Learning templates
  'nl1': `---
id: nl1
title: Family Lesson
category: learning
mood: [reflective, curious]
difficulty: beginner
estimatedTime: 15 min
---

# A Lesson My Family Tried to Teach Me

*Revisiting wisdom passed down through generations.*

## The Lesson

Something my family always said or taught:

Who taught it to me:

How they tried to convey it:

## Then

As a child/teenager, I interpreted this as...

I thought it meant...

My reaction at the time was...

## Now

Today, I understand this differently...

What I now see they were really trying to say:

## My Own Version

If I were to pass this lesson on, I would say:

What I've added from my own experience:

---

> **Learning tip:** Sometimes we need to grow into wisdom before we can receive it.
`,

  'nl2': `---
id: nl2
title: Facing Fear
category: learning
mood: [reflective, energetic]
difficulty: intermediate
estimatedTime: 20 min
---

# Something I'm Scared Of

*Confronting fear and planning to overcome it.*

## The Fear

Something I'm genuinely scared of:

When I think about it, I feel:

Physical sensations:

## Origins

When did this fear begin?

What experience or belief created it?

## How It Limits Me

This fear holds me back from:
-
-
-

What I miss out on because of it:

## The Plan

Small steps I could take:
1.
2.
3.

What I would need to feel ready:

## Vision

If I overcame this fear, my life would be different because:

---

> **Courage note:** Bravery isn't the absence of fear—it's action despite fear.
`,

  'nl4': `---
id: nl4
title: Overcoming Challenge
category: learning
mood: [reflective, energetic]
difficulty: intermediate
estimatedTime: 20 min
---

# A Challenge I Overcame

*Documenting the journey and the lessons.*

## The Challenge

What I faced:

When this happened:

Why it felt insurmountable at first:

## The Struggle

The hardest part was...

Moments I wanted to give up:

What kept me going:

## The Turning Point

Something shifted when...

A key insight or breakthrough:

## The Victory

How I finally overcame it:

How I felt when I succeeded:

## The Lessons

What this taught me about myself:

Skills I developed:

Advice I would give someone facing something similar:

---

> **Growth mindset:** Challenges are how we discover what we're capable of.
`,

  // Exploration templates
  'ne1': `---
id: ne1
title: Search History Obsession
category: exploration
mood: [curious, energetic]
difficulty: beginner
estimatedTime: 15 min
---

# A Topic I Researched Obsessively

*Going through my search history to find a curiosity thread.*

## The Topic

Something I couldn't stop researching:

How I first became interested:

## The Rabbit Hole

Where my research took me:
- Started with...
- Then discovered...
- Which led to...
- And finally...

## What I Learned

The most surprising fact:

Something that changed my perspective:

Things I now know that most people don't:

## Why It Mattered

Looking back, I was drawn to this because...

What this curiosity revealed about me:

## Still Wondering

Questions I still have:
- [ ]
- [ ]

---

> **Exploration tip:** Our curiosities are clues to who we really are.
`,

  'ne2': `---
id: ne2
title: Bookshelf Portrait
category: exploration
mood: [curious, relaxed]
difficulty: beginner
estimatedTime: 15 min
---

# What's on My Bookshelf Right Now

*A portrait of the books that surround me.*

## The Overview

Number of books:
Types (fiction, non-fiction, reference, etc.):
General condition (organized? chaotic? color-coded?):

## The Categories

**Books I've finished and loved:**
-
-

**Books I started but didn't finish:**
-
-

**Books I own but haven't started:**
-
-

**Books that have been there the longest:**
-

## The Story They Tell

If someone looked at my bookshelf without knowing me, they would think I'm...

The books that most represent who I am:

The books that represent who I want to become:

## Missing

Books I wish I had on my shelf:

Topics I want to explore next:

---

> **Reflection:** A bookshelf is a self-portrait made of other people's words.
`,

  // Technical/Craft writing templates
  'nt1': `---
id: nt1
title: The Quiet Argument
category: technical
mood: [focused, creative]
difficulty: advanced
estimatedTime: 30 min
---

# The Worst Argument (Without Raising Voices)

*Two people who love each other, in their worst moment.*

## Setting the Scene

Who are these two people?

Their relationship:

The history between them:

## The Tension

What this argument is really about (beneath the surface):

What triggered it today:

## The Dialogue

Write the argument. No shouting, no slamming doors. The tension comes entirely from what's said, what's left unsaid, and the silences between.

---

[Character A]:

[Character B]:

[Character A]:

[Character B]:

*(Continue the scene...)*

---

## The Unspoken

What each character is really feeling but not saying:

**Character A's inner monologue:**

**Character B's inner monologue:**

## The Aftermath

How does this end? (Not resolved—just ended for now)

---

> **Craft note:** Real conflict is often quiet. The loudest pain happens in silence.
`,

  'nt2': `---
id: nt2
title: The First Lie
category: technical
mood: [creative, focused]
difficulty: intermediate
estimatedTime: 25 min
---

# When Honesty Failed Them

*A character tells their first real lie.*

## The Character

Who is this person?

Why they've never lied convincingly before:

What they're known for (their honesty, their integrity):

## The Situation

The truth would destroy someone they love. What is the truth?

Why the lie feels necessary:

## The Physical Experience

Write the scene of them lying. Include:
- The internal struggle before speaking
- The physical sensations of deception
- The moment they commit to the lie
- The listener's reaction
- How they know if they've succeeded or failed

---

*(Write the scene here)*

---

## The Cost

What has changed inside them?

Can they ever go back to who they were before?

---

> **Craft note:** A lie told to protect can still be a turning point in someone's character.
`,

  'nt4': `---
id: nt4
title: The Detective's Eye
category: technical
mood: [creative, curious]
difficulty: intermediate
estimatedTime: 25 min
---

# The Empty Apartment

*Revealing character through objects, not words.*

## The Setup

A detective enters a suspect's apartment. The suspect isn't home.

Who is the suspect? (Don't state their secret yet):

What crime are they suspected of?

## The Description

Walk through the apartment. Describe only what the detective sees:
- The objects and their arrangement
- What's present
- What's conspicuously absent
- Details that feel off

---

*(Write the description here—never state the secret directly)*

---

## The Reveal

Through these details alone, what dark secret becomes clear?

What object or absence was the key to understanding?

## Craft Reflection

How did you make the reader figure it out without stating it directly?

What details carried the most weight?

---

> **Show don't tell:** The best reveals are the ones readers discover themselves.
`,
}

/**
 * Parse frontmatter from markdown content
 */
function parseFrontmatter(content: string): {
  metadata: Partial<TemplateMetadata>
  body: string
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { metadata: {}, body: content }
  }

  const [, frontmatter, body] = match
  const metadata: Partial<TemplateMetadata> = {}

  // Parse YAML-like frontmatter
  const lines = frontmatter.split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value = line.slice(colonIndex + 1).trim()

    // Parse arrays
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1)
      const items = value.split(',').map((s) => s.trim())
      ;(metadata as Record<string, unknown>)[key] = items
    } else {
      ;(metadata as Record<string, unknown>)[key] = value
    }
  }

  return { metadata, body: body.trim() }
}

/**
 * Get template for a prompt by ID
 */
export function getTemplateForPrompt(promptId: string): PromptTemplate | null {
  const rawContent = TEMPLATE_REGISTRY[promptId]
  if (!rawContent) return null

  const { metadata, body } = parseFrontmatter(rawContent)

  return {
    id: promptId,
    title: metadata.title || 'Untitled',
    category: (metadata.category as PromptCategory) || 'reflection',
    mood: metadata.mood,
    difficulty: metadata.difficulty,
    estimatedTime: metadata.estimatedTime,
    content: body,
    rawContent,
  }
}

/**
 * Check if a prompt has a template
 */
export function hasTemplate(promptId: string): boolean {
  return promptId in TEMPLATE_REGISTRY
}

/**
 * Get all available template IDs
 */
export function getAvailableTemplateIds(): string[] {
  return Object.keys(TEMPLATE_REGISTRY)
}

/**
 * Get all templates
 */
export function getAllTemplates(): PromptTemplate[] {
  return Object.keys(TEMPLATE_REGISTRY)
    .map((id) => getTemplateForPrompt(id))
    .filter((t): t is PromptTemplate => t !== null)
}

/**
 * Convert template content to strand-ready format
 * (Strip frontmatter, clean up placeholders)
 */
export function prepareTemplateForStrand(
  template: PromptTemplate,
  options?: {
    stripPlaceholders?: boolean
    includeHeader?: boolean
  }
): string {
  let content = template.content

  if (options?.stripPlaceholders) {
    // Remove placeholder brackets
    content = content.replace(/\[([^\]]+)\]/g, '')
    // Clean up empty lines
    content = content.replace(/\n{3,}/g, '\n\n')
  }

  if (options?.includeHeader !== false) {
    // Add prompt as header if not already present
    if (!content.startsWith('#')) {
      content = `# ${template.title}\n\n${content}`
    }
  }

  return content.trim()
}
