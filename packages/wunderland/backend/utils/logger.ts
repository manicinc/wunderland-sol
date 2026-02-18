import pino, { type Logger as PinoLogger } from 'pino';
import { format } from 'node:util';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMethod = (...args: unknown[]) => void;

export interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  child(scopeExtension: string): Logger;
}

function parseBooleanEnv(value: string | undefined): boolean {
  const raw = (value ?? '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

function isOtelEnabled(): boolean {
  return parseBooleanEnv(process.env['OTEL_ENABLED']);
}

function isOtelLogsExporterEnabled(): boolean {
  const raw = (process.env['OTEL_LOGS_EXPORTER'] ?? '').trim().toLowerCase();
  if (!raw) return false; // require explicit opt-in
  if (raw === 'none') return false;
  return true;
}

function shouldEmitOtelLogRecords(): boolean {
  return isOtelEnabled() && isOtelLogsExporterEnabled();
}

function getActiveTraceIds(): { trace_id: string; span_id: string } | null {
  const span = trace.getSpan(context.active());
  if (!span) return null;
  try {
    const spanContext = span.spanContext();
    return { trace_id: spanContext.traceId, span_id: spanContext.spanId };
  } catch {
    return null;
  }
}

function severityForLevel(level: LogLevel): {
  severityNumber: SeverityNumber;
  severityText: string;
} {
  if (level === 'debug') return { severityNumber: SeverityNumber.DEBUG, severityText: 'DEBUG' };
  if (level === 'info') return { severityNumber: SeverityNumber.INFO, severityText: 'INFO' };
  if (level === 'warn') return { severityNumber: SeverityNumber.WARN, severityText: 'WARN' };
  return { severityNumber: SeverityNumber.ERROR, severityText: 'ERROR' };
}

function pickError(args: unknown[]): Error | null {
  for (const arg of args) {
    if (arg instanceof Error) return arg;
  }
  return null;
}

function sanitizeAttributes(
  input: Record<string, unknown> | undefined
): Record<string, any> | undefined {
  if (!input) return undefined;
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      const allPrimitive = value.every(
        (item) => typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean'
      );
      if (allPrimitive) out[key] = value;
    }
  }
  return out;
}

function emitOtelLog(
  level: LogLevel,
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldEmitOtelLogRecords()) return;

  const { severityNumber, severityText } = severityForLevel(level);
  const err = meta?.['err'] instanceof Error ? (meta['err'] as Error) : null;
  const traceIds = getActiveTraceIds();

  const attributes: Record<string, unknown> = {
    scope,
    ...meta,
    ...traceIds,
  };

  if (err) {
    attributes['exception.type'] = err.name;
    attributes['exception.message'] = err.message;
    attributes['exception.stacktrace'] = err.stack;
  }

  try {
    const loggerName = (process.env['OTEL_SERVICE_NAME'] ?? 'voice-chat-assistant-backend').trim();
    const otelLogger = logs.getLogger(loggerName);
    otelLogger.emit({
      timestamp: Date.now(),
      severityNumber,
      severityText,
      body: message,
      attributes: sanitizeAttributes(attributes),
      context: context.active(),
    });
  } catch {
    // Never throw from logging paths.
  }
}

function normalizeMeta(
  meta: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!meta) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseLogArgs(args: unknown[]): { message: string; meta?: Record<string, unknown> } {
  if (args.length === 0) return { message: '' };

  const first = args[0];
  const second = args.length > 1 ? args[1] : undefined;

  // Support pino-style `{ meta }, 'msg %s', ...` while still allowing console-style formatting.
  const looksLikeMeta =
    typeof first === 'object' &&
    first !== null &&
    !(first instanceof Error) &&
    !Array.isArray(first) &&
    !(first instanceof Date);

  if (looksLikeMeta && typeof second === 'string') {
    return { meta: first as Record<string, unknown>, message: format(second, ...args.slice(2)) };
  }

  return { message: format(...args) };
}

const rootPino: PinoLogger = pino({
  level: (process.env['LOG_LEVEL'] ?? 'info').trim() || 'info',
});

class ScopedLogger implements Logger {
  private readonly pino: PinoLogger;
  private readonly scope: string;

  constructor(scope: string, parent?: PinoLogger) {
    this.scope = scope;
    this.pino = (parent ?? rootPino).child({ scope });
  }

  private log(level: LogLevel, args: unknown[]): void {
    const { meta: rawMeta, message } = parseLogArgs(args);
    const err = pickError(args);
    const traceIds = isOtelEnabled() ? getActiveTraceIds() : null;

    const meta: Record<string, unknown> = {
      ...(rawMeta ?? {}),
      ...(traceIds ?? {}),
      ...(err ? { err } : {}),
    };
    const finalMeta = normalizeMeta(meta);

    try {
      if (finalMeta) {
        if (level === 'debug') this.pino.debug(finalMeta as any, message);
        else if (level === 'info') this.pino.info(finalMeta as any, message);
        else if (level === 'warn') this.pino.warn(finalMeta as any, message);
        else this.pino.error(finalMeta as any, message);
      } else {
        if (level === 'debug') this.pino.debug(message);
        else if (level === 'info') this.pino.info(message);
        else if (level === 'warn') this.pino.warn(message);
        else this.pino.error(message);
      }
    } catch {
      // ignore
    }

    emitOtelLog(level, this.scope, message, finalMeta);
  }

  debug(...args: unknown[]): void {
    this.log('debug', args);
  }

  info(...args: unknown[]): void {
    this.log('info', args);
  }

  warn(...args: unknown[]): void {
    this.log('warn', args);
  }

  error(...args: unknown[]): void {
    this.log('error', args);
  }

  child(scopeExtension: string): Logger {
    return new ScopedLogger(`${this.scope}.${scopeExtension}`, this.pino);
  }
}

export const createLogger = (scope: string): Logger => new ScopedLogger(scope);

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
};
