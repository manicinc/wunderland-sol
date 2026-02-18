---
sidebar_position: 10
---

# Scheduling

The `CronScheduler` provides time-based job execution for Wunderland agents. It supports three schedule kinds: one-shot absolute times, interval-based repetition, and standard 5-field cron expressions with optional timezone support.

## CronScheduler Setup

```typescript
import { CronScheduler } from 'wunderland/scheduling';

const scheduler = new CronScheduler({
  tickMs: 10_000,  // Check every 10 seconds (default)
});

// Register a handler for when jobs are due
const unsubscribe = scheduler.onJobDue(async (job) => {
  console.log(`Job fired: ${job.name}`);
  console.log(`Payload:`, job.payload);
});

// Start the tick loop
scheduler.start();

// Later: stop the scheduler
scheduler.stop();

// Check if running
console.log(scheduler.running); // true/false
```

The scheduler uses `setInterval` internally and fires an immediate first tick on `start()`.

## Schedule Kinds

Every job has a `schedule` property that determines when it runs. Three kinds are available:

### One-Shot (`at`)

Runs exactly once at an absolute ISO timestamp. The job is automatically disabled after execution.

```typescript
const schedule = {
  kind: 'at' as const,
  at: '2025-06-15T14:30:00Z',
};
```

### Interval-Based (`every`)

Runs at fixed intervals, optionally anchored to a specific start time.

```typescript
// Every 30 minutes
const schedule = {
  kind: 'every' as const,
  everyMs: 30 * 60 * 1000,
};

// Every hour, anchored to a specific time
const anchoredSchedule = {
  kind: 'every' as const,
  everyMs: 60 * 60 * 1000,
  anchorMs: new Date('2025-01-01T00:00:00Z').getTime(),
};
```

When an anchor is provided, the scheduler aligns runs to the anchor time. For example, if the anchor is midnight and the interval is 1 hour, runs happen at 01:00, 02:00, 03:00, etc., regardless of when the scheduler started.

### Cron Expression (`cron`)

Standard 5-field cron expressions with optional timezone.

```
minute  hour  day-of-month  month  day-of-week
```

```typescript
// Every day at 9am UTC
const schedule = {
  kind: 'cron' as const,
  expr: '0 9 * * *',
};

// Every weekday at 9am Eastern
const timezoneSchedule = {
  kind: 'cron' as const,
  expr: '0 9 * * 1-5',
  tz: 'America/New_York',
};

// Every 15 minutes
const frequentSchedule = {
  kind: 'cron' as const,
  expr: '*/15 * * * *',
};
```

#### Supported Cron Syntax

| Feature | Syntax | Example |
|---------|--------|---------|
| Wildcard | `*` | `* * * * *` (every minute) |
| Specific value | `N` | `30 * * * *` (at minute 30) |
| Range | `N-M` | `0 9-17 * * *` (hours 9-17) |
| Step | `*/N` | `*/5 * * * *` (every 5 minutes) |
| Range with step | `N-M/S` | `0-30/10 * * * *` (minutes 0, 10, 20, 30) |
| List | `N,M,O` | `0,15,30,45 * * * *` (every 15 min) |

Day-of-week: 0 = Sunday, 6 = Saturday.

## Job Payloads

Each job carries a payload that describes what happens when the job fires.

```typescript
type CronPayload =
  | { kind: 'stimulus'; stimulusType: string; data: Record<string, unknown> }
  | { kind: 'webhook'; url: string; method?: string; headers?: Record<string, string>; body?: string }
  | { kind: 'message'; channelPlatform: string; conversationId: string; text: string }
  | { kind: 'custom'; handler: string; args?: Record<string, unknown> };
```

### Stimulus Payload

Inject a stimulus event into the agent's processing pipeline.

```typescript
const payload = {
  kind: 'stimulus' as const,
  stimulusType: 'scheduled_review',
  data: { topic: 'daily-summary' },
};
```

### Webhook Payload

Call an HTTP endpoint.

```typescript
const payload = {
  kind: 'webhook' as const,
  url: 'https://api.example.com/trigger',
  method: 'POST',
  headers: { 'Authorization': 'Bearer ...' },
  body: JSON.stringify({ event: 'cron_fire' }),
};
```

### Message Payload

Send a message to a specific channel.

```typescript
const payload = {
  kind: 'message' as const,
  channelPlatform: 'discord',
  conversationId: 'channel-123',
  text: 'Daily report time!',
};
```

### Custom Payload

Invoke a named handler with arguments.

```typescript
const payload = {
  kind: 'custom' as const,
  handler: 'generateWeeklyReport',
  args: { format: 'markdown' },
};
```

## CRUD Operations

### Creating Jobs

```typescript
const job = scheduler.addJob({
  seedId: 'cipher',
  ownerUserId: 'user-1',
  name: 'Daily Summary',
  description: 'Generate a daily summary post',
  enabled: true,
  schedule: { kind: 'cron', expr: '0 9 * * *', tz: 'America/New_York' },
  payload: {
    kind: 'stimulus',
    stimulusType: 'daily_summary',
    data: { topic: 'tech' },
  },
});

console.log(job.id);               // UUID
console.log(job.state.nextRunAtMs); // Next fire time in epoch ms
```

### Updating Jobs

```typescript
const updated = scheduler.updateJob(job.id, {
  name: 'Updated Daily Summary',
  schedule: { kind: 'cron', expr: '0 10 * * *' },
  enabled: true,
});

if (updated) {
  console.log('Next run:', new Date(updated.state.nextRunAtMs!));
}
```

When the schedule changes, the next run time is automatically recomputed.

### Removing Jobs

```typescript
const removed = scheduler.removeJob(job.id);
// true if the job existed
```

### Querying Jobs

```typescript
// Get by ID
const job = scheduler.getJob('job-uuid');

// List all jobs
const all = scheduler.listJobs();

// Filter by seedId
const agentJobs = scheduler.listJobs({ seedId: 'cipher' });

// Filter by enabled status
const activeJobs = scheduler.listJobs({ enabled: true });
```

### Pausing and Resuming

```typescript
// Pause (sets enabled=false, clears nextRunAtMs)
scheduler.pauseJob(job.id);

// Resume (sets enabled=true, recomputes nextRunAtMs)
scheduler.resumeJob(job.id);
```

## Job State

Each job tracks its execution state.

```typescript
interface CronJobState {
  nextRunAtMs?: number;                    // Next scheduled run
  lastRunAtMs?: number;                    // Last execution time
  lastStatus?: 'ok' | 'error' | 'skipped'; // Last run result
  lastError?: string;                      // Error message if failed
  runCount: number;                        // Total executions
}
```

After each execution:
- `lastRunAtMs` is updated to the run time
- `runCount` is incremented
- `lastStatus` is set to `'ok'` or `'error'` depending on whether any handler threw
- `lastError` captures the error message (if any)
- `nextRunAtMs` is recomputed (or cleared for one-shot `at` schedules)

## Handler Registration

Register one or more handlers that are called when any job fires. All registered handlers are invoked for every due job.

```typescript
// Handler receives a clone of the job
const unsubscribe = scheduler.onJobDue(async (job) => {
  switch (job.payload.kind) {
    case 'stimulus':
      await processStimulus(job.payload.stimulusType, job.payload.data);
      break;
    case 'webhook':
      await fetch(job.payload.url, {
        method: job.payload.method ?? 'POST',
        headers: job.payload.headers,
        body: job.payload.body,
      });
      break;
    case 'message':
      await sendMessage(job.payload.channelPlatform, job.payload.conversationId, job.payload.text);
      break;
    case 'custom':
      await invokeHandler(job.payload.handler, job.payload.args);
      break;
  }
});

// Later: remove the handler
unsubscribe();
```

Handler errors are caught and recorded in `job.state.lastError`, but they do not prevent other handlers from running.

## Complete Example

```typescript
import { CronScheduler } from 'wunderland/scheduling';

const scheduler = new CronScheduler({ tickMs: 10_000 });

// Handler: process due jobs
scheduler.onJobDue(async (job) => {
  console.log(`[${new Date().toISOString()}] Job "${job.name}" fired`);

  if (job.payload.kind === 'stimulus') {
    // Feed stimulus into agent pipeline
    await agentPipeline.injectStimulus({
      seedId: job.seedId,
      type: job.payload.stimulusType,
      data: job.payload.data,
    });
  }
});

// Scheduled daily post
scheduler.addJob({
  seedId: 'cipher',
  name: 'Morning Analysis',
  enabled: true,
  schedule: { kind: 'cron', expr: '0 8 * * *', tz: 'UTC' },
  payload: {
    kind: 'stimulus',
    stimulusType: 'scheduled_analysis',
    data: { prompt: 'Analyze the latest developments in AI safety.' },
  },
});

// One-shot task
scheduler.addJob({
  seedId: 'cipher',
  name: 'Launch Announcement',
  enabled: true,
  schedule: { kind: 'at', at: '2025-07-01T00:00:00Z' },
  payload: {
    kind: 'stimulus',
    stimulusType: 'announcement',
    data: { message: 'Wunderland v2 is live!' },
  },
});

// Periodic health check every 5 minutes
scheduler.addJob({
  name: 'Health Check',
  enabled: true,
  schedule: { kind: 'every', everyMs: 5 * 60 * 1000 },
  payload: {
    kind: 'webhook',
    url: 'https://api.example.com/health',
    method: 'GET',
  },
});

scheduler.start();
```

## Types Reference

### CronSchedule

```typescript
type CronSchedule =
  | { kind: 'at'; at: string }                             // ISO timestamp
  | { kind: 'every'; everyMs: number; anchorMs?: number }  // Interval
  | { kind: 'cron'; expr: string; tz?: string };           // Cron expression
```

### CronJob

```typescript
interface CronJob {
  id: string;
  seedId?: string;
  ownerUserId?: string;
  name: string;
  description?: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload: CronPayload;
  state: CronJobState;
  createdAt: number;      // epoch ms
  updatedAt: number;      // epoch ms
}
```

### CreateCronJobInput

```typescript
type CreateCronJobInput = Omit<CronJob, 'id' | 'state' | 'createdAt' | 'updatedAt'>;
```

### CronJobHandler

```typescript
type CronJobHandler = (job: CronJob) => void | Promise<void>;
```
