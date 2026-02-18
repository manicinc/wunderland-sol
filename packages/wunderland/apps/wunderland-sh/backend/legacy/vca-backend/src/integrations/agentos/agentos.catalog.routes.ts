/**
 * Catalog routes for extensions, skills, channels, and providers
 */

import { Router, Request, Response } from 'express';

const router: Router = Router();

/**
 * Get the full extensions catalog (tools, voice, productivity, channels, skills).
 * Aggregates from @framers/agentos-extensions-registry and @framers/agentos-skills-registry.
 *
 * @route GET /api/extensions/catalog
 * @returns {tools: ExtensionInfo[], voice: ExtensionInfo[], productivity: ExtensionInfo[], channels: ChannelRegistryEntry[], skills: SkillCatalogEntry[]}
 */
router.get('/extensions/catalog', async (req: Request, res: Response) => {
  try {
    // Dynamic imports to avoid hard dependencies
    const catalog: any = {
      tools: [],
      voice: [],
      productivity: [],
      channels: [],
      skills: [],
    };

    // Try to load extensions registry
    try {
      const extensionsRegistry = await import('@framers/agentos-extensions-registry');
      const available = await extensionsRegistry.getAvailableExtensions();

      // Categorize by type
      catalog.tools = available.filter(
        (e: any) => e.category === 'tool' || e.category === 'integration'
      );
      catalog.voice = available.filter((e: any) => e.category === 'voice');
      catalog.productivity = available.filter((e: any) => e.category === 'productivity');
      catalog.channels = available.filter((e: any) => e.category === 'channel');
    } catch (err) {
      console.warn('Extensions registry not available:', err);
    }

    // Try to load skills registry
    try {
      const skillsRegistry = await import('@framers/agentos-skills-registry');
      catalog.skills = await skillsRegistry.getAllSkills();
    } catch (err) {
      console.warn('Skills registry not available:', err);
    }

    return res.json(catalog);
  } catch (error: any) {
    console.error('Error fetching catalog:', error);
    return res.status(500).json({
      error: error.message || 'Failed to fetch catalog',
    });
  }
});

/**
 * Resolve a preset's full configuration (skills + extensions).
 * Returns the preset config along with resolved skills and extensions manifests.
 *
 * @route POST /api/presets/:presetId/resolve
 * @param presetId - Preset identifier (e.g., "research-assistant")
 * @body {includeExtensions?: boolean, includeSkills?: boolean, secrets?: object}
 * @returns {preset: AgentPreset, skills: SkillSnapshot, extensions: ExtensionManifest, missing: string[]}
 */
router.post('/presets/:presetId/resolve', async (req: Request, res: Response) => {
  try {
    const { presetId } = req.params;
    const { includeExtensions = true, includeSkills = true, secrets = {} } = req.body;

    if (!presetId || typeof presetId !== 'string') {
      return res.status(400).json({ error: 'presetId parameter required' });
    }

    const result: any = {
      preset: null,
      skills: null,
      extensions: null,
      missing: [],
    };

    // Load preset
    try {
      const { PresetLoader } = await import(
        '../../../../packages/wunderland/src/core/PresetLoader.js'
      );
      const loader = new PresetLoader();
      result.preset = loader.loadPreset(presetId);
    } catch (err) {
      return res.status(404).json({
        error: `Preset "${presetId}" not found`,
      });
    }

    // Resolve skills if requested
    if (includeSkills) {
      try {
        const { resolvePresetSkills } = await import(
          '../../../../packages/wunderland/src/core/PresetSkillResolver.js'
        );
        result.skills = await resolvePresetSkills(presetId);
      } catch (err) {
        console.warn('Could not resolve skills:', err);
      }
    }

    // Resolve extensions if requested
    if (includeExtensions) {
      try {
        const { resolvePresetExtensions } = await import(
          '../../../../packages/wunderland/src/core/PresetExtensionResolver.js'
        );
        const extensionResult = await resolvePresetExtensions(presetId, { secrets });
        result.extensions = extensionResult.manifest;
        result.missing.push(...extensionResult.missing);
      } catch (err) {
        console.warn('Could not resolve extensions:', err);
      }
    }

    return res.json(result);
  } catch (error: any) {
    console.error('Error resolving preset:', error);
    return res.status(500).json({
      error: error.message || 'Failed to resolve preset',
    });
  }
});

/**
 * List all available presets.
 *
 * @route GET /api/presets
 * @returns {presets: {id: string, name: string, description: string}[]}
 */
router.get('/presets', async (req: Request, res: Response) => {
  try {
    const { PresetLoader } = await import(
      '../../../../packages/wunderland/src/core/PresetLoader.js'
    );
    const loader = new PresetLoader();
    const presets = loader.listPresets();

    return res.json({ presets });
  } catch (error: any) {
    console.error('Error listing presets:', error);
    return res.status(500).json({
      error: error.message || 'Failed to list presets',
    });
  }
});

export default router;
