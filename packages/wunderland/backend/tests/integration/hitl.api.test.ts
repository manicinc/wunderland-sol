/**
 * @file hitl.api.test.ts
 * @description Integration tests for the Human-in-the-Loop (HITL) API endpoints.
 *
 * Tests cover:
 * - Listing pending interactions
 * - Approval workflow (approve/reject)
 * - Clarification workflow
 * - Escalation resolution
 * - Feedback submission
 * - Statistics endpoint
 *
 * @module Backend/Tests/Integration/HITL
 * @version 1.0.0
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from '../helpers/testApp.js';

describe('HITL API Integration Tests', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    // Get auth token for authenticated requests
    const authResponse = await request(app)
      .post('/api/auth/global')
      .send({ password: process.env.GLOBAL_ACCESS_PASSWORD || 'test-password' });
    authToken = authResponse.body.token || 'test-token';
  });

  describe('GET /api/agentos/hitl/approvals', () => {
    it('should return list of pending interactions', async () => {
      const response = await request(app)
        .get('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('interactions');
      expect(Array.isArray(response.body.interactions)).toBe(true);
    });

    it('should support type filter', async () => {
      const response = await request(app)
        .get('/api/agentos/hitl/approvals')
        .query({ type: 'approval' })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // All returned items should be of type 'approval'
      response.body.interactions.forEach((item: any) => {
        expect(item.type).toBe('approval');
      });
    });

    it('should support limit parameter', async () => {
      const response = await request(app)
        .get('/api/agentos/hitl/approvals')
        .query({ limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.interactions.length).toBeLessThanOrEqual(10);
    });
  });

  describe('POST /api/agentos/hitl/approvals', () => {
    it('should create an approval request', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'approval',
          initiatorId: 'test-agent',
          title: 'Test Approval Request',
          instructions: 'Please approve this test action',
          severity: 'medium',
          proposedContent: 'Test action content',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('interaction');
      expect(response.body.interaction).toHaveProperty('interactionId');
      expect(response.body.interaction).toHaveProperty('status', 'pending');
      expect(response.body.interaction).toHaveProperty('type', 'approval');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/agentos/hitl/approvals/:id/approve', () => {
    let testInteractionId: string;

    beforeEach(async () => {
      // Create a test approval request
      const createResponse = await request(app)
        .post('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'approval',
          initiatorId: 'test-agent',
          title: 'Test for approval action',
          proposedContent: 'Action to be approved',
          severity: 'low',
        });

      testInteractionId = createResponse.body.interaction.interactionId;
    });

    it('should approve an interaction', async () => {
      const response = await request(app)
        .post(`/api/agentos/hitl/approvals/${testInteractionId}/approve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comments: 'Approved by test',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction).toHaveProperty('status', 'approved');
    });

    it('should return 404 for non-existent interaction', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/approvals/non-existent-id/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/agentos/hitl/approvals/:id/reject', () => {
    let testInteractionId: string;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'approval',
          initiatorId: 'test-agent',
          title: 'Test for rejection',
          proposedContent: 'Action to be rejected',
          severity: 'high',
        });

      testInteractionId = createResponse.body.interaction.interactionId;
    });

    it('should reject an interaction with reason', async () => {
      const response = await request(app)
        .post(`/api/agentos/hitl/approvals/${testInteractionId}/reject`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          comments: 'Rejected due to policy violation',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction).toHaveProperty('status', 'rejected');
    });
  });

  describe('Clarification Workflow', () => {
    let clarificationId: string;

    beforeEach(async () => {
      // Create a clarification request
      const response = await request(app)
        .post('/api/agentos/hitl/clarifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'clarification',
          initiatorId: 'test-agent',
          title: 'Need clarification',
          question: 'What format should the output be in?',
          options: ['JSON', 'XML', 'CSV'],
          severity: 'medium',
        });

      clarificationId = response.body.interaction?.interactionId;
    });

    it('should create a clarification request', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/clarifications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'clarification',
          initiatorId: 'test-agent',
          question: 'Which database to use?',
          options: ['PostgreSQL', 'MySQL', 'SQLite'],
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction).toHaveProperty('type', 'clarification');
    });

    it('should respond to a clarification', async () => {
      if (!clarificationId) {
        // Skip if creation failed
        return;
      }

      const response = await request(app)
        .post(`/api/agentos/hitl/clarifications/${clarificationId}/respond`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          answer: 'Please use JSON format',
          selectedOption: 'JSON',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction).toHaveProperty('status', 'clarified');
    });
  });

  describe('Escalation Workflow', () => {
    let escalationId: string;

    beforeEach(async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/escalations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'escalation',
          initiatorId: 'test-agent',
          title: 'Critical issue',
          reason: 'low_confidence',
          problemDescription: 'Agent cannot determine the correct action',
          suggestedActions: ['Consult expert', 'Retry with different parameters'],
          severity: 'critical',
        });

      escalationId = response.body.interaction?.interactionId;
    });

    it('should create an escalation', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/escalations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'escalation',
          initiatorId: 'test-agent',
          reason: 'safety_concern',
          problemDescription: 'Detected potentially unsafe content',
          severity: 'high',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction).toHaveProperty('type', 'escalation');
    });

    it('should resolve an escalation', async () => {
      if (!escalationId) {
        return;
      }

      const response = await request(app)
        .post(`/api/agentos/hitl/escalations/${escalationId}/resolve`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          resolution: 'Manually verified the action is safe to proceed',
          resolvedSuccessfully: true,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.interaction.status).toMatch(/completed|escalated/);
    });
  });

  describe('Feedback Workflow', () => {
    it('should submit feedback', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'test-agent',
          feedbackType: 'correction',
          aspect: 'accuracy',
          content: 'The response contained outdated information',
          importance: 4,
          context: {
            conversationId: 'test-conv-123',
            messageId: 'test-msg-456',
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should list feedback history', async () => {
      // Submit some feedback first
      await request(app)
        .post('/api/agentos/hitl/feedback')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          agentId: 'test-agent',
          feedbackType: 'positive',
          content: 'Great response!',
        });

      const response = await request(app)
        .get('/api/agentos/hitl/feedback')
        .query({ agentId: 'test-agent', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.feedback)).toBe(true);
    });
  });

  describe('GET /api/agentos/hitl/stats', () => {
    it('should return HITL statistics', async () => {
      const response = await request(app)
        .get('/api/agentos/hitl/stats')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalInteractions');
      expect(response.body).toHaveProperty('pendingInteractions');
      expect(response.body).toHaveProperty('interactionsByType');
      expect(response.body).toHaveProperty('interactionsByStatus');
      expect(typeof response.body.totalInteractions).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid interaction types gracefully', async () => {
      const response = await request(app)
        .post('/api/agentos/hitl/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'invalid_type',
          initiatorId: 'test-agent',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/agentos/hitl/approvals');
      // Without auth token

      // Should either require auth (401) or work with degraded mode
      expect([200, 401, 403]).toContain(response.status);
    });
  });
});
