/**
 * Pre-built grader configurations.
 * Load via the UI or POST /api/presets/seed.
 * Datasets are now CSV files in backend/datasets/.
 */

export interface GraderPreset {
  id: string;
  name: string;
  description: string;
  type:
    | 'exact-match'
    | 'llm-judge'
    | 'semantic-similarity'
    | 'contains'
    | 'regex'
    | 'json-schema'
    | 'promptfoo';
  rubric?: string;
  config?: Record<string, unknown>;
  tooltip: string;
}

export const GRADER_PRESETS: GraderPreset[] = [
  {
    id: 'faithfulness',
    name: 'Faithfulness',
    description: 'Checks that response claims are grounded in provided context (>80%)',
    type: 'promptfoo',
    config: { assertion: 'context-faithfulness', threshold: 0.8 },
    tooltip:
      'RAGAS-style: extracts atomic claims, verifies each against context (threshold adjustable)',
  },
  {
    id: 'llm-judge-helpful',
    name: 'Helpfulness Judge',
    description: 'LLM evaluates if response is helpful and accurate',
    type: 'llm-judge',
    rubric: `Evaluate if the response is helpful, accurate, and addresses the user's question.

Pass if:
- The response directly answers the question
- Information is accurate and relevant
- Response is clear and well-structured

Fail if:
- Response is off-topic or doesn't answer the question
- Contains factual errors
- Is confusing or poorly written`,
    tooltip: 'General-purpose quality check',
  },
  {
    id: 'semantic-similarity',
    name: 'Semantic Similarity',
    description: 'Output meaning must be very similar (>80%)',
    type: 'semantic-similarity',
    config: { threshold: 0.8 },
    tooltip: 'Cosine similarity on embeddings (threshold adjustable)',
  },
  {
    id: 'extraction-completeness',
    name: 'Extraction Completeness Judge',
    description: 'LLM evaluates extraction quality, completeness, and grounding',
    type: 'llm-judge',
    rubric: `Evaluate the quality of a JSON extraction from a source document.

Compare the extracted output against the expected extraction:

1. COMPLETENESS: All relevant fields populated? All authors, findings, keywords captured?
2. ACCURACY: Values match source text? No fabricated data?
3. GROUNDING: Every value traces to source text? Null for fields without evidence?
4. STRUCTURE: Valid JSON matching expected schema?

Pass if all information is captured accurately with no fabrication.
Fail if key data is missing, fabricated, or schema is wrong.`,
    tooltip: 'LLM judge for extraction quality and grounding',
  },
];
