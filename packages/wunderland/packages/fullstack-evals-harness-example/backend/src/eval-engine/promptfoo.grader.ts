import { BaseGrader, EvalInput, GraderResult, GraderConfig } from './base.grader';
import { LlmService } from '../llm/llm.service';

type PromptfooAssertion = {
  type: string;
  threshold?: number;
  value?: string;
  provider?: string;
};

/**
 * Promptfoo-backed grader - uses promptfoo's assertion engine.
 *
 * This provides access to promptfoo's battle-tested assertions including:
 * - context-faithfulness (RAGAS faithfulness)
 * - answer-relevance (RAGAS answer relevancy)
 * - context-relevance (RAGAS context relevancy)
 * - context-recall (RAGAS context recall)
 * - similar (semantic similarity via embeddings)
 * - llm-rubric (LLM-as-judge)
 * - factuality (OpenAI factuality)
 * - And many more assertion types
 *
 * Supports multiple providers via Settings:
 * - OpenAI (gpt-4o, etc.)
 * - Anthropic (claude-sonnet-4-5, etc.)
 * - Ollama (llama3, mistral, etc.)
 *
 * Reference: https://promptfoo.dev/docs/configuration/expected-outputs/
 */
export class PromptfooGrader extends BaseGrader {
  private assertion: string;
  private threshold: number;

  constructor(
    graderConfig: GraderConfig,
    private llmService: LlmService
  ) {
    super(graderConfig);

    // Get promptfoo assertion type from config
    this.assertion = this.getConfigValue('assertion', 'llm-rubric');
    this.threshold = this.getConfigValue('threshold', 0.7);
  }

  get type(): string {
    return 'promptfoo';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { input, output: rawOutput, expected, context } = evalInput;
    const output = String(rawOutput || '');

    try {
      const { assertions: pf } = await import('promptfoo');

      // Get provider config for LLM-based assertions
      const providerConfig = await this.getProviderConfig();
      const grading: any = {};
      if (providerConfig.provider) {
        grading.provider = providerConfig.provider;
      }
      // Set env vars so promptfoo can find API keys
      if (providerConfig.env) {
        for (const [k, v] of Object.entries(providerConfig.env)) {
          process.env[k] = v;
        }
      }

      // Build the assertion object
      const assertion = this.buildAssertion(expected);

      // Use promptfoo's runAssertion directly — avoids the broken evaluate() + nunjucks path
      const result = await pf.runAssertion({
        prompt: input,
        provider: { id: () => 'echo' } as any,
        assertion: assertion as any,
        test: {
          vars: {
            query: input,
            context: context || '',
            expected: expected || '',
          },
          assert: [assertion as any],
          options: { provider: providerConfig.provider },
        } as any,
        vars: {
          query: input,
          context: context || '',
          expected: expected || '',
        },
        latencyMs: 0,
        providerResponse: {
          output,
          cost: 0,
        },
      });

      return this.parseRunAssertionResult(result);
    } catch (error) {
      return {
        pass: false,
        score: 0,
        reason: `Promptfoo evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get provider configuration from LlmService settings.
   */
  private async getProviderConfig(): Promise<{ provider?: string; env?: Record<string, string> }> {
    const settings = await this.llmService.getFullSettings();
    const env: Record<string, string> = {};

    // Map our provider names to promptfoo provider format
    let provider: string | undefined;

    switch (settings.provider) {
      case 'openai':
        provider = settings.model ? `openai:${settings.model}` : 'openai:gpt-4.1';
        if (settings.apiKey) {
          env.OPENAI_API_KEY = settings.apiKey;
        } else if (process.env.OPENAI_API_KEY) {
          env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        }
        break;

      case 'anthropic':
        provider = settings.model
          ? `anthropic:messages:${settings.model}`
          : 'anthropic:messages:claude-sonnet-4-5-20250929';
        if (settings.apiKey) {
          env.ANTHROPIC_API_KEY = settings.apiKey;
        } else if (process.env.ANTHROPIC_API_KEY) {
          env.ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
        }
        break;

      case 'ollama': {
        const baseUrl = settings.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        provider = settings.model ? `ollama:${settings.model}` : 'ollama:llama3';
        env.OLLAMA_BASE_URL = baseUrl;
        break;
      }

      default:
        // Fallback to OpenAI
        provider = 'openai:gpt-4.1';
        if (process.env.OPENAI_API_KEY) {
          env.OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        }
    }

    return { provider, env };
  }

  /**
   * Build a promptfoo assertion based on the configured type.
   */
  private buildAssertion(expected?: string): PromptfooAssertion {
    const baseAssertion: PromptfooAssertion = {
      type: this.assertion,
      threshold: this.threshold,
    };

    // Add type-specific configuration
    switch (this.assertion) {
      case 'llm-rubric':
        // Use the grader's rubric for LLM-based evaluation
        return {
          ...baseAssertion,
          value:
            this.rubric || 'Evaluate if the response is accurate, helpful, and well-structured.',
        };

      case 'similar':
        // Semantic similarity against expected output
        return {
          ...baseAssertion,
          value: expected || '',
        };

      case 'context-faithfulness':
      case 'answer-relevance':
      case 'context-relevance':
      case 'context-recall':
        // RAGAS-style metrics - context is passed via vars
        return baseAssertion;

      case 'contains':
      case 'equals':
      case 'regex':
        // Simple assertions need a value
        return {
          ...baseAssertion,
          value: expected || '',
        };

      case 'factuality':
        // OpenAI factuality check
        return baseAssertion;

      default:
        return baseAssertion;
    }
  }

  /**
   * Parse promptfoo runAssertion result into our GraderResult format.
   */
  private parseRunAssertionResult(result: any): GraderResult {
    if (!result) {
      return {
        pass: false,
        score: 0,
        reason: 'No result from promptfoo assertion',
      };
    }

    const reasons: string[] = [];
    if (result.reason) {
      reasons.push(result.reason);
    }
    if (result.componentResults) {
      for (const component of result.componentResults) {
        if (component.reason) {
          reasons.push(component.reason);
        }
      }
    }

    return {
      pass: result.pass ?? false,
      score: result.score ?? (result.pass ? 1 : 0),
      reason:
        reasons.join('. ') || `${this.assertion} evaluation: ${result.pass ? 'passed' : 'failed'}`,
    };
  }
}

/**
 * Available promptfoo assertion types for reference.
 * See: https://promptfoo.dev/docs/configuration/expected-outputs/
 */
export const PROMPTFOO_ASSERTIONS = {
  // Deterministic
  equals: 'Exact string match',
  contains: 'Output contains substring',
  regex: 'Output matches regex pattern',
  'is-json': 'Output is valid JSON',
  'is-valid-function-call': 'Valid function call format',

  // Semantic
  similar: 'Cosine similarity via embeddings',
  classifier: 'ML classifier evaluation',

  // LLM-as-Judge
  'llm-rubric': 'LLM evaluates against custom rubric',
  'g-eval': 'Chain-of-thought evaluation',
  factuality: 'OpenAI factuality check',
  'model-graded-closedqa': 'OpenAI closed QA evaluation',

  // RAGAS metrics (RAG evaluation)
  'context-faithfulness': 'Claims grounded in context (hallucination detection)',
  'answer-relevance': 'Answer relevant to query',
  'context-relevance': 'Retrieved context relevant to query',
  'context-recall': 'Ground truth present in context',

  // NLP metrics
  'rouge-n': 'ROUGE-N overlap score',
  bleu: 'BLEU translation quality',
  levenshtein: 'Edit distance score',

  // Safety
  'is-refusal': 'Model refused the task',
  guardrails: 'Harmful content detection',
} as const;

export type PromptfooAssertionType = keyof typeof PROMPTFOO_ASSERTIONS;
