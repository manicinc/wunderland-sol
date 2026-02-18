/**
 * Agent Builder routes for natural language agent creation
 */

import { Router, Request, Response } from 'express';
import { agentosService } from './agentos.integration.js';

const router: Router = Router();

/**
 * Extract agent configuration from natural language description.
 * Uses LLM to parse description and return structured config with confidence scores.
 *
 * @route POST /api/voice/extract-config
 * @body {text: string, existingConfig?: object, hostingMode?: 'managed'|'self_hosted'}
 * @returns {ExtractedAgentConfig} - Structured config with confidence scores
 */
router.post('/voice/extract-config', async (req: Request, res: Response) => {
  try {
    const { text, existingConfig, hostingMode } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'text field required (non-empty string)' });
    }

    // Dynamic import to avoid circular dependencies
    const { extractAgentConfig } = await import(
      '../../../../packages/wunderland/src/ai/NaturalLanguageAgentBuilder.js'
    );

    // Create LLM invoker
    // TODO: Integrate with your LLM service (OpenAI, Anthropic, Ollama, etc.)
    const llmInvoker = async (prompt: string): Promise<string> => {
      // Placeholder - replace with actual LLM service call
      throw new Error(
        'LLM service not configured. Please set up an LLM provider (OpenAI, Anthropic, Ollama) and update this function to call your LLM service.'
      );
    };

    // Extract configuration
    const extractedConfig = await extractAgentConfig(text, llmInvoker, existingConfig, hostingMode);

    return res.json(extractedConfig);
  } catch (error: any) {
    console.error('Error extracting agent config:', error);
    return res.status(500).json({
      error: error.message || 'Failed to extract agent configuration',
    });
  }
});

/**
 * Validate API key format for a given LLM provider.
 *
 * @route POST /api/voice/validate-api-key
 * @body {provider: string, apiKey: string}
 * @returns {valid: boolean, message?: string}
 */
router.post('/voice/validate-api-key', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey } = req.body;

    if (!provider || typeof provider !== 'string') {
      return res.status(400).json({ error: 'provider field required (string)' });
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'apiKey field required (string)' });
    }

    // Dynamic import
    const { validateApiKeySetup } = await import(
      '../../../../packages/wunderland/src/ai/NaturalLanguageAgentBuilder.js'
    );

    const valid = validateApiKeySetup(provider, apiKey);

    if (valid) {
      return res.json({ valid: true, message: 'API key format is valid' });
    } else {
      return res.json({ valid: false, message: 'API key format is invalid' });
    }
  } catch (error: any) {
    console.error('Error validating API key:', error);
    return res.status(500).json({
      error: error.message || 'Failed to validate API key',
    });
  }
});

export default router;
