import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Lightweight loader for the AgentOS Guardrails from the extensions registry.
 * Serves `/api/agentos/guardrails*` endpoints.
 * Guardrails are part of @framers/agentos-extensions.
 * @internal
 */

/** @public */
export type GuardrailDescriptor = {
  id: string;
  package: string;
  version: string;
  displayName: string;
  description?: string;
  category?: 'safety' | 'privacy' | 'budget' | 'compliance' | 'quality' | 'custom';
  verified?: boolean;
  capabilities?: string[];
  repository?: string;
};

type GuardrailsRegistry = {
  version: string;
  updated: string;
  guardrails: {
    curated: GuardrailDescriptor[];
    community: GuardrailDescriptor[];
  };
  stats: Record<string, unknown>;
};

let cachedRegistry: GuardrailsRegistry | null = null;

/**
 * Resolve absolute path to the guardrails registry JSON in the monorepo.
 * Guardrails are part of the agentos-extensions registry.
 * @returns Absolute filesystem path to the guardrails registry JSON.
 */
function getRegistryPath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Guardrails are in the extensions registry
  return path.resolve(__dirname, '../../../../packages/agentos-extensions/registry.json');
}

/**
 * Load and cache the guardrails registry from disk.
 * @returns Parsed {@link GuardrailsRegistry}.
 */
export async function loadGuardrailsRegistry(): Promise<GuardrailsRegistry> {
  if (cachedRegistry) {
    return cachedRegistry;
  }
  const registryPath = getRegistryPath();
  const raw = await readFile(registryPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<GuardrailsRegistry>;

  // Backwards/forwards compatibility:
  // - Some registries expose a generic `extensions.curated` shape (no `guardrails` key yet).
  // - In that case, fall back to the local guardrails that power the backend integration.
  if (!parsed.guardrails) {
    parsed.guardrails = {
      curated: [
        {
          id: 'keyword-guardrail',
          package: 'voice-chat-assistant-backend',
          version: '0.1.0',
          displayName: 'Keyword Guardrail',
          description: 'Blocks or escalates on keyword matches.',
          category: 'safety',
          verified: true,
        },
        {
          id: 'sensitive-topic-guardrail',
          package: 'voice-chat-assistant-backend',
          version: '0.1.0',
          displayName: 'Sensitive Topic Guardrail',
          description: 'Detects sensitive topics and routes through escalation policies.',
          category: 'safety',
          verified: true,
        },
        {
          id: 'cost-ceiling-guardrail',
          package: 'voice-chat-assistant-backend',
          version: '0.1.0',
          displayName: 'Cost Ceiling Guardrail',
          description: 'Stops tool/LLM actions when cost thresholds are exceeded.',
          category: 'budget',
          verified: true,
        },
      ],
      community: [],
    };
  }

  const normalized: GuardrailsRegistry = {
    version: parsed.version ?? 'local-fallback',
    updated: parsed.updated ?? new Date().toISOString(),
    guardrails: parsed.guardrails,
    stats: parsed.stats ?? {},
  };

  cachedRegistry = normalized;
  return normalized;
}

/**
 * Flatten curated and community guardrails into a single list for clients.
 * @returns Array of {@link GuardrailDescriptor}.
 * @public
 */
export async function listGuardrails(): Promise<GuardrailDescriptor[]> {
  const registry = await loadGuardrailsRegistry();
  return [...(registry.guardrails.curated ?? []), ...(registry.guardrails.community ?? [])];
}

/**
 * Clear cached guardrails registry.
 * @public
 */
export function invalidateGuardrailsCache(): void {
  cachedRegistry = null;
}
