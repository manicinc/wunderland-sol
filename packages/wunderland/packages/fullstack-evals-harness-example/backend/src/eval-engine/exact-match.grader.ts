import { BaseGrader, EvalInput, GraderResult } from './base.grader';

/**
 * Exact match grader - simplest evaluation strategy.
 * Compares output to expected string.
 *
 * Config options:
 * - caseSensitive: boolean (default: false)
 * - trimWhitespace: boolean (default: true)
 */
export class ExactMatchGrader extends BaseGrader {
  get type(): string {
    return 'exact-match';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { output, expected } = evalInput;

    if (!expected) {
      return {
        pass: false,
        score: 0,
        reason: 'No expected output provided for exact match comparison',
      };
    }

    const caseSensitive = this.getConfigValue('caseSensitive', false);
    const trimWhitespace = this.getConfigValue('trimWhitespace', true);

    let normalizedOutput = output;
    let normalizedExpected = expected;

    if (trimWhitespace) {
      normalizedOutput = normalizedOutput.trim();
      normalizedExpected = normalizedExpected.trim();
    }

    if (!caseSensitive) {
      normalizedOutput = normalizedOutput.toLowerCase();
      normalizedExpected = normalizedExpected.toLowerCase();
    }

    const pass = normalizedOutput === normalizedExpected;

    return {
      pass,
      score: pass ? 1.0 : 0.0,
      reason: pass
        ? 'Output matches expected exactly'
        : `Output "${this.truncate(output)}" does not match expected "${this.truncate(expected)}"`,
    };
  }

  private truncate(str: string, maxLen = 50): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...';
  }
}
