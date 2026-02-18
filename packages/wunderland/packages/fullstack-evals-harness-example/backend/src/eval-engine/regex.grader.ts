import { BaseGrader, EvalInput, GraderResult } from './base.grader';

/**
 * Regex grader - checks if output matches a regular expression pattern.
 *
 * Config options:
 * - pattern: string (required - the regex pattern)
 * - flags: string (default: '' - regex flags like 'i', 'g', 'm')
 */
export class RegexGrader extends BaseGrader {
  get type(): string {
    return 'regex';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { output } = evalInput;
    const pattern = this.getConfigValue<string>('pattern', '');
    const flags = this.getConfigValue<string>('flags', '');

    if (!pattern) {
      return {
        pass: false,
        score: 0,
        reason: 'No regex pattern provided in grader config',
      };
    }

    try {
      const regex = new RegExp(pattern, flags);
      const matches = regex.test(output);

      return {
        pass: matches,
        score: matches ? 1.0 : 0.0,
        reason: matches
          ? `Output matches pattern /${pattern}/${flags}`
          : `Output does not match pattern /${pattern}/${flags}`,
      };
    } catch (error) {
      return {
        pass: false,
        score: 0,
        reason: `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
