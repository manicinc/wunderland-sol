import { BaseGrader, EvalInput, GraderResult } from './base.grader';
import Ajv from 'ajv';

/**
 * JSON Schema grader - validates that output is valid JSON matching a schema.
 *
 * Config options:
 * - schema: object (required - a JSON Schema object)
 * - strictMode: boolean (default: false - when true, enables strict schema validation)
 */
export class JsonSchemaGrader extends BaseGrader {
  get type(): string {
    return 'json-schema';
  }

  async evaluate(evalInput: EvalInput): Promise<GraderResult> {
    const { output } = evalInput;
    const schema = this.getConfigValue<object>('schema', {});
    const strictMode = this.getConfigValue('strictMode', false);

    if (!schema || Object.keys(schema).length === 0) {
      return {
        pass: false,
        score: 0,
        reason: 'No JSON schema provided in grader config',
      };
    }

    // Step 1: Try to parse as JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(output);
    } catch (error) {
      return {
        pass: false,
        score: 0,
        reason: `Output is not valid JSON: ${error instanceof Error ? error.message : 'Parse error'}`,
      };
    }

    // Step 2: Validate against schema
    try {
      const ajv = new Ajv({ allErrors: true, strict: strictMode });
      const validate = ajv.compile(schema);
      const valid = validate(parsed);

      if (valid) {
        return {
          pass: true,
          score: 1.0,
          reason: 'Output is valid JSON matching the schema',
        };
      }

      const errors = validate.errors || [];
      const errorMessages = errors
        .slice(0, 5)
        .map((e) => `${e.instancePath || '/'}: ${e.message}`)
        .join('; ');

      return {
        pass: false,
        score: 0,
        reason: `JSON schema validation failed: ${errorMessages}${errors.length > 5 ? ` ... and ${errors.length - 5} more errors` : ''}`,
      };
    } catch (error) {
      return {
        pass: false,
        score: 0,
        reason: `Schema compilation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
