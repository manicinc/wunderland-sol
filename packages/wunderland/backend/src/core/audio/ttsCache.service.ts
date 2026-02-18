/**
 * @file ttsCache.service.ts
 * @description LRU cache service for TTS audio buffers to reduce API calls and improve response times
 * @version 1.0.0
 */

import crypto from 'crypto';
import { LRUCache } from 'lru-cache';

interface CachedAudioEntry {
  audioBuffer: Buffer;
  mimeType: string;
  voice: string;
  provider: string;
  createdAt: number;
  hitCount: number;
  lastAccessed: number;
  textHash: string;
  originalTextLength: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  cacheSize: number;
  maxCacheSize: number;
  averageHitRate: number;
  totalBytesSaved: number;
  totalApiCallsSaved: number;
  estimatedCostSavingsUsd: number;
}

/**
 * TTS Audio Cache Service
 * Implements an LRU (Least Recently Used) cache for TTS-generated audio buffers
 * to reduce API calls and improve response times for repeated text.
 */
class TTSCacheService {
  private cache: LRUCache<string, CachedAudioEntry>;
  private stats: CacheStats;
  private readonly MAX_CACHE_SIZE_MB: number;
  private readonly MAX_CACHE_ITEMS: number;
  private readonly CACHE_TTL_MS: number;
  private readonly COST_PER_1K_CHARS: number = 0.015; // OpenAI TTS cost

  constructor(
    maxSizeMB: number = 100, // 100MB default cache size
    maxItems: number = 500,   // Maximum 500 cached items
    ttlMs: number = 3600000   // 1 hour TTL
  ) {
    this.MAX_CACHE_SIZE_MB = maxSizeMB;
    this.MAX_CACHE_ITEMS = maxItems;
    this.CACHE_TTL_MS = ttlMs;

    // Initialize LRU cache with size calculation
    this.cache = new LRUCache<string, CachedAudioEntry>({
      max: this.MAX_CACHE_ITEMS,
      maxSize: this.MAX_CACHE_SIZE_MB * 1024 * 1024, // Convert MB to bytes
      sizeCalculation: (value: CachedAudioEntry) => value.audioBuffer.length,
      ttl: this.CACHE_TTL_MS,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      cacheSize: 0,
      maxCacheSize: this.MAX_CACHE_SIZE_MB * 1024 * 1024,
      averageHitRate: 0,
      totalBytesSaved: 0,
      totalApiCallsSaved: 0,
      estimatedCostSavingsUsd: 0,
    };

    console.log(`[TTSCacheService] Initialized with ${maxSizeMB}MB cache, max ${maxItems} items, ${ttlMs}ms TTL`);
  }

  /**
   * Generates a deterministic hash for cache key based on text and options
   */
  private generateCacheKey(
    text: string,
    voice: string,
    model: string,
    speed: number,
    provider: string
  ): string {
    const normalizedText = text.trim().toLowerCase();
    const keyString = `${provider}:${model}:${voice}:${speed}:${normalizedText}`;
    return crypto.createHash('sha256').update(keyString).digest('hex');
  }

  /**
   * Retrieves cached audio if available
   */
  public getCachedAudio(
    text: string,
    voice: string,
    model: string,
    speed: number,
    provider: string
  ): CachedAudioEntry | null {
    const cacheKey = this.generateCacheKey(text, voice, model, speed, provider);
    const cached = this.cache.get(cacheKey);

    this.stats.totalRequests++;

    if (cached) {
      this.stats.hits++;
      this.stats.totalApiCallsSaved++;
      this.stats.totalBytesSaved += cached.audioBuffer.length;
      this.stats.estimatedCostSavingsUsd += (cached.originalTextLength / 1000) * this.COST_PER_1K_CHARS;

      // Update hit count and last accessed
      cached.hitCount++;
      cached.lastAccessed = Date.now();
      this.cache.set(cacheKey, cached); // Update the cache entry

      this.updateAverageHitRate();

      console.log(`[TTSCacheService] Cache HIT for text (${text.length} chars), ` +
                  `saved API call, hit rate: ${(this.stats.averageHitRate * 100).toFixed(1)}%`);

      return cached;
    } else {
      this.stats.misses++;
      this.updateAverageHitRate();

      console.log(`[TTSCacheService] Cache MISS for text (${text.length} chars), ` +
                  `hit rate: ${(this.stats.averageHitRate * 100).toFixed(1)}%`);

      return null;
    }
  }

  /**
   * Stores audio in cache
   */
  public cacheAudio(
    text: string,
    audioBuffer: Buffer,
    mimeType: string,
    voice: string,
    model: string,
    speed: number,
    provider: string
  ): void {
    const cacheKey = this.generateCacheKey(text, voice, model, speed, provider);

    const entry: CachedAudioEntry = {
      audioBuffer,
      mimeType,
      voice,
      provider,
      createdAt: Date.now(),
      hitCount: 0,
      lastAccessed: Date.now(),
      textHash: cacheKey,
      originalTextLength: text.length,
    };

    this.cache.set(cacheKey, entry);
    this.stats.cacheSize = this.cache.calculatedSize || 0;

    console.log(`[TTSCacheService] Cached audio for text (${text.length} chars), ` +
                `cache size: ${(this.stats.cacheSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Checks if text is in cache without retrieving
   */
  public hasCache(
    text: string,
    voice: string,
    model: string,
    speed: number,
    provider: string
  ): boolean {
    const cacheKey = this.generateCacheKey(text, voice, model, speed, provider);
    return this.cache.has(cacheKey);
  }

  /**
   * Clears the entire cache
   */
  public clearCache(): void {
    const previousSize = this.stats.cacheSize;
    this.cache.clear();
    this.stats.cacheSize = 0;
    console.log(`[TTSCacheService] Cache cleared, freed ${(previousSize / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * Removes expired entries manually (LRU handles this automatically but this can be called explicitly)
   */
  public pruneExpired(): number {
    const initialSize = this.cache.size;
    this.cache.purgeStale();
    const pruned = initialSize - this.cache.size;

    if (pruned > 0) {
      console.log(`[TTSCacheService] Pruned ${pruned} expired entries`);
    }

    return pruned;
  }

  /**
   * Gets current cache statistics
   */
  public getStats(): CacheStats {
    return {
      ...this.stats,
      cacheSize: this.cache.calculatedSize || 0,
    };
  }

  /**
   * Gets detailed cache information for monitoring
   */
  public getCacheInfo(): {
    stats: CacheStats;
    itemCount: number;
    oldestEntry: number | null;
    newestEntry: number | null;
    mostFrequentlyUsed: { text: string; hitCount: number } | null;
  } {
    const entries = Array.from(this.cache.values());
    const oldestEntry = entries.length > 0
      ? Math.min(...entries.map(e => e.createdAt))
      : null;
    const newestEntry = entries.length > 0
      ? Math.max(...entries.map(e => e.createdAt))
      : null;

    const mostFrequentlyUsed = entries.length > 0
      ? entries.reduce((prev, current) =>
          current.hitCount > prev.hitCount ? current : prev
        )
      : null;

    return {
      stats: this.getStats(),
      itemCount: this.cache.size,
      oldestEntry,
      newestEntry,
      mostFrequentlyUsed: mostFrequentlyUsed
        ? {
            text: `[${mostFrequentlyUsed.originalTextLength} chars]`,
            hitCount: mostFrequentlyUsed.hitCount
          }
        : null,
    };
  }

  /**
   * Pre-warms cache with commonly used phrases
   */
  public async prewarmCache(
    commonPhrases: Array<{ text: string; voice: string; model: string; speed: number; provider: string; audioBuffer?: Buffer }>
  ): Promise<void> {
    console.log(`[TTSCacheService] Pre-warming cache with ${commonPhrases.length} phrases`);

    for (const phrase of commonPhrases) {
      if (phrase.audioBuffer) {
        this.cacheAudio(
          phrase.text,
          phrase.audioBuffer,
          'audio/mpeg', // Default mime type
          phrase.voice,
          phrase.model,
          phrase.speed,
          phrase.provider
        );
      }
    }

    console.log(`[TTSCacheService] Pre-warming complete, cache size: ${(this.stats.cacheSize / 1024 / 1024).toFixed(2)}MB`);
  }

  private updateAverageHitRate(): void {
    if (this.stats.totalRequests > 0) {
      this.stats.averageHitRate = this.stats.hits / this.stats.totalRequests;
    }
  }

  /**
   * Estimates memory savings from caching
   */
  public getMemorySavings(): {
    totalSavedBytes: number;
    totalSavedMB: number;
    totalSavedApiCalls: number;
    estimatedCostSavingsUsd: number;
    averageResponseTimeSavedMs: number;
  } {
    // Estimate average API response time saved (500-2000ms typical)
    const avgApiResponseTimeMs = 1000;

    return {
      totalSavedBytes: this.stats.totalBytesSaved,
      totalSavedMB: this.stats.totalBytesSaved / 1024 / 1024,
      totalSavedApiCalls: this.stats.totalApiCallsSaved,
      estimatedCostSavingsUsd: this.stats.estimatedCostSavingsUsd,
      averageResponseTimeSavedMs: this.stats.totalApiCallsSaved * avgApiResponseTimeMs,
    };
  }
}

// Singleton instance
export const ttsCacheService = new TTSCacheService(
  parseInt(process.env.TTS_CACHE_MAX_SIZE_MB || '100'),
  parseInt(process.env.TTS_CACHE_MAX_ITEMS || '500'),
  parseInt(process.env.TTS_CACHE_TTL_MS || '3600000')
);

// Export for testing and flexibility
export { TTSCacheService, type CachedAudioEntry, type CacheStats };