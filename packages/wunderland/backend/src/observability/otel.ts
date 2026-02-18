/**
 * OpenTelemetry bootstrap for the backend.
 *
 * Design goals:
 * - Default OFF (to avoid overhead and accidental data export).
 * - When enabled, rely on standard OTEL_* env vars for exporters/sampling.
 * - Keep content collection (LLM prompts/responses, tool args) out of spans by default.
 *
 * Enable with:
 *   OTEL_ENABLED=true
 *
 * Typical local collector:
 *   OTEL_TRACES_EXPORTER=otlp
 *   OTEL_METRICS_EXPORTER=otlp
 *   # OTEL_LOGS_EXPORTER=otlp
 *   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
 *   OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
 *
 * Sampling:
 *   OTEL_TRACES_SAMPLER=parentbased_traceidratio
 *   OTEL_TRACES_SAMPLER_ARG=0.1
 *
 * Note: This module intentionally avoids importing OTEL packages unless enabled.
 */

function isEnabled(): boolean {
  const raw = (process.env['OTEL_ENABLED'] ?? '').trim().toLowerCase();
  if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on') return true;
  return false;
}

async function configureDiagLogger(): Promise<void> {
  // Optional: keep otel internal logs quiet by default.
  const raw = (process.env['OTEL_DIAG_LOG_LEVEL'] ?? '').trim().toLowerCase();
  if (!raw) return;

  const { diag, DiagConsoleLogger, DiagLogLevel } = await import('@opentelemetry/api');

  const level =
    raw === 'debug'
      ? DiagLogLevel.DEBUG
      : raw === 'info'
        ? DiagLogLevel.INFO
        : raw === 'warn'
          ? DiagLogLevel.WARN
          : raw === 'error'
            ? DiagLogLevel.ERROR
            : raw === 'none'
              ? DiagLogLevel.NONE
              : null;
  if (level === null) return;
  diag.setLogger(new DiagConsoleLogger(), level);
}

type OtelSdk = { start(): void | Promise<void>; shutdown(): Promise<void> };

let sdk: OtelSdk | null = null;

export async function shutdownOtel(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch (error) {
     
    console.warn('[otel] shutdown failed', error);
  } finally {
    sdk = null;
  }
}

export async function startOtel(): Promise<void> {
  if (!isEnabled()) return;
  if (sdk) return;

  await configureDiagLogger();

  // If OTEL_SERVICE_NAME is not set, fall back to a stable, explicit name.
  const serviceName = (process.env['OTEL_SERVICE_NAME'] ?? 'voice-chat-assistant-backend').trim();

  const [{ NodeSDK }, { getNodeAutoInstrumentations }] = await Promise.all([
    import('@opentelemetry/sdk-node'),
    import('@opentelemetry/auto-instrumentations-node'),
  ]);

  sdk = new NodeSDK({
    serviceName,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Reduce default overhead/noise; enable more only when needed.
        '@opentelemetry/instrumentation-fs': { enabled: false },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-aws-sdk': { enabled: false },
        '@opentelemetry/instrumentation-redis-4': { enabled: false },
      }),
    ],
  });

  await sdk.start();
}
