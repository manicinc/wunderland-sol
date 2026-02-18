/**
 * @file otel-logs.test.ts
 * @description Tests for backend log export via OpenTelemetry Logs API.
 *
 * This validates that our pino-backed logger can emit OTEL LogRecords (opt-in)
 * and that trace correlation fields are present when an active span context exists.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import type { LogRecord, Logger as OtelLogger, LoggerProvider } from '@opentelemetry/api-logs';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { context, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

import { createLogger } from '../../utils/logger.js';

class InMemoryLogger implements OtelLogger {
  public readonly records: LogRecord[] = [];
  emit(logRecord: LogRecord): void {
    this.records.push(logRecord);
  }
}

class InMemoryLoggerProvider implements LoggerProvider {
  public readonly logger = new InMemoryLogger();
  getLogger(_name: string): OtelLogger {
    return this.logger;
  }
}

test('backend logger emits OTEL LogRecords only when explicitly enabled', async () => {
  const originalEnv = {
    OTEL_ENABLED: process.env.OTEL_ENABLED,
    OTEL_LOGS_EXPORTER: process.env.OTEL_LOGS_EXPORTER,
    OTEL_SERVICE_NAME: process.env.OTEL_SERVICE_NAME,
  };

  const previousProvider = logs.getLoggerProvider();
  const provider = new InMemoryLoggerProvider();

  try {
    logs.setGlobalLoggerProvider(provider);
    context.setGlobalContextManager(new AsyncLocalStorageContextManager().enable());

    // Not enabled -> no OTEL log records.
    process.env.OTEL_ENABLED = 'false';
    delete process.env.OTEL_LOGS_EXPORTER;
    process.env.OTEL_SERVICE_NAME = 'test-backend';

    const logger = createLogger('Test');
    logger.info('hello %s', 'world');
    assert.equal(provider.logger.records.length, 0);

    // Enabled -> emits OTEL log record.
    process.env.OTEL_ENABLED = 'true';
    process.env.OTEL_LOGS_EXPORTER = 'otlp';

    // Attach an active span context without requiring an SDK tracer provider.
    const spanContext = {
      traceId: '12345678901234567890123456789012',
      spanId: '1234567890123456',
      traceFlags: 1,
    };

    const ctx = trace.setSpanContext(context.active(), spanContext as any);
    context.with(ctx, () => {
      logger.info('hello %s', 'otel');
    });

    assert.equal(provider.logger.records.length, 1);
    const record = provider.logger.records[0]!;
    assert.equal(record.severityNumber, SeverityNumber.INFO);
    assert.equal(record.severityText, 'INFO');
    assert.equal(record.body, 'hello otel');
    assert.equal((record.attributes as any)?.scope, 'Test');
    assert.equal((record.attributes as any)?.trace_id, spanContext.traceId);
    assert.equal((record.attributes as any)?.span_id, spanContext.spanId);
  } finally {
    logs.setGlobalLoggerProvider(previousProvider);
    context.disable();
    process.env.OTEL_ENABLED = originalEnv.OTEL_ENABLED;
    process.env.OTEL_LOGS_EXPORTER = originalEnv.OTEL_LOGS_EXPORTER;
    process.env.OTEL_SERVICE_NAME = originalEnv.OTEL_SERVICE_NAME;
  }
});
