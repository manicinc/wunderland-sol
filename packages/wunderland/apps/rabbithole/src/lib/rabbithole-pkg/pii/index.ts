/**
 * @fileoverview PII Redaction module exports
 * @module @framers/rabbithole/pii
 */

// Types and interfaces
export * from './IPIIRedactor.js';

// Middleware
export { PIIRedactionMiddleware } from './PIIRedactionMiddleware.js';
export type { RedactionContext } from './PIIRedactionMiddleware.js';

// Vault
export * from './vault/index.js';

// Anonymization Policy
export {
  PII_PATTERNS,
  REDACTION_TOKENS,
  AnonymizationPolicy,
  TaskRedactor,
  createAnonymizationPolicy,
  createTaskRedactor,
} from './AnonymizationPolicy.js';
export type { RedactionResult, RedactionDetection } from './AnonymizationPolicy.js';
