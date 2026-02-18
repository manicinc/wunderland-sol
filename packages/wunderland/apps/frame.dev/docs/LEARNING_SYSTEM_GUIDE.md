# Learning System Guide

> Complete guide to the flashcard, quiz, and spaced repetition system in Quarry Codex.

> **Interactive Tutorial Available!** 🎓
> Start with our [Flashcards & Learning tutorial](/codex?tutorial=flashcards) to learn how to generate cards, review with spaced repetition, and track your progress.

## Table of Contents

- [Overview](#overview)
- [Content Generation](#content-generation)
- [Flashcard System](#flashcard-system)
- [Quiz System](#quiz-system)
- [FSRS Algorithm](#fsrs-algorithm)
- [Learning Progress](#learning-progress)
- [API Reference](#api-reference)
- [Components Reference](#components-reference)

---

## Overview

The learning system combines:

1. **Static NLP** - Fast, client-side content analysis
2. **LLM Enhancement** - Optional AI-powered quality improvement
3. **FSRS Algorithm** - State-of-the-art spaced repetition
4. **Progress Tracking** - XP, streaks, and mastery visualization

```
[Content] → [NLP Generation] → [LLM Enhancement] → [Flashcards/Quizzes]
                                                          ↓
                                            [FSRS Scheduling]
                                                          ↓
                                            [Progress Dashboard]
```

---

## Content Generation

### Generation Strategy

```
1. Static NLP (always runs)
   ├── Keyword extraction
   ├── Entity recognition
   ├── Definition patterns
   └── Code block detection

2. LLM Enhancement (optional)
   ├── Chain-of-thought prompting
   ├── Quality improvement
   └── Additional context
```

### API Endpoint

```
POST /api/generate
```

#### Request Body

```typescript
{
  type: 'flashcards' | 'quiz' | 'suggestions',
  content: string,           // Markdown content (min 50 chars)
  strandSlug?: string,       // For context
  title?: string,            // Strand title
  useLLM?: boolean,          // Enable AI enhancement
  maxItems?: number,         // Max items to generate (1-20)
  difficulty?: 'beginner' | 'intermediate' | 'advanced',
  focusTopics?: string[],    // Topics to emphasize
}
```

#### Response

```typescript
{
  success: boolean,
  type: string,
  items: [...],              // Generated items
  source: 'static' | 'llm' | 'hybrid',
  metadata: {
    processingTime: number,
    nlpConfidence: number,
    llmUsed: boolean,
    tokensUsed?: number,
  }
}
```

### Batch Generation

```
POST /api/generate/batch
```

For generating content across multiple strands:

```typescript
{
  type: 'flashcards' | 'quiz',
  strands: [
    { path: 'weaves/tech/react.md', title: 'React', content: '...' },
    { path: 'weaves/tech/vue.md', title: 'Vue', content: '...' },
  ],
  useLLM?: boolean,
  itemsPerStrand?: number,   // 1-10
}
```

---

## Flashcard System

### Card Types

| Type | Description | Example |
|------|-------------|---------|
| **Basic** | Q&A pair | "What is React?" → "A JavaScript library..." |
| **Cloze** | Fill-in-blank | "React uses [...] for state" → "hooks" |
| **Reversed** | Answer → Question | "JavaScript library" → "What is React?" |

### Generation Methods

#### 1. Keyword Extraction (Cloze)

```typescript
// Input
"React hooks provide a way to use state in functional components."

// Output
{
  type: 'cloze',
  front: "React [...] provide a way to use state in functional components.",
  back: "hooks",
  confidence: 0.85
}
```

#### 2. Definition Patterns (Basic)

```typescript
// Input
"useState is a React hook that lets you add state to functional components."

// Output
{
  type: 'basic',
  front: "What is useState?",
  back: "A React hook that lets you add state to functional components.",
  confidence: 0.9
}
```

#### 3. LLM Chain-of-Thought

System prompt guides the model through:
1. Identify key concepts
2. Determine best card type
3. Write clear questions
4. Rate confidence

### FlashcardQuizPopover

```tsx
import FlashcardQuizPopover from '@/components/quarry/ui/FlashcardQuizPopover'

<FlashcardQuizPopover
  isOpen={showQuiz}
  onClose={() => setShowQuiz(false)}
  strandSlug="weaves/tech/react-hooks.md"
  content={strandContent}
  theme="dark"
/>
```

Features:
- Card flip animation
- Rating buttons (Again, Hard, Good, Easy)
- Interval preview
- Progress tracking
- Auto-generation from content

---

## Quiz System

### Question Types

| Type | Description |
|------|-------------|
| **Multiple Choice** | 4 options, 1 correct |
| **True/False** | Statement verification |
| **Short Answer** | Free-form response |
| **Fill Blank** | Complete the sentence |

### Generation from NLP

```typescript
// True/False from statements
{
  type: 'true_false',
  question: "True or False: React uses a virtual DOM for efficient updates.",
  answer: "True",
  explanation: "This statement comes directly from the content.",
  difficulty: "intermediate"
}

// Fill-in-blank from keywords
{
  type: 'fill_blank',
  question: "React uses _____ for efficient DOM updates.",
  answer: "virtual DOM",
  difficulty: "beginner"
}

// Short answer from entities
{
  type: 'short_answer',
  question: "Briefly explain what React hooks are and why they're important.",
  answer: "React hooks are functions that let you use state and other React features in functional components.",
  difficulty: "intermediate"
}
```

### LLM Enhancement

Multiple choice with plausible distractors:

```typescript
{
  type: 'multiple_choice',
  question: "Which hook is used to manage state in functional components?",
  options: [
    "useState",      // Correct
    "useEffect",     // Plausible - common hook
    "useContext",    // Plausible - another hook
    "useCallback",   // Plausible - another hook
  ],
  answer: "useState",
  explanation: "useState is specifically designed for state management. useEffect handles side effects, useContext accesses context, and useCallback memoizes functions.",
  difficulty: "beginner"
}
```

---

## FSRS Algorithm

### Overview

FSRS (Free Spaced Repetition Scheduler) is a state-of-the-art algorithm that outperforms SM-2.

```typescript
import { 
  processReview, 
  previewNextIntervals,
  calculateRetrievability,
  createInitialFSRSState,
} from '@/lib/fsrs'
```

### Card States

```
[New] → [Learning] → [Review]
              ↑           ↓
              └── [Relearning] ←┘ (on lapse)
```

| State | Description |
|-------|-------------|
| `new` | Never reviewed |
| `learning` | Initial learning phase |
| `review` | Regular review cycle |
| `relearning` | Failed review, relearning |

### Rating Scale

| Rating | Label | Description | Effect |
|--------|-------|-------------|--------|
| 1 | Again | Complete failure | Reset to relearning |
| 2 | Hard | Difficult recall | Shorter interval |
| 3 | Good | Correct with effort | Normal interval |
| 4 | Easy | Effortless recall | Longer interval |

### Usage

```typescript
// Create initial state for new card
const fsrs = createInitialFSRSState()

// Process a review
const { newState, scheduledDays } = processReview(fsrs, rating)

// Preview intervals for all ratings
const intervals = previewNextIntervals(fsrs)
// { 1: 0, 2: 1, 3: 3, 4: 7 }

// Calculate current retrievability
const retrievability = calculateRetrievability(fsrs.stability, elapsedDays)
// 0.0 - 1.0
```

### Interval Formatting

```typescript
import { formatInterval } from '@/lib/fsrs'

formatInterval(0)    // "Now"
formatInterval(1)    // "1 day"
formatInterval(7)    // "7 days"
formatInterval(30)   // "1 month"
formatInterval(365)  // "1 year"
```

---

## Learning Progress

### Dashboard Component

```tsx
import LearningProgressDashboard from '@/components/quarry/ui/LearningProgressDashboard'

<LearningProgressDashboard
  theme="dark"
  onClose={() => setShowDashboard(false)}
/>
```

### Stats Tracked

| Metric | Description |
|--------|-------------|
| **Total XP** | Cumulative experience points |
| **Level** | Based on XP thresholds |
| **Current Streak** | Consecutive study days |
| **Longest Streak** | Best streak ever |
| **Cards Reviewed** | Total cards reviewed |
| **Accuracy** | Correct / Total ratio |
| **Quizzes Taken** | Total quizzes completed |
| **Average Score** | Quiz performance |
| **Study Time** | Total minutes studied |
| **Topic Mastery** | Per-topic progress |

### XP Rewards

| Action | XP |
|--------|-----|
| Easy rating | 15 |
| Good rating | 10 |
| Hard rating | 5 |
| Again rating | 2 |
| Quiz completion | 20-50 |

### Level Thresholds

| Level | XP Required |
|-------|-------------|
| 1 | 0 |
| 2 | 100 |
| 3 | 300 |
| 4 | 600 |
| 5 | 1,000 |
| 6 | 1,500 |
| 7 | 2,200 |
| 8 | 3,000 |
| 9 | 4,000 |
| 10 | 5,200 |

### Utility Functions

```typescript
import { 
  addXP, 
  recordCardReview, 
  updateLearningStats 
} from '@/components/quarry/ui/LearningProgressDashboard'

// Add XP
addXP(15) // Easy rating

// Record review
recordCardReview(true, 'react-hooks') // correct, topic

// Update arbitrary stats
updateLearningStats({
  quizzesTaken: stats.quizzesTaken + 1,
  averageScore: newAverage,
})
```

---

## API Reference

### GET /api/generate

Returns generation capabilities:

```json
{
  "status": "ok",
  "capabilities": {
    "staticNLP": true,
    "llm": true,
    "providers": ["anthropic", "openai", "openrouter", "mistral", "ollama"]
  },
  "endpoints": {
    "POST": {
      "types": ["flashcards", "quiz", "suggestions"],
      "requiredFields": ["type", "content"],
      "optionalFields": ["strandSlug", "title", "useLLM", "maxItems", "difficulty", "focusTopics"]
    }
  }
}
```

**Multi-Provider LLM Support**: Quarry Codex supports 5 LLM providers with automatic fallback:
- **Anthropic Claude** - Best for analysis & writing
- **OpenAI GPT** - Fast general purpose
- **OpenRouter** - Access 100+ models via one API
- **Mistral** - European AI, code focus
- **Ollama** - 100% local & private (no API key required)

Configure providers via Settings → API Keys, or set environment variables.

### POST /api/generate

Generate content:

```bash
curl -X POST /api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "type": "flashcards",
    "content": "# React Hooks\n\nReact hooks are functions...",
    "useLLM": true,
    "maxItems": 10
  }'
```

### POST /api/generate/batch

Batch generation:

```bash
curl -X POST /api/generate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "type": "quiz",
    "strands": [
      {"path": "weaves/tech/react.md", "content": "..."},
      {"path": "weaves/tech/vue.md", "content": "..."}
    ],
    "itemsPerStrand": 5
  }'
```

---

## Components Reference

### FlashcardQuizPopover

Full flashcard quiz interface:

```tsx
<FlashcardQuizPopover
  isOpen={boolean}
  onClose={() => void}
  strandSlug={string}
  content={string}
  theme={string}
/>
```

### StrandMindMap

D3-based knowledge graph:

```tsx
<StrandMindMap
  strandPath={string}
  metadata={StrandMetadata}
  knowledgeTree={TreeNode[]}
  theme={string}
  onNavigate={(path) => void}
/>
```

### SuggestedQuestions

Dynamic NLP-generated questions:

```tsx
<SuggestedQuestions
  currentStrand={string}
  strandContent={string}
  onSelectQuestion={(q) => void}
  theme={string}
  maxQuestions={number}
/>
```

### LearningProgressDashboard

Progress tracking dashboard:

```tsx
<LearningProgressDashboard
  theme={string}
  onClose={() => void}
/>
```

---

## Integration Example

Complete integration in CodexViewer:

```tsx
import { useState } from 'react'
import FlashcardQuizPopover from '@/components/quarry/ui/FlashcardQuizPopover'
import StrandMindMap from '@/components/quarry/ui/StrandMindMap'
import LearningProgressDashboard from '@/components/quarry/ui/LearningProgressDashboard'

function CodexViewer() {
  const [showQuiz, setShowQuiz] = useState(false)
  const [showMindMap, setShowMindMap] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  return (
    <>
      {/* Toolbar buttons */}
      <button onClick={() => setShowQuiz(true)}>Quiz</button>
      <button onClick={() => setShowMindMap(true)}>Mind Map</button>
      <button onClick={() => setShowProgress(true)}>Progress</button>

      {/* Components */}
      {showQuiz && (
        <FlashcardQuizPopover
          isOpen={showQuiz}
          onClose={() => setShowQuiz(false)}
          strandSlug={currentStrand}
          content={strandContent}
          theme={theme}
        />
      )}

      {showMindMap && (
        <StrandMindMap
          strandPath={currentStrand}
          metadata={metadata}
          knowledgeTree={tree}
          theme={theme}
          onNavigate={handleNavigate}
        />
      )}

      {showProgress && (
        <LearningProgressDashboard
          theme={theme}
          onClose={() => setShowProgress(false)}
        />
      )}
    </>
  )
}
```

---

## Best Practices

### 1. Generation Quality

- Provide >200 words for best results
- Include headings and structure
- Enable `useLLM` for complex content

### 2. Review Scheduling

- Review due cards daily
- Don't skip "Again" ratings
- Use hints before revealing answers

### 3. Progress Tracking

- Check dashboard weekly
- Focus on low-mastery topics
- Maintain streaks for consistency

---

## Related Documentation

- [NLP Guide](./NLP_GUIDE.md) - Detailed NLP implementation
- [Strand Creation](./STRAND_CREATION_GUIDE.md) - Creating content
- [Semantic Search](./SEMANTIC_SEARCH_ARCHITECTURE.md) - Search system




















