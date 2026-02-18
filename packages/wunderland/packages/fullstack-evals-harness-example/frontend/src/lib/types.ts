/**
 * Shared types for the eval harness frontend.
 */

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  source?: 'file';
  filePath?: string;
  metaPath?: string | null;
  testCaseCount?: number;
  testCases?: TestCase[];
  synthetic?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TestCase {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput?: string;
  context?: string;
  metadata?: Record<string, unknown>;
  customFields?: Record<string, string>;
  createdAt?: string;
}

export type GraderType =
  | 'exact-match'
  | 'llm-judge'
  | 'semantic-similarity'
  | 'contains'
  | 'regex'
  | 'json-schema'
  | 'promptfoo';

export interface Grader {
  id: string;
  name: string;
  description?: string;
  type: GraderType;
  rubric?: string;
  config?: Record<string, unknown>;
  inspiration?: string;
  reference?: string;
  source?: 'file';
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export type CandidateRunnerType = 'llm_prompt' | 'http_endpoint';

export interface Candidate {
  id: string;
  name: string;
  description?: string;
  runnerType: CandidateRunnerType;
  systemPrompt?: string;
  userPromptTemplate?: string;
  modelConfig?: {
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    apiKey?: string;
    baseUrl?: string;
  };
  endpointUrl?: string;
  endpointMethod?: string;
  endpointHeaders?: Record<string, string>;
  endpointBodyTemplate?: string;
  parentId?: string;
  variantLabel?: string;
  recommendedGraders?: string[];
  graderWeights?: Record<string, number>;
  recommendedDatasets?: string[];
  graderRationale?: string;
  notes?: string;
  source?: 'file';
  filePath?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Experiment {
  id: string;
  name?: string;
  datasetId: string;
  graderIds: string[];
  candidateIds?: string[];
  modelConfig?: { provider?: string; model?: string };
  status: 'pending' | 'running' | 'completed' | 'failed';
  passRate?: number | null;
  totalResults?: number;
  passed?: number;
  failed?: number;
  createdAt: string;
  completedAt?: string;
  results?: ExperimentResult[];
}

export interface ExperimentResult {
  id: string;
  experimentId: string;
  testCaseId: string;
  graderId: string;
  candidateId?: string;
  pass: boolean;
  score?: number;
  reason?: string;
  output?: string;
  generatedOutput?: string;
  latencyMs?: number;
  modelProvider?: string;
  modelName?: string;
  createdAt: string;
}

export interface ExperimentProgress {
  type: 'progress' | 'generation' | 'result' | 'complete' | 'error';
  experimentId: string;
  testCaseId?: string;
  graderId?: string;
  candidateId?: string;
  current?: number;
  total?: number;
  result?: {
    pass: boolean;
    score: number;
    reason: string;
  };
  generatedOutput?: string;
  error?: string;
}

export interface ExperimentStats {
  experimentId: string;
  totalTests: number;
  totalGraders: number;
  passed: number;
  failed: number;
  passRate: number;
  graderStats: Array<{
    graderId: string;
    passed: number;
    total: number;
    passRate: number;
    avgScore: number;
  }>;
  candidateStats?: Array<{
    candidateId: string;
    total: number;
    passed: number;
    avgScore: number;
    weightedScore?: number;
    passRate: number;
    byGrader: Array<{
      graderId: string;
      total: number;
      passed: number;
      avgScore: number;
      passRate: number;
    }>;
  }>;
}

export interface CandidateComparison {
  experimentId: string;
  baselineId: string;
  challengerId: string;
  summary: {
    baselinePassRate: number;
    challengerPassRate: number;
    deltaPassRate: number;
    improved: number;
    regressed: number;
    same: number;
    total: number;
  };
  comparisons: Array<{
    testCaseId: string;
    graderId: string;
    baseline: { pass: boolean; score: number | null };
    challenger: { pass: boolean; score: number | null };
    delta: 'improved' | 'regressed' | 'same';
  }>;
}
