/**
 * @file logger.ts
 * @description Simple logger replacing NestJS Logger for bot services.
 */

export class BotLogger {
  constructor(private readonly context: string) {}

  log(message: string): void {
    console.log(`[${this.context}] ${message}`);
  }

  warn(message: string): void {
    console.warn(`[${this.context}] WARN: ${message}`);
  }

  error(message: string, trace?: string): void {
    console.error(`[${this.context}] ERROR: ${message}`);
    if (trace) console.error(trace);
  }
}
