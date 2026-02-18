/* eslint-disable no-console */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogMethod = (...args: unknown[]) => void;

export interface Logger {
  debug: LogMethod;
  info: LogMethod;
  warn: LogMethod;
  error: LogMethod;
  child(scopeExtension: string): Logger;
}

const formatArgs = (scope: string, args: unknown[]): unknown[] => {
  if (args.length === 0) {
    return [`[${scope}]`];
  }

  const [first, ...rest] = args;

  if (typeof first === 'string') {
    return [`[${scope}] ${first}`, ...rest];
  }

  return [`[${scope}]`, first, ...rest];
};

const createConsoleMethod = (level: LogLevel, scope: string): LogMethod => (...args: unknown[]) => {
  const consoleMethod = console[level] ?? console.log;
  consoleMethod(...formatArgs(scope, args));
};

const buildLogger = (scope: string): Logger => ({
  debug: createConsoleMethod('debug', scope),
  info: createConsoleMethod('info', scope),
  warn: createConsoleMethod('warn', scope),
  error: createConsoleMethod('error', scope),
  child: (scopeExtension: string): Logger => buildLogger(`${scope}.${scopeExtension}`),
});

export const createLogger = (scope: string): Logger => buildLogger(scope);

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
