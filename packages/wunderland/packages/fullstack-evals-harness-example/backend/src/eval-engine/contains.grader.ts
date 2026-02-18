import { BaseGrader, EvalInput, GraderResult } from './base.grader';

/**
 * Contains grader - checks if output contains required substrings.
 *
 * Config options:
 * - requiredStrings: string[] (required - list of strings to search for)
 * - mode: 'all' | 'any' (default: 'all')
 * - caseSensitive: boolean (default: false)
 */
export class ContainsGrader extends BaseGrader {
  get type(): string {
    return 'contains';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { output } = evalInput;
    const requiredStrings = this.getConfigValue<string[]>('requiredStrings', []);
    const mode = this.getConfigValue<'all' | 'any'>('mode', 'all');
    const caseSensitive = this.getConfigValue('caseSensitive', false);

    if (requiredStrings.length === 0) {
      return {
        pass: false,
        score: 0,
        reason: 'No requiredStrings provided in grader config',
      };
    }

    const normalizedOutput = caseSensitive ? output : output.toLowerCase();

    const results = requiredStrings.map((str) => {
      const needle = caseSensitive ? str : str.toLowerCase();
      return { string: str, found: normalizedOutput.includes(needle) };
    });

    const matchedCount = results.filter((r) => r.found).length;
    const score = matchedCount / requiredStrings.length;

    const pass = mode === 'all' ? matchedCount === requiredStrings.length : matchedCount > 0;

    const missing = results.filter((r) => !r.found).map((r) => r.string);
    const reason = pass
      ? `Output contains ${mode === 'all' ? 'all' : 'at least one of'} ${requiredStrings.length} required string(s)`
      : `Missing ${missing.length} required string(s): "${missing.slice(0, 3).join('", "')}"${missing.length > 3 ? ` ... and ${missing.length - 3} more` : ''}`;

    return { pass, score, reason };
  }
}
