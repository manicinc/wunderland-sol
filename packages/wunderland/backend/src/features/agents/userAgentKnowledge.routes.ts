import { Router, type Response, type Request } from 'express';
import { userAgentKnowledgeService, type CreateKnowledgeInput } from './userAgentKnowledge.service.js';

type AgentKnowledgeListParams = { agentId: string };
type AgentKnowledgeDeleteParams = { agentId: string; knowledgeId: string };

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

const router = Router({ mergeParams: true });

const requireUserId = (req: AuthenticatedRequest): string => {
  const userId = req.user?.id;
  if (!userId) {
    throw new HttpError(401, 'AUTH_REQUIRED', 'Authentication required.');
  }
  return userId;
};

const handleError = (res: Response, error: unknown): Response => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      message: error.message,
      error: error.code,
    });
  }

  if (error instanceof Error) {
    const statusCode = (() => {
      const candidate = (error as { statusCode?: unknown }).statusCode;
      return typeof candidate === 'number' ? candidate : 500;
    })();
    const code = (() => {
      const candidate = (error as { code?: unknown }).code;
      return typeof candidate === 'string' ? candidate : 'UNEXPECTED_ERROR';
    })();
    return res.status(statusCode).json({
      message: error.message,
      error: code,
    });
  }

  return res.status(500).json({
    message: 'Unexpected error.',
    error: 'UNEXPECTED_ERROR',
  });
};

router.get('/', async (req: AuthenticatedRequest<AgentKnowledgeListParams>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId } = req.params;
    const items = await userAgentKnowledgeService.list(userId, agentId);
    res.json({ knowledge: items });
  } catch (error) {
    handleError(res, error);
  }
});

router.post('/', async (req: AuthenticatedRequest<AgentKnowledgeListParams, unknown, CreateKnowledgeInput>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId } = req.params;
    const body: CreateKnowledgeInput | undefined = req.body;

    if (!body || typeof body.type !== 'string' || typeof body.content !== 'string') {
      res.status(400).json({ message: 'type and content are required.', error: 'INVALID_PAYLOAD' });
      return;
    }

    const created = await userAgentKnowledgeService.create(userId, agentId, {
      type: body.type,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      content: body.content,
      metadata: body.metadata,
    });
    res.status(201).json(created);
  } catch (error) {
    handleError(res, error);
  }
});

router.delete('/:knowledgeId', async (req: AuthenticatedRequest<AgentKnowledgeDeleteParams>, res: Response) => {
  try {
    const userId = requireUserId(req);
    const { agentId, knowledgeId } = req.params;
    await userAgentKnowledgeService.remove(userId, agentId, knowledgeId);
    res.status(204).end();
  } catch (error) {
    handleError(res, error);
  }
});

export const userAgentKnowledgeRouter: Router = router;
