import fs from 'fs';
import path from 'path';
import type { AgentOSPersonaDefinition } from '../../integrations/agentos/agentos.persona-registry.js';
import { listAgentOSPersonas, reloadDynamicPersonas } from '../../integrations/agentos/agentos.persona-registry.js';
import { marketplaceService } from '../marketplace/marketplace.service.js';
import { userAgentsRepository } from './userAgents.repository.js';
import { getAppDatabase, generateId } from '../../core/database/appDatabase.js';

interface HttpError extends Error {
  statusCode?: number;
}

const createHttpError = (statusCode: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  return error;
};

export interface AgentBundlePayload {
  version: string;
  persona: {
    id: string;
    label: string;
    prompt: string;
    description?: string | null;
    tags?: string[];
    toolsetIds?: string[];
    minAccessLevel?: string;
    category?: string;
  };
  agent?: {
    label: string;
    config: Record<string, unknown>;
  };
  marketplace?: Partial<{
    label: string;
    tagline: string | null;
    description: string | null;
    category: string;
    accessLevel: string;
    pricingModel: 'free' | 'freemium' | 'paid';
    priceCents?: number | null;
    currency?: string | null;
    visibility?: string;
  }>;
  metadata?: Record<string, unknown>;
}

export interface AgentBundleExport {
  version: string;
  persona: {
    id: string;
    label: string;
    prompt: string;
    description?: string | null;
    tags?: string[];
    toolsetIds?: string[];
    minAccessLevel?: string;
    category?: string;
  };
  agent?: {
    id: string;
    label: string;
    config: Record<string, unknown>;
  };
  marketplace?: Partial<{
    id: string;
    label: string;
    tagline: string | null;
    description: string | null;
    category: string;
    accessLevel: string;
    pricingModel: string | null;
    priceCents: number | null;
    currency: string | null;
    visibility: string;
    status: string;
  }>;
  metadata?: Record<string, unknown>;
}

const readPrompt = (definition: AgentOSPersonaDefinition): string => {
  try {
    return fs.readFileSync(path.resolve(definition.promptPath), 'utf-8');
  } catch (error) {
    console.warn('[AgentBundles] Failed to read persona prompt', {
      personaId: definition.personaId,
      promptPath: definition.promptPath,
      error,
    });
    return '';
  }
};

export const agentBundlesService = {
  async importBundle(userId: string, bundle: AgentBundlePayload): Promise<{ submissionId: string }> {
    if (!bundle?.persona?.id || !bundle.persona.prompt) {
      throw createHttpError(400, 'Bundle persona.id and persona.prompt are required.');
    }
    if (bundle.version !== '1.0') {
      throw createHttpError(400, 'Unsupported bundle version. Expected "1.0".');
    }

    const db = getAppDatabase();
    const submissionId = generateId();
    const now = Date.now();
    const metadata = {
      tags: bundle.persona.tags ?? [],
      toolsetIds: bundle.persona.toolsetIds ?? [],
      minAccessLevel: bundle.persona.minAccessLevel,
      agent: bundle.agent ?? null,
      marketplace: bundle.marketplace ?? null,
      extra: bundle.metadata ?? null,
    };

    await db.run(
      `
        INSERT INTO agentos_persona_submissions (
          id,
          persona_id,
          label,
          prompt,
          description,
          metadata,
          bundle_path,
          status,
          submitted_by,
          submitted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `,
      [
        submissionId,
        bundle.persona.id,
        bundle.persona.label,
        bundle.persona.prompt,
        bundle.persona.description ?? null,
        JSON.stringify(metadata),
        null,
        userId,
        now,
      ],
    );

    return { submissionId };
  },

  async exportBundle(userId: string, agentId: string): Promise<AgentBundleExport> {
    await reloadDynamicPersonas();
    const agent = await userAgentsRepository.getById(userId, agentId);
    if (!agent) {
      throw createHttpError(404, 'Agent not found.');
    }

    const personaId =
      (agent.config?.personaId as string | undefined) ??
      (agent.config?.selectedPersonaId as string | undefined) ??
      'v_researcher';

    const personaDefinition =
      listAgentOSPersonas().find((persona) => persona.personaId === personaId) ??
      listAgentOSPersonas().find((persona) => persona.agentIds.includes(personaId));

    if (!personaDefinition) {
      throw createHttpError(404, `Persona "${personaId}" not found.`);
    }

    const prompt = readPrompt(personaDefinition);
    const marketplaceListing = await marketplaceService.getAgentById(personaId);

    const bundle: AgentBundleExport = {
      version: '1.0',
      persona: {
        id: personaDefinition.personaId,
        label: personaDefinition.label,
        prompt,
        description: personaDefinition.description,
        tags: personaDefinition.tags,
        toolsetIds: personaDefinition.toolsetIds,
        minAccessLevel: personaDefinition.minAccessLevel,
        category: personaDefinition.category,
      },
      agent: {
        id: agent.id,
        label: agent.label,
        config: agent.config,
      },
      metadata: {
        planId: agent.planId,
      },
    };

    if (marketplaceListing) {
      bundle.marketplace = {
        id: marketplaceListing.id,
        label: marketplaceListing.label,
        tagline: marketplaceListing.tagline,
        description: marketplaceListing.description,
        category: marketplaceListing.category ?? personaDefinition.category,
        accessLevel: marketplaceListing.accessLevel ?? 'public',
        pricingModel: marketplaceListing.pricing.model,
        priceCents: marketplaceListing.pricing.priceCents ?? null,
        currency: marketplaceListing.pricing.currency ?? null,
        visibility: marketplaceListing.visibility,
        status: marketplaceListing.status,
      };
    }

    return bundle;
  },

  async reviewSubmission(
    submissionId: string,
    status: 'approved' | 'rejected' | 'pending',
    approverUserId: string,
    options?: { notes?: string | null },
  ): Promise<void> {
    const db = getAppDatabase();
    const now = Date.now();

    await db.run(
      `
        UPDATE agentos_persona_submissions
           SET status = ?,
               approved_by = ?,
               approved_at = ?,
               rejection_reason = ?
         WHERE id = ?
      `,
      [
        status,
        status === 'approved' ? approverUserId : null,
        status === 'approved' ? now : null,
        status === 'rejected' ? options?.notes ?? null : null,
        submissionId,
      ],
    );

    if (status === 'approved') {
      await reloadDynamicPersonas();
    }
  },

  async listSubmissions(status?: 'approved' | 'pending' | 'rejected'): Promise<
    Array<{
      id: string;
      personaId: string;
      label: string;
      status: string;
      submittedAt: number;
      submittedBy: string | null;
      approvedAt: number | null;
      approvedBy: string | null;
      metadata: Record<string, unknown> | null;
    }>
  > {
    const db = getAppDatabase();
    type SubmissionRow = {
      id: string | number;
      persona_id: string | number;
      label: string | number | null;
      status: string | number | null;
      submitted_at: number | null;
      submitted_by: string | null;
      approved_at: number | null;
      approved_by: string | null;
      metadata: string | null;
    };
    const rows = (await db.all(
      status
        ? `SELECT * FROM agentos_persona_submissions WHERE status = ? ORDER BY submitted_at DESC`
        : `SELECT * FROM agentos_persona_submissions ORDER BY submitted_at DESC`,
      status ? [status] : undefined,
    )) as SubmissionRow[];

    return rows.map((row) => ({
      id: String(row.id),
      personaId: String(row.persona_id),
      label: String(row.label),
      status: String(row.status),
      submittedAt: Number(row.submitted_at ?? 0),
      submittedBy: (row.submitted_by as string) ?? null,
      approvedAt: row.approved_at ? Number(row.approved_at) : null,
      approvedBy: (row.approved_by as string) ?? null,
      metadata: row.metadata ? JSON.parse(String(row.metadata)) : null,
    }));
  },
};
