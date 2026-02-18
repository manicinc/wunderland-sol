/**
 * @file textChunker.service.ts
 * @description Intelligent text chunking service for streaming TTS processing
 * @version 1.0.0
 */

export interface TextChunk {
  id: string;
  text: string;
  index: number;
  startOffset: number;
  endOffset: number;
  isFirst: boolean;
  isLast: boolean;
  estimatedDurationMs: number;
  priority: 'high' | 'normal' | 'low';
}

export interface ChunkingOptions {
  /** Target chunk size in characters */
  targetChunkSize?: number;
  /** Maximum chunk size in characters */
  maxChunkSize?: number;
  /** Minimum chunk size in characters */
  minChunkSize?: number;
  /** Prefer breaking at sentence boundaries */
  preferSentenceBoundaries?: boolean;
  /** Prefer breaking at paragraph boundaries */
  preferParagraphBoundaries?: boolean;
  /** Strategy for chunking */
  strategy?: 'sentence' | 'paragraph' | 'fixed' | 'smart';
  /** Preserve markdown formatting */
  preserveMarkdown?: boolean;
  /** Estimated words per minute for duration calculation */
  wordsPerMinute?: number;
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  targetChunkSize: 300,
  maxChunkSize: 500,
  minChunkSize: 50,
  preferSentenceBoundaries: true,
  preferParagraphBoundaries: false,
  strategy: 'smart',
  preserveMarkdown: true,
  wordsPerMinute: 150,
};

/**
 * Service for intelligently chunking text for optimal TTS streaming
 */
export class TextChunkerService {
  private readonly sentenceDelimiters = /[.!?]+/g;
  private readonly paragraphDelimiters = /\n\n+/g;
  private readonly markdownCodeBlockPattern = /```[\s\S]*?```/g;
  private readonly markdownHeadingPattern = /^#{1,6}\s+.*$/gm;

  /**
   * Chunks text into optimal segments for TTS processing
   */
  public chunkText(text: string, options: ChunkingOptions = {}): TextChunk[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Clean and normalize text
    const normalizedText = this.normalizeText(text);

    // Choose chunking strategy
    let chunks: TextChunk[];
    switch (opts.strategy) {
      case 'sentence':
        chunks = this.chunkBySentences(normalizedText, opts);
        break;
      case 'paragraph':
        chunks = this.chunkByParagraphs(normalizedText, opts);
        break;
      case 'fixed':
        chunks = this.chunkByFixedSize(normalizedText, opts);
        break;
      case 'smart':
      default:
        chunks = this.smartChunk(normalizedText, opts);
        break;
    }

    // Assign priorities based on position
    chunks = this.assignPriorities(chunks);

    // Calculate estimated durations
    chunks = this.calculateDurations(chunks, opts.wordsPerMinute || 150);

    return chunks;
  }

  /**
   * Smart chunking that adapts to content type
   */
  private smartChunk(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Detect and handle special content
    if (options.preserveMarkdown && this.hasMarkdownContent(text)) {
      return this.chunkMarkdownAware(text, options);
    }

    // First, try to split by paragraphs if they exist
    const paragraphs = text.split(this.paragraphDelimiters);

    if (paragraphs.length > 1) {
      let offset = 0;
      for (const paragraph of paragraphs) {
        if (paragraph.trim().length === 0) continue;

        if (paragraph.length <= options.maxChunkSize!) {
          // Paragraph fits in a single chunk
          chunks.push(this.createChunk(
            paragraph,
            chunks.length,
            offset,
            offset + paragraph.length,
            chunks.length === 0,
            false
          ));
        } else {
          // Paragraph too long, split by sentences
          const sentenceChunks = this.chunkBySentences(paragraph, options);
          sentenceChunks.forEach((chunk, idx) => {
            chunks.push({
              ...chunk,
              index: chunks.length,
              startOffset: offset + chunk.startOffset,
              endOffset: offset + chunk.endOffset,
              isFirst: chunks.length === 0 && idx === 0,
              isLast: false,
            });
          });
        }
        offset += paragraph.length + 2; // Account for \n\n
      }
    } else {
      // No paragraphs, chunk by sentences
      return this.chunkBySentences(text, options);
    }

    // Mark the last chunk
    if (chunks.length > 0) {
      chunks[chunks.length - 1].isLast = true;
    }

    return chunks;
  }

  /**
   * Chunk text by sentences
   */
  private chunkBySentences(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const sentences = this.splitIntoSentences(text);

    let currentChunk = '';
    let currentStartOffset = 0;
    let currentEndOffset = 0;
    let offset = 0;

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length === 0) continue;

      const sentenceWithSpace = currentChunk.length > 0 ? ' ' + trimmedSentence : trimmedSentence;

      if (currentChunk.length + sentenceWithSpace.length <= options.targetChunkSize!) {
        // Add sentence to current chunk
        currentChunk += sentenceWithSpace;
        currentEndOffset = offset + sentence.length;
      } else if (currentChunk.length >= options.minChunkSize!) {
        // Current chunk is complete, start new one
        chunks.push(this.createChunk(
          currentChunk,
          chunks.length,
          currentStartOffset,
          currentEndOffset,
          chunks.length === 0,
          false
        ));

        currentChunk = trimmedSentence;
        currentStartOffset = offset;
        currentEndOffset = offset + sentence.length;
      } else {
        // Current chunk too small, force add even if over target
        currentChunk += sentenceWithSpace;
        currentEndOffset = offset + sentence.length;

        // If we exceed max, split forcefully
        if (currentChunk.length > options.maxChunkSize!) {
          chunks.push(this.createChunk(
            currentChunk,
            chunks.length,
            currentStartOffset,
            currentEndOffset,
            chunks.length === 0,
            false
          ));
          currentChunk = '';
          currentStartOffset = currentEndOffset;
        }
      }

      offset += sentence.length;
    }

    // Add remaining chunk if any
    if (currentChunk.trim().length > 0) {
      chunks.push(this.createChunk(
        currentChunk,
        chunks.length,
        currentStartOffset,
        currentEndOffset,
        chunks.length === 0,
        true
      ));
    }

    return chunks;
  }

  /**
   * Chunk text by paragraphs
   */
  private chunkByParagraphs(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const paragraphs = text.split(this.paragraphDelimiters);
    let offset = 0;

    paragraphs.forEach((paragraph, index) => {
      const trimmed = paragraph.trim();
      if (trimmed.length === 0) return;

      chunks.push(this.createChunk(
        trimmed,
        chunks.length,
        offset,
        offset + paragraph.length,
        index === 0,
        index === paragraphs.length - 1
      ));

      offset += paragraph.length + 2; // Account for \n\n
    });

    return chunks;
  }

  /**
   * Chunk text by fixed size
   */
  private chunkByFixedSize(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];
    const chunkSize = options.targetChunkSize || 300;

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, Math.min(i + chunkSize, text.length));
      chunks.push(this.createChunk(
        chunk,
        chunks.length,
        i,
        Math.min(i + chunkSize, text.length),
        i === 0,
        i + chunkSize >= text.length
      ));
    }

    return chunks;
  }

  /**
   * Markdown-aware chunking
   */
  private chunkMarkdownAware(text: string, options: ChunkingOptions): TextChunk[] {
    const chunks: TextChunk[] = [];

    // Extract code blocks to preserve them intact
    const codeBlocks: Array<{ start: number; end: number; content: string }> = [];
    let match;
    const codeBlockRegex = new RegExp(this.markdownCodeBlockPattern);

    while ((match = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[0],
      });
    }

    // Process text, treating code blocks as single units
    let currentPos = 0;

    for (const block of codeBlocks) {
      // Process text before code block
      if (block.start > currentPos) {
        const beforeText = text.slice(currentPos, block.start);
        const beforeChunks = this.smartChunk(beforeText, { ...options, preserveMarkdown: false });
        beforeChunks.forEach(chunk => {
          chunks.push({
            ...chunk,
            index: chunks.length,
            startOffset: currentPos + chunk.startOffset,
            endOffset: currentPos + chunk.endOffset,
            isFirst: chunks.length === 0,
            isLast: false,
          });
        });
      }

      // Add code block as single chunk (if not too large)
      if (block.content.length <= options.maxChunkSize! * 2) {
        // Allow code blocks to be up to 2x max size
        chunks.push(this.createChunk(
          block.content,
          chunks.length,
          block.start,
          block.end,
          chunks.length === 0,
          false
        ));
      } else {
        // Code block too large, split it
        const codeChunks = this.chunkByFixedSize(block.content, options);
        codeChunks.forEach(chunk => {
          chunks.push({
            ...chunk,
            index: chunks.length,
            startOffset: block.start + chunk.startOffset,
            endOffset: block.start + chunk.endOffset,
            isFirst: chunks.length === 0,
            isLast: false,
          });
        });
      }

      currentPos = block.end;
    }

    // Process remaining text after last code block
    if (currentPos < text.length) {
      const remainingText = text.slice(currentPos);
      const remainingChunks = this.smartChunk(remainingText, { ...options, preserveMarkdown: false });
      remainingChunks.forEach(chunk => {
        chunks.push({
          ...chunk,
          index: chunks.length,
          startOffset: currentPos + chunk.startOffset,
          endOffset: currentPos + chunk.endOffset,
          isFirst: chunks.length === 0,
          isLast: false,
        });
      });
    }

    // Mark last chunk
    if (chunks.length > 0) {
      chunks[chunks.length - 1].isLast = true;
    }

    return chunks;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Advanced sentence splitting that handles edge cases
    const sentences: string[] = [];
    let current = '';
    let inQuote = false;
    let inParentheses = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      current += char;

      // Track quotes and parentheses
      if (char === '"' || char === "'") {
        inQuote = !inQuote;
      } else if (char === '(') {
        inParentheses++;
      } else if (char === ')') {
        inParentheses = Math.max(0, inParentheses - 1);
      }

      // Check for sentence end
      if (!inQuote && inParentheses === 0) {
        if ((char === '.' || char === '!' || char === '?') &&
            (!nextChar || nextChar === ' ' || nextChar === '\n')) {
          // Check if not an abbreviation
          if (!this.isAbbreviation(current)) {
            sentences.push(current);
            current = '';
          }
        }
      }
    }

    // Add remaining text
    if (current.trim().length > 0) {
      sentences.push(current);
    }

    return sentences;
  }

  /**
   * Check if text ends with common abbreviation
   */
  private isAbbreviation(text: string): boolean {
    const commonAbbreviations = [
      'Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Prof.', 'Sr.', 'Jr.',
      'Inc.', 'Corp.', 'Co.', 'Ltd.', 'LLC.',
      'vs.', 'etc.', 'i.e.', 'e.g.', 'cf.', 'al.',
      'Jan.', 'Feb.', 'Mar.', 'Apr.', 'Jun.', 'Jul.',
      'Aug.', 'Sep.', 'Sept.', 'Oct.', 'Nov.', 'Dec.',
    ];

    const lastWord = text.trim().split(' ').pop() || '';
    return commonAbbreviations.some(abbr =>
      lastWord.toLowerCase().endsWith(abbr.toLowerCase())
    );
  }

  /**
   * Normalize text for processing
   */
  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')  // Normalize line endings
      .replace(/\t/g, '    ')   // Convert tabs to spaces
      .trim();
  }

  /**
   * Check if text contains markdown content
   */
  private hasMarkdownContent(text: string): boolean {
    return this.markdownCodeBlockPattern.test(text) ||
           this.markdownHeadingPattern.test(text) ||
           text.includes('**') ||
           text.includes('__') ||
           text.includes('```');
  }

  /**
   * Create a text chunk
   */
  private createChunk(
    text: string,
    index: number,
    startOffset: number,
    endOffset: number,
    isFirst: boolean,
    isLast: boolean
  ): TextChunk {
    return {
      id: `chunk-${index}-${Date.now()}`,
      text: text.trim(),
      index,
      startOffset,
      endOffset,
      isFirst,
      isLast,
      estimatedDurationMs: 0, // Will be calculated later
      priority: 'normal',
    };
  }

  /**
   * Assign priorities to chunks based on position
   */
  private assignPriorities(chunks: TextChunk[]): TextChunk[] {
    return chunks.map((chunk, index) => {
      let priority: 'high' | 'normal' | 'low' = 'normal';

      // First chunks get high priority for immediate playback
      if (index < 2) {
        priority = 'high';
      } else if (index > chunks.length - 3) {
        // Last chunks get low priority as user might interrupt
        priority = 'low';
      }

      return { ...chunk, priority };
    });
  }

  /**
   * Calculate estimated duration for each chunk
   */
  private calculateDurations(chunks: TextChunk[], wordsPerMinute: number): TextChunk[] {
    return chunks.map(chunk => {
      const wordCount = chunk.text.split(/\s+/).length;
      const estimatedDurationMs = (wordCount / wordsPerMinute) * 60 * 1000;
      return { ...chunk, estimatedDurationMs };
    });
  }

  /**
   * Optimize chunks for specific TTS constraints
   */
  public optimizeForProvider(
    chunks: TextChunk[],
    provider: 'openai' | 'browser',
    maxCharsPerRequest: number = 4096
  ): TextChunk[] {
    if (provider === 'openai') {
      // OpenAI has a 4096 character limit
      return chunks.map(chunk => {
        if (chunk.text.length > maxCharsPerRequest) {
          // Split oversized chunks
          const subChunks = this.chunkByFixedSize(chunk.text, {
            targetChunkSize: Math.floor(maxCharsPerRequest * 0.9),
            maxChunkSize: maxCharsPerRequest,
          });
          return subChunks[0]; // Return first sub-chunk, handle rest separately
        }
        return chunk;
      });
    }

    return chunks;
  }
}

// Singleton instance
export const textChunkerService = new TextChunkerService();

// Export for testing
export default TextChunkerService;