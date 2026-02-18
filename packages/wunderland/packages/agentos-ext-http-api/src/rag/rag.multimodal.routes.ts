/**
 * @file rag.multimodal.routes.ts
 * @description Multimodal RAG (image/audio) endpoints for AgentOS.
 *
 * This router ingests binary assets (multipart/form-data) and indexes them by
 * deriving a text representation (caption/transcript) which is stored as a normal
 * RAG document for retrieval.
 *
 * It also supports query-by-image and query-by-audio:
 * - Query-by-image prefers offline image embeddings when enabled in the host app.
 * - Otherwise it derives a text representation for the query asset, then runs the standard
 *   text retrieval pipeline over previously indexed assets.
 *
 * Routes are typically mounted under `/api/agentos/rag/multimodal`.
 */

import { Router, type NextFunction, type Request, type Response } from 'express';
import multer, { MulterError } from 'multer';
import type { AgentOSRagRouterDeps } from './rag.types.js';

const MAX_IMAGE_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_AUDIO_SIZE_BYTES = 25 * 1024 * 1024; // Whisper API limit is 25MB

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (typeof file.mimetype === 'string' && file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported image MIME type: ${file.mimetype}`));
  },
});

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AUDIO_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    // Whisper supports: mp3, mp4, mpeg, mpga, m4a, wav, and webm.
    const allowed = new Set([
      'audio/mpeg',
      'audio/mp4',
      'audio/x-m4a',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'video/mp4',
      'video/webm',
    ]);
    if (allowed.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error(`Unsupported audio MIME type: ${file.mimetype}`));
  },
});

const parseBooleanField = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  const text = String(value).trim().toLowerCase();
  if (!text) return undefined;
  if (text === 'true' || text === '1' || text === 'yes' || text === 'y') return true;
  if (text === 'false' || text === '0' || text === 'no' || text === 'n') return false;
  return undefined;
};

const parseJsonField = <T = any>(value: unknown): T | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return undefined;
  }
};

const parseTagsField = (value: unknown): string[] | undefined => {
  if (value === null || value === undefined) return undefined;
  if (Array.isArray(value)) {
    const out = value.map((v) => String(v ?? '').trim()).filter(Boolean);
    return out.length > 0 ? out : undefined;
  }
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // Accept JSON array or comma-separated list.
  const json = parseJsonField<unknown>(trimmed);
  if (Array.isArray(json)) {
    const out = json.map((v) => String(v ?? '').trim()).filter(Boolean);
    return out.length > 0 ? out : undefined;
  }
  const out = trimmed
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  return out.length > 0 ? out : undefined;
};

const parseCategoryField = (
  value: unknown
): 'conversation_memory' | 'knowledge_base' | 'user_notes' | 'system' | 'custom' | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (
    trimmed === 'conversation_memory' ||
    trimmed === 'knowledge_base' ||
    trimmed === 'user_notes' ||
    trimmed === 'system' ||
    trimmed === 'custom'
  ) {
    return trimmed;
  }
  return undefined;
};

const runSingleUpload = async (
  uploader: multer.Multer,
  field: string,
  req: Request,
  res: Response
): Promise<Express.Multer.File> => {
  return await new Promise((resolve, reject) => {
    uploader.single(field)(req, res, (err: any) => {
      if (err) return reject(err);
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return reject(new Error(`Missing multipart field: ${field}`));
      resolve(file);
    });
  });
};

/**
 * Creates the Express router for multimodal RAG endpoints.
 */
export const createAgentOSRagMultimodalRouter = (deps: AgentOSRagRouterDeps): Router => {
  const router = Router();

  router.post(
    '/images/query',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        let file: Express.Multer.File;
        try {
          file = await runSingleUpload(imageUpload, 'image', req, res);
        } catch (err: any) {
          if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({
                success: false,
                message: `Image file is too large. Max is ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
                error: 'FILE_TOO_LARGE',
              });
            }
            return res.status(400).json({
              success: false,
              message: `File upload error: ${err.message}`,
              error: 'FILE_UPLOAD_ERROR',
            });
          }
          return res.status(415).json({
            success: false,
            message: err?.message || 'Invalid image file.',
            error: 'INVALID_IMAGE_FILE',
          });
        }

        const body = req.body as Record<string, unknown>;
        const parsedModalities = Array.isArray(body.modalities)
          ? (body.modalities
              .map((v) => String(v ?? '').trim())
              .filter((v) => v === 'image' || v === 'audio') as Array<'image' | 'audio'>)
          : undefined;
        const modalities: Array<'image' | 'audio'> =
          parsedModalities && parsedModalities.length > 0 ? parsedModalities : ['image'];

        const collectionIds = Array.isArray(body.collectionIds)
          ? body.collectionIds.map((v) => String(v ?? '').trim()).filter(Boolean)
          : typeof body.collectionIds === 'string'
            ? body.collectionIds
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : undefined;

        const topK =
          typeof body.topK === 'number'
            ? body.topK
            : typeof body.topK === 'string'
              ? Number.parseInt(body.topK, 10)
              : undefined;

        const includeMetadata = parseBooleanField(body.includeMetadata);

        const result = await deps.ragService.queryMediaAssetsByImage({
          payload: file.buffer,
          mimeType: file.mimetype,
          sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
          textRepresentation:
            typeof body.textRepresentation === 'string' ? body.textRepresentation : undefined,
          modalities,
          collectionIds,
          topK: Number.isFinite(topK as any) ? (topK as number) : undefined,
          includeMetadata,
        });

        return res.status(result.success ? 200 : 500).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/audio/query',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        let file: Express.Multer.File;
        try {
          file = await runSingleUpload(audioUpload, 'audio', req, res);
        } catch (err: any) {
          if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({
                success: false,
                message: `Audio file is too large. Max is ${Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.`,
                error: 'FILE_TOO_LARGE',
              });
            }
            return res.status(400).json({
              success: false,
              message: `File upload error: ${err.message}`,
              error: 'FILE_UPLOAD_ERROR',
            });
          }
          return res.status(415).json({
            success: false,
            message: err?.message || 'Invalid audio file.',
            error: 'INVALID_AUDIO_FILE',
          });
        }

        const body = req.body as Record<string, unknown>;
        const parsedModalities = Array.isArray(body.modalities)
          ? (body.modalities
              .map((v) => String(v ?? '').trim())
              .filter((v) => v === 'image' || v === 'audio') as Array<'image' | 'audio'>)
          : undefined;
        const modalities: Array<'image' | 'audio'> =
          parsedModalities && parsedModalities.length > 0 ? parsedModalities : ['audio'];

        const collectionIds = Array.isArray(body.collectionIds)
          ? body.collectionIds.map((v) => String(v ?? '').trim()).filter(Boolean)
          : typeof body.collectionIds === 'string'
            ? body.collectionIds
                .split(',')
                .map((v) => v.trim())
                .filter(Boolean)
            : undefined;

        const topK =
          typeof body.topK === 'number'
            ? body.topK
            : typeof body.topK === 'string'
              ? Number.parseInt(body.topK, 10)
              : undefined;

        const includeMetadata = parseBooleanField(body.includeMetadata);

        const result = await deps.ragService.queryMediaAssetsByAudio({
          payload: file.buffer,
          mimeType: file.mimetype,
          originalFileName: file.originalname,
          textRepresentation:
            typeof body.textRepresentation === 'string' ? body.textRepresentation : undefined,
          modalities,
          collectionIds,
          topK: Number.isFinite(topK as any) ? (topK as number) : undefined,
          includeMetadata,
          userId: typeof body.userId === 'string' ? body.userId : undefined,
        });

        return res.status(result.success ? 200 : 500).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/images/ingest',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        let file: Express.Multer.File;
        try {
          file = await runSingleUpload(imageUpload, 'image', req, res);
        } catch (err: any) {
          if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({
                success: false,
                message: `Image file is too large. Max is ${Math.round(MAX_IMAGE_SIZE_BYTES / (1024 * 1024))}MB.`,
                error: 'FILE_TOO_LARGE',
              });
            }
            return res.status(400).json({
              success: false,
              message: `File upload error: ${err.message}`,
              error: 'FILE_UPLOAD_ERROR',
            });
          }
          return res.status(415).json({
            success: false,
            message: err?.message || 'Invalid image file.',
            error: 'INVALID_IMAGE_FILE',
          });
        }

        const body = req.body as Record<string, unknown>;
        const metadata = parseJsonField<Record<string, unknown>>(body.metadata) ?? undefined;
        const tags = parseTagsField(body.tags);
        const storePayload = parseBooleanField(body.storePayload);

        const result = await deps.ragService.ingestImageAsset({
          assetId: typeof body.assetId === 'string' ? body.assetId : undefined,
          collectionId: typeof body.collectionId === 'string' ? body.collectionId : undefined,
          mimeType: file.mimetype,
          originalFileName: file.originalname,
          payload: file.buffer,
          sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
          category: parseCategoryField(body.category),
          metadata,
          tags,
          storePayload,
          userId: typeof body.userId === 'string' ? body.userId : undefined,
          agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
          textRepresentation:
            typeof body.textRepresentation === 'string' ? body.textRepresentation : undefined,
        });

        return res.status(result.success ? 201 : 500).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.post(
    '/audio/ingest',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        let file: Express.Multer.File;
        try {
          file = await runSingleUpload(audioUpload, 'audio', req, res);
        } catch (err: any) {
          if (err instanceof MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(413).json({
                success: false,
                message: `Audio file is too large. Max is ${Math.round(MAX_AUDIO_SIZE_BYTES / (1024 * 1024))}MB.`,
                error: 'FILE_TOO_LARGE',
              });
            }
            return res.status(400).json({
              success: false,
              message: `File upload error: ${err.message}`,
              error: 'FILE_UPLOAD_ERROR',
            });
          }
          return res.status(415).json({
            success: false,
            message: err?.message || 'Invalid audio file.',
            error: 'INVALID_AUDIO_FILE',
          });
        }

        const body = req.body as Record<string, unknown>;
        const metadata = parseJsonField<Record<string, unknown>>(body.metadata) ?? undefined;
        const tags = parseTagsField(body.tags);
        const storePayload = parseBooleanField(body.storePayload);

        const result = await deps.ragService.ingestAudioAsset({
          assetId: typeof body.assetId === 'string' ? body.assetId : undefined,
          collectionId: typeof body.collectionId === 'string' ? body.collectionId : undefined,
          mimeType: file.mimetype,
          originalFileName: file.originalname,
          payload: file.buffer,
          sourceUrl: typeof body.sourceUrl === 'string' ? body.sourceUrl : undefined,
          category: parseCategoryField(body.category),
          metadata,
          tags,
          storePayload,
          userId: typeof body.userId === 'string' ? body.userId : undefined,
          agentId: typeof body.agentId === 'string' ? body.agentId : undefined,
          textRepresentation:
            typeof body.textRepresentation === 'string' ? body.textRepresentation : undefined,
        });

        return res.status(result.success ? 201 : 500).json(result);
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

        const body = req.body as Record<string, unknown>;
        const query = typeof body.query === 'string' ? body.query.trim() : '';
        if (!query) {
          return res.status(400).json({
            success: false,
            message: 'query is required and must be a non-empty string',
            error: 'INVALID_PAYLOAD',
          });
        }

        const modalities = Array.isArray(body.modalities)
          ? (body.modalities
              .map((v) => String(v ?? '').trim())
              .filter((v) => v === 'image' || v === 'audio') as Array<'image' | 'audio'>)
          : undefined;

        const collectionIds = Array.isArray(body.collectionIds)
          ? body.collectionIds.map((v) => String(v ?? '').trim()).filter(Boolean)
          : undefined;

        const topK =
          typeof body.topK === 'number'
            ? body.topK
            : typeof body.topK === 'string'
              ? Number.parseInt(body.topK, 10)
              : undefined;

        const includeMetadata = parseBooleanField(body.includeMetadata);

        const result = await deps.ragService.queryMediaAssets({
          query,
          modalities,
          collectionIds,
          topK: Number.isFinite(topK as any) ? (topK as number) : undefined,
          includeMetadata,
        });

        return res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/assets/:assetId',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { assetId } = req.params;
        if (!assetId) {
          return res.status(400).json({
            success: false,
            message: 'assetId is required',
            error: 'INVALID_PARAMS',
          });
        }

        const asset = await deps.ragService.getMediaAsset(assetId);
        if (!asset) {
          return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        return res.status(200).json({ success: true, asset });
      } catch (error) {
        next(error);
      }
    }
  );

  router.get(
    '/assets/:assetId/content',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { assetId } = req.params;
        if (!assetId) {
          return res.status(400).json({
            success: false,
            message: 'assetId is required',
            error: 'INVALID_PARAMS',
          });
        }

        const content = await deps.ragService.getMediaAssetContent(assetId);
        if (!content) {
          return res.status(404).json({
            success: false,
            message: 'Asset content not found (payload not stored).',
            error: 'NO_PAYLOAD',
          });
        }

        res.setHeader('Content-Type', content.mimeType);
        return res.status(200).send(content.buffer);
      } catch (error) {
        next(error);
      }
    }
  );

  router.delete(
    '/assets/:assetId',
    async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
      try {
        if (!deps.isEnabled()) {
          return res.status(503).json({
            success: false,
            message: 'AgentOS integration disabled',
            error: 'AGENTOS_DISABLED',
          });
        }

        const { assetId } = req.params;
        if (!assetId) {
          return res.status(400).json({
            success: false,
            message: 'assetId is required',
            error: 'INVALID_PARAMS',
          });
        }

        const deleted = await deps.ragService.deleteMediaAsset(assetId);
        if (!deleted) {
          return res.status(404).json({ success: false, message: 'Asset not found' });
        }
        return res.status(200).json({ success: true, assetId, message: 'Asset deleted' });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
};
