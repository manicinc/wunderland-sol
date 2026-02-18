/**
 * Database Adapter Interface
 *
 * Provides a dialect-agnostic interface for database operations.
 * Implementations can target SQLite, PostgreSQL, MySQL, etc.
 */

// ============================================================
// Entity Types
// ============================================================

export interface Dataset {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCase {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput: string | null;
  context: string | null;
  metadata: string | null;
  createdAt: Date;
}

export interface Grader {
  id: string;
  name: string;
  description: string | null;
  type: string;
  rubric: string | null;
  config: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Candidate {
  id: string;
  name: string;
  description: string | null;
  runnerType: string; // 'llm_prompt' | 'http_endpoint'
  systemPrompt: string | null;
  userPromptTemplate: string | null;
  modelConfig: string | null; // JSON: {provider?, model?, temperature?, maxTokens?}
  endpointUrl: string | null;
  endpointMethod: string | null;
  endpointHeaders: string | null; // JSON
  endpointBodyTemplate: string | null;
  parentId: string | null;
  variantLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Experiment {
  id: string;
  name: string | null;
  datasetId: string;
  graderIds: string;
  candidateIds: string | null; // JSON array, nullable for legacy
  modelConfig: string | null; // JSON: {provider?, model?}
  status: string;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  testCaseId: string;
  graderId: string;
  candidateId: string | null;
  pass: boolean;
  score: number | null;
  reason: string | null;
  output: string | null;
  generatedOutput: string | null;
  latencyMs: number | null;
  modelProvider: string | null;
  modelName: string | null;
  createdAt: Date;
}

export interface MetadataSchema {
  id: string;
  datasetId: string;
  schemaJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Settings {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}

// ============================================================
// Insert Types (without auto-generated fields)
// ============================================================

export interface InsertDataset {
  id: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertTestCase {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput?: string | null;
  context?: string | null;
  metadata?: string | null;
  createdAt: Date;
}

export interface InsertGrader {
  id: string;
  name: string;
  description?: string | null;
  type: string;
  rubric?: string | null;
  config?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertCandidate {
  id: string;
  name: string;
  description?: string | null;
  runnerType: string;
  systemPrompt?: string | null;
  userPromptTemplate?: string | null;
  modelConfig?: string | null;
  endpointUrl?: string | null;
  endpointMethod?: string | null;
  endpointHeaders?: string | null;
  endpointBodyTemplate?: string | null;
  parentId?: string | null;
  variantLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertExperiment {
  id: string;
  name?: string | null;
  datasetId: string;
  graderIds: string;
  candidateIds?: string | null;
  modelConfig?: string | null;
  status: string;
  createdAt: Date;
  completedAt?: Date | null;
}

export interface InsertExperimentResult {
  id: string;
  experimentId: string;
  testCaseId: string;
  graderId: string;
  candidateId?: string | null;
  pass: boolean;
  score?: number | null;
  reason?: string | null;
  output?: string | null;
  generatedOutput?: string | null;
  latencyMs?: number | null;
  modelProvider?: string | null;
  modelName?: string | null;
  createdAt: Date;
}

export interface InsertMetadataSchema {
  id: string;
  datasetId: string;
  schemaJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertSettings {
  id: string;
  key: string;
  value: string;
  updatedAt: Date;
}

// ============================================================
// Database Adapter Interface
// ============================================================

export interface IDbAdapter {
  // Lifecycle
  initialize(): Promise<void>;
  close(): Promise<void>;

  // Datasets
  findAllDatasets(): Promise<Dataset[]>;
  findDatasetById(id: string): Promise<Dataset | null>;
  insertDataset(dataset: InsertDataset): Promise<Dataset>;
  updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, 'id' | 'createdAt'>>
  ): Promise<Dataset | null>;
  deleteDataset(id: string): Promise<boolean>;

  // Test Cases
  findTestCasesByDatasetId(datasetId: string): Promise<TestCase[]>;
  findTestCaseById(id: string): Promise<TestCase | null>;
  insertTestCase(testCase: InsertTestCase): Promise<TestCase>;
  updateTestCase(
    id: string,
    updates: Partial<Omit<TestCase, 'id' | 'datasetId' | 'createdAt'>>
  ): Promise<TestCase | null>;
  deleteTestCase(id: string): Promise<boolean>;
  countTestCasesByDatasetId(datasetId: string): Promise<number>;

  // Graders
  findAllGraders(): Promise<Grader[]>;
  findGraderById(id: string): Promise<Grader | null>;
  findGradersByIds(ids: string[]): Promise<Grader[]>;
  insertGrader(grader: InsertGrader): Promise<Grader>;
  updateGrader(
    id: string,
    updates: Partial<Omit<Grader, 'id' | 'createdAt'>>
  ): Promise<Grader | null>;
  deleteGrader(id: string): Promise<boolean>;

  // Candidates
  findAllCandidates(): Promise<Candidate[]>;
  findCandidateById(id: string): Promise<Candidate | null>;
  findCandidatesByIds(ids: string[]): Promise<Candidate[]>;
  findCandidateVariants(parentId: string): Promise<Candidate[]>;
  insertCandidate(candidate: InsertCandidate): Promise<Candidate>;
  updateCandidate(
    id: string,
    updates: Partial<Omit<Candidate, 'id' | 'createdAt'>>
  ): Promise<Candidate | null>;
  deleteCandidate(id: string): Promise<boolean>;

  // Experiments
  findAllExperiments(): Promise<Experiment[]>;
  findExperimentById(id: string): Promise<Experiment | null>;
  insertExperiment(experiment: InsertExperiment): Promise<Experiment>;
  updateExperiment(
    id: string,
    updates: Partial<Omit<Experiment, 'id' | 'createdAt'>>
  ): Promise<Experiment | null>;
  deleteExperiment(id: string): Promise<boolean>;

  // Experiment Results
  findResultsByExperimentId(experimentId: string): Promise<ExperimentResult[]>;
  insertResult(result: InsertExperimentResult): Promise<ExperimentResult>;
  deleteResultsByExperimentId(experimentId: string): Promise<boolean>;

  // Aggregate queries
  getExperimentStats(experimentId: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    byGrader: Record<string, { total: number; passed: number; avgScore: number }>;
    byCandidate: Record<
      string,
      {
        total: number;
        passed: number;
        avgScore: number;
        byGrader: Record<string, { total: number; passed: number; avgScore: number }>;
      }
    >;
  }>;

  // Metadata Schemas
  findMetadataSchemaByDatasetId(datasetId: string): Promise<MetadataSchema | null>;
  upsertMetadataSchema(datasetId: string, schemaJson: string): Promise<MetadataSchema>;
  deleteMetadataSchema(datasetId: string): Promise<boolean>;

  // Settings
  findAllSettings(): Promise<Settings[]>;
  findSettingByKey(key: string): Promise<Settings | null>;
  upsertSetting(key: string, value: string): Promise<Settings>;
  deleteSetting(key: string): Promise<boolean>;

  // Transactions (optional, for adapters that support it)
  transaction?<T>(fn: (adapter: IDbAdapter) => Promise<T>): Promise<T>;
}

// ============================================================
// Adapter Registry
// ============================================================

export type DbAdapterType = 'sqlite' | 'postgres' | 'mysql';

export interface DbAdapterConfig {
  type: DbAdapterType;
  connectionString?: string;
  filePath?: string;
  poolSize?: number;
}

export const DB_ADAPTER = Symbol('DB_ADAPTER');
