import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { createAgentOSRagRouter } from './rag.routes.js';

describe('createAgentOSRagRouter multimodal routes', () => {
  it('ingests an image via multipart/form-data and forwards parsed fields', async () => {
    const ingestImageAsset = vi.fn().mockResolvedValue({
      success: true,
      assetId: 'asset_123',
      modality: 'image',
      collectionId: 'media_images',
      documentId: 'asset_123',
    });

    const ragService = {
      ingestImageAsset,
    } as any;

    const app = express();
    app.use(
      '/api/agentos/rag',
      createAgentOSRagRouter({
        isEnabled: () => true,
        ragService,
      })
    );

    const server = app.listen(0);
    try {
      const address = server.address();
      const port =
        typeof address === 'object' && address && 'port' in address ? (address as any).port : null;
      expect(typeof port).toBe('number');

      const payloadBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const form = new FormData();
      form.append('image', new Blob([payloadBytes], { type: 'image/png' }), 'test.png');
      form.append('assetId', 'asset_123');
      form.append('collectionId', 'media_images');
      form.append('storePayload', 'true');
      form.append('tags', 'a,b');
      form.append('metadata', JSON.stringify({ hello: 'world' }));
      form.append('userId', 'user_1');
      form.append('agentId', 'agent_1');
      form.append('textRepresentation', '[Image] caption');

      const response = await fetch(
        `http://127.0.0.1:${port}/api/agentos/rag/multimodal/images/ingest`,
        { method: 'POST', body: form }
      );

      expect(response.status).toBe(201);
      const json = (await response.json()) as any;
      expect(json.success).toBe(true);
      expect(ingestImageAsset).toHaveBeenCalledTimes(1);

      const call = ingestImageAsset.mock.calls[0]?.[0] as any;
      expect(call.assetId).toBe('asset_123');
      expect(call.collectionId).toBe('media_images');
      expect(call.mimeType).toBe('image/png');
      expect(call.originalFileName).toBe('test.png');
      expect(call.storePayload).toBe(true);
      expect(call.tags).toEqual(['a', 'b']);
      expect(call.metadata).toEqual({ hello: 'world' });
      expect(call.userId).toBe('user_1');
      expect(call.agentId).toBe('agent_1');
      expect(call.textRepresentation).toBe('[Image] caption');
      expect(Buffer.isBuffer(call.payload)).toBe(true);
      expect(Buffer.from(payloadBytes).toString('hex')).toBe(call.payload.toString('hex'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('serves stored asset bytes from GET /assets/:assetId/content', async () => {
    const assetId = 'asset_payload';
    const buffer = Buffer.from('hello-bytes');

    const ragService = {
      getMediaAssetContent: vi.fn().mockResolvedValue({ mimeType: 'image/png', buffer }),
    } as any;

    const app = express();
    app.use(
      '/api/agentos/rag',
      createAgentOSRagRouter({
        isEnabled: () => true,
        ragService,
      })
    );

    const server = app.listen(0);
    try {
      const address = server.address();
      const port =
        typeof address === 'object' && address && 'port' in address ? (address as any).port : null;
      expect(typeof port).toBe('number');

      const response = await fetch(
        `http://127.0.0.1:${port}/api/agentos/rag/multimodal/assets/${assetId}/content`
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toBe('image/png');
      const bytes = new Uint8Array(await response.arrayBuffer());
      expect(Buffer.from(bytes).toString('hex')).toBe(buffer.toString('hex'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
