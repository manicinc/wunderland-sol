# Rating System Guide

Rate your documents and reflections to track quality over time with personal ratings and optional AI-powered analysis.

## Overview

The Quarry rating system provides two complementary ways to assess your content:

1. **User Ratings (1-5 Stars)** - Your personal assessment of content value
2. **AI Ratings (6 Dimensions)** - LLM-powered quality analysis with detailed scoring

## User Ratings

### How It Works

Click on any star (1-5) to rate a document. Your rating is saved immediately and persists across sessions.

- **1 Star** - Needs significant improvement
- **2 Stars** - Below expectations
- **3 Stars** - Meets basic expectations
- **4 Stars** - Good quality
- **5 Stars** - Excellent, high-value content

### Tips for Rating

- Rate based on how meaningful or valuable the content is to you
- For reflections, consider: Was this session productive? Did you gain insights?
- For notes, consider: Is this comprehensive? Will it be useful later?
- Click the same star again to clear your rating

## AI Ratings

### 6 Quality Dimensions

AI ratings evaluate your content across six dimensions, each scored 1-10:

| Dimension | What It Measures |
|-----------|------------------|
| **Quality** | Writing structure, grammar, professionalism, and overall polish |
| **Completeness** | How thoroughly the topic is covered; no major gaps |
| **Accuracy** | Factual correctness and reliability of information |
| **Clarity** | How easy to understand and follow; logical flow |
| **Relevance** | Alignment with stated purpose, title, or goals |
| **Depth** | Level of analytical detail, insight, and nuance |

### How AI Rating Works

1. Click "Analyze with AI" on any document with content
2. The LLM evaluates your content against each dimension
3. You receive:
   - Overall score (1-10)
   - Individual dimension scores
   - Written reasoning explaining the scores
   - Suggestions for improvement

### Requirements

AI rating requires an LLM API key configured in Settings > AI Features:

- **OpenAI** - GPT-4 or GPT-4o recommended
- **Anthropic** - Claude Opus 4.5 or Sonnet recommended
- **OpenRouter** - Access multiple providers

### Re-analyzing Content

Click "Re-analyze" to get fresh AI ratings after making improvements. This is useful for tracking how your content evolves over time.

## Privacy & Storage

### Local First

- All ratings (user and AI) are stored locally in SQLite
- Your personal star ratings never leave your device
- AI analysis only sends content when you explicitly click "Analyze"

### Data Location

Ratings are stored in:
- `strand_user_ratings` table - Your personal star ratings
- `strand_llm_ratings` table - AI analysis results with dimension scores

### Export & Sync

- Ratings are included in strand metadata exports
- Batch publishing preserves rating data
- Ratings sync with GitHub when using strand publishing features

## Viewing Ratings

### In the Editor

- Star rating appears in the right sidebar for any open strand
- AI rating section (collapsible) shows dimension breakdown

### In Analytics

- View rating trends over time
- See distribution of ratings across your knowledge base
- Identify highest and lowest rated content

### In Search Results

- Highly-rated strands can be prioritized in search
- Filter by minimum rating (coming soon)

## Best Practices

1. **Rate Consistently** - Develop personal criteria for each star level
2. **Use AI Sparingly** - AI analysis costs API tokens; save for important content
3. **Track Improvement** - Re-analyze after major edits to see progress
4. **Review Low Ratings** - Use AI suggestions to improve struggling content
5. **Celebrate High Ratings** - Note what makes your best content succeed

## Technical Details

### Score Conversion

User ratings use a 5-star display but store as 1-10 internally for consistency with AI ratings:

- 1 star = 2/10
- 2 stars = 4/10
- 3 stars = 6/10
- 4 stars = 8/10
- 5 stars = 10/10

### API Response Format

AI ratings return structured JSON:

```typescript
interface RatingResult {
  overallScore: number      // 1-10
  qualityScore: number      // 1-10
  completenessScore: number // 1-10
  accuracyScore: number     // 1-10
  clarityScore: number      // 1-10
  relevanceScore: number    // 1-10
  depthScore: number        // 1-10
  reasoning: string         // Explanation
  suggestions: string[]     // Improvement tips
}
```

### Database Schema

```sql
CREATE TABLE strand_user_ratings (
  strand_id TEXT PRIMARY KEY,
  strand_path TEXT,
  rating INTEGER,           -- 1-10 scale
  rated_at TEXT,
  notes TEXT
);

CREATE TABLE strand_llm_ratings (
  strand_id TEXT PRIMARY KEY,
  strand_path TEXT,
  overall_score REAL,
  quality_score REAL,
  completeness_score REAL,
  accuracy_score REAL,
  clarity_score REAL,
  relevance_score REAL,
  depth_score REAL,
  reasoning TEXT,
  suggestions TEXT,         -- JSON array
  model_used TEXT,
  rated_at TEXT
);
```

## Troubleshooting

### "Failed to generate AI rating"

- Check that your LLM API key is configured in Settings
- Verify you have API credits remaining
- Ensure the content is long enough to analyze (minimum ~100 words recommended)

### Ratings not saving

- Check browser console for errors
- Verify SQLite database is accessible
- Try refreshing the page

### AI scores seem inconsistent

- Different LLM providers may score differently
- Very short content may get inconsistent results
- Context matters - ensure document title accurately reflects content

---

For more help, see the [FAQ](/quarry/faq) or join our [Discord community](https://discord.gg/frame-dev).
