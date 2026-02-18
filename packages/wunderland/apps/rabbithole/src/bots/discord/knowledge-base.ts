/**
 * @file knowledge-base.ts
 * @description Loads .md docs from the wunderland-sh docs-site, chunks them by headings,
 * and provides keyword-based search for RAG context.
 */

import fs from 'fs';
import path from 'path';
import { BotLogger } from '../shared/logger';

const logger = new BotLogger('KnowledgeBase');

interface DocChunk {
  source: string;
  heading: string;
  content: string;
  keywords: string[];
}

export class KnowledgeBaseService {
  private chunks: DocChunk[] = [];
  private loaded = false;

  constructor() {
    this.loadDocs();
  }

  // --- Loading ---

  private getDocsPath(): string {
    // In Next.js, process.cwd() is the app root (apps/rabbithole/)
    // Docs are at ../../apps/wunderland-sh/docs-site/docs relative to app root
    // Since monorepo root is 2 levels up: apps/rabbithole -> root
    const monorepoRoot = path.resolve(process.cwd(), '../..');
    return path.join(monorepoRoot, 'apps/wunderland-sh/docs-site/docs');
  }

  private loadDocs(): void {
    try {
      const docsPath = this.getDocsPath();

      if (!fs.existsSync(docsPath)) {
        logger.warn(`Docs directory not found at ${docsPath}. Knowledge base empty.`);
        this.loaded = true;
        return;
      }

      this.walkAndParse(docsPath, docsPath);
      this.loaded = true;
      logger.log(`Knowledge base loaded: ${this.chunks.length} chunks from docs.`);
    } catch (error) {
      logger.error('Failed to load knowledge base docs', String(error));
      this.loaded = true;
    }
  }

  private walkAndParse(dir: string, rootDir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        this.walkAndParse(fullPath, rootDir);
      } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const relativePath = path.relative(rootDir, fullPath);
          this.parseMarkdownIntoChunks(raw, relativePath);
        } catch {
          logger.warn(`Failed to read file: ${fullPath}`);
        }
      }
    }
  }

  private parseMarkdownIntoChunks(content: string, source: string): void {
    const MAX_CHUNK = 6000;
    const lines = content.split('\n');
    let currentHeading = source;
    let currentContent = '';

    const flushChunk = (): void => {
      const trimmed = currentContent.trim();
      if (trimmed.length > 0) {
        const keywords = this.extractKeywords(trimmed);
        this.chunks.push({
          source,
          heading: currentHeading,
          content: trimmed,
          keywords,
        });
      }
      currentContent = '';
    };

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        if (currentContent.length > 0) {
          flushChunk();
        }
        currentHeading = headingMatch[1].trim();
        currentContent = line + '\n';
      } else {
        currentContent += line + '\n';
        if (currentContent.length >= MAX_CHUNK) {
          flushChunk();
        }
      }
    }

    flushChunk();
  }

  private extractKeywords(text: string): string[] {
    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2);

    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'has', 'have', 'from', 'that',
      'this', 'with', 'they', 'been', 'will', 'each', 'make', 'like',
      'long', 'look', 'many', 'some', 'than', 'them', 'then', 'what',
      'when', 'who', 'how', 'its', 'may', 'into',
    ]);

    return [...new Set(words.filter((w) => !stopWords.has(w)))];
  }

  // --- Search ---

  findRelevantChunks(query: string, maxChunks: number = 5): DocChunk[] {
    if (this.chunks.length === 0) return [];

    const queryKeywords = this.extractKeywords(query);
    if (queryKeywords.length === 0) return this.chunks.slice(0, maxChunks);

    const scored = this.chunks.map((chunk) => {
      let score = 0;

      for (const qk of queryKeywords) {
        if (chunk.heading.toLowerCase().includes(qk)) score += 3;
        if (chunk.keywords.includes(qk)) score += 2;
        if (chunk.content.toLowerCase().includes(qk)) score += 1;
      }

      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map((s) => s.chunk);
  }

  buildContext(query: string, maxChunks: number = 3): string {
    const relevant = this.findRelevantChunks(query, maxChunks);
    if (relevant.length === 0) return '';

    return relevant
      .map((c) => `## ${c.heading} (${c.source})\n${c.content}`)
      .join('\n\n---\n\n');
  }

  searchDocs(query: string): { heading: string; source: string; excerpt: string }[] {
    const chunks = this.findRelevantChunks(query, 10);
    return chunks.map((c) => ({
      heading: c.heading,
      source: c.source,
      excerpt: c.content.substring(0, 200) + (c.content.length > 200 ? '...' : ''),
    }));
  }

  getChunkCount(): number {
    return this.chunks.length;
  }
}
