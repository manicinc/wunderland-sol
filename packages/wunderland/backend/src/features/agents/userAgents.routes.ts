import { Router, type Request, type Response } from 'express';
import {
  userAgentsService,
  type UpdateUserAgentInput,
} from './userAgents.service.js';

interface AuthenticatedRequest<
  Params extends Record<string, string> = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: { id?: string } | undefined;
}

class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

const requireUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
  }
  return userId;
};

const handleError = (res: Response, error: unknown): Response => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message, error: error.code });
  }
  if (error instanceof Error) {
    const status = (() => {
      const candidate = (error as { statusCode?: unknown }).statusCode;
      return typeof candidate === 'number' ? candidate : 500;
    })();
    const code = (() => {
      const candidate = (error as { code?: unknown }).code;
      return typeof candidate === 'string' ? candidate : 'UNEXPECTED_ERROR';
    })();
    return res.status(status).json({ message: error.message, error: code });
  }
  return res.status(500).json({ message: 'Unexpected error.', error: 'UNEXPECTED_ERROR' });
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type AgentParams = { agentId: string };

type CreateAgentBody = {
  label?: string;
  slug?: string | null;
  config?: Record<string, unknown>;
};

type UpdateAgentBody = Partial<{
  label: string;
  slug: string | null;
  status: string;
  config: Record<string, unknown>;
  archived: boolean;
}>;

const router = Router();

router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireUserId(req);
    const agents = await userAgentsService.list(userId);
    res.json({ agents });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/plan/snapshot', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = requireUserId(req);
    const snapshot = await userAgentsService.getPlanSnapshot(userId);
    const { planId, limits, usage } = snapshot;
    const serialisedLimits = {
      maxActiveAgents: limits.maxActiveAgents,
      monthlyCreationAllowance: limits.monthlyCreationAllowance,
      knowledgeDocumentsPerAgent: limits.knowledgeDocumentsPerAgent,
      agencySeats: limits.agencySeats,
    };

    res.json({
      planId,
      limits: serialisedLimits,
      usage,
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.get('/:agentId', async (req: AuthenticatedRequest<AgentParams>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId } = req.params;
    const agent = await userAgentsService.get(userId, agentId);
    if (!agent) {
      res.status(404).json({ message: 'Agent not found.', error: 'AGENT_NOT_FOUND' });
      return;
    }
    res.json(agent);
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/', async (req: AuthenticatedRequest<Record<string, string>, unknown, CreateAgentBody>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const payload = req.body ?? {};

    if (typeof payload.label !== 'string' || payload.label.trim().length === 0) {
      res.status(400).json({ message: 'label is required.', error: 'INVALID_PAYLOAD' });
      return;
    }

    const config = isPlainObject(payload.config) ? payload.config : {};

    const created = await userAgentsService.create(userId, {
      label: payload.label,
      slug: typeof payload.slug === 'string' ? payload.slug : payload.slug ?? null,
      config,
    });

    res.status(201).json(created);
  } catch (error) {
    handleError(res, error);
  }
});

router.patch('/:agentId', async (req: AuthenticatedRequest<AgentParams, unknown, UpdateAgentBody>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId } = req.params;
    const payload = req.body ?? {};

    const updates: UpdateUserAgentInput = {};

    if (typeof payload.label === 'string') {
      updates.label = payload.label;
    }

    if (typeof payload.slug !== 'undefined') {
      updates.slug = payload.slug;
    }

    if (typeof payload.status === 'string') {
      updates.status = payload.status;
    }

    if (typeof payload.archived === 'boolean') {
      updates.archived = payload.archived;
    }

    if (typeof payload.config !== 'undefined') {
      if (!isPlainObject(payload.config)) {
        res.status(400).json({ message: 'config must be an object when provided.', error: 'INVALID_PAYLOAD' });
        return;
      }
      updates.config = payload.config;
    }

    const updated = await userAgentsService.update(userId, agentId, updates);
    res.json(updated);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete('/:agentId', async (req: AuthenticatedRequest<AgentParams>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId } = req.params;
    await userAgentsService.remove(userId, agentId);
    res.status(204).end();
  } catch (error) {
    handleError(res, error);
  }
});

export const userAgentsRouter: Router = router;
