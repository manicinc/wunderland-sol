/**
 * @file giphy.ts
 * @description GIPHY integration for mood-appropriate GIF responses.
 */

import { BotLogger } from '../shared/logger';

const logger = new BotLogger('Giphy');

export class GiphyService {
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.GIPHY_API_KEY || '';
    if (!this.apiKey) {
      logger.warn('GIPHY_API_KEY not set. GIF responses will be disabled.');
    }
  }

  async search(query: string): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${this.apiKey}&q=${encodeURIComponent(query)}&limit=10&rating=pg`;
      const response = await fetch(url);
      if (!response.ok) {
        logger.warn(`GIPHY API returned ${response.status}`);
        return null;
      }

      const data = (await response.json()) as any;
      const gifs = data?.data;
      if (!gifs || gifs.length === 0) return null;

      const gif = gifs[Math.floor(Math.random() * gifs.length)];
      return gif?.images?.original?.url || gif?.images?.fixed_height?.url || null;
    } catch (error: any) {
      logger.warn(`GIPHY search failed: ${error.message}`);
      return null;
    }
  }

  async trending(): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const url = `https://api.giphy.com/v1/gifs/trending?api_key=${this.apiKey}&limit=10&rating=pg`;
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = (await response.json()) as any;
      const gifs = data?.data;
      if (!gifs || gifs.length === 0) return null;

      const gif = gifs[Math.floor(Math.random() * gifs.length)];
      return gif?.images?.original?.url || null;
    } catch {
      return null;
    }
  }
}
