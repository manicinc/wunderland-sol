import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Datasets hold collections of test cases.
 */
export const datasets = sqliteTable('datasets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Test cases belong to a dataset.
 * Each case has an input and optional expected output.
 */
export const testCases = sqliteTable('test_cases', {
  id: text('id').primaryKey(),
  datasetId: text('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'cascade' }),
  input: text('input').notNull(),
  expectedOutput: text('expected_output'),
  context: text('context'),
  metadata: text('metadata'), // JSON blob
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Graders define evaluation criteria.
 */
export const graders = sqliteTable('graders', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  type: text('type').notNull(),
  rubric: text('rubric'),
  config: text('config'), // JSON blob
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Candidates define how to produce output for test cases.
 * Runner types:
 *   - llm_prompt: Uses system/user prompt templates with {{variable}} substitution
 *   - http_endpoint: Calls an external API endpoint
 *
 * Supports variant lineage via parent_id for prompt iteration.
 */
export const candidates = sqliteTable('candidates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  runnerType: text('runner_type').notNull(), // 'llm_prompt' | 'http_endpoint'

  // LLM prompt runner fields
  systemPrompt: text('system_prompt'),
  userPromptTemplate: text('user_prompt_template'),
  modelConfig: text('model_config'), // JSON: {provider?, model?, temperature?, maxTokens?}

  // HTTP endpoint runner fields
  endpointUrl: text('endpoint_url'),
  endpointMethod: text('endpoint_method'), // GET | POST
  endpointHeaders: text('endpoint_headers'), // JSON
  endpointBodyTemplate: text('endpoint_body_template'), // JSON with {{input}} vars

  // Variant lineage
  parentId: text('parent_id'),
  variantLabel: text('variant_label'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Experiments run candidates against datasets and grade the outputs.
 * candidateIds: JSON array of candidate IDs (nullable for legacy compat).
 */
export const experiments = sqliteTable('experiments', {
  id: text('id').primaryKey(),
  name: text('name'),
  datasetId: text('dataset_id')
    .notNull()
    .references(() => datasets.id),
  graderIds: text('grader_ids').notNull(), // JSON array
  candidateIds: text('candidate_ids'), // JSON array, nullable for backwards compat
  modelConfig: text('model_config'), // JSON: {provider?, model?}
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
});

/**
 * Results store individual grader evaluations.
 * One result per (experiment, test case, candidate, grader) combination.
 */
export const experimentResults = sqliteTable('experiment_results', {
  id: text('id').primaryKey(),
  experimentId: text('experiment_id')
    .notNull()
    .references(() => experiments.id, { onDelete: 'cascade' }),
  testCaseId: text('test_case_id')
    .notNull()
    .references(() => testCases.id),
  graderId: text('grader_id')
    .notNull()
    .references(() => graders.id),
  candidateId: text('candidate_id'), // nullable for legacy results
  pass: integer('pass', { mode: 'boolean' }).notNull(),
  score: real('score'),
  reason: text('reason'),
  output: text('output'),
  generatedOutput: text('generated_output'), // output produced by candidate
  latencyMs: integer('latency_ms'),
  modelProvider: text('model_provider'), // which provider was used
  modelName: text('model_name'), // which model was used
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Metadata schemas define expected fields for test case metadata.
 */
export const metadataSchemas = sqliteTable('metadata_schemas', {
  id: text('id').primaryKey(),
  datasetId: text('dataset_id')
    .notNull()
    .references(() => datasets.id, { onDelete: 'cascade' }),
  schemaJson: text('schema_json').notNull(), // JSON Schema format
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

/**
 * Settings store runtime configuration.
 */
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Type exports
export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;
export type TestCase = typeof testCases.$inferSelect;
export type NewTestCase = typeof testCases.$inferInsert;
export type Grader = typeof graders.$inferSelect;
export type NewGrader = typeof graders.$inferInsert;
export type Candidate = typeof candidates.$inferSelect;
export type NewCandidate = typeof candidates.$inferInsert;
export type Experiment = typeof experiments.$inferSelect;
export type NewExperiment = typeof experiments.$inferInsert;
export type ExperimentResult = typeof experimentResults.$inferSelect;
export type NewExperimentResult = typeof experimentResults.$inferInsert;
export type MetadataSchema = typeof metadataSchemas.$inferSelect;
export type NewMetadataSchema = typeof metadataSchemas.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
