import { ContainsGrader } from './contains.grader';

describe('ContainsGrader', () => {
  describe('mode: all (default)', () => {
    it('should pass when output contains all required strings', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['hello', 'world'] },
      });
      const result = await grader.evaluate({ input: '', output: 'hello world' });
      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('should fail when output is missing a required string', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['hello', 'world'] },
      });
      const result = await grader.evaluate({ input: '', output: 'hello there' });
      expect(result.pass).toBe(false);
      expect(result.score).toBe(0.5);
      expect(result.reason).toContain('world');
    });

    it('should fail when no requiredStrings provided', async () => {
      const grader = new ContainsGrader({ name: 'Test' });
      const result = await grader.evaluate({ input: '', output: 'anything' });
      expect(result.pass).toBe(false);
      expect(result.reason).toContain('No requiredStrings');
    });
  });

  describe('mode: any', () => {
    it('should pass when output contains at least one required string', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['hello', 'world'], mode: 'any' },
      });
      const result = await grader.evaluate({ input: '', output: 'hello there' });
      expect(result.pass).toBe(true);
    });

    it('should fail when output contains none of the required strings', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['hello', 'world'], mode: 'any' },
      });
      const result = await grader.evaluate({ input: '', output: 'goodbye' });
      expect(result.pass).toBe(false);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['HELLO'] },
      });
      const result = await grader.evaluate({ input: '', output: 'hello world' });
      expect(result.pass).toBe(true);
    });

    it('should respect caseSensitive config', async () => {
      const grader = new ContainsGrader({
        name: 'Test',
        config: { requiredStrings: ['HELLO'], caseSensitive: true },
      });
      const result = await grader.evaluate({ input: '', output: 'hello world' });
      expect(result.pass).toBe(false);
    });
  });
});
