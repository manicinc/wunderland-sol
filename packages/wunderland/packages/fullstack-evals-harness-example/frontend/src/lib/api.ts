import type {
  Dataset,
  Grader,
  GraderType,
  Candidate,
  Experiment,
  ExperimentStats,
  CandidateComparison,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3021/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || `Request failed: ${response.status}`);
  }

  return response.json();
}

// Dataset API (read-only — datasets are loaded from CSV files on disk)
export const datasetsApi = {
  list: () => fetchApi<Dataset[]>('/datasets'),

  get: (id: string) => fetchApi<Dataset>(`/datasets/${id}`),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      testCases?: Array<{
        input: string;
        expectedOutput?: string;
        context?: string;
        metadata?: Record<string, unknown>;
        customFields?: Record<string, string>;
      }>;
    }
  ) =>
    fetchApi<Dataset>(`/datasets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  reload: () => fetchApi<{ loaded: number }>('/datasets/reload', { method: 'POST' }),

  delete: (id: string) => fetchApi<{ deleted: boolean }>(`/datasets/${id}`, { method: 'DELETE' }),

  importCsv: (data: { filename: string; csv: string; name?: string; description?: string }) =>
    fetchApi<Dataset>('/datasets/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Export URLs (for download links)
  exportJsonUrl: (id: string) => `${API_BASE}/datasets/${id}/export/json`,
  exportCsvUrl: (id: string) => `${API_BASE}/datasets/${id}/export/csv`,
};

// Grader API
export const gradersApi = {
  list: () => fetchApi<Grader[]>('/graders'),

  get: (id: string) => fetchApi<Grader>(`/graders/${id}`),

  create: (data: {
    name: string;
    description?: string;
    type: GraderType;
    rubric?: string;
    config?: Record<string, unknown>;
  }) =>
    fetchApi<Grader>('/graders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<Grader, 'id' | 'type' | 'createdAt' | 'updatedAt'>>) =>
    fetchApi<Grader>(`/graders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => fetchApi<{ deleted: boolean }>(`/graders/${id}`, { method: 'DELETE' }),

  reload: () => fetchApi<{ loaded: number }>('/graders/reload', { method: 'POST' }),

  getRawYaml: async (id: string): Promise<string> => {
    const response = await fetch(`${API_BASE}/graders/${id}/yaml`);
    if (!response.ok) {
      throw new Error(`Failed to fetch YAML: ${response.status}`);
    }
    return response.text();
  },
};

// Prompts API (loaded from markdown files on disk)
export const promptsApi = {
  list: () => fetchApi<Candidate[]>('/prompts'),

  get: (id: string) => fetchApi<Candidate>(`/prompts/${id}`),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string;
      runnerType?: 'llm_prompt' | 'http_endpoint';
      systemPrompt?: string;
      userPromptTemplate?: string;
      temperature?: number;
      maxTokens?: number;
      provider?: string;
      model?: string;
      endpointUrl?: string;
      endpointMethod?: string;
      endpointBodyTemplate?: string;
      recommendedGraders?: string[];
      graderWeights?: Record<string, number>;
      recommendedDatasets?: string[];
      graderRationale?: string;
      notes?: string;
    }
  ) =>
    fetchApi<Candidate>(`/prompts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  test: (
    id: string,
    data: { input: string; context?: string; metadata?: Record<string, unknown> }
  ) =>
    fetchApi<{ output: string; latencyMs: number; error?: string }>(`/prompts/${id}/test`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createVariant: (
    parentId: string,
    data: {
      variantLabel: string;
      name?: string;
      description?: string;
      systemPrompt?: string;
    }
  ) =>
    fetchApi<Candidate>(`/prompts/${parentId}/variant`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  suggestVariantName: (parentId: string, data: { variantLabel: string; systemPrompt?: string }) =>
    fetchApi<{ name: string }>(`/prompts/${parentId}/variant/suggest-name`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateVariants: (
    parentId: string,
    data: {
      count?: number;
      customInstructions?: string;
      provider?: 'openai' | 'anthropic' | 'ollama';
      model?: string;
      temperature?: number;
      maxTokens?: number;
    }
  ) =>
    fetchApi<{
      parentId: string;
      created: Candidate[];
      skipped: Array<{ requestedLabel: string; reason: string }>;
      usedConfig: {
        provider: 'openai' | 'anthropic' | 'ollama';
        model: string;
        temperature: number;
        maxTokens: number;
      };
    }>(`/prompts/${parentId}/variants/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => fetchApi<{ deleted: boolean }>(`/prompts/${id}`, { method: 'DELETE' }),

  reload: () => fetchApi<{ loaded: number }>('/prompts/reload', { method: 'POST' }),
};

// Experiment API
export const experimentsApi = {
  list: () => fetchApi<Experiment[]>('/experiments'),

  get: (id: string) => fetchApi<Experiment>(`/experiments/${id}`),

  create: (data: {
    name?: string;
    datasetId: string;
    graderIds: string[];
    candidateIds?: string[];
    modelConfig?: { provider?: string; model?: string };
  }) =>
    fetchApi<Experiment>('/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ deleted: boolean }>(`/experiments/${id}`, { method: 'DELETE' }),

  clearAll: () => fetchApi<{ deleted: number }>('/experiments/clear-all', { method: 'DELETE' }),

  getStats: (id: string) => fetchApi<ExperimentStats>(`/experiments/${id}/stats`),

  compare: (id: string, baselineId: string, challengerId: string) =>
    fetchApi<CandidateComparison>(
      `/experiments/${id}/compare?baseline=${baselineId}&challenger=${challengerId}`
    ),

  // SSE stream for real-time progress
  streamProgress: (id: string) => {
    return new EventSource(`${API_BASE}/experiments/${id}/stream`);
  },

  // Export URLs
  exportJsonUrl: (id: string) => `${API_BASE}/experiments/${id}/export/json`,
  exportCsvUrl: (id: string) => `${API_BASE}/experiments/${id}/export/csv`,
  exportAllCsvUrl: () => `${API_BASE}/experiments/export/all-csv`,
};

// Preset types
export interface GraderPreset {
  id: string;
  name: string;
  description: string;
  type: GraderType;
  rubric?: string;
  config?: Record<string, unknown>;
  tooltip: string;
}

// Presets API (graders only — datasets are CSV files)
export const presetsApi = {
  getGraderPresets: () => fetchApi<GraderPreset[]>('/presets/graders'),

  loadGraderPreset: (id: string) =>
    fetchApi<Grader>(`/presets/graders/${id}/load`, { method: 'POST' }),

  seedAll: () =>
    fetchApi<{ graders: Grader[] }>('/presets/seed', {
      method: 'POST',
    }),

  generateSynthetic: (data: {
    topic: string;
    count: number;
    style: 'qa' | 'classification' | 'extraction' | 'rag';
    customInstructions?: string;
  }) =>
    fetchApi<Array<{ input: string; expectedOutput: string; context?: string }>>(
      '/presets/synthetic/generate',
      { method: 'POST', body: JSON.stringify(data) }
    ),

  generateSyntheticDataset: (data: {
    name: string;
    description?: string;
    topic: string;
    count: number;
    style: 'qa' | 'classification' | 'extraction' | 'rag';
    customInstructions?: string;
    forCandidateId?: string;
  }) =>
    fetchApi<Dataset>('/presets/synthetic/dataset', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Settings types
export interface LlmSettings {
  provider: 'openai' | 'anthropic' | 'ollama';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AppSettings {
  llm: LlmSettings;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  latencyMs?: number;
}

// Settings API
export const settingsApi = {
  getAll: () => fetchApi<AppSettings>('/settings'),

  getLlmSettings: () => fetchApi<LlmSettings>('/settings/llm'),

  updateLlmSettings: (data: Partial<LlmSettings>) =>
    fetchApi<LlmSettings>('/settings/llm', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  testConnection: () => fetchApi<ConnectionTestResult>('/settings/llm/test', { method: 'POST' }),

  resetToDefaults: () => fetchApi<AppSettings>('/settings/reset', { method: 'POST' }),
};
