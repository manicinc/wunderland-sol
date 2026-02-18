/**
 * Extension management routes for AgentOS
 */

import { Router, Request, Response } from 'express';
import {
  listExtensions,
  listAvailableTools,
  invalidateRegistryCache,
} from './extensions.service.js';
import { agentosService } from './agentos.integration.js';

const router: Router = Router();

/**
 * List all available extensions from the local registry.
 * @route GET /api/agentos/extensions
 */
router.get('/extensions', async (req: Request, res: Response) => {
  try {
    const exts = await listExtensions();
    return res.json(exts);
  } catch (error: any) {
    console.error('Error fetching extensions:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * List all available tools derived from the extensions registry.
 * @route GET /api/agentos/extensions/tools
 */
router.get('/extensions/tools', async (req: Request, res: Response) => {
  try {
    const tools = await listAvailableTools();
    return res.json(tools);
  } catch (error: any) {
    console.error('Error fetching tools:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Schedule installation of an extension package (placeholder).
 * Currently only invalidates the in-memory registry cache.
 * @route POST /api/agentos/extensions/install
 */
router.post('/extensions/install', async (req: Request, res: Response) => {
  try {
    const { package: packageName } = req.body;

    if (!packageName) {
      return res.status(400).json({ error: 'Package name required' });
    }

    // Placeholder: in the future, resolve and install the package, then reload registry/cache.
    invalidateRegistryCache();

    return res.json({ success: true, message: `Extension ${packageName} installation scheduled` });
  } catch (error: any) {
    console.error('Error installing extension:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Invalidate the extensions registry cache (forces reload on next request).
 * @route POST /api/agentos/extensions/reload
 */
router.post('/extensions/reload', async (req: Request, res: Response) => {
  try {
    invalidateRegistryCache();
    return res.json({ success: true, message: 'Extensions cache invalidated' });
  } catch (error: any) {
    console.error('Error reloading extensions:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Search across the local registry by name, package, or description substring.
 * @route GET /api/agentos/extensions/search?q=<text>
 */
router.get('/extensions/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const exts = await listExtensions();
    const query = (q as string | undefined)?.toLowerCase() ?? '';
    const results = query
      ? exts.filter(
          (ext) =>
            ext.name.toLowerCase().includes(query) ||
            ext.package.toLowerCase().includes(query) ||
            (ext.description ?? '').toLowerCase().includes(query)
        )
      : exts;
    return res.json(results);
  } catch (error: any) {
    console.error('Error searching extensions:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Execute a specific tool via AgentOS ToolOrchestrator.
 * - Validates the tool exists (by id/name) in registry.
 * - Delegates JSON schema validation to AgentOS ToolExecutor.
 * @route POST /api/agentos/tools/execute
 */
router.post('/tools/execute', async (req: Request, res: Response) => {
  try {
    const { toolId, input, userId, personaId, personaCapabilities, correlationId } = req.body;

    if (!toolId) {
      return res.status(400).json({ error: 'toolId required' });
    }

    // Validate tool exists in registry
    const tools = await listAvailableTools();
    const tool = tools.find((t) => t.id === toolId);
    if (!tool) {
      return res.status(404).json({ error: `Tool ${toolId} not found in registry` });
    }

    const result = await agentosService.executeToolCall({
      toolName: toolId,
      args: input ?? {},
      userId,
      personaId,
      personaCapabilities,
      correlationId,
    });

    return res.json(result);
  } catch (error: any) {
    console.error('Error executing tool:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Note: Demo agency workflow endpoints removed in favor of runtime-backed router.

export default router;
