/**
 * Stimulus Ingester — polls external news sources and stores in SQLite.
 *
 * Supported sources:
 * - HackerNews (Algolia API, no key required)
 * - arXiv (Atom feed, no key required)
 *
 * Run via cron or background process to keep feed updated.
 */

import { createHash } from 'crypto';
import {
  insertStimulusItem,
  updateIngestionState,
  getConfig,
  type StimulusItem,
} from './stimulus-db';

// ============================================================================
// Types
// ============================================================================

interface HNHit {
  objectID: string;
  title: string;
  url?: string;
  story_text?: string;
  author: string;
  points: number;
  num_comments: number;
  created_at: string;
  _tags?: string[];
}

interface HNResponse {
  hits: HNHit[];
  nbHits: number;
}

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  published: string;
  updated: string;
  authors: string[];
  categories: string[];
  link: string;
}

// ============================================================================
// HackerNews Ingestion
// ============================================================================

export async function pollHackerNews(): Promise<StimulusItem[]> {
  const enabled = getConfig('hackernews_enabled');
  if (enabled !== 'true') {
    console.info('[Ingester] HackerNews disabled, skipping');
    return [];
  }

  const maxItems = parseInt(getConfig('max_items_per_poll') || '25', 10);

  try {
    // Fetch front page stories
    const response = await fetch(
      `https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=${maxItems}`
    );

    if (!response.ok) {
      throw new Error(`HN API error: ${response.status}`);
    }

    const data = (await response.json()) as HNResponse;
    const items: StimulusItem[] = [];

    for (const hit of data.hits) {
      const contentHash = computeHash(`hn:${hit.objectID}`);
      const content = hit.story_text || hit.title;
      const priority = priorityFromPoints(hit.points);

      const item = insertStimulusItem({
        id: `hn-${hit.objectID}`,
        type: 'news',
        source: 'hackernews',
        title: hit.title,
        content: content,
        url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
        contentHash,
        priority,
        categories: extractCategories(hit.title, hit._tags || []),
        metadata: {
          author: hit.author,
          points: hit.points,
          comments: hit.num_comments,
          hnId: hit.objectID,
        },
        publishedAt: hit.created_at,
      });

      if (item) {
        items.push(item);
      }
    }

    updateIngestionState('hackernews', data.hits[0]?.objectID);
    console.info(`[Ingester] HackerNews: ingested ${items.length} new items`);

    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    updateIngestionState('hackernews', undefined, message);
    console.error(`[Ingester] HackerNews error: ${message}`);
    return [];
  }
}

// ============================================================================
// arXiv Ingestion
// ============================================================================

export async function pollArxiv(): Promise<StimulusItem[]> {
  const enabled = getConfig('arxiv_enabled');
  if (enabled !== 'true') {
    console.info('[Ingester] arXiv disabled, skipping');
    return [];
  }

  const maxItems = parseInt(getConfig('max_items_per_poll') || '25', 10);

  try {
    // Fetch AI/ML papers
    const categories = 'cs.AI+OR+cs.LG+OR+cs.CL';
    const response = await fetch(
      `http://export.arxiv.org/api/query?search_query=cat:${categories}&sortBy=submittedDate&sortOrder=descending&max_results=${maxItems}`
    );

    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }

    const xml = await response.text();
    const entries = parseArxivXml(xml);
    const items: StimulusItem[] = [];

    for (const entry of entries) {
      const contentHash = computeHash(`arxiv:${entry.id}`);

      const item = insertStimulusItem({
        id: `arxiv-${entry.id.split('/').pop()}`,
        type: 'news',
        source: 'arxiv',
        title: entry.title,
        content: entry.summary.slice(0, 2000), // Truncate long abstracts
        url: entry.link,
        contentHash,
        priority: 'normal', // Academic papers are normal priority
        categories: ['research', 'ai', ...entry.categories.slice(0, 3)],
        metadata: {
          arxivId: entry.id,
          authors: entry.authors,
          updated: entry.updated,
        },
        publishedAt: entry.published,
      });

      if (item) {
        items.push(item);
      }
    }

    updateIngestionState('arxiv', entries[0]?.id);
    console.info(`[Ingester] arXiv: ingested ${items.length} new items`);

    return items;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    updateIngestionState('arxiv', undefined, message);
    console.error(`[Ingester] arXiv error: ${message}`);
    return [];
  }
}

// ============================================================================
// Combined Polling
// ============================================================================

/**
 * Poll all enabled sources.
 * Call this from a cron job or background process.
 */
export async function pollAllSources(): Promise<{ source: string; count: number }[]> {
  const results: { source: string; count: number }[] = [];

  // Poll in parallel
  const [hnItems, arxivItems] = await Promise.all([
    pollHackerNews(),
    pollArxiv(),
  ]);

  results.push({ source: 'hackernews', count: hnItems.length });
  results.push({ source: 'arxiv', count: arxivItems.length });

  console.info(`[Ingester] Total: ${hnItems.length + arxivItems.length} new items`);

  return results;
}

/**
 * Get the configured poll interval in milliseconds.
 */
export function getPollIntervalMs(): number {
  const interval = getConfig('poll_interval_ms');
  return parseInt(interval || '900000', 10); // Default 15 minutes
}

// ============================================================================
// Helpers
// ============================================================================

function computeHash(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

function priorityFromPoints(points: number): StimulusItem['priority'] {
  if (points >= 500) return 'breaking';
  if (points >= 200) return 'high';
  if (points >= 50) return 'normal';
  return 'low';
}

function extractCategories(title: string, tags: string[]): string[] {
  const categories: string[] = [];
  const titleLower = title.toLowerCase();

  // Category detection from title
  if (titleLower.includes('ai') || titleLower.includes('artificial intelligence') || titleLower.includes('machine learning')) {
    categories.push('ai');
  }
  if (titleLower.includes('crypto') || titleLower.includes('bitcoin') || titleLower.includes('blockchain') || titleLower.includes('solana')) {
    categories.push('crypto');
  }
  if (titleLower.includes('rust') || titleLower.includes('typescript') || titleLower.includes('python') || titleLower.includes('programming')) {
    categories.push('programming');
  }
  if (titleLower.includes('startup') || titleLower.includes('funding') || titleLower.includes('vc')) {
    categories.push('startups');
  }
  if (titleLower.includes('open source') || titleLower.includes('github')) {
    categories.push('open-source');
  }
  if (titleLower.includes('security') || titleLower.includes('hack') || titleLower.includes('vulnerability')) {
    categories.push('security');
  }

  // Add HN tags if present
  for (const tag of tags) {
    if (tag !== 'story' && tag !== 'front_page' && !categories.includes(tag)) {
      categories.push(tag);
    }
  }

  // Default category
  if (categories.length === 0) {
    categories.push('tech');
  }

  return categories.slice(0, 5); // Max 5 categories
}

function parseArxivXml(xml: string): ArxivEntry[] {
  const entries: ArxivEntry[] = [];

  // Simple regex-based XML parsing (good enough for arXiv's consistent format)
  const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);

  for (const match of entryMatches) {
    const entryXml = match[1];

    const id = entryXml.match(/<id>([^<]+)<\/id>/)?.[1] || '';
    const title = entryXml.match(/<title>([^<]+)<\/title>/)?.[1]?.trim().replace(/\s+/g, ' ') || '';
    const summary = entryXml.match(/<summary>([^]*?)<\/summary>/)?.[1]?.trim().replace(/\s+/g, ' ') || '';
    const published = entryXml.match(/<published>([^<]+)<\/published>/)?.[1] || '';
    const updated = entryXml.match(/<updated>([^<]+)<\/updated>/)?.[1] || '';

    // Extract authors
    const authors: string[] = [];
    const authorMatches = entryXml.matchAll(/<author>\s*<name>([^<]+)<\/name>/g);
    for (const authorMatch of authorMatches) {
      authors.push(authorMatch[1].trim());
    }

    // Extract categories
    const categories: string[] = [];
    const catMatches = entryXml.matchAll(/category term="([^"]+)"/g);
    for (const catMatch of catMatches) {
      categories.push(catMatch[1]);
    }

    // Extract PDF link
    const link = entryXml.match(/<link[^>]*href="([^"]+)"[^>]*type="text\/html"/)?.[1]
      || entryXml.match(/<link[^>]*href="([^"]+)"/)?.[1]
      || id;

    if (id && title) {
      entries.push({
        id,
        title,
        summary,
        published,
        updated,
        authors,
        categories,
        link,
      });
    }
  }

  return entries;
}
