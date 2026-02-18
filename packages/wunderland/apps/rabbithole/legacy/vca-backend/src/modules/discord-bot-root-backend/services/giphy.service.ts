/**
 * @file giphy.service.ts
 * @description GIPHY API integration for the Wunderbot.
 * Searches for GIFs by keyword/mood and returns URLs for Discord embedding.
 */

import { Injectable, Logger } from '@nestjs/common';

interface GiphyGif {
  id: string;
  url: string;
  title: string;
  images: {
    fixed_height: { url: string; width: string; height: string };
    downsized: { url: string; width: string; height: string };
    original: { url: string };
  };
}

interface GiphySearchResponse {
  data: GiphyGif[];
  pagination: { total_count: number; count: number; offset: number };
}

/** Mood-to-search-term mapping for ambient GIF reactions. */
const MOOD_GIF_QUERIES: Record<string, string[]> = {
  excited: ['excited', 'celebration', 'woohoo', 'party rabbit'],
  serene: ['peaceful', 'zen', 'calm vibes', 'relaxing'],
  contemplative: ['thinking', 'pondering', 'deep thoughts', 'hmm'],
  frustrated: ['frustrated', 'facepalm', 'ugh', 'annoyed'],
  curious: ['curious', 'interesting', 'detective', 'magnifying glass'],
  assertive: ['confident', 'boss', 'power move', 'strong'],
  provocative: ['sassy', 'mic drop', 'spicy', 'oh snap'],
  analytical: ['calculating', 'smart', 'science', 'big brain'],
  engaged: ['interested', 'listening', 'engaged', 'attentive'],
  bored: ['bored', 'yawn', 'waiting', 'tumbleweed'],
};

@Injectable()
export class GiphyService {
  private readonly logger = new Logger('GiphyService');
  private readonly apiKey: string | undefined;
  private readonly baseUrl = 'https://api.giphy.com/v1/gifs';

  constructor() {
    this.apiKey = process.env.GIPHY_API_KEY;
    if (!this.apiKey) {
      this.logger.warn('GIPHY_API_KEY not set — GIF reactions disabled.');
    }
  }

  get isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Search for a GIF by query string.
   * Returns a random result from the top 10 matches for variety.
   */
  async searchGif(query: string, rating = 'pg-13'): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        q: query,
        limit: '10',
        offset: '0',
        rating,
        lang: 'en',
      });

      const res = await fetch(`${this.baseUrl}/search?${params}`);
      if (!res.ok) {
        this.logger.warn(`GIPHY search failed: ${res.status} ${res.statusText}`);
        return null;
      }

      const data = (await res.json()) as GiphySearchResponse;
      if (data.data.length === 0) return null;

      // Pick a random result from top results for variety
      const pick = data.data[Math.floor(Math.random() * data.data.length)];
      return pick.images.fixed_height.url;
    } catch (error: any) {
      this.logger.warn(`GIPHY error: ${error.message}`);
      return null;
    }
  }

  /**
   * Get a mood-appropriate GIF based on the bot's current mood label.
   */
  async getMoodGif(mood: string): Promise<string | null> {
    const queries = MOOD_GIF_QUERIES[mood] || MOOD_GIF_QUERIES.engaged;
    const query = queries[Math.floor(Math.random() * queries.length)];
    return this.searchGif(query);
  }

  /**
   * Get a GIF as a reaction to a message topic/keyword.
   */
  async getReactionGif(topic: string): Promise<string | null> {
    return this.searchGif(topic);
  }
}
