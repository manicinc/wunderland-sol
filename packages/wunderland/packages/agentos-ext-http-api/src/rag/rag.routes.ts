/**
 * @file rag.routes.ts
 * @description REST API routes for AgentOS RAG (Retrieval Augmented Generation) operations.
 * Provides endpoints for document ingestion, retrieval queries, and memory management.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import {
  type AgentOSRagRouterDeps,
  type RagDocumentSummary,
  type RagIngestRequest,
  type RagIngestResponse,
  type RagMemoryStats,
  type RagQueryRequest,
  type RagQueryResponse,
} from './rag.types.js';
import { createAgentOSRagMultimodalRouter } from './rag.multimodal.routes.js';

/**
 * Creates the Express router for RAG API endpoints.
 *
 * @example
 * ```ts
 * app.use('/api/agentos/rag', createAgentOSRagRouter({ isEnabled, ragService }));
 * ```
 */
export const createAgentOSRagRouter = (deps: AgentOSRagRouterDeps): Router => {
  const router = Router();

  // Multimodal (image/audio) endpoints.
  router.use('/multimodal', createAgentOSRagMultimodalRouter(deps));

  router.post(
    '/ingest',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const body = req.body as RagIngestRequest;

        if (!body.content || typeof body.content !== 'string' || body.content.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'content is required and must be a non-empty string',
            error: 'INVALID_PAYLOAD',
          });
        }

        const result = await deps.ragService.ingestDocument({
          documentId: body.documentId,
          content: body.content,
          collectionId: body.collectionId,
          category: body.category,
          metadata: body.metadata,
          chunkingOptions: body.chunkingOptions,
        });

        const response: RagIngestResponse = {
          success: result.success,
          documentId: result.documentId,
          chunksCreated: result.chunksCreated,
          collectionId: result.collectionId,
          message:
            result.error ||
            (result.success ? 'Document ingested successfully' : 'Ingestion failed'),
        };

        return res.status(result.success ? 201 : 500).json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/query',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const body = req.body as RagQueryRequest;

        if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
          return res.status(400).json({
            success: false,
            message: 'query is required and must be a non-empty string',
            error: 'INVALID_PAYLOAD',
          });
        }

        const result = await deps.ragService.query({
          query: body.query,
          preset: body.preset,
          collectionIds: body.collectionIds,
          topK: body.topK,
          similarityThreshold: body.similarityThreshold,
          filters: body.filters,
          includeMetadata: body.includeMetadata,
          strategy: body.strategy,
          strategyParams: body.strategyParams,
          queryVariants: body.queryVariants,
          rewrite: body.rewrite,
        });

        const response: RagQueryResponse = {
          success: result.success,
          query: result.query,
          chunks: result.chunks,
          totalResults: result.totalResults,
          processingTimeMs: result.processingTimeMs,
        };

        return res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/graphrag/local-search',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const body = req.body as { query?: unknown; options?: unknown };
        const query = typeof body?.query === 'string' ? body.query.trim() : '';
        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'query is required and must be a non-empty string',
            error: 'INVALID_PAYLOAD',
          });
        }

        const result = await deps.ragService.graphRagLocalSearch(query, body.options as any);
        return res.status(200).json({ success: true, result });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/graphrag/global-search',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const body = req.body as { query?: unknown; options?: unknown };
        const query = typeof body?.query === 'string' ? body.query.trim() : '';
        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'query is required and must be a non-empty string',
            error: 'INVALID_PAYLOAD',
          });
        }

        const result = await deps.ragService.graphRagGlobalSearch(query, body.options as any);
        return res.status(200).json({ success: true, result });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/graphrag/stats',
    async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const stats = await deps.ragService.graphRagStats();
        return res.status(200).json({ success: true, stats });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/documents',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { collectionId, agentId, userId, limit, offset } = req.query;

        const documents = await deps.ragService.listDocuments({
          collectionId: collectionId as string | undefined,
          agentId: agentId as string | undefined,
          userId: userId as string | undefined,
        });

        const limitNum = Number(limit) || 50;
        const offsetNum = Number(offset) || 0;
        const paginatedDocs = documents.slice(offsetNum, offsetNum + limitNum);

        const response = {
          success: true,
          documents: paginatedDocs.map((doc) => ({
            documentId: doc.documentId,
            collectionId: doc.collectionId,
            chunkCount: doc.chunkCount,
            category: doc.category,
            metadata: doc.metadata,
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt ?? doc.createdAt).toISOString(),
          })) as RagDocumentSummary[],
          total: documents.length,
          limit: limitNum,
          offset: offsetNum,
        };

        return res.status(200).json(response);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/documents/:documentId',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { documentId } = req.params;

        if (!documentId) {
          return res.status(400).json({
            success: false,
            message: 'documentId is required',
            error: 'INVALID_PARAMS',
          });
        }

        const deleted = await deps.ragService.deleteDocument(documentId);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            documentId,
            message: 'Document not found',
          });
        }

        return res.status(200).json({
          success: true,
          documentId,
          message: 'Document deleted successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/stats',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { agentId } = req.query;
        const stats = await deps.ragService.getStats(agentId as string | undefined);

        return res.status(200).json({
          success: true,
          storageAdapter: deps.ragService.getAdapterKind(),
          ...stats,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/collections',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { collectionId, displayName } = req.body;

        if (!collectionId || typeof collectionId !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'collectionId is required',
            error: 'INVALID_PAYLOAD',
          });
        }

        await deps.ragService.createCollection(collectionId, displayName);

        return res.status(201).json({
          success: true,
          collectionId,
          displayName: displayName || collectionId,
          message: 'Collection created successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/collections',
    async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const collections = await deps.ragService.listCollections();

        return res.status(200).json({
          success: true,
          collections,
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/collections/:collectionId',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { collectionId } = req.params;

        if (!collectionId) {
          return res.status(400).json({
            success: false,
            message: 'collectionId is required',
            error: 'INVALID_PARAMS',
          });
        }

        const deleted = await deps.ragService.deleteCollection(collectionId);

        if (!deleted) {
          return res.status(404).json({
            success: false,
            collectionId,
            message: 'Collection not found',
          });
        }

        return res.status(200).json({
          success: true,
          collectionId,
          message: 'Collection deleted successfully',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/health',
    async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        const isEnabled = deps.isEnabled();

        let ragAvailable = deps.ragService.isAvailable();
        let adapterKind = 'not-initialized';
        let stats: RagMemoryStats | null = null;

        if (isEnabled && !ragAvailable) {
          try {
            await deps.ragService.initialize();
            ragAvailable = deps.ragService.isAvailable();
          } catch {
            // Best-effort: health should not throw if init fails.
          }
        }

        if (ragAvailable) {
          adapterKind = deps.ragService.getAdapterKind();
          try {
            stats = await deps.ragService.getStats();
          } catch {
            // Best-effort.
          }
        }

        const embeddingConfigured = Boolean(
          process.env.OPENAI_API_KEY?.trim() ||
            process.env.OPENROUTER_API_KEY?.trim() ||
            process.env.OLLAMA_BASE_URL?.trim() ||
            process.env.OLLAMA_HOST?.trim()
        );

        const graphRagEnabledRaw = String(process.env.AGENTOS_GRAPHRAG_ENABLED || '')
          .trim()
          .toLowerCase();
        const graphRagEnabled =
          graphRagEnabledRaw === '1' ||
          graphRagEnabledRaw === 'true' ||
          graphRagEnabledRaw === 'yes' ||
          graphRagEnabledRaw === 'on';

        return res.status(200).json({
          status: isEnabled && ragAvailable ? 'ready' : isEnabled ? 'initializing' : 'disabled',
          ragServiceInitialized: ragAvailable,
          storageAdapter: adapterKind,
          vectorStoreConnected: ragAvailable,
          embeddingServiceAvailable: embeddingConfigured,
          graphRagEnabled,
          stats: stats
            ? {
                totalDocuments: stats.totalDocuments,
                totalChunks: stats.totalChunks,
                collectionCount: stats.collections.length,
              }
            : null,
          message: isEnabled
            ? ragAvailable
              ? `RAG service ready (using ${adapterKind} storage)`
              : 'RAG service initializing'
            : 'AgentOS integration is disabled.',
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
