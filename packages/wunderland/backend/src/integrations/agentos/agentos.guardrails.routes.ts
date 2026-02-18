import { Router, type Request, type Response } from 'express';
import { listGuardrails, invalidateGuardrailsCache } from './guardrails.service.js';

const router: Router = Router();

/**
 * List available guardrails from the local registry.
 * @route GET /api/agentos/guardrails
 */
router.get('/guardrails', async (_req: Request, res: Response) => {
	try {
		const rails = await listGuardrails();
		res.json(rails);
	} catch (error: any) {
		console.error('Error fetching guardrails:', error);
		res.status(500).json({ error: error.message });
	}
});

/**
 * Invalidate guardrails registry cache (dev convenience).
 * @route POST /api/agentos/guardrails/reload
 */
router.post('/guardrails/reload', async (_req: Request, res: Response) => {
	try {
		invalidateGuardrailsCache();
		res.json({ success: true, message: 'Guardrails cache invalidated' });
	} catch (error: any) {
		console.error('Error reloading guardrails:', error);
		res.status(500).json({ error: error.message });
	}
});

export default router;


