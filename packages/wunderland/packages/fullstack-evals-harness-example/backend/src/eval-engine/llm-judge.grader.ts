import { BaseGrader, EvalInput, GraderResult } from './base.grader';
import { LlmService } from '../llm/llm.service';

/**
 * LLM Judge grader - uses an LLM to evaluate output against a rubric.
 *
 * The rubric defines what constitutes a passing response.
 * The LLM is prompted to return a structured judgment.
 *
 * Inspired by promptfoo's LLM assertion pattern.
 */
export class LlmJudgeGrader extends BaseGrader {
  constructor(
    graderConfig: {
      name: string;
      description?: string;
      rubric?: string;
      config?: Record<string, unknown>;
    },
    private llmService: LlmService
  ) {
    super(graderConfig);
  }

  get type(): string {
    return 'llm-judge';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { input, output, expected } = evalInput;

    if (!this.rubric) {
      return {
        pass: false,
        score: 0,
        reason: 'No rubric provided for LLM judge evaluation',
      };
    }

    const prompt = this.buildPrompt(input, output, expected);
    const systemPrompt = `You are an evaluation judge. Assess the output against the given criteria.
Respond with ONLY a JSON object in this exact format:
{"pass": true/false, "score": 0.0-1.0, "reason": "brief explanation"}`;

    try {
      const response = await this.llmService.complete(prompt, {
        temperature: 0.1, // Low temperature for consistent judgments
        systemPrompt,
      });

      const judged = this.parseResponse(response);

      // Optional: allow callers to enforce pass/fail via a numeric score threshold.
      // This makes the "threshold" UI control meaningful for llm-judge graders.
      const thresholdRaw = this.getConfigValue<unknown>('threshold', null);
      const threshold = typeof thresholdRaw === 'number' ? thresholdRaw : null;

      if (threshold !== null) {
        return {
          ...judged,
          pass: judged.score >= threshold,
        };
      }

      return judged;
    } catch (error) {
      return {
        pass: false,
        score: 0,
        reason: `LLM evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private buildPrompt(input: string, output: string, expected?: string): string {
    let prompt = `## Evaluation Task

**Input/Question:**
${input}

**Output to Evaluate:**
${output}

**Rubric/Criteria:**
${this.rubric}`;

    if (expected) {
      prompt += `

**Expected/Reference Output:**
${expected}`;
    }

    prompt += `

Based on the rubric, evaluate whether the output passes or fails. Provide a score from 0.0 to 1.0 and a brief reason.`;

    return prompt;
  }

  private parseResponse(response: string): GraderResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        pass: Boolean(parsed.pass),
        score:
          typeof parsed.score === 'number'
            ? Math.max(0, Math.min(1, parsed.score))
            : parsed.pass
              ? 1
              : 0,
        reason: String(parsed.reason || 'No reason provided'),
      };
    } catch {
      // Fallback: try to interpret the response
      const lowerResponse = response.toLowerCase();
      const pass = lowerResponse.includes('pass') && !lowerResponse.includes('fail');

      return {
        pass,
        score: pass ? 0.7 : 0.3,
        reason: `Could not parse structured response. Raw: ${response.slice(0, 200)}`,
      };
    }
  }
}
