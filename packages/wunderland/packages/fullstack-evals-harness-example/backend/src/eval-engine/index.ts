export * from './base.grader';
export * from './exact-match.grader';
export * from './llm-judge.grader';
export * from './semantic-similarity.grader';
export * from './contains.grader';
export * from './regex.grader';
export * from './json-schema.grader';
export * from './promptfoo.grader';

import { BaseGrader, GraderConfig } from './base.grader';
import { ExactMatchGrader } from './exact-match.grader';
import { LlmJudgeGrader } from './llm-judge.grader';
import { SemanticSimilarityGrader } from './semantic-similarity.grader';
import { ContainsGrader } from './contains.grader';
import { RegexGrader } from './regex.grader';
import { JsonSchemaGrader } from './json-schema.grader';
import { PromptfooGrader } from './promptfoo.grader';
import { LlmService } from '../llm/llm.service';

export type GraderType =
  | 'exact-match'
  | 'llm-judge'
  | 'semantic-similarity'
  | 'contains'
  | 'regex'
  | 'json-schema'
  | 'promptfoo';

/**
 * Factory function to create grader instances based on type.
 */
export function createGrader(
  type: GraderType,
  config: GraderConfig,
  llmService: LlmService,
): BaseGrader {
  switch (type) {
    case 'exact-match':
      return new ExactMatchGrader(config);

    case 'llm-judge':
      return new LlmJudgeGrader(config, llmService);

    case 'semantic-similarity':
      return new SemanticSimilarityGrader(config, llmService);

    case 'contains':
      return new ContainsGrader(config);

    case 'regex':
      return new RegexGrader(config);

    case 'json-schema':
      return new JsonSchemaGrader(config);

    case 'promptfoo':
      return new PromptfooGrader(config, llmService);

    default:
      throw new Error(`Unknown grader type: ${type}`);
  }
}
