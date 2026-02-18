/**
 * Result returned by all graders.
 */
export interface GraderResult {
  pass: boolean;
  score: number; // 0.0 - 1.0
  reason: string;
}

/**
 * Configuration for grader instances.
 */
export interface GraderConfig {
  name: string;
  description?: string;
  rubric?: string;
  config?: Record<string, unknown>;
}

/**
 * Input data for evaluation.
 */
export interface EvalInput {
  input: string;
  output: string;
  expected?: string;
  context?: string; // For faithfulness grader
}

/**
 * Base class for all graders.
 * Each grader implements a different evaluation strategy.
 */
export abstract class BaseGrader {
  constructor(protected graderConfig: GraderConfig) {}

  /**
   * Evaluate an output against the expected result.
   */
  abstract evaluate(evalInput: EvalInput): Promise<GraderResult>;

  /**
   * Get the grader type identifier.
   */
  abstract get type(): string;

  protected get name(): string {
    return this.graderConfig.name;
  }

  protected get rubric(): string | undefined {
    return this.graderConfig.rubric;
  }

  protected getConfigValue<T>(key: string, defaultValue: T): T {
    const config = this.graderConfig.config || {};
    return (config[key] as T) ?? defaultValue;
  }
}
