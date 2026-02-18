'use client';

import { useState, useEffect } from 'react';
import { Plus, Sparkles, ChevronDown, RefreshCw, Info } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { gradersApi, presetsApi, type GraderPreset } from '@/lib/api';
import { Tooltip } from '@/components/Tooltip';
import { useToast } from '@/components/Toast';
import type { Grader, GraderType } from '@/lib/types';

const GRADER_TYPES: {
  value: GraderType;
  label: string;
  description: string;
  category: 'deterministic' | 'llm-powered';
  inspiration: string;
  reference?: string;
}[] = [
  {
    value: 'exact-match',
    label: 'Exact Match',
    description: 'Output must match expected string exactly',
    category: 'deterministic',
    inspiration:
      'Standard EM metric from SQuAD (Rajpurkar et al., 2016). Simple but effective for factoid QA where exact phrasing matters.',
    reference: 'https://arxiv.org/abs/1606.05250',
  },
  {
    value: 'llm-judge',
    label: 'LLM Judge',
    description: 'Uses an LLM with your rubric to judge pass/fail',
    category: 'llm-powered',
    inspiration:
      'Inspired by "Judging LLM-as-a-Judge" (Zheng et al., 2023). Uses a capable model to evaluate responses against a human-written rubric, enabling open-ended quality assessment.',
    reference: 'https://arxiv.org/abs/2306.05685',
  },
  {
    value: 'semantic-similarity',
    label: 'Semantic Similarity',
    description: 'Compares embeddings using cosine similarity',
    category: 'llm-powered',
    inspiration:
      'Computes cosine similarity between provider embeddings (OpenAI text-embedding-3-small, Ollama). Falls back to weighted token overlap when embeddings unavailable. Captures meaning beyond surface-level string matching.',
    reference: undefined,
  },
  {
    value: 'contains',
    label: 'Contains',
    description: 'Checks if output contains required substrings',
    category: 'deterministic',
    inspiration:
      'Common in HELM (Liang et al., 2022) and other eval harnesses. Verifies key terms or phrases appear in the output without requiring exact matches.',
    reference: 'https://arxiv.org/abs/2211.09110',
  },
  {
    value: 'regex',
    label: 'Regex Match',
    description: 'Checks if output matches a regular expression pattern',
    category: 'deterministic',
    inspiration:
      'Pattern-based validation used across eval frameworks. Useful for structured outputs (dates, numbers, formats) where the answer must follow a specific pattern.',
  },
  {
    value: 'json-schema',
    label: 'JSON Schema',
    description: 'Validates output is valid JSON matching a schema',
    category: 'deterministic',
    inspiration:
      'Inspired by structured output evaluation in function calling and tool-use benchmarks. Validates both syntactic correctness and schema compliance per JSON Schema (RFC draft).',
  },
  {
    value: 'promptfoo',
    label: 'Promptfoo',
    description: "Wraps promptfoo's assertion types including RAGAS-style metrics",
    category: 'llm-powered',
    inspiration:
      "Delegates to promptfoo's assertion engine. Supports context-faithfulness, answer-relevance, context-relevance, context-recall, llm-rubric, similar, and many more assertion types. MIT licensed.",
    reference: 'https://promptfoo.dev/docs/configuration/expected-outputs/',
  },
];

export default function GradersPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [graders, setGraders] = useState<Grader[]>([]);
  const [presets, setPresets] = useState<GraderPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  // Create form state (simplified — no edit, just name/type/description then redirect)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'llm-judge' as GraderType,
  });

  useEffect(() => {
    loadGraders();
    loadPresets();
  }, []);

  async function loadGraders() {
    try {
      const data = await gradersApi.list();
      setGraders(data);
    } catch (error) {
      console.error('Failed to load graders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadPresets() {
    try {
      const data = await presetsApi.getGraderPresets();
      setPresets(data);
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  }

  async function handleReload() {
    setReloading(true);
    try {
      const result = await gradersApi.reload();
      await loadGraders();
      toast(`Reloaded ${result.loaded} graders from disk.`, 'success');
    } catch (error) {
      console.error('Failed to reload graders:', error);
    } finally {
      setReloading(false);
    }
  }

  async function loadPreset(preset: GraderPreset) {
    setLoadingPreset(preset.id);
    try {
      const created = await presetsApi.loadGraderPreset(preset.id);
      await loadGraders();
      setShowPresets(false);
      // Navigate to the new grader's detail page
      if (created && created.id) {
        router.push(`/graders/${created.id}`);
      }
    } catch (error) {
      console.error('Failed to load preset:', error);
    } finally {
      setLoadingPreset(null);
    }
  }

  async function createGrader() {
    if (!formData.name.trim()) return;

    try {
      const created = await gradersApi.create({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        type: formData.type,
      });
      setShowForm(false);
      router.push(`/graders/${created.id}`);
    } catch (error) {
      console.error('Failed to create grader:', error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Graders</h1>
          <p className="text-muted-foreground mt-1">
            YAML files loaded from <code className="text-xs">backend/graders/</code> (source of
            truth). Click a grader to edit.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Presets are optional templates that create YAML graders on disk when loaded. The preset
            list may differ from what&apos;s installed on disk (by design).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReload}
            disabled={reloading}
            className="btn-secondary"
            title="Re-read all YAML files from the graders/ directory"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reloading ? 'animate-spin' : ''}`} />
            {reloading ? 'Reloading...' : 'Reload from Disk'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="btn-secondary"
              title="Load a pre-configured grader from built-in presets"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Load Preset
            </button>

            {showPresets && (
              <div className="absolute right-0 mt-2 w-80 card p-2 z-50 shadow-xl max-h-96 overflow-y-auto">
                <div className="text-xs text-muted-foreground px-2 py-1 mb-1">
                  Presets create grader YAML files in{' '}
                  <code className="text-[10px]">backend/graders/</code>
                </div>
                {presets.map((preset) => {
                  const installed = graders.some((g) => g.id === preset.id);
                  return (
                    <button
                      key={preset.id}
                      onClick={() =>
                        installed ? router.push(`/graders/${preset.id}`) : loadPreset(preset)
                      }
                      disabled={loadingPreset === preset.id}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm flex items-center gap-2">
                          {preset.name}
                          {installed && (
                            <span className="badge bg-muted text-muted-foreground text-[10px]">
                              Installed
                            </span>
                          )}
                        </span>
                        <Tooltip text={preset.tooltip} size="sm" />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setFormData({ name: '', description: '', type: 'llm-judge' });
              setShowForm(true);
            }}
            className="btn-primary"
            title="Create a custom grader with your own evaluation criteria"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Grader
          </button>
        </div>
      </div>

      {/* Expandable guide */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full text-left px-4 py-3 card flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          How graders work
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>
      {showGuide && (
        <div className="card p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            A <strong className="text-foreground">grader</strong> defines how to score a
            candidate&apos;s output against the expected answer. Each grader has a type that
            determines its evaluation method.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border border-border p-3 rounded-md">
              <strong className="text-foreground text-xs uppercase">Deterministic</strong>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>
                  <strong>Exact Match</strong> — binary string equality (
                  <a
                    href="https://arxiv.org/abs/1606.05250"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    SQuAD
                  </a>
                  )
                </li>
                <li>
                  <strong>Contains</strong> — checks for required keywords (
                  <a
                    href="https://arxiv.org/abs/2211.09110"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    HELM
                  </a>
                  )
                </li>
                <li>
                  <strong>Regex</strong> — pattern matching
                </li>
                <li>
                  <strong>JSON Schema</strong> — validates JSON structure
                </li>
              </ul>
            </div>
            <div className="border border-border p-3 rounded-md bg-blue-500/5">
              <strong className="text-foreground text-xs uppercase">
                LLM-Powered (built-in +{' '}
                <a
                  href="https://promptfoo.dev"
                  target="_blank"
                  rel="noopener"
                  className="underline"
                >
                  promptfoo
                </a>
                )
              </strong>
              <ul className="mt-1 space-y-0.5 text-xs">
                <li>
                  <strong>LLM Judge</strong> — evaluates against your rubric (built-in)
                </li>
                <li>
                  <strong>Semantic Similarity</strong> — embedding cosine distance (built-in)
                </li>
                <li>
                  <strong>context-faithfulness</strong> — hallucination detection (
                  <a
                    href="https://arxiv.org/abs/2309.15217"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    RAGAS
                  </a>
                  )
                </li>
                <li>
                  <strong>answer-relevance</strong> — query alignment (
                  <a
                    href="https://arxiv.org/abs/2309.15217"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    RAGAS
                  </a>
                  )
                </li>
                <li>
                  <strong>context-relevance</strong> — retrieval quality (
                  <a
                    href="https://arxiv.org/abs/2309.15217"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    RAGAS
                  </a>
                  )
                </li>
                <li>
                  <strong>context-recall</strong> — ground truth coverage
                </li>
                <li className="text-muted-foreground/70">+ many more assertion types</li>
              </ul>
              <p className="text-[10px] text-muted-foreground mt-2">
                Supports OpenAI, Anthropic, Ollama via Settings
              </p>
            </div>
          </div>
          <div className="border-t border-border pt-3 space-y-2">
            <p>
              <strong className="text-foreground">Presets</strong> provide a small starter set of
              common graders. You can create any grader type from scratch. For open-ended
              evaluation, use <strong>LLM Judge</strong> with a custom rubric. For structured
              output, combine <strong>JSON Schema</strong> with <strong>LLM Judge</strong>.
            </p>
            <div className="text-xs space-y-1 opacity-80">
              <p className="font-medium text-foreground/70">Research & Inspiration</p>
              <ul className="space-y-0.5">
                <li>
                  <a
                    href="https://arxiv.org/abs/2309.15217"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    RAGAS
                  </a>{' '}
                  — Es et al. 2023. Automated evaluation of retrieval-augmented generation
                  (faithfulness, answer/context relevancy)
                </li>
                <li>
                  <a
                    href="https://arxiv.org/abs/2306.05685"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    LLM-as-Judge
                  </a>{' '}
                  — Zheng et al. 2023. Using LLMs to evaluate LLM outputs with rubric-based scoring
                </li>
                <li>
                  <a
                    href="https://arxiv.org/abs/1908.10084"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    Semantic Similarity
                  </a>{' '}
                  — Provider embeddings (OpenAI, Ollama) with text overlap fallback
                </li>
                <li>
                  <a
                    href="https://arxiv.org/abs/1606.05250"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    SQuAD
                  </a>{' '}
                  — Rajpurkar et al. 2016. Reading comprehension benchmark with EM/F1 metrics
                </li>
                <li>
                  <a
                    href="https://arxiv.org/abs/2211.09110"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    HELM
                  </a>{' '}
                  — Liang et al. 2022. Holistic evaluation of language models
                </li>
              </ul>
              <p className="font-medium text-foreground/70 mt-2">Frameworks Used</p>
              <ul className="space-y-0.5">
                <li>
                  <a
                    href="https://promptfoo.dev"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    promptfoo
                  </a>{' '}
                  — <strong>Our assertion engine</strong> for RAGAS-style metrics, LLM-as-judge, and
                  dozens of assertion types. MIT licensed.
                </li>
                <li>
                  <a
                    href="https://docs.confident-ai.com"
                    target="_blank"
                    rel="noopener"
                    className="underline hover:text-foreground"
                  >
                    DeepEval
                  </a>{' '}
                  — Python-based eval framework; inspired our architecture
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {graders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground">No graders yet</p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={() => setShowPresets(true)} className="btn-secondary">
              <Sparkles className="h-4 w-4 mr-2" />
              Load a preset
            </button>
            <button
              onClick={() => {
                setFormData({ name: '', description: '', type: 'llm-judge' });
                setShowForm(true);
              }}
              className="btn-secondary"
            >
              Create from scratch
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {graders.map((grader) => {
            const typeInfo = GRADER_TYPES.find((t) => t.value === grader.type);
            return (
              <Link
                key={grader.id}
                href={`/graders/${grader.id}`}
                className="card overflow-hidden hover:bg-muted/30 transition-colors block"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{grader.name}</h3>
                        <span
                          className={`badge text-xs ${typeInfo?.category === 'llm-powered' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' : 'bg-muted text-muted-foreground'}`}
                        >
                          {typeInfo?.label || grader.type}
                        </span>
                      </div>
                      {grader.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {grader.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Config summary badges */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {grader.config &&
                      typeof grader.config === 'object' &&
                      'threshold' in grader.config && (
                        <span className="badge bg-muted text-muted-foreground text-xs">
                          threshold: {String(grader.config.threshold)}
                        </span>
                      )}
                    {grader.config &&
                      typeof grader.config === 'object' &&
                      'assertion' in grader.config && (
                        <span className="badge bg-muted text-muted-foreground text-xs">
                          {String(grader.config.assertion)}
                        </span>
                      )}
                    {grader.rubric && (
                      <span className="badge bg-muted text-muted-foreground text-xs">
                        has rubric
                      </span>
                    )}
                    {grader.config &&
                      typeof grader.config === 'object' &&
                      'schema' in grader.config && (
                        <span className="badge bg-muted text-muted-foreground text-xs">
                          has schema
                        </span>
                      )}
                    {grader.filePath && (
                      <span className="badge bg-muted text-muted-foreground font-mono text-[10px]">
                        {grader.filePath}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal (simplified — name, type, description, then redirect to detail page) */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">Create Grader</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Grader"
                  className="input"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                  Type
                  <Tooltip text="Choose how the grader evaluates responses. Cannot be changed after creation." />
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as GraderType })}
                  className="input"
                >
                  {GRADER_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} — {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Evaluates responses for..."
                  className="input"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                After creating, you&apos;ll be taken to the detail page to configure rubric,
                threshold, and other settings.
              </p>

              <div className="flex gap-2 justify-end pt-2">
                <button onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={createGrader}
                  disabled={!formData.name.trim()}
                  className="btn-primary"
                >
                  Create & Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close presets dropdown */}
      {showPresets && <div className="fixed inset-0 z-40" onClick={() => setShowPresets(false)} />}
    </div>
  );
}
