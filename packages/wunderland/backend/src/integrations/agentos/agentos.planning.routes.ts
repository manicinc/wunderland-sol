/**
 * @file agentos.planning.routes.ts
 * @description Express routes for AgentOS Planning Engine API.
 * Provides endpoints for creating, managing, and executing execution plans.
 *
 * @module Backend/AgentOS/Planning
 */

import express from 'express';
import type { Request, Response, Router } from 'express';

const router: Router = express.Router();

// =============================================================================
// Types
// =============================================================================

interface PlanStep {
  stepId: string;
  description: string;
  actionType:
    | 'tool_call'
    | 'gmi_action'
    | 'human_input'
    | 'sub_plan'
    | 'reflection'
    | 'communication';
  toolId?: string;
  toolArgs?: Record<string, unknown>;
  targetGmiIdOrRole?: string;
  instructions?: string;
  dependsOn?: string[];
  estimatedCost?: { tokens?: number; usd?: number };
}

interface ExecutionPlan {
  planId: string;
  goal: string;
  steps: PlanStep[];
  dependencies: Record<string, string[]>;
  estimatedTokens?: number;
  estimatedCostUSD?: number;
  confidenceScore?: number;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'executing' | 'paused' | 'completed' | 'failed';
}

interface GeneratePlanRequest {
  goal: string;
  context?: {
    gmiId?: string;
    personaId?: string;
    availableTools?: string[];
    constraints?: string[];
    maxSteps?: number;
  };
  options?: {
    strategy?: 'react' | 'tree_of_thought' | 'reflexion';
    maxIterations?: number;
    confidenceThreshold?: number;
  };
}

// In-memory store for demo (replace with persistent storage in production)
const plans = new Map<string, ExecutionPlan>();

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /planning/plans
 * List all execution plans
 */
router.get('/plans', (req: Request, res: Response) => {
  const planList = Array.from(plans.values());

  // Apply filters
  const status = req.query.status as string | undefined;
  const limit = parseInt(req.query.limit as string) || 50;

  let filtered = planList;
  if (status) {
    filtered = filtered.filter((p) => p.status === status);
  }

  res.json({
    success: true,
    data: {
      plans: filtered.slice(0, limit),
      total: filtered.length,
    },
  });
});

/**
 * POST /planning/plans
 * Generate a new execution plan
 */
router.post('/plans', async (req: Request, res: Response) => {
  try {
    const body = req.body as GeneratePlanRequest;

    if (!body.goal) {
      res.status(400).json({
        success: false,
        error: 'Goal is required',
      });
      return;
    }

    // Generate plan ID
    const planId = `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // In production, this would call the actual PlanningEngine
    // For now, create a placeholder plan
    const plan: ExecutionPlan = {
      planId,
      goal: body.goal,
      steps: [
        {
          stepId: `${planId}-step-1`,
          description: `Analyze goal: "${body.goal}"`,
          actionType: 'reflection',
          dependsOn: [],
        },
        {
          stepId: `${planId}-step-2`,
          description: 'Gather required information',
          actionType: 'gmi_action',
          dependsOn: [`${planId}-step-1`],
        },
        {
          stepId: `${planId}-step-3`,
          description: 'Execute main task',
          actionType: 'gmi_action',
          dependsOn: [`${planId}-step-2`],
        },
        {
          stepId: `${planId}-step-4`,
          description: 'Synthesize results',
          actionType: 'reflection',
          dependsOn: [`${planId}-step-3`],
        },
      ],
      dependencies: {
        [`${planId}-step-2`]: [`${planId}-step-1`],
        [`${planId}-step-3`]: [`${planId}-step-2`],
        [`${planId}-step-4`]: [`${planId}-step-3`],
      },
      estimatedTokens: 5000,
      confidenceScore: 0.85,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };

    plans.set(planId, plan);

    res.status(201).json({
      success: true,
      data: { plan },
    });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate plan',
    });
  }
});

/**
 * GET /planning/plans/:planId
 * Get a specific plan
 */
router.get('/plans/:planId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: 'Plan not found',
    });
    return;
  }

  res.json({
    success: true,
    data: { plan },
  });
});

/**
 * POST /planning/plans/:planId/execute
 * Start executing a plan
 */
router.post('/plans/:planId/execute', async (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: 'Plan not found',
    });
    return;
  }

  if (plan.status === 'executing') {
    res.status(400).json({
      success: false,
      error: 'Plan is already executing',
    });
    return;
  }

  // Update status
  plan.status = 'executing';
  plan.updatedAt = new Date().toISOString();
  plans.set(plan.planId, plan);

  res.json({
    success: true,
    data: {
      planId: plan.planId,
      status: plan.status,
      message: 'Plan execution started',
    },
  });
});

/**
 * POST /planning/plans/:planId/pause
 * Pause a running plan
 */
router.post('/plans/:planId/pause', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: 'Plan not found',
    });
    return;
  }

  if (plan.status !== 'executing') {
    res.status(400).json({
      success: false,
      error: 'Plan is not executing',
    });
    return;
  }

  plan.status = 'paused';
  plan.updatedAt = new Date().toISOString();
  plans.set(plan.planId, plan);

  res.json({
    success: true,
    data: {
      planId: plan.planId,
      status: plan.status,
    },
  });
});

/**
 * POST /planning/plans/:planId/refine
 * Refine a plan based on feedback
 */
router.post('/plans/:planId/refine', async (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: 'Plan not found',
    });
    return;
  }

  const { feedback, stepId } = req.body;

  if (!feedback) {
    res.status(400).json({
      success: false,
      error: 'Feedback is required',
    });
    return;
  }

  // In production, this would call PlanningEngine.refinePlan()
  // For now, just update the timestamp
  plan.updatedAt = new Date().toISOString();
  plans.set(plan.planId, plan);

  res.json({
    success: true,
    data: {
      plan,
      message: 'Plan refinement queued',
    },
  });
});

/**
 * DELETE /planning/plans/:planId
 * Delete a plan
 */
router.delete('/plans/:planId', (req: Request, res: Response) => {
  const plan = plans.get(req.params.planId);

  if (!plan) {
    res.status(404).json({
      success: false,
      error: 'Plan not found',
    });
    return;
  }

  if (plan.status === 'executing') {
    res.status(400).json({
      success: false,
      error: 'Cannot delete executing plan. Pause it first.',
    });
    return;
  }

  plans.delete(req.params.planId);

  res.json({
    success: true,
    data: { message: 'Plan deleted' },
  });
});

/**
 * GET /planning/stats
 * Get planning statistics
 */
router.get('/stats', (req: Request, res: Response) => {
  const planList = Array.from(plans.values());

  res.json({
    success: true,
    data: {
      total: planList.length,
      byStatus: {
        draft: planList.filter((p) => p.status === 'draft').length,
        executing: planList.filter((p) => p.status === 'executing').length,
        paused: planList.filter((p) => p.status === 'paused').length,
        completed: planList.filter((p) => p.status === 'completed').length,
        failed: planList.filter((p) => p.status === 'failed').length,
      },
      avgConfidence:
        planList.length > 0
          ? planList.reduce((sum, p) => sum + (p.confidenceScore || 0), 0) / planList.length
          : 0,
      avgSteps:
        planList.length > 0
          ? planList.reduce((sum, p) => sum + p.steps.length, 0) / planList.length
          : 0,
    },
  });
});

export default router;
