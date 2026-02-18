/**
 * Codex Tool Plugin Template
 * Replace this with your actual implementation
 * @module your-plugin-name
 */

import type {
  CodexPlugin,
  PluginManifest,
  CodexIndexer,
  CodexValidator,
  CodexTransformer,
  CodexAnalyzer,
  StrandMetadata,
  IndexResult,
  ValidationResult,
  AnalysisResult,
} from '@framers/codex-extensions';

// Import your manifest
import manifest from '../manifest.json';

/**
 * Example Indexer Implementation
 * Extracts searchable tokens from content
 */
const exampleIndexer: CodexIndexer = {
  name: 'example-indexer',
  description: 'Extracts keywords and tokens for search indexing',
  fileTypes: ['.md', '.mdx'],

  async index(content: string, metadata: StrandMetadata): Promise<IndexResult> {
    try {
      // Your indexing logic here
      // Example: simple word tokenization
      const tokens = content
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);

      // Remove duplicates
      const uniqueTokens = [...new Set(tokens)];

      return {
        success: true,
        tokens: uniqueTokens,
        metadata: {
          wordCount: tokens.length,
          uniqueWords: uniqueTokens.length,
          path: metadata.path,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Indexing failed',
      };
    }
  },
};

/**
 * Example Validator Implementation
 * Validates content meets quality standards
 */
const exampleValidator: CodexValidator = {
  name: 'example-validator',
  description: 'Validates content quality and structure',
  severity: 'warning',

  async validate(content: string, metadata: StrandMetadata): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // Example validations
    if (content.length < 100) {
      warnings.push({
        code: 'MIN_LENGTH',
        message: 'Content is shorter than recommended minimum (100 chars)',
        suggestion: 'Consider adding more detail to this strand',
        severity: 'warning',
      });
    }

    if (!metadata.title) {
      errors.push({
        code: 'MISSING_TITLE',
        message: 'Strand is missing a title in frontmatter',
        suggestion: 'Add a title field to the YAML frontmatter',
      });
    }

    if (content.includes('TODO') || content.includes('FIXME')) {
      warnings.push({
        code: 'UNFINISHED_CONTENT',
        message: 'Content contains TODO or FIXME markers',
        suggestion: 'Complete or remove placeholder content before publishing',
        severity: 'warning',
      });
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  },
};

/**
 * Example Analyzer Implementation
 * Extracts insights from content
 */
const exampleAnalyzer: CodexAnalyzer = {
  name: 'example-analyzer',
  description: 'Analyzes content for keywords and readability',

  async analyze(content: string, metadata: StrandMetadata): Promise<AnalysisResult> {
    // Simple keyword extraction (replace with your logic)
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    
    for (const word of words) {
      if (word.length > 4) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }

    const keywords = [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);

    // Simple readability score (Flesch-Kincaid approximation)
    const sentences = content.split(/[.!?]+/).length;
    const avgWordsPerSentence = words.length / Math.max(sentences, 1);
    const readabilityScore = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence));

    return {
      summary: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
      keywords,
      readability: {
        grade: Math.round(avgWordsPerSentence / 2),
        ease: readabilityScore,
        metric: 'flesch-kincaid',
      },
      custom: {
        wordCount: words.length,
        sentenceCount: sentences,
        avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
      },
    };
  },
};

/**
 * The Plugin Export
 * This is what gets loaded by the plugin system
 */
const plugin: CodexPlugin = {
  manifest: manifest as PluginManifest,

  // Lifecycle hooks
  async onLoad() {
    console.log(`[${manifest.name}] Plugin loaded`);
  },

  async onUnload() {
    console.log(`[${manifest.name}] Plugin unloaded`);
  },

  async onActivate() {
    console.log(`[${manifest.name}] Plugin activated`);
  },

  async onDeactivate() {
    console.log(`[${manifest.name}] Plugin deactivated`);
  },

  // Capabilities - uncomment what you need
  indexer: exampleIndexer,
  validator: exampleValidator,
  analyzer: exampleAnalyzer,
  // transformer: exampleTransformer,
  // exporter: exampleExporter,
};

export default plugin;

// Also export individual components for flexibility
export { exampleIndexer, exampleValidator, exampleAnalyzer };

