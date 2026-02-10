/**
 * @file quality-check.service.spec.ts
 * @description Unit tests for QualityCheckService
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { QualityCheckService } from '../quality-check.service.js';

test('QualityCheckService', async (t) => {
  await t.test('checkDeliverable - should pass for code with sufficient content', async () => {
    process.env.JOB_QUALITY_THRESHOLD = '0.7';
    const service = new QualityCheckService();

    const deliverable = {
      type: 'code' as const,
      content: 'function test() { return "Hello World"; } // More than 50 chars',
    };

    const job = {
      id: 'job-123',
      title: 'Build a function',
      description: 'Create a test function',
      category: 'development',
    };

    const result = await service.checkDeliverable(deliverable, job);

    assert.strictEqual(result.passed, true);
    assert.ok(result.score >= 0.7);
    assert.strictEqual(result.issues.length, 0);
  });

  await t.test('checkDeliverable - should fail for code that is too short', async () => {
    process.env.JOB_QUALITY_THRESHOLD = '0.7';
    const service = new QualityCheckService();

    const deliverable = {
      type: 'code' as const,
      content: 'x=1',
    };

    const job = {
      id: 'job-123',
      title: 'Build a function',
      description: 'Create a test function',
      category: 'development',
    };

    const result = await service.checkDeliverable(deliverable, job);

    assert.strictEqual(result.passed, false);
    assert.ok(result.score < 0.7);
    assert.ok(result.issues.length > 0);
    assert.ok(result.issues[0].includes('too short'));
  });

  await t.test('checkDeliverable - should require 200+ chars for reports', async () => {
    process.env.JOB_QUALITY_THRESHOLD = '0.7';
    const service = new QualityCheckService();

    const shortReport = {
      type: 'report' as const,
      content: 'Short report',
    };

    const job = {
      id: 'job-123',
      title: 'Research',
      description: 'Do research',
      category: 'research',
    };

    const result = await service.checkDeliverable(shortReport, job);

    assert.strictEqual(result.passed, false);
    assert.ok(result.issues[0].includes('minimum: 200'));
  });

  await t.test(
    'checkDeliverable - should pass when deliverable contains job keywords',
    async () => {
      process.env.JOB_QUALITY_THRESHOLD = '0.7';
      const service = new QualityCheckService();

      const deliverable = {
        type: 'code' as const,
        content: `
        function calculateTotalPrice(items) {
          return items.reduce((sum, item) => sum + item.price, 0);
        }
      `,
      };

      const job = {
        id: 'job-123',
        title: 'Calculate total price function',
        description: 'Create a function to calculate total price from items array',
        category: 'development',
      };

      const result = await service.checkDeliverable(deliverable, job);

      assert.strictEqual(result.passed, true);
      assert.ok(result.score >= 0.7);
    }
  );

  await t.test('checkDeliverable - should respect custom threshold', async () => {
    process.env.JOB_QUALITY_THRESHOLD = '0.9';
    const service = new QualityCheckService();

    const deliverable = {
      type: 'code' as const,
      content: 'function test() { return 42; }',
    };

    const job = {
      id: 'job-123',
      title: 'test',
      description: 'test',
      category: 'development',
    };

    const result = await service.checkDeliverable(deliverable, job);

    assert.strictEqual(result.passed, false);
  });

  await t.test('checkDeliverable - should use default threshold of 0.7 when not set', async () => {
    delete process.env.JOB_QUALITY_THRESHOLD;
    const service = new QualityCheckService();

    assert.strictEqual((service as any).threshold, 0.7);
  });
});
