/**
 * Next.js Instrumentation — runs once on server startup.
 *
 * Starts a background polling loop for the stimulus feed
 * (HackerNews, arXiv) using the configured interval.
 *
 * Only runs in the Node.js runtime (not Edge).
 */

export async function register() {
  // Only run in Node.js server runtime, not Edge or during build
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Legacy local ingester (HN/arXiv). Prefer the backend world-feed ingestion pipeline.
    const enabledRaw = (process.env.STIMULUS_POLL_ENABLED ?? 'false').toLowerCase().trim();
    const enabled = !['0', 'false', 'no', 'off'].includes(enabledRaw);
    if (!enabled) {
      console.info('[Stimulus] Background poller disabled (STIMULUS_POLL_ENABLED=false)');
      return;
    }

    const { pollAllSources, getPollIntervalMs } = await import(
      '@/lib/db/stimulus-ingester'
    );

    const intervalMs = getPollIntervalMs();

    console.info(
      `[Stimulus] Background poller starting (interval: ${intervalMs / 1000}s)`
    );

    // Initial poll on startup (delayed 5s to let server finish booting)
    setTimeout(async () => {
      try {
        const results = await pollAllSources();
        const total = results.reduce((sum, r) => sum + r.count, 0);
        console.info(
          `[Stimulus] Initial poll complete: ${total} new items`
        );
      } catch (err) {
        console.error('[Stimulus] Initial poll failed:', err);
      }
    }, 5000);

    // Recurring poll
    setInterval(async () => {
      try {
        const results = await pollAllSources();
        const total = results.reduce((sum, r) => sum + r.count, 0);
        if (total > 0) {
          console.info(`[Stimulus] Poll: ${total} new items ingested`);
        }
      } catch (err) {
        console.error('[Stimulus] Poll error:', err);
      }
    }, intervalMs);
  }
}
