import { Router, type Request, type Response, type NextFunction } from 'express';
import { agentBundlesService, type AgentBundlePayload } from './agentBundles.service.js';

interface AuthenticatedRequest<
  Params extends Record<string, string> = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
> extends Request<Params, ResBody, ReqBody, ReqQuery> {
  user?: { id?: string } | undefined;
}

export const agentBundlesRouter: Router = Router();

agentBundlesRouter.post(
  '/import',
  async (
    req: AuthenticatedRequest<
      Record<string, string>,
      { submissionId: string },
      AgentBundlePayload & { userId?: string }
    >,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const payload = req.body ?? ({} as AgentBundlePayload & { userId?: string });
      const userId = req.user?.id ?? payload.userId;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }

      const submission = await agentBundlesService.importBundle(userId, payload);
      return res.status(202).json(submission);
    } catch (error) {
      next(error);
    }
  },
);

agentBundlesRouter.get(
  '/:agentId/export',
  async (
    req: AuthenticatedRequest<{ agentId: string }, { bundle: unknown }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }
      const bundle = await agentBundlesService.exportBundle(userId, req.params.agentId);
      return res.status(200).json({ bundle });
    } catch (error) {
      next(error);
    }
  },
);

agentBundlesRouter.patch(
  '/submissions/:submissionId',
  async (
    req: AuthenticatedRequest<{ submissionId: string }, { status: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }
      const { status, notes } = req.body as { status?: string; notes?: string };
      if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
        return res.status(400).json({ message: 'status must be approved, rejected, or pending.' });
      }
      await agentBundlesService.reviewSubmission(
        req.params.submissionId,
        status as 'approved' | 'rejected' | 'pending',
        userId,
        { notes: notes ?? null },
      );
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
);

agentBundlesRouter.get(
  '/submissions',
  async (
    req: AuthenticatedRequest<Record<string, string>, { submissions: unknown }>,
    res: Response,
    next: NextFunction,
  ): Promise<Response | void> => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Authentication required.' });
      }
      const status =
        typeof req.query.status === 'string' && ['approved', 'pending', 'rejected'].includes(req.query.status)
          ? (req.query.status as 'approved' | 'pending' | 'rejected')
          : undefined;
      const submissions = await agentBundlesService.listSubmissions(status);
      return res.json({ submissions });
    } catch (error) {
      next(error);
    }
  },
);
