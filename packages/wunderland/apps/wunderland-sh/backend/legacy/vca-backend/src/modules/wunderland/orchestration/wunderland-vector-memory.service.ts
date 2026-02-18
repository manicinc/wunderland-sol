import fs from 'node:fs';
import path from 'node:path';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { AIModelProviderManager } from '@framers/agentos/core/llm/providers/AIModelProviderManager';
import type { ProviderConfigEntry } from '@framers/agentos/core/llm/providers/AIModelProviderManager';
import { EmbeddingManager, RetrievalAugmentor, VectorStoreManager } from '@framers/agentos/rag';
import type { RetrievalAugmentorServiceConfig } from '@framers/agentos/config/RetrievalAugmentorConfiguration';
import type { EmbeddingManagerConfig } from '@framers/agentos/config/EmbeddingManagerConfiguration';
import type {
  RagDocumentInput,
  RagRetrievedChunk,
  RagRetrievalOptions,
} from '@framers/agentos/rag/IRetrievalAugmentor';
import type { VectorStoreManagerConfig } from '@framers/agentos/config/VectorStoreConfiguration';
import type { StorageResolutionOptions } from '@framers/sql-storage-adapter';

type EmbedProbeResult = {
  providerId: string;
  modelId: string;
  dimension: number;
};

const isNodeTestRun = (): boolean =>
  process.argv.includes('--test') || process.env.NODE_ENV === 'test';

const ensureDirectoryForFile = (filePath: string): void => {
  if (!filePath) return;
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const coerceOllamaBaseURL = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `http://${trimmed}`;
};

const parsePositiveIntEnv = (value: string | undefined): number | undefined => {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const parseBooleanEnv = (value: string | undefined): boolean | undefined => {
  if (!value) return undefined;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'true' || lowered === '1' || lowered === 'yes' || lowered === 'y') return true;
  if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === 'n') return false;
  return undefined;
};

const coercePreset = (value: string | undefined): 'fast' | 'balanced' | 'accurate' | undefined => {
  const preset = value?.trim().toLowerCase();
  if (preset === 'fast' || preset === 'balanced' || preset === 'accurate') return preset;
  return undefined;
};

const coerceVectorProvider = (value: string | undefined): 'sql' | 'qdrant' | undefined => {
  const provider = value?.trim().toLowerCase();
  if (provider === 'sql' || provider === 'qdrant') return provider;
  return undefined;
};

@Injectable()
export class WunderlandVectorMemoryService implements OnModuleDestroy {
  private readonly logger = new Logger('WunderlandVectorMemoryService');

  private initPromise: Promise<void> | null = null;
  private status: 'uninitialized' | 'enabled' | 'disabled' = 'uninitialized';
  private disabledReason?: string;

  private providerManager?: AIModelProviderManager;
  private embeddingManager?: EmbeddingManager;
  private vectorStoreManager?: VectorStoreManager;
  private retrievalAugmentor?: RetrievalAugmentor;

  private readonly dataSourceId = 'wunderland_seed_memory';
  private readonly collectionName = 'wunderland_seed_memory';
  private vectorProviderId: string = 'wunderland-memory-sql';

  async onModuleDestroy(): Promise<void> {
    try {
      await this.retrievalAugmentor?.shutdown();
    } catch (err) {
      this.logger.warn(
        `Failed to shutdown RetrievalAugmentor: ${String((err as any)?.message ?? err)}`
      );
    }
    try {
      await this.vectorStoreManager?.shutdownAllProviders();
    } catch (err) {
      this.logger.warn(
        `Failed to shutdown VectorStoreManager: ${String((err as any)?.message ?? err)}`
      );
    }
    try {
      await this.embeddingManager?.shutdown();
    } catch (err) {
      this.logger.warn(
        `Failed to shutdown EmbeddingManager: ${String((err as any)?.message ?? err)}`
      );
    }
  }

  public isAvailable(): boolean {
    return this.status === 'enabled';
  }

  private async ensureInitialized(): Promise<void> {
    if (this.status === 'enabled') return;
    if (this.status === 'disabled') {
      throw new Error(this.disabledReason ?? 'Vector memory is disabled.');
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        await this._doInitialize();
        this.status = 'enabled';
        this.logger.log('Vector memory enabled.');
      } catch (err) {
        this.status = 'disabled';
        this.disabledReason = (err as any)?.message
          ? String((err as any).message)
          : 'Vector memory initialization failed.';
        this.logger.warn(`Vector memory disabled: ${this.disabledReason}`);
        throw err;
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  private buildProviderConfigs(): ProviderConfigEntry[] {
    const providers: ProviderConfigEntry[] = [];

    const openaiKey = process.env.OPENAI_API_KEY?.trim();
    const openrouterKey = process.env.OPENROUTER_API_KEY?.trim();

    const explicitProvider = process.env.WUNDERLAND_MEMORY_EMBED_PROVIDER?.trim().toLowerCase();
    const ollamaConfiguredBaseURL =
      coerceOllamaBaseURL(process.env.OLLAMA_BASE_URL) ??
      coerceOllamaBaseURL(process.env.OLLAMA_HOST);

    const ollamaEnabled = parseBooleanEnv(process.env.OLLAMA_ENABLED) ?? false;

    // Only include Ollama when explicitly requested or enabled via env.
    const shouldIncludeOllama = explicitProvider === 'ollama' || ollamaEnabled;
    if (shouldIncludeOllama) {
      const requestTimeout =
        parsePositiveIntEnv(process.env.OLLAMA_REQUEST_TIMEOUT_MS) ??
        parsePositiveIntEnv(process.env.WUNDERLAND_MEMORY_OLLAMA_REQUEST_TIMEOUT_MS) ??
        5_000;
      providers.push({
        providerId: 'ollama',
        enabled: true,
        isDefault: explicitProvider === 'ollama' || (!openaiKey && !openrouterKey),
        config: {
          baseURL: ollamaConfiguredBaseURL ?? 'http://localhost:11434',
          requestTimeout,
        },
      });
    }

    if (openaiKey) {
      providers.push({
        providerId: 'openai',
        enabled: true,
        isDefault: explicitProvider === 'openai' || (!explicitProvider && !shouldIncludeOllama),
        config: { apiKey: openaiKey },
      });
    }

    if (openrouterKey) {
      providers.push({
        providerId: 'openrouter',
        enabled: true,
        isDefault:
          explicitProvider === 'openrouter' ||
          (!explicitProvider && !shouldIncludeOllama && !openaiKey),
        config: { apiKey: openrouterKey },
      });
    }

    return providers;
  }

  private buildEmbeddingCandidates(
    providerManager: AIModelProviderManager
  ): Array<{ providerId: string; modelId: string }> {
    const explicitProvider = process.env.WUNDERLAND_MEMORY_EMBED_PROVIDER?.trim();
    const explicitModel = process.env.WUNDERLAND_MEMORY_EMBED_MODEL?.trim();

    const candidates: Array<{ providerId: string; modelId: string }> = [];

    if (explicitProvider) {
      const providerId = explicitProvider.trim().toLowerCase();
      if (explicitModel) {
        candidates.push({ providerId, modelId: explicitModel });
        return candidates;
      }

      if (providerId === 'ollama') {
        candidates.push({
          providerId,
          modelId:
            process.env.OLLAMA_EMBED_MODEL?.trim() ||
            process.env.OLLAMA_EMBEDDING_MODEL?.trim() ||
            'nomic-embed-text',
        });
        return candidates;
      }
      if (providerId === 'openai') {
        candidates.push({ providerId, modelId: 'text-embedding-3-small' });
        return candidates;
      }
      if (providerId === 'openrouter') {
        candidates.push({ providerId, modelId: 'openai/text-embedding-3-small' });
        return candidates;
      }

      // Unknown/unsupported provider; allow probe to surface a clean error.
      candidates.push({ providerId, modelId: explicitModel || 'unknown' });
      return candidates;
    }

    // Prefer local Ollama embeddings when configured.
    if (providerManager.getProvider('ollama')) {
      const ollamaModel =
        process.env.OLLAMA_EMBED_MODEL?.trim() ||
        process.env.OLLAMA_EMBEDDING_MODEL?.trim() ||
        'nomic-embed-text';
      candidates.push({ providerId: 'ollama', modelId: ollamaModel });
    }

    // Cloud fallbacks.
    if (providerManager.getProvider('openai')) {
      candidates.push({ providerId: 'openai', modelId: 'text-embedding-3-small' });
    }
    if (providerManager.getProvider('openrouter')) {
      candidates.push({ providerId: 'openrouter', modelId: 'openai/text-embedding-3-small' });
    }

    return candidates;
  }

  private async probeEmbeddingDimension(
    providerManager: AIModelProviderManager
  ): Promise<EmbedProbeResult> {
    const candidates = this.buildEmbeddingCandidates(providerManager);
    const probeText = 'dimension probe';

    const errors: string[] = [];
    for (const candidate of candidates) {
      const provider = providerManager.getProvider(candidate.providerId);
      if (!provider) {
        errors.push(`${candidate.providerId}: provider not initialized`);
        continue;
      }
      if (typeof provider.generateEmbeddings !== 'function') {
        errors.push(`${candidate.providerId}: embeddings not supported`);
        continue;
      }

      try {
        const resp = await provider.generateEmbeddings(candidate.modelId, [probeText], {});
        const embedding = resp?.data?.[0]?.embedding;
        if (!Array.isArray(embedding) || embedding.length === 0) {
          errors.push(`${candidate.providerId}/${candidate.modelId}: empty embedding`);
          continue;
        }
        return {
          providerId: candidate.providerId,
          modelId: candidate.modelId,
          dimension: embedding.length,
        };
      } catch (err) {
        errors.push(
          `${candidate.providerId}/${candidate.modelId}: ${(err as any)?.message ?? String(err)}`
        );
      }
    }

    throw new Error(
      `No embedding provider/model is available for vector memory. Configure Ollama or set OPENAI_API_KEY/OPENROUTER_API_KEY. Errors: ${errors.join(
        '; '
      )}`
    );
  }

  private buildVectorStoreConfig(dimension: number): VectorStoreManagerConfig {
    const tablePrefix = 'wunderland_mem_';

    const filePathEnv = process.env.WUNDERLAND_MEMORY_VECTOR_DB_PATH?.trim();
    const defaultFilePath = path.join(process.cwd(), 'db_data', 'wunderland_memory_vectors.db');

    const useInMemory = isNodeTestRun() || filePathEnv === '';
    const filePath = useInMemory ? '' : filePathEnv || defaultFilePath;

    if (!useInMemory) {
      ensureDirectoryForFile(filePath);
    }

    const provider = coerceVectorProvider(process.env.WUNDERLAND_MEMORY_VECTOR_PROVIDER) ?? 'sql';
    const useQdrant = provider === 'qdrant' && !isNodeTestRun();

    if (useQdrant) {
      const url =
        process.env.WUNDERLAND_MEMORY_QDRANT_URL?.trim() ?? process.env.QDRANT_URL?.trim();
      if (!url) {
        throw new Error(
          'Wunderland vector memory is configured for Qdrant but no URL is set. Set `WUNDERLAND_MEMORY_QDRANT_URL` (or `QDRANT_URL`).'
        );
      }

      this.vectorProviderId = 'wunderland-memory-qdrant';
      const timeoutMs =
        parsePositiveIntEnv(process.env.WUNDERLAND_MEMORY_QDRANT_TIMEOUT_MS) ??
        parsePositiveIntEnv(process.env.QDRANT_TIMEOUT_MS) ??
        15_000;
      const enableBm25 = parseBooleanEnv(process.env.WUNDERLAND_MEMORY_QDRANT_ENABLE_BM25) ?? true;

      return {
        managerId: 'wunderland-memory-vsm',
        providers: [
          {
            id: this.vectorProviderId,
            type: 'qdrant',
            url,
            apiKey:
              process.env.WUNDERLAND_MEMORY_QDRANT_API_KEY?.trim() ??
              process.env.QDRANT_API_KEY?.trim(),
            timeoutMs,
            enableBm25,
          },
        ],
        defaultProviderId: this.vectorProviderId,
        defaultEmbeddingDimension: dimension,
      };
    }

    const storage: StorageResolutionOptions = useInMemory
      ? {
          priority: ['sqljs'],
          filePath: '',
        }
      : {
          filePath,
          priority: ['better-sqlite3', 'sqljs'],
          postgres: process.env.WUNDERLAND_MEMORY_VECTOR_DB_URL
            ? { connectionString: process.env.WUNDERLAND_MEMORY_VECTOR_DB_URL }
            : undefined,
        };

    this.vectorProviderId = 'wunderland-memory-sql';
    return {
      managerId: 'wunderland-memory-vsm',
      providers: [
        {
          id: this.vectorProviderId,
          type: 'sql',
          storage,
          tablePrefix,
          enableFullTextSearch: true,
          defaultEmbeddingDimension: dimension,
        },
      ],
      defaultProviderId: this.vectorProviderId,
      defaultEmbeddingDimension: dimension,
    };
  }

  private async _doInitialize(): Promise<void> {
    // 1) Providers (OpenAI/OpenRouter/Ollama) for embeddings
    this.providerManager = new AIModelProviderManager();
    await this.providerManager.initialize({ providers: this.buildProviderConfigs() });

    // 2) Decide embedding provider/model and determine dimension
    const embed = await this.probeEmbeddingDimension(this.providerManager);
    this.logger.log(
      `Using embeddings: provider='${embed.providerId}' model='${embed.modelId}' dim=${embed.dimension}`
    );

    const embeddingConfig: EmbeddingManagerConfig = {
      embeddingModels: [
        {
          providerId: embed.providerId,
          modelId: embed.modelId,
          dimension: embed.dimension,
          isDefault: true,
        },
      ],
      defaultModelId: embed.modelId,
      enableCache: true,
      cacheMaxSize: 10_000,
      cacheTTLSeconds: 60 * 60,
    };

    this.embeddingManager = new EmbeddingManager();
    await this.embeddingManager.initialize(embeddingConfig, this.providerManager);

    // 3) Vector stores
    this.vectorStoreManager = new VectorStoreManager();
    await this.vectorStoreManager.initialize(this.buildVectorStoreConfig(embed.dimension), [
      {
        dataSourceId: this.dataSourceId,
        displayName: 'Wunderland Seed Memory',
        vectorStoreProviderId: this.vectorProviderId,
        actualNameInProvider: this.collectionName,
        embeddingDimension: embed.dimension,
        isDefaultIngestionSource: true,
        isDefaultQuerySource: true,
      },
    ]);

    // Ensure the collection exists for the configured vector store.
    const store = this.vectorStoreManager.getProvider(this.vectorProviderId);
    if (store.collectionExists && store.createCollection) {
      const exists = await store.collectionExists(this.collectionName);
      if (!exists) {
        await store.createCollection(this.collectionName, embed.dimension, {
          similarityMetric: 'cosine',
        });
      }
    }

    // 4) Retrieval augmentor (vector-first; hybrid/MMR optional per request)
    this.retrievalAugmentor = new RetrievalAugmentor();

    const rerankerProviders = [
      { providerId: 'local', defaultModelId: 'cross-encoder/ms-marco-MiniLM-L-6-v2' },
    ];
    const cohereKey = process.env.COHERE_API_KEY?.trim();
    if (cohereKey) {
      rerankerProviders.push({
        providerId: 'cohere',
        apiKey: cohereKey,
        defaultModelId: 'rerank-v3.5',
      } as any);
    }

    const retrievalConfig: RetrievalAugmentorServiceConfig = {
      defaultDataSourceId: this.dataSourceId,
      defaultQueryEmbeddingModelId: embed.modelId,
      defaultEmbeddingModelId: embed.modelId,
      defaultChunkingStrategy: { type: 'fixed_size', chunkSize: 480, chunkOverlap: 80 },
      globalDefaultRetrievalOptions: { topK: 6, strategy: 'similarity' },
      categoryBehaviors: [],
      rerankerServiceConfig: {
        providers: rerankerProviders as any,
        defaultProviderId: cohereKey ? 'cohere' : 'local',
      },
      defaultRerankerProviderId: cohereKey ? 'cohere' : 'local',
      defaultRerankerModelId: cohereKey ? 'rerank-v3.5' : 'cross-encoder/ms-marco-MiniLM-L-6-v2',
    };

    await this.retrievalAugmentor.initialize(
      retrievalConfig,
      this.embeddingManager,
      this.vectorStoreManager
    );
  }

  private getDefaultQueryOptions(): Pick<
    RagRetrievalOptions,
    'strategy' | 'strategyParams' | 'rerankerConfig'
  > {
    const preset = coercePreset(process.env.WUNDERLAND_MEMORY_PRESET) ?? 'balanced';

    const hybridAlphaEnv = Number(process.env.WUNDERLAND_MEMORY_HYBRID_ALPHA);
    const hybridAlpha = Number.isFinite(hybridAlphaEnv)
      ? Math.max(0, Math.min(1, hybridAlphaEnv))
      : 0.7;

    if (preset === 'fast') {
      return { strategy: 'similarity' };
    }

    if (preset === 'accurate') {
      const useCohere = Boolean(process.env.COHERE_API_KEY?.trim());
      return {
        strategy: 'hybrid',
        strategyParams: { hybridAlpha },
        rerankerConfig: {
          enabled: true,
          providerId: useCohere ? 'cohere' : 'local',
          modelId: useCohere ? 'rerank-v3.5' : 'cross-encoder/ms-marco-MiniLM-L-6-v2',
          // Keep reranking bounded; memory_read is latency sensitive.
          maxDocuments: 40,
          timeoutMs: 20_000,
        },
      };
    }

    // balanced
    return {
      strategy: 'hybrid',
      strategyParams: { hybridAlpha },
    };
  }

  public async ingestSeedPost(input: {
    seedId: string;
    postId: string;
    content: string;
    replyToPostId?: string | null;
    createdAt?: string;
    publishedAt?: string | null;
  }): Promise<void> {
    await this.ensureInitialized();
    if (!this.retrievalAugmentor) throw new Error('Vector memory not initialized.');

    const doc: RagDocumentInput = {
      id: `wunderland_post:${input.postId}`,
      content: input.content,
      dataSourceId: this.dataSourceId,
      metadata: {
        seedId: input.seedId,
        kind: 'wunderland_post',
        postId: input.postId,
        replyToPostId: input.replyToPostId ?? '',
        createdAt: input.createdAt ?? '',
        publishedAt: input.publishedAt ?? '',
      },
    };

    await this.retrievalAugmentor.ingestDocuments(doc, {
      targetDataSourceId: this.dataSourceId,
      chunkingStrategy: { type: 'fixed_size', chunkSize: 480, chunkOverlap: 80 },
    });
  }

  public async querySeedMemory(input: {
    seedId: string;
    query: string;
    topK: number;
    options?: Pick<RagRetrievalOptions, 'strategy' | 'strategyParams' | 'rerankerConfig'>;
  }): Promise<{ chunks: RagRetrievedChunk[]; context: string }> {
    await this.ensureInitialized();
    if (!this.retrievalAugmentor) throw new Error('Vector memory not initialized.');

    const defaults = this.getDefaultQueryOptions();
    const retrievalOptions: RagRetrievalOptions = {
      topK: input.topK,
      targetDataSourceIds: [this.dataSourceId],
      metadataFilter: { seedId: { $eq: input.seedId } },
      strategy: input.options?.strategy ?? defaults.strategy ?? 'similarity',
      strategyParams: {
        ...(defaults.strategyParams ?? {}),
        ...(input.options?.strategyParams ?? {}),
      },
      rerankerConfig: input.options?.rerankerConfig ?? defaults.rerankerConfig,
      includeEmbeddings: false,
      tokenBudgetForContext: 4000,
    };

    const result = await this.retrievalAugmentor.retrieveContext(input.query, retrievalOptions);
    const chunks = result.retrievedChunks ?? [];
    const context = chunks.map((c, idx) => `(${idx + 1}) ${c.content}`).join('\n');

    return { chunks, context };
  }

  /**
   * Get the underlying RetrievalAugmentor for advanced RAG usage (e.g., JobMemoryService).
   */
  public async getRetrievalAugmentor(): Promise<RetrievalAugmentor | undefined> {
    await this.ensureInitialized();
    return this.retrievalAugmentor;
  }
}
