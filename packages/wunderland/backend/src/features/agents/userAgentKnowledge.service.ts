/**
 * @file userAgentKnowledge.service.ts
 * @description Service for managing user-specific agent knowledge documents.
 * Handles CRUD operations for knowledge items and integrates with RAG memory
 * for semantic retrieval capabilities.
 *
 * @module UserAgentKnowledgeService
 * @version 2.0.0 - Added RAG integration
 */

import { sqlKnowledgeBaseService } from '../../core/knowledge/SqlKnowledgeBaseService.js';
import { userAgentsRepository } from './userAgents.repository.js';
import { getPlanAgentLimits, resolvePlanIdForUser } from './userAgents.service.js';
import { findUserById } from '../auth/user.repository.js';
import {
  ragService,
  type RagIngestionResult,
} from '../../integrations/agentos/agentos.rag.service.js';

/**
 * Input for creating a knowledge document.
 */
export interface CreateKnowledgeInput {
  /** Type/category of the knowledge document */
  type: string;
  /** Tags for filtering and organization */
  tags?: string[];
  /** The actual content to store */
  content: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /**
   * Whether to ingest this document into RAG memory for semantic retrieval.
   * Defaults to true if the agent has RAG enabled.
   */
  ingestToRag?: boolean;
}

const ensureAgentOwnership = async (userId: string, agentId: string) => {
  const agent = await userAgentsRepository.getById(userId, agentId);
  if (!agent) {
    const error: any = new Error('Agent not found.');
    error.statusCode = 404;
    error.code = 'AGENT_NOT_FOUND';
    throw error;
  }
  return agent;
};

const assertKnowledgeCapacity = async (userId: string, agentId: string) => {
  const user = await findUserById(userId);
  const planId = resolvePlanIdForUser(user ?? null);
  const limits = getPlanAgentLimits(planId);
  const allowance = limits.knowledgeDocumentsPerAgent ?? 0;

  if (allowance <= 0) {
    const error: any = new Error('Knowledge uploads are not available on your current plan.');
    error.statusCode = 403;
    error.code = 'KNOWLEDGE_UPLOAD_DISABLED';
    throw error;
  }

  const current = await sqlKnowledgeBaseService.countByAgent(agentId, userId);
  if (current >= allowance) {
    const error: any = new Error(
      'Knowledge document limit reached for this agent. Upgrade your plan to add more.'
    );
    error.statusCode = 403;
    error.code = 'KNOWLEDGE_LIMIT_REACHED';
    throw error;
  }
};

export const userAgentKnowledgeService = {
  /**
   * List all knowledge documents for an agent owned by a user.
   *
   * @param userId - The user ID
   * @param agentId - The agent ID
   * @returns Array of knowledge items
   */
  async list(userId: string, agentId: string) {
    await ensureAgentOwnership(userId, agentId);
    return sqlKnowledgeBaseService.listByAgent(agentId, userId);
  },

  /**
   * Create a new knowledge document for an agent.
   * Optionally ingests the document into RAG memory for semantic retrieval.
   *
   * @param userId - The user ID
   * @param agentId - The agent ID
   * @param input - Knowledge document input
   * @returns Created knowledge item with optional RAG ingestion status
   *
   * @example
   * const knowledge = await userAgentKnowledgeService.create(
   *   'user-123',
   *   'agent-456',
   *   {
   *     type: 'documentation',
   *     content: 'Important product information...',
   *     tags: ['product', 'v2'],
   *     ingestToRag: true, // Enable RAG ingestion
   *   }
   * );
   */
  async create(userId: string, agentId: string, input: CreateKnowledgeInput) {
    const agent = await ensureAgentOwnership(userId, agentId);
    await assertKnowledgeCapacity(userId, agentId);

    // Store in SQL knowledge base
    const payload = await sqlKnowledgeBaseService.addKnowledgeItem({
      type: input.type,
      // Encode ownership in tags for easy filtering
      tags: [...(input.tags ?? []), `agent:${agent.id}`, `owner:${userId}`],
      content: input.content,
      metadata: { ...(input.metadata ?? {}), agentId: agent.id, ownerUserId: userId },
    });

    // Ingest into RAG memory if requested (default: true)
    const shouldIngestToRag = input.ingestToRag !== false;
    let ragIngestionResult: RagIngestionResult | null = null;

    if (shouldIngestToRag && ragService.isAvailable()) {
      try {
        ragIngestionResult = await ragService.ingestAgentKnowledge(
          agent.id,
          userId,
          payload.id,
          input.content,
          {
            type: input.type,
            tags: input.tags,
            title: input.metadata?.title,
            ...input.metadata,
          }
        );

        if (ragIngestionResult.success) {
          console.log(
            `[UserAgentKnowledge] Document ${payload.id} ingested into RAG with ${ragIngestionResult.chunksCreated} chunks`
          );
        } else {
          console.warn(
            `[UserAgentKnowledge] RAG ingestion failed for document ${payload.id}:`,
            ragIngestionResult.error
          );
        }
      } catch (ragError) {
        // Log but don't fail the overall operation
        console.error('[UserAgentKnowledge] RAG ingestion error:', ragError);
      }
    }

    return {
      ...payload,
      ragIngestion: ragIngestionResult
        ? {
            success: ragIngestionResult.success,
            chunksCreated: ragIngestionResult.chunksCreated,
            collectionId: ragIngestionResult.collectionId,
          }
        : null,
    };
  },

  /**
   * Remove a knowledge document from an agent.
   * Also removes the document from RAG memory if it was ingested.
   *
   * @param userId - The user ID
   * @param agentId - The agent ID
   * @param knowledgeId - The knowledge document ID to remove
   */
  async remove(userId: string, agentId: string, knowledgeId: string) {
    await ensureAgentOwnership(userId, agentId);
    const existing = await sqlKnowledgeBaseService.getKnowledgeItemById(knowledgeId);
    const agentTag = `agent:${agentId}`.toLowerCase();
    const ownerTag = `owner:${userId}`.toLowerCase();
    const hasScope =
      !!existing &&
      (existing.tags ?? []).map(t => t.toLowerCase()).includes(agentTag) &&
      (existing.tags ?? []).map(t => t.toLowerCase()).includes(ownerTag);
    if (!hasScope) {
      const error: any = new Error('Knowledge document not found.');
      error.statusCode = 404;
      error.code = 'KNOWLEDGE_NOT_FOUND';
      throw error;
    }

    // Remove from RAG memory
    if (ragService.isAvailable()) {
      try {
        const ragDeleted = await ragService.deleteAgentKnowledge(knowledgeId);
        if (ragDeleted) {
          console.log(`[UserAgentKnowledge] Document ${knowledgeId} removed from RAG memory`);
        }
      } catch (ragError) {
        // Log but don't fail the overall operation
        console.error('[UserAgentKnowledge] RAG deletion error:', ragError);
      }
    }

    // Remove from SQL knowledge base
    await sqlKnowledgeBaseService.deleteById(knowledgeId);
  },

  /**
   * Query RAG memory for relevant knowledge chunks for an agent.
   *
   * @param userId - The user ID
   * @param agentId - The agent ID
   * @param query - The search query
   * @param options - Query options
   * @returns Retrieved chunks with relevance scores
   */
  async queryRag(
    userId: string,
    agentId: string,
    query: string,
    options?: {
      topK?: number;
      similarityThreshold?: number;
      tags?: string[];
    }
  ) {
    await ensureAgentOwnership(userId, agentId);

    if (!ragService.isAvailable()) {
      return {
        success: false,
        chunks: [],
        totalResults: 0,
        message: 'RAG service not available',
      };
    }

    const result = await ragService.query({
      query,
      collectionIds: [`agent-${agentId}`],
      topK: options?.topK ?? 5,
      similarityThreshold: options?.similarityThreshold ?? 0.3,
      filters: {
        agentId,
        userId,
        tags: options?.tags,
      },
      includeMetadata: true,
    });

    return result;
  },

  /**
   * Get RAG memory statistics for an agent.
   *
   * @param userId - The user ID
   * @param agentId - The agent ID
   * @returns RAG memory statistics
   */
  async getRagStats(userId: string, agentId: string) {
    await ensureAgentOwnership(userId, agentId);

    if (!ragService.isAvailable()) {
      return {
        available: false,
        stats: null,
      };
    }

    return {
      available: true,
      stats: ragService.getStats(agentId),
    };
  },
};
