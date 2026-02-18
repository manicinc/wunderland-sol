import { RegexGrader } from './regex.grader';

describe('RegexGrader', () => {
  it('should pass when output matches the pattern', async () => {
    const grader = new RegexGrader({
      name: 'Test',
      config: { pattern: '\\d{3}-\\d{4}' },
    });
    const result = await grader.evaluate({ input: '', output: 'Call 555-1234' });
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('should fail when output does not match', async () => {
    const grader = new RegexGrader({
      name: 'Test',
      config: { pattern: '^\\d+$' },
    });
    const result = await grader.evaluate({ input: '', output: 'not a number' });
    expect(result.pass).toBe(false);
    expect(result.score).toBe(0);
  });

  it('should support regex flags', async () => {
    const grader = new RegexGrader({
      name: 'Test',
      config: { pattern: 'hello', flags: 'i' },
    });
    const result = await grader.evaluate({ input: '', output: 'HELLO WORLD' });
    expect(result.pass).toBe(true);
  });

  it('should fail when no pattern provided', async () => {
    const grader = new RegexGrader({ name: 'Test' });
    const result = await grader.evaluate({ input: '', output: 'anything' });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('No regex pattern');
  });

  it('should handle invalid regex gracefully', async () => {
    const grader = new RegexGrader({
      name: 'Test',
      config: { pattern: '[invalid' },
    });
    const result = await grader.evaluate({ input: '', output: 'test' });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('Invalid regex');
  });
});
