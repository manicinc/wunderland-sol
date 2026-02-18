/**
 * OpenTelemetry stub for the standalone Wunderland backend.
 *
 * Provides no-op implementations of startOtel() and shutdownOtel() to avoid
 * pulling in heavy @opentelemetry/* dependencies. Enable the real implementation
 * by replacing this file with the full version and installing the OTel packages.
 */

export async function startOtel(): Promise<void> {
  // No-op: OpenTelemetry is not enabled in the standalone backend.
}

export async function shutdownOtel(): Promise<void> {
  // No-op: OpenTelemetry is not enabled in the standalone backend.
}
