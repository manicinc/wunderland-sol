/**
 * AnonymizationPolicy Tests
 *
 * Tests for PII detection, redaction, risk scoring, and task redaction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  AnonymizationPolicy,
  TaskRedactor,
  PII_PATTERNS,
  REDACTION_TOKENS,
  createAnonymizationPolicy,
  createTaskRedactor,
} from '../pii/AnonymizationPolicy';
import { DEFAULT_PII_POLICY } from '../admin/types';
import type { TaskQueueItem } from '../admin/types';

describe('AnonymizationPolicy', () => {
  // --------------------------------------------------------------------------
  // PII Pattern Tests
  // --------------------------------------------------------------------------

  describe('PII Patterns', () => {
    it('should detect email addresses', () => {
      const text = 'Contact me at john.doe@example.com or jane@company.org';
      const matches = text.match(PII_PATTERNS.email);
      expect(matches).toHaveLength(2);
      expect(matches).toContain('john.doe@example.com');
      expect(matches).toContain('jane@company.org');
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at 555-123-4567 or (123) 456-7890';
      const matches = text.match(PII_PATTERNS.phone);
      expect(matches).toHaveLength(2);
    });

    it('should detect SSN patterns', () => {
      const text = 'My SSN is 123-45-6789 and hers is 987.65.4321';
      const matches = text.match(PII_PATTERNS.ssn);
      expect(matches).toHaveLength(2);
    });

    it('should detect credit card numbers', () => {
      const text = 'Visa: 4111111111111111 Mastercard: 5500000000000004';
      const matches = text.match(PII_PATTERNS.creditCard);
      expect(matches).toHaveLength(2);
    });
  });

  // --------------------------------------------------------------------------
  // Redaction Tests
  // --------------------------------------------------------------------------

  describe('Redaction', () => {
    let policy: AnonymizationPolicy;

    beforeEach(() => {
      policy = new AnonymizationPolicy();
    });

    it('should redact emails when policy enabled', () => {
      const result = policy.redact('Email me at test@example.com please');

      expect(result.redacted).toContain(REDACTION_TOKENS.email);
      expect(result.redacted).not.toContain('test@example.com');
      expect(result.piiDetected).toBe(true);
      expect(result.detections).toHaveLength(1);
      expect(result.detections[0].type).toBe('email');
      expect(result.detections[0].count).toBe(1);
    });

    it('should redact phone numbers', () => {
      const result = policy.redact('Call 555-123-4567 for support');

      expect(result.redacted).toContain(REDACTION_TOKENS.phone);
      expect(result.redacted).not.toContain('555-123-4567');
    });

    it('should redact SSN', () => {
      const result = policy.redact('SSN: 123-45-6789');

      expect(result.redacted).toContain(REDACTION_TOKENS.ssn);
      expect(result.redacted).not.toContain('123-45-6789');
    });

    it('should redact credit cards', () => {
      const result = policy.redact('Card: 4111111111111111', { redactFinancials: true });

      expect(result.redacted).toContain(REDACTION_TOKENS.creditCard);
    });

    it('should redact multiple PII types in same text', () => {
      const result = policy.redact('Contact John Doe at john@example.com or 555-123-4567');

      expect(result.piiDetected).toBe(true);
      expect(result.detections.length).toBeGreaterThan(1);
      expect(result.redacted).not.toContain('john@example.com');
      expect(result.redacted).not.toContain('555-123-4567');
    });

    it('should respect policy settings', () => {
      const result = policy.redact('Email: test@example.com', {
        redactEmails: false,
      });

      // Email should NOT be redacted when policy disables it
      expect(result.redacted).toContain('test@example.com');
    });

    it('should apply custom regex patterns', () => {
      const result = policy.redact('Order ID: ORD-12345-ABC', {
        redactCustomPatterns: ['ORD-\\d+-[A-Z]+'],
      });

      expect(result.redacted).toContain(REDACTION_TOKENS.custom);
      expect(result.redacted).not.toContain('ORD-12345-ABC');
    });

    it('should return original text when no PII found', () => {
      const text = 'Hello world, this is a safe message';
      const result = policy.redact(text);

      expect(result.redacted).toBe(text);
      expect(result.piiDetected).toBe(false);
      expect(result.detections).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Risk Scoring Tests
  // --------------------------------------------------------------------------

  describe('Risk Scoring', () => {
    let policy: AnonymizationPolicy;

    beforeEach(() => {
      policy = new AnonymizationPolicy();
    });

    it('should return 0 for text without PII', () => {
      const score = policy.calculateRiskScore('Hello world');
      expect(score).toBe(0);
    });

    it('should score SSN as highest risk', () => {
      const ssnScore = policy.calculateRiskScore('SSN: 123-45-6789');
      const emailScore = policy.calculateRiskScore('Email: test@example.com');

      expect(ssnScore).toBeGreaterThan(emailScore);
    });

    it('should accumulate score for multiple PII instances', () => {
      const singleEmail = policy.calculateRiskScore('Email: a@b.com');
      const multipleEmails = policy.calculateRiskScore('Emails: a@b.com, c@d.com, e@f.com');

      expect(multipleEmails).toBeGreaterThan(singleEmail);
    });

    it('should cap score at 100', () => {
      const text =
        'SSN: 111-22-3333, 444-55-6666, 777-88-9999, ' +
        'Cards: 4111111111111111, 5500000000000004, ' +
        'Emails: a@b.com, c@d.com, e@f.com, g@h.com';

      const score = policy.calculateRiskScore(text);
      expect(score).toBe(100);
    });
  });

  // --------------------------------------------------------------------------
  // Scan Tests
  // --------------------------------------------------------------------------

  describe('Scan (Non-Destructive)', () => {
    let policy: AnonymizationPolicy;

    beforeEach(() => {
      policy = new AnonymizationPolicy();
    });

    it('should detect PII types without modifying text', () => {
      const result = policy.scan('Contact john@example.com or call 555-123-4567');

      expect(result.piiDetected).toBe(true);
      expect(result.types).toContain('email');
      expect(result.types).toContain('phone');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should return empty types for clean text', () => {
      const result = policy.scan('Just a normal message');

      expect(result.piiDetected).toBe(false);
      expect(result.types).toHaveLength(0);
      expect(result.riskScore).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Factory Functions
  // --------------------------------------------------------------------------

  describe('Factory Functions', () => {
    it('should create policy with defaults', () => {
      const policy = createAnonymizationPolicy();
      expect(policy).toBeInstanceOf(AnonymizationPolicy);
    });

    it('should create policy with custom settings', () => {
      const policy = createAnonymizationPolicy({
        redactEmails: false,
        redactNames: false,
      });

      const result = policy.redact('Email: test@example.com');
      expect(result.redacted).toContain('test@example.com');
    });
  });
});

describe('TaskRedactor', () => {
  let redactor: TaskRedactor;

  const createMockTask = (overrides: Partial<TaskQueueItem> = {}): TaskQueueItem => ({
    id: 'task_1',
    clientId: 'client_1',
    organizationId: 'org_1',
    title: 'Test Task',
    description: 'Contact john@example.com at 555-123-4567',
    status: 'pending',
    priority: 'normal',
    piiRedactionLevel: 'partial',
    estimatedHours: 2,
    createdBy: 'user_1',
    createdAt: new Date(),
    updatedAt: new Date(),
    statusHistory: [],
    ...overrides,
  });

  beforeEach(() => {
    redactor = new TaskRedactor();
  });

  describe('Task Redaction', () => {
    it('should redact PII from task description', () => {
      const task = createMockTask();
      const redacted = redactor.redactTask(task);

      expect(redacted.redactedDescription).toBeDefined();
      expect(redacted.redactedDescription).not.toContain('john@example.com');
      expect(redacted.redactedDescription).not.toContain('555-123-4567');
      expect(redacted.riskScore).toBeGreaterThan(0);
    });

    it('should skip redaction when level is none', () => {
      const task = createMockTask({ piiRedactionLevel: 'none' });
      const redacted = redactor.redactTask(task);

      expect(redacted.redactedDescription).toBeUndefined();
      expect(redacted.description).toContain('john@example.com');
    });

    it('should apply org-level policy overrides', () => {
      const task = createMockTask();
      const redacted = redactor.redactTask(task, { redactEmails: false });

      // Email should still be present when org disables email redaction
      expect(redacted.redactedDescription).toContain('john@example.com');
      expect(redacted.redactedDescription).not.toContain('555-123-4567');
    });
  });

  describe('Batch Redaction', () => {
    it('should redact multiple tasks', () => {
      const tasks = [
        createMockTask({ id: 'task_1' }),
        createMockTask({ id: 'task_2' }),
        createMockTask({ id: 'task_3', piiRedactionLevel: 'none' }),
      ];

      const redacted = redactor.redactTasks(tasks);

      expect(redacted).toHaveLength(3);
      expect(redacted[0].redactedDescription).toBeDefined();
      expect(redacted[1].redactedDescription).toBeDefined();
      expect(redacted[2].redactedDescription).toBeUndefined(); // None level
    });
  });

  describe('Task Scanning', () => {
    it('should scan task for PII without modifying', () => {
      const task = createMockTask();
      const result = redactor.scanTask(task);

      expect(result.piiDetected).toBe(true);
      expect(result.types).toContain('email');
      expect(result.types).toContain('phone');
    });
  });

  describe('Redaction Level Recommendation', () => {
    it('should recommend full redaction for high-risk content', () => {
      const task = createMockTask({
        description: 'SSN: 123-45-6789 Card: 4111111111111111',
      });

      const level = redactor.recommendRedactionLevel(task);
      expect(level).toBe('full');
    });

    it('should recommend partial for medium-risk content', () => {
      const task = createMockTask({
        description: 'Email: test@example.com',
      });

      const level = redactor.recommendRedactionLevel(task);
      expect(level).toBe('partial');
    });

    it('should recommend none for clean content', () => {
      const task = createMockTask({
        description: 'Just a simple task description',
      });

      const level = redactor.recommendRedactionLevel(task);
      expect(level).toBe('none');
    });
  });

  describe('Factory Functions', () => {
    it('should create redactor with default policy', () => {
      const r = createTaskRedactor();
      expect(r).toBeInstanceOf(TaskRedactor);
    });

    it('should create redactor with custom policy', () => {
      const policy = createAnonymizationPolicy({ redactEmails: false });
      const r = createTaskRedactor(policy);

      const task = createMockTask();
      const redacted = r.redactTask(task);

      expect(redacted.redactedDescription).toContain('john@example.com');
    });
  });
});
