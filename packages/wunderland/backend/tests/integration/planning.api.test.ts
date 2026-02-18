/**
 * @file planning.api.test.ts
 * @description Integration tests for the Planning Engine API endpoints.
 *
 * Tests cover:
 * - Plan listing and retrieval
 * - Plan generation from goals
 * - Plan execution, pausing, and refinement
 * - Plan deletion
 * - Statistics endpoint
 *
 * @module Backend/Tests/Integration/Planning
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from '../helpers/testApp.js';

describe('Planning API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  // Track plans created during tests for cleanup
  const createdPlanIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    // Get auth token for authenticated requests
    const authResponse = await request(app)
      .post('/api/auth/global')
      .send({ password: process.env.GLOBAL_ACCESS_PASSWORD || 'test-password' });
    authToken = authResponse.body.token || 'test-token';
  });

  afterAll(async () => {
    // Cleanup created plans
    for (const planId of createdPlanIds) {
      try {
        await request(app)
          .delete(`/api/agentos/planning/plans/${planId}`)
          .set('Authorization', `Bearer ${authToken}`);
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  describe('GET /api/agentos/planning/plans', () => {
    it('should return empty list when no plans exist', async () => {
      const response = await request(app)
        .get('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBe(true);
    });

    it('should support status filter', async () => {
      const response = await request(app)
        .get('/api/agentos/planning/plans')
        .query({ status: 'draft' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      // All returned plans should have status 'draft'
      response.body.plans.forEach((plan: any) => {
        if (plan.status) {
          expect(plan.status).toBe('draft');
        }
      });
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/agentos/planning/plans')
        .query({ limit: 5 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.plans.length).toBeLessThanOrEqual(5);
    });
  });

  describe('POST /api/agentos/planning/plans', () => {
    it('should generate a plan from a goal', async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          goal: 'Research and summarize the latest AI trends',
          context: { userId: 'test-user' },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('plan');
      expect(response.body.plan).toHaveProperty('planId');
      expect(response.body.plan).toHaveProperty(
        'goal',
        'Research and summarize the latest AI trends'
      );
      expect(response.body.plan).toHaveProperty('steps');
      expect(Array.isArray(response.body.plan.steps)).toBe(true);
      expect(response.body.plan.steps.length).toBeGreaterThan(0);

      // Track for cleanup
      createdPlanIds.push(response.body.plan.planId);
    });

    it('should fail without a goal', async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('should respect maxSteps constraint', async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          goal: 'Simple task',
          maxSteps: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.plan.steps.length).toBeLessThanOrEqual(3);

      createdPlanIds.push(response.body.plan.planId);
    });
  });

  describe('GET /api/agentos/planning/plans/:planId', () => {
    let testPlanId: string;

    beforeEach(async () => {
      // Create a test plan
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ goal: 'Test plan for retrieval' });

      testPlanId = response.body.plan.planId;
      createdPlanIds.push(testPlanId);
    });

    it('should retrieve a specific plan', async () => {
      const response = await request(app)
        .get(`/api/agentos/planning/plans/${testPlanId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.plan).toHaveProperty('planId', testPlanId);
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .get('/api/agentos/planning/plans/non-existent-plan-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/agentos/planning/plans/:planId/execute', () => {
    let testPlanId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ goal: 'Test plan for execution' });

      testPlanId = response.body.plan.planId;
      createdPlanIds.push(testPlanId);
    });

    it('should start plan execution', async () => {
      const response = await request(app)
        .post(`/api/agentos/planning/plans/${testPlanId}/execute`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.plan).toHaveProperty('status', 'executing');
    });

    it('should fail for non-existent plan', async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans/non-existent/execute')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/agentos/planning/plans/:planId/pause', () => {
    let testPlanId: string;

    beforeEach(async () => {
      // Create and start a plan
      const createResponse = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ goal: 'Test plan for pausing' });

      testPlanId = createResponse.body.plan.planId;
      createdPlanIds.push(testPlanId);

      await request(app)
        .post(`/api/agentos/planning/plans/${testPlanId}/execute`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('should pause an executing plan', async () => {
      const response = await request(app)
        .post(`/api/agentos/planning/plans/${testPlanId}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.plan).toHaveProperty('status', 'paused');
    });
  });

  describe('POST /api/agentos/planning/plans/:planId/refine', () => {
    let testPlanId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ goal: 'Test plan for refinement' });

      testPlanId = response.body.plan.planId;
      createdPlanIds.push(testPlanId);
    });

    it('should refine a plan with feedback', async () => {
      const response = await request(app)
        .post(`/api/agentos/planning/plans/${testPlanId}/refine`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          feedback: 'Add more detailed steps for research phase',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('plan');
    });

    it('should fail without feedback', async () => {
      const response = await request(app)
        .post(`/api/agentos/planning/plans/${testPlanId}/refine`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/agentos/planning/plans/:planId', () => {
    it('should delete an existing plan', async () => {
      // Create a plan to delete
      const createResponse = await request(app)
        .post('/api/agentos/planning/plans')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ goal: 'Test plan for deletion' });

      const planId = createResponse.body.plan.planId;

      const deleteResponse = await request(app)
        .delete(`/api/agentos/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body).toHaveProperty('success', true);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/agentos/planning/plans/${planId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .delete('/api/agentos/planning/plans/non-existent-plan')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/agentos/planning/stats', () => {
    it('should return planning statistics', async () => {
      const response = await request(app)
        .get('/api/agentos/planning/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('stats');
      expect(response.body.stats).toHaveProperty('totalPlans');
      expect(response.body.stats).toHaveProperty('byStatus');
      expect(typeof response.body.stats.totalPlans).toBe('number');
    });
  });
});
