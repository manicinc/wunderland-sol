/**
 * Central "hosted mode" switch for the managed multi-tenant deployment.
 *
 * - Hosted mode (true): aggressively restrict tool/skill enablement server-side.
 * - Self-hosted mode (false): allow broader capabilities (still subject to per-agent profiles).
 */

export function isHostedMode(): boolean {
  return (
    process.env.WUNDERLAND_HOSTED_MODE === 'true' || process.env.WUNDERLAND_MANAGED_MODE === 'true'
  );
}
