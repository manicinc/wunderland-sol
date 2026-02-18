import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Lightweight loader for the AgentOS Extensions registry stored in the monorepo.
 * This powers the `/api/agentos/extensions*` endpoints without hardcoded mock data.
 *
 * Note: This reads the local JSON registry in `packages/agentos-extensions/registry.json`.
 * In production, consider a remote registry service and add caching/ETag validation.
 * @internal
 */

/** @public */
type RegistryAuthor = {
	name?: string;
	email?: string;
	url?: string;
};

/** @public */
type RegistryExtension = {
	id: string;
	name: string;
	package: string;
	version: string;
	category?: string;
	path?: string;
	description?: string;
	author?: RegistryAuthor;
	features?: string[];
	tools?: string[];
	keywords?: string[];
	npm?: string;
	repository?: string;
	verified?: boolean;
	verifiedAt?: string;
	verifiedBy?: RegistryAuthor;
	verificationChecklistVersion?: string;
	downloads?: number;
};

/** @public */
type ExtensionsRegistry = {
	version: string;
	updated: string;
	categories: Record<string, string[]>;
	extensions: {
		curated: RegistryExtension[];
		community: RegistryExtension[];
		templates: RegistryExtension[];
	};
	stats: Record<string, unknown>;
};

/** Summary payload returned to clients for each extension. @public */
export type ExtensionSummary = {
	id: string;
	name: string;
	package: string;
	version: string;
	description: string;
	category: string;
	verified?: boolean;
	verifiedAt?: string;
	verifiedBy?: RegistryAuthor;
	verificationChecklistVersion?: string;
	installed?: boolean;
	tools?: string[];
	author?: RegistryAuthor;
};

/** Summary payload returned to clients for each tool. @public */
export type ToolSummary = {
	id: string;
	name: string;
	description: string;
	extension: string;
	inputSchema?: Record<string, unknown>;
	outputSchema?: Record<string, unknown>;
	hasSideEffects?: boolean;
};

let cachedRegistry: ExtensionsRegistry | null = null;

/**
 * Resolve absolute path to the monorepo extensions registry.json.
 * @returns Absolute filesystem path to the registry JSON file.
 */
function getRegistryPath(): string {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	// backend/src/integrations/agentos → ../../../../ to repo root, then packages/agentos-extensions/registry.json
	return path.resolve(__dirname, '../../../../packages/agentos-extensions/registry.json');
}

/**
 * Load and cache the extensions registry from disk.
 * @returns Parsed {@link ExtensionsRegistry}.
 */
export async function loadExtensionsRegistry(): Promise<ExtensionsRegistry> {
	if (cachedRegistry) {
		return cachedRegistry;
	}
	const registryPath = getRegistryPath();
	const raw = await readFile(registryPath, 'utf-8');
	const parsed = JSON.parse(raw) as ExtensionsRegistry;
	cachedRegistry = parsed;
	return parsed;
}

/**
 * Return a flattened list of curated/community/template extensions with a stable UI shape.
 * @returns Array of {@link ExtensionSummary}.
 * @public
 */
export async function listExtensions(): Promise<ExtensionSummary[]> {
	const registry = await loadExtensionsRegistry();
	const groups: Array<keyof ExtensionsRegistry['extensions']> = ['curated', 'community', 'templates'];
	const results: ExtensionSummary[] = [];
	for (const group of groups) {
		for (const ext of registry.extensions[group] ?? []) {
			results.push({
				id: ext.id,
				name: ext.name,
				package: ext.package,
				version: ext.version,
				description: ext.description ?? '',
				category: ext.category ?? group,
				verified: Boolean(ext.verified),
				verifiedAt: ext.verifiedAt,
				verifiedBy: ext.verifiedBy,
				verificationChecklistVersion: ext.verificationChecklistVersion,
				installed: false,
				tools: Array.isArray(ext.tools) ? ext.tools : [],
				author: ext.author,
			});
		}
	}
	return results;
}

/**
 * Derive a simple tools list from the registry's extension entries.
 * Schemas are not included in the registry, so they are omitted for now.
 * @returns Array of {@link ToolSummary}.
 * @public
 */
export async function listAvailableTools(): Promise<ToolSummary[]> {
	const exts = await listExtensions();
	const tools: ToolSummary[] = [];
	for (const ext of exts) {
		for (const toolId of ext.tools ?? []) {
			tools.push({
				id: toolId,
				name: toolId,
				description: `Tool from ${ext.name}`,
				extension: ext.package,
				hasSideEffects: false,
			});
		}
	}
	return tools;
}

/**
 * Mark registry cache dirty (used by future install/update operations).
 * @public
 */
export function invalidateRegistryCache(): void {
	cachedRegistry = null;
}


