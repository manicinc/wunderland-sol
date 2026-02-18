/**
 * @file knowledge-base.service.ts
 * @description Loads markdown documentation files, chunks them by heading boundaries,
 * and provides keyword-based search for RAG context building.
 */

import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface KnowledgeChunk {
  docPath: string;
  docTitle: string;
  section: string;
  content: string;
  keywords: Set<string>;
}

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'because', 'but', 'and',
  'or', 'if', 'while', 'about', 'up', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'our', 'their',
]);

/** Max characters per chunk (~1500 tokens) */
const MAX_CHUNK_CHARS = 6000;
/** Max total context characters for GPT-4o (~8000 tokens) */
const MAX_CONTEXT_CHARS = 32000;

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger('KnowledgeBase');
  private chunks: KnowledgeChunk[] = [];

  async onModuleInit(): Promise<void> {
    this.loadDocumentation();
    this.logger.log(`Knowledge base loaded: ${this.chunks.length} chunks from documentation`);
  }

  /**
   * Find the most relevant chunks for a query using keyword overlap scoring.
   */
  findRelevantChunks(query: string, maxChunks = 5): KnowledgeChunk[] {
    const queryTokens = this.tokenize(query);
    if (queryTokens.size === 0) return this.chunks.slice(0, maxChunks);

    const scored = this.chunks.map(chunk => {
      let score = 0;
      for (const token of queryTokens) {
        if (chunk.keywords.has(token)) score += 1;
        // Boost for partial matches (prefix)
        for (const kw of chunk.keywords) {
          if (kw.startsWith(token) || token.startsWith(kw)) {
            score += 0.5;
          }
        }
      }
      // Boost for title/section match
      const sectionLower = chunk.section.toLowerCase();
      const titleLower = chunk.docTitle.toLowerCase();
      for (const token of queryTokens) {
        if (sectionLower.includes(token)) score += 2;
        if (titleLower.includes(token)) score += 1.5;
      }
      return { chunk, score };
    });

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxChunks)
      .map(s => s.chunk);
  }

  /**
   * Build a context string from the most relevant chunks for a query.
   */
  buildContext(query: string): string {
    const chunks = this.findRelevantChunks(query, 8);
    if (chunks.length === 0) {
      return 'No relevant documentation found for this query.';
    }

    const parts: string[] = [];
    let totalChars = 0;

    for (const chunk of chunks) {
      const entry = `--- Source: ${chunk.docTitle} > ${chunk.section} ---\n${chunk.content}\n`;
      if (totalChars + entry.length > MAX_CONTEXT_CHARS) break;
      parts.push(entry);
      totalChars += entry.length;
    }

    return parts.join('\n');
  }

  /**
   * Get brief search results (titles + excerpts) for /docs command.
   */
  searchDocs(topic: string, maxResults = 3): Array<{ title: string; section: string; excerpt: string }> {
    const chunks = this.findRelevantChunks(topic, maxResults);
    return chunks.map(chunk => ({
      title: chunk.docTitle,
      section: chunk.section,
      excerpt: chunk.content.slice(0, 200).replace(/\n/g, ' ') + '...',
    }));
  }

  // ---------------------------------------------------------------------------
  // Private: Loading & chunking
  // ---------------------------------------------------------------------------

  private loadDocumentation(): void {
    // Resolve paths relative to the project root
    const projectRoot = path.resolve(process.cwd(), '..');
    const docPaths = [
      path.join(projectRoot, 'apps/wunderland-sh/docs-site/docs/guides'),
      path.join(projectRoot, 'apps/wunderland-sh/docs-site/docs/getting-started'),
    ];

    for (const docDir of docPaths) {
      if (!fs.existsSync(docDir)) {
        this.logger.warn(`Doc directory not found: ${docDir}`);
        continue;
      }
      this.loadDirectory(docDir);
    }

    // Also load some inline knowledge about pricing and getting started
    this.addInlineKnowledge();
  }

  private loadDirectory(dirPath: string): void {
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.md'));
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const title = this.extractTitle(content, file);
        const sections = this.splitBySections(content);

        for (const section of sections) {
          const chunks = this.splitIntoChunks(section.content);
          for (const chunkContent of chunks) {
            this.chunks.push({
              docPath: filePath,
              docTitle: title,
              section: section.heading,
              content: chunkContent,
              keywords: this.tokenize(chunkContent + ' ' + section.heading + ' ' + title),
            });
          }
        }
      } catch (error: any) {
        this.logger.warn(`Failed to load doc ${file}: ${error.message}`);
      }
    }
  }

  private extractTitle(content: string, filename: string): string {
    const match = content.match(/^#\s+(.+)/m);
    if (match) return match[1].trim();
    // Convert filename to title
    return filename
      .replace(/\.md$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  private splitBySections(content: string): Array<{ heading: string; content: string }> {
    const lines = content.split('\n');
    const sections: Array<{ heading: string; content: string }> = [];
    let currentHeading = 'Introduction';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,3}\s+(.+)/);
      if (headingMatch) {
        // Save previous section
        if (currentContent.length > 0) {
          sections.push({
            heading: currentHeading,
            content: currentContent.join('\n').trim(),
          });
        }
        currentHeading = headingMatch[1].trim();
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentContent.length > 0) {
      sections.push({
        heading: currentHeading,
        content: currentContent.join('\n').trim(),
      });
    }

    return sections.filter(s => s.content.length > 20); // Skip tiny sections
  }

  private splitIntoChunks(content: string): string[] {
    if (content.length <= MAX_CHUNK_CHARS) return [content];

    const chunks: string[] = [];
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      currentChunk += para + '\n\n';
    }

    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private tokenize(text: string): Set<string> {
    const words = text.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/);
    const tokens = new Set<string>();
    for (const word of words) {
      if (word.length > 2 && !STOPWORDS.has(word)) {
        tokens.add(word);
      }
    }
    return tokens;
  }

  private addInlineKnowledge(): void {
    // Pricing knowledge
    this.chunks.push({
      docPath: 'inline:pricing',
      docTitle: 'Pricing',
      section: 'Subscription Tiers',
      content: [
        'Rabbit Hole has three pricing tiers:',
        '',
        'Starter ($19/month): 3-day free trial, 1 self-hosted agent, BYO LLM keys (OpenAI/Anthropic/OpenRouter), voice/text agent builder, export Docker Compose bundles, curated extensions + skills, prompt injection defenses, community support.',
        '',
        'Pro ($49/month - Most Popular): 3-day free trial, up to 5 self-hosted agents, BYO LLM keys + tool keys, advanced builder templates, multi-channel integrations (Telegram/Slack/Discord/WebChat), audit logs + immutable agent sealing, priority support.',
        '',
        'Enterprise (Custom pricing): Unlimited Wunderbots, managed runtime (dedicated), on-site / private deployment, custom integrations & API access, dedicated account manager, team pricing & volume discounts, SLA guarantees, SSO / SAML authentication.',
        '',
        'Self-host free forever with `npm install -g wunderland`. No per-message fees - you pay model providers directly.',
      ].join('\n'),
      keywords: this.tokenize('pricing price cost tier plan starter pro enterprise subscription free trial'),
    });

    // Getting started knowledge
    this.chunks.push({
      docPath: 'inline:getting-started',
      docTitle: 'Getting Started',
      section: 'Quick Start',
      content: [
        'To get started with Rabbit Hole:',
        '1. Create an account at rabbithole.inc',
        '2. Describe your agent using the voice/text builder',
        '3. Configure personality (HEXACO traits), security tier, and channels',
        '4. Export a Docker Compose bundle',
        '5. Deploy to your VPS with `docker compose up -d --build`',
        '6. Connect and iterate from the dashboard',
        '',
        'For free self-hosting without an account:',
        '```',
        'npm install -g wunderland',
        'wunderland setup',
        'wunderland start',
        'wunderland chat',
        '```',
      ].join('\n'),
      keywords: this.tokenize('getting started quick start setup install deploy docker compose vps agent create account'),
    });
  }
}
