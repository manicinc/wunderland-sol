import fs from 'fs';
import path from 'path';
import { getAppDatabase } from '../../core/database/appDatabase.js';
import type { AgentOSPersonaDefinition } from './agentos.persona-registry.js';

const DYNAMIC_PROMPT_DIR = path.resolve(process.cwd(), 'prompts', '_dynamic');

interface PersonaSubmissionRecord {
  persona_id: string;
  label: string;
  description: string | null;
  prompt: string;
  metadata: string | null;
}

const ensurePromptDir = (): void => {
  if (!fs.existsSync(DYNAMIC_PROMPT_DIR)) {
    fs.mkdirSync(DYNAMIC_PROMPT_DIR, { recursive: true });
  }
};

const writePromptFile = (personaId: string, prompt: string): string => {
  ensurePromptDir();
  const sanitizedId = personaId.replace(/[^a-z0-9_\-]/gi, '_');
  const promptPath = path.join(DYNAMIC_PROMPT_DIR, `${sanitizedId}.md`);
  fs.writeFileSync(promptPath, prompt, 'utf-8');
  return promptPath;
};

const parseJson = <T>(value: string | null, fallback: T): T => {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

export const listApprovedDynamicPersonas = async (): Promise<AgentOSPersonaDefinition[]> => {
  const db = getAppDatabase();
  const rows = await db.all<PersonaSubmissionRecord & { status: string }>(
    "SELECT persona_id, label, description, prompt, metadata, status FROM agentos_persona_submissions WHERE status = 'approved'",
  );
  if (!rows?.length) {
    return [];
  }

  return rows.map((record) => {
    const metadata = parseJson<Record<string, unknown>>(record.metadata, {});
    const promptPath = writePromptFile(record.persona_id, record.prompt);
    const tags = Array.isArray(metadata?.tags) ? (metadata.tags as string[]) : [];
    const toolsetIds = Array.isArray(metadata?.toolsetIds) ? (metadata.toolsetIds as string[]) : [];
    const agentIds = Array.isArray(metadata?.agentIds) ? (metadata.agentIds as string[]) : [];
    const category =
      typeof metadata?.category === 'string' && metadata.category.length > 0
        ? (metadata.category as string)
        : 'custom';

    return {
      personaId: record.persona_id,
      agentIds,
      label: record.label,
      description: record.description ?? (metadata?.description as string | undefined) ?? record.label,
      category,
      promptKey: `dynamic_${record.persona_id}`,
      promptPath,
      tags,
      toolsetIds,
      minAccessLevel:
        typeof metadata?.minAccessLevel === 'string'
          ? (metadata.minAccessLevel as any)
          : undefined,
    } as AgentOSPersonaDefinition;
  });
};

