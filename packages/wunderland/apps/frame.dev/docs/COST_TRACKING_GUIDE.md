# Cost Tracking Guide

Comprehensive documentation for Quarry's LLM API cost tracking system.

## Overview

Quarry tracks **all LLM API usage and costs** locally, providing full visibility into your AI spending without sending data to external servers.

### Key Features

- **100% Local Storage**: All data stored in SQLite via IndexedDB
- **Per-Provider Breakdown**: Track costs by Anthropic, OpenAI, Mistral, etc.
- **Per-Model Analytics**: Detailed model-level usage statistics
- **Cost Projections**: Monthly spend forecasting
- **Real-Time Recording**: Automatic tracking on every API call
- **Zero External Dependencies**: No analytics or tracking services

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      LLM API Calls                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Claude API   │  │ OpenAI API   │  │ Other Providers      │  │
│  │ (streaming)  │  │ (streaming)  │  │ (Mistral, OpenRouter)│  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                 │                      │              │
│         └─────────────────┼──────────────────────┘              │
│                           ▼                                      │
│            ┌──────────────────────────────┐                     │
│            │ recordTokenUsage()           │                     │
│            │ recordImageUsage()           │                     │
│            └──────────────┬───────────────┘                     │
│                           │                                      │
│                           ▼                                      │
│            ┌──────────────────────────────┐                     │
│            │ costTrackingService.ts       │                     │
│            │ - Calculate cost             │                     │
│            │ - Save to DB                 │                     │
│            │ - Update aggregates          │                     │
│            └──────────────┬───────────────┘                     │
│                           │                                      │
│                           ▼                                      │
│            ┌──────────────────────────────┐                     │
│            │ SQLite (IndexedDB)           │                     │
│            │ - llm_api_usage table        │                     │
│            │ - llm_cost_aggregates table  │                     │
│            └──────────────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
```

## Supported Providers

### Anthropic (Claude)

| Model | Input $/1M | Output $/1M | Cached $/1M |
|-------|-----------|------------|-------------|
| claude-opus-4-5-20251101 | $15.00 | $75.00 | $1.875 |
| claude-sonnet-4-20250514 | $3.00 | $15.00 | $0.30 |
| claude-3-5-sonnet-20241022 | $3.00 | $15.00 | $0.30 |
| claude-3-5-haiku-20241022 | $0.80 | $4.00 | $0.08 |
| claude-3-opus-20240229 | $15.00 | $75.00 | $1.875 |
| claude-3-haiku-20240307 | $0.25 | $1.25 | - |

### OpenAI

| Model | Input $/1M | Output $/1M | Cached $/1M |
|-------|-----------|------------|-------------|
| gpt-4o | $2.50 | $10.00 | $1.25 |
| gpt-4o-mini | $0.15 | $0.60 | $0.075 |
| gpt-4-turbo | $10.00 | $30.00 | - |
| o1 | $15.00 | $60.00 | $7.50 |
| o1-mini | $3.00 | $12.00 | $1.50 |

**Image Generation (DALL-E 3)**:
| Size | Standard | HD |
|------|----------|-----|
| 1024x1024 | $0.04 | $0.08 |
| 1792x1024 | $0.08 | $0.12 |

### Mistral

| Model | Input $/1M | Output $/1M |
|-------|-----------|------------|
| mistral-large-latest | $2.00 | $6.00 |
| ministral-8b-latest | $0.10 | $0.10 |
| ministral-3b-latest | $0.04 | $0.04 |
| mistral-small-latest | $0.20 | $0.60 |
| codestral-latest | $0.30 | $0.90 |

### Ollama (Local)

All Ollama models are **free** (local execution).

## Usage

### Recording Token Usage

```typescript
import { recordTokenUsage } from '@/lib/costs/costTrackingService'

// After an LLM API call
await recordTokenUsage(
  'anthropic',                    // Provider
  'claude-3-5-sonnet-20241022',   // Model
  {
    promptTokens: 1500,
    completionTokens: 800,
    totalTokens: 2300,
    cachedTokens: 200,            // Optional: cached input tokens
  },
  {
    operationType: 'chat',        // 'chat' | 'completion' | 'embedding'
    context: {
      feature: 'abstractive-summary',
      strandPath: '/docs/guide.md',
      sessionId: 'abc123',
    },
    durationMs: 1234,
    success: true,
  }
)
```

### Recording Image Generation

```typescript
import { recordImageUsage } from '@/lib/costs/costTrackingService'

await recordImageUsage(
  'openai',
  'dall-e-3',
  '1024x1024',    // Size
  'hd',           // Quality: 'standard' | 'hd'
  2,              // Count
  {
    context: { feature: 'image-generation' },
    success: true,
  }
)
```

### Querying Costs

```typescript
import {
  getCostSummary,
  getDailyCosts,
  getCurrentMonthProjection,
  getProviderBreakdown,
} from '@/lib/costs/costTrackingService'

// Get summary for a time period
const summary = await getCostSummary('month')
console.log(`Total cost: $${summary.totalCost.toFixed(2)}`)
console.log(`Total requests: ${summary.totalRequests}`)
console.log(`Total tokens: ${summary.totalTokens}`)

// Get daily breakdown (for charts)
const dailyCosts = await getDailyCosts(30) // Last 30 days
dailyCosts.forEach(day => {
  console.log(`${day.date}: $${day.cost.toFixed(4)}`)
})

// Get monthly projection
const projection = await getCurrentMonthProjection()
console.log(`Current spend: $${projection.currentSpend.toFixed(2)}`)
console.log(`Projected monthly: $${projection.projectedMonthly.toFixed(2)}`)
console.log(`Daily average: $${projection.averageDailyCost.toFixed(4)}`)

// Get provider breakdown
const breakdown = await getProviderBreakdown()
for (const [provider, data] of Object.entries(breakdown)) {
  console.log(`${provider}: $${data.cost.toFixed(4)} (${data.percentage.toFixed(1)}%)`)
}
```

### Formatting Costs

```typescript
import { formatCost } from '@/lib/costs/pricingModels'

formatCost(0)        // "$0.00"
formatCost(0.000123) // "$0.000123"
formatCost(0.0045)   // "$0.0045"
formatCost(0.123)    // "$0.123"
formatCost(12.345)   // "$12.35"
```

## Database Schema

### llm_api_usage Table

Stores individual API call records:

```sql
CREATE TABLE llm_api_usage (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  cost_usd REAL DEFAULT 0,
  request_context TEXT,           -- JSON
  duration_ms INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TEXT NOT NULL
);
```

### llm_cost_aggregates Table

Stores pre-computed daily aggregates for fast querying:

```sql
CREATE TABLE llm_cost_aggregates (
  id TEXT PRIMARY KEY,
  period_type TEXT NOT NULL,      -- 'day' | 'month'
  period_date TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  total_requests INTEGER DEFAULT 0,
  total_prompt_tokens INTEGER DEFAULT 0,
  total_completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd REAL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(period_type, period_date, provider, model)
);
```

### llm_image_usage Table

Stores image generation records:

```sql
CREATE TABLE llm_image_usage (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  quality TEXT NOT NULL,
  count INTEGER DEFAULT 1,
  cost_usd REAL DEFAULT 0,
  request_context TEXT,
  success INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);
```

## Cost Analytics Dashboard

Access the cost analytics dashboard at `/quarry/costs`:

### Features

1. **Monthly Overview Card**
   - Current month spend
   - Projected end-of-month total
   - Daily average cost

2. **Provider Breakdown Chart**
   - Pie chart showing cost distribution
   - Percentage per provider

3. **Daily Cost Trend**
   - Line chart for last 30 days
   - Provider color coding

4. **Model Usage Table**
   - Per-model request counts
   - Token usage
   - Costs

## Integration Points

### Streaming LLM Responses

Cost tracking is integrated into the streaming pipeline:

```typescript
// lib/llm/streaming.ts
import { recordTokenUsage } from '@/lib/costs/costTrackingService'

async function* streamLLMResponse(provider, model, messages) {
  const startTime = Date.now()
  let totalTokens = 0

  try {
    for await (const chunk of llmStream) {
      yield chunk
      totalTokens += chunk.tokens || 0
    }

    // Record usage after successful stream
    await recordTokenUsage(provider, model, {
      promptTokens: estimatePromptTokens(messages),
      completionTokens: totalTokens,
    }, {
      durationMs: Date.now() - startTime,
      success: true,
    })
  } catch (error) {
    // Record failed request
    await recordTokenUsage(provider, model, {
      promptTokens: estimatePromptTokens(messages),
      completionTokens: 0,
    }, {
      success: false,
      errorMessage: error.message,
    })
    throw error
  }
}
```

### Non-Streaming Requests

```typescript
// lib/llm/claude.ts
const response = await anthropic.messages.create({...})

await recordTokenUsage('anthropic', model, {
  promptTokens: response.usage.input_tokens,
  completionTokens: response.usage.output_tokens,
  cachedTokens: response.usage.cache_read_input_tokens || 0,
})
```

## In-Memory Fallback

When the database is unavailable (SSR, worker context), the service uses in-memory storage:

- Last 1000 records kept in memory
- Data is not persisted across page reloads
- Full functionality maintained

## Types Reference

```typescript
interface UsageRecord {
  id: string
  timestamp: string
  provider: LLMProviderName
  model: string
  operationType: 'chat' | 'completion' | 'embedding' | 'image' | 'vision'
  promptTokens: number
  completionTokens: number
  totalTokens: number
  costUsd: number
  requestContext?: {
    feature?: string
    strandPath?: string
    sessionId?: string
  }
  durationMs?: number
  success: boolean
  errorMessage?: string
}

interface CostSummary {
  totalCost: number
  totalRequests: number
  totalTokens: number
  byProvider: Record<string, {
    cost: number
    requests: number
    tokens: number
    models: Record<string, { cost: number; requests: number; tokens: number }>
  }>
  byDay: Array<{
    date: string
    cost: number
    requests: number
    tokens: number
  }>
  period: {
    start: string
    end: string
    type: 'day' | 'week' | 'month' | 'year' | 'all'
  }
}

interface MonthlyProjection {
  currentSpend: number
  daysElapsed: number
  daysRemaining: number
  projectedMonthly: number
  averageDailyCost: number
}

type LLMProviderName = 'anthropic' | 'openai' | 'openrouter' | 'mistral' | 'ollama'
```

## Updating Pricing

Pricing is centralized in `lib/costs/pricingModels.ts`. To update:

1. Check provider pricing pages for updates
2. Update the relevant `*_PRICING` constant
3. Update `lastUpdated` field
4. Existing records keep their original costs

## Testing

Run cost tracking tests:

```bash
pnpm test __tests__/unit/costs/
```

Tests cover:
- `pricingModels.test.ts` - Pricing calculations
- `costTrackingService.test.ts` - Recording and querying

## Privacy

All cost data is stored **locally** in your browser:

- No data sent to Quarry servers
- No analytics or tracking
- Data stays in your IndexedDB
- Export/delete anytime via browser DevTools

## Related Documentation

- [SUMMARIZATION_GUIDE.md](./SUMMARIZATION_GUIDE.md) - Summarization features (includes LLM costs)
- [NLP_GUIDE.md](./NLP_GUIDE.md) - Client-side NLP (no costs)
