import { ExactMatchGrader } from './exact-match.grader';

describe('ExactMatchGrader', () => {
  describe('basic matching', () => {
    it('should pass when output matches expected exactly', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
      });

      const result = await grader.evaluate({
        input: 'What is 2+2?',
        output: '4',
        expected: '4',
      });

      expect(result.pass).toBe(true);
      expect(result.score).toBe(1.0);
    });

    it('should fail when output does not match expected', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
      });

      const result = await grader.evaluate({
        input: 'What is 2+2?',
        output: '5',
        expected: '4',
      });

      expect(result.pass).toBe(false);
      expect(result.score).toBe(0);
      expect(result.reason).toContain('does not match');
    });

    it('should fail when no expected output provided', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
      });

      const result = await grader.evaluate({
        input: 'What is 2+2?',
        output: '4',
      });

      expect(result.pass).toBe(false);
      expect(result.reason).toContain('No expected output');
    });
  });

  describe('case sensitivity', () => {
    it('should match case-insensitively by default', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
      });

      const result = await grader.evaluate({
        input: 'Capital of France?',
        output: 'PARIS',
        expected: 'paris',
      });

      expect(result.pass).toBe(true);
    });

    it('should respect caseSensitive config', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
        config: { caseSensitive: true },
      });

      const result = await grader.evaluate({
        input: 'Capital of France?',
        output: 'PARIS',
        expected: 'paris',
      });

      expect(result.pass).toBe(false);
    });
  });

  describe('whitespace handling', () => {
    it('should trim whitespace by default', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
      });

      const result = await grader.evaluate({
        input: 'What is 2+2?',
        output: '  4  ',
        expected: '4',
      });

      expect(result.pass).toBe(true);
    });

    it('should respect trimWhitespace config', async () => {
      const grader = new ExactMatchGrader({
        name: 'Test Grader',
        config: { trimWhitespace: false },
      });

      const result = await grader.evaluate({
        input: 'What is 2+2?',
        output: '  4  ',
        expected: '4',
      });

      expect(result.pass).toBe(false);
    });
  });
});
