import { JsonSchemaGrader } from './json-schema.grader';

const testSchema = {
  type: 'object',
  required: ['name', 'age'],
  properties: {
    name: { type: 'string' },
    age: { type: 'number' },
  },
};

describe('JsonSchemaGrader', () => {
  it('should pass when JSON matches the schema', async () => {
    const grader = new JsonSchemaGrader({
      name: 'Test',
      config: { schema: testSchema },
    });
    const result = await grader.evaluate({
      input: '',
      output: JSON.stringify({ name: 'Alice', age: 30 }),
    });
    expect(result.pass).toBe(true);
    expect(result.score).toBe(1.0);
  });

  it('should fail when required field is missing', async () => {
    const grader = new JsonSchemaGrader({
      name: 'Test',
      config: { schema: testSchema },
    });
    const result = await grader.evaluate({
      input: '',
      output: JSON.stringify({ name: 'Alice' }),
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('age');
  });

  it('should fail when type is wrong', async () => {
    const grader = new JsonSchemaGrader({
      name: 'Test',
      config: { schema: testSchema },
    });
    const result = await grader.evaluate({
      input: '',
      output: JSON.stringify({ name: 'Alice', age: 'thirty' }),
    });
    expect(result.pass).toBe(false);
  });

  it('should fail when output is not valid JSON', async () => {
    const grader = new JsonSchemaGrader({
      name: 'Test',
      config: { schema: testSchema },
    });
    const result = await grader.evaluate({
      input: '',
      output: 'not json at all',
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('not valid JSON');
  });

  it('should fail when no schema provided', async () => {
    const grader = new JsonSchemaGrader({ name: 'Test' });
    const result = await grader.evaluate({
      input: '',
      output: '{"foo": "bar"}',
    });
    expect(result.pass).toBe(false);
    expect(result.reason).toContain('No JSON schema');
  });

  it('should accept additional properties by default', async () => {
    const grader = new JsonSchemaGrader({
      name: 'Test',
      config: { schema: testSchema },
    });
    const result = await grader.evaluate({
      input: '',
      output: JSON.stringify({ name: 'Alice', age: 30, extra: 'field' }),
    });
    expect(result.pass).toBe(true);
  });
});
