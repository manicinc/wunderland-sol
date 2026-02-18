import test from 'node:test';
import assert from 'node:assert/strict';
import { ragService } from '../integrations/agentos/agentos.rag.service.js';

test('Multimodal RAG ingests, queries, and serves asset payloads', async () => {
  // Ensure a clean store for this test run.
  await ragService.shutdown();

  // Force an in-memory SQLite database for deterministic tests.
  process.env.RAG_DATABASE_PATH = '';
  process.env.RAG_STORAGE_PRIORITY = 'sqljs';
  process.env.AGENTOS_RAG_VECTOR_PROVIDER = 'sql';
  // Enable offline multimodal embeddings to ensure they degrade gracefully when optional deps
  // are not installed (indexing is best-effort and should never break ingestion).
  process.env.AGENTOS_RAG_MEDIA_IMAGE_EMBEDDINGS_ENABLED = 'true';
  process.env.AGENTOS_RAG_MEDIA_AUDIO_EMBEDDINGS_ENABLED = 'true';
  // Avoid any real network calls in this unit test (embeddings are best-effort).
  process.env.OPENAI_API_KEY = '';
  process.env.OPENROUTER_API_KEY = '';
  process.env.OLLAMA_ENABLED = 'false';
  process.env.OLLAMA_BASE_URL = '';
  process.env.OLLAMA_HOST = '';

  const imageAssetId = `test_image_${Date.now()}`;
  const audioAssetId = `test_audio_${Date.now()}`;

  const imageBytes = Buffer.from('not-a-real-png');
  const audioBytes = Buffer.from('not-a-real-audio');

  const imageIngest = await ragService.ingestImageAsset({
    assetId: imageAssetId,
    mimeType: 'image/png',
    originalFileName: 'test.png',
    payload: imageBytes,
    storePayload: true,
    textRepresentation: '[Image]\nCaption: a red square\nTags: red, square',
    tags: ['manual_tag'],
    metadata: { test: true, kind: 'unit_test' },
    userId: 'test_user',
    agentId: 'test_agent',
  });
  assert.equal(imageIngest.success, true);

  const audioIngest = await ragService.ingestAudioAsset({
    assetId: audioAssetId,
    mimeType: 'audio/webm',
    originalFileName: 'test.webm',
    payload: audioBytes,
    storePayload: false,
    textRepresentation: '[Audio]\nTranscript: hello world',
    userId: 'test_user',
    agentId: 'test_agent',
  });
  assert.equal(audioIngest.success, true);

  const imageQuery = await ragService.queryMediaAssets({
    query: 'red square',
    modalities: ['image'],
    topK: 5,
    includeMetadata: true,
  });
  assert.equal(imageQuery.success, true);
  assert.ok(imageQuery.assets.some((a) => a.asset.assetId === imageAssetId));

  // Query-by-image path (textRepresentation supplied to avoid any captioning network calls).
  const imageQueryByImage = await ragService.queryMediaAssetsByImage({
    textRepresentation: 'red square',
    modalities: ['image'],
    topK: 5,
  });
  assert.equal(imageQueryByImage.success, true);
  assert.ok(imageQueryByImage.assets.some((a) => a.asset.assetId === imageAssetId));

  // Re-ingest the same assetId with different derived text (update semantics).
  const imageReingest = await ragService.ingestImageAsset({
    assetId: imageAssetId,
    mimeType: 'image/png',
    originalFileName: 'test.png',
    payload: imageBytes,
    storePayload: true,
    textRepresentation: '[Image]\nCaption: a blue circle\nTags: blue, circle',
    userId: 'test_user',
    agentId: 'test_agent',
  });
  assert.equal(imageReingest.success, true);

  const redAfterUpdate = await ragService.queryMediaAssets({
    query: 'red square',
    modalities: ['image'],
    topK: 5,
  });
  assert.equal(redAfterUpdate.success, true);
  assert.equal(
    redAfterUpdate.assets.some((a) => a.asset.assetId === imageAssetId),
    false
  );

  const blueAfterUpdate = await ragService.queryMediaAssets({
    query: 'blue circle',
    modalities: ['image'],
    topK: 5,
  });
  assert.equal(blueAfterUpdate.success, true);
  assert.ok(blueAfterUpdate.assets.some((a) => a.asset.assetId === imageAssetId));

  const audioQuery = await ragService.queryMediaAssets({
    query: 'hello',
    modalities: ['audio'],
    topK: 5,
  });
  assert.equal(audioQuery.success, true);
  assert.ok(audioQuery.assets.some((a) => a.asset.assetId === audioAssetId));

  // Query-by-audio path (textRepresentation supplied to avoid any transcription network calls).
  const audioQueryByAudio = await ragService.queryMediaAssetsByAudio({
    textRepresentation: 'hello',
    modalities: ['audio'],
    topK: 5,
  });
  assert.equal(audioQueryByAudio.success, true);
  assert.ok(audioQueryByAudio.assets.some((a) => a.asset.assetId === audioAssetId));

  const assetMeta = await ragService.getMediaAsset(imageAssetId);
  assert.ok(assetMeta, 'expected image asset metadata');
  assert.equal(assetMeta?.assetId, imageAssetId);
  assert.equal(assetMeta?.modality, 'image');

  const storedImage = await ragService.getMediaAssetContent(imageAssetId);
  assert.ok(storedImage, 'expected stored image payload');
  assert.equal(storedImage?.mimeType, 'image/png');
  assert.deepEqual(storedImage?.buffer, imageBytes);

  const storedAudio = await ragService.getMediaAssetContent(audioAssetId);
  assert.equal(storedAudio, null, 'expected no stored audio payload when storePayload=false');

  const deleted = await ragService.deleteMediaAsset(audioAssetId);
  assert.equal(deleted, true);

  const audioQueryAfterDelete = await ragService.queryMediaAssets({
    query: 'hello',
    modalities: ['audio'],
    topK: 5,
  });
  assert.equal(audioQueryAfterDelete.success, true);
  assert.equal(
    audioQueryAfterDelete.assets.some((a) => a.asset.assetId === audioAssetId),
    false
  );

  await ragService.shutdown();
});
