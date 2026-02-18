'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Bot,
  Globe,
  Save,
  Play,
  Loader2,
  ChevronDown,
  FileText,
  GitBranch,
  Plus,
  RotateCcw,
  Trash2,
  X,
  Info,
  Wand2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { promptsApi, datasetsApi, presetsApi, settingsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Tooltip } from '@/components/Tooltip';
import type { Candidate, Dataset } from '@/lib/types';

interface LlmSettings {
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

function toWorkspaceRelativePath(absPath?: string): string | null {
  if (!absPath) return null;
  const idx = absPath.lastIndexOf('/backend/');
  if (idx !== -1) {
    return absPath.slice(idx + 1);
  }
  return absPath;
}

interface EditableCandidate {
  name: string;
  description: string;
  runnerType: 'llm_prompt' | 'http_endpoint';
  systemPrompt: string;
  userPromptTemplate: string;
  temperature: string;
  maxTokens: string;
  provider: string;
  model: string;
  endpointUrl: string;
  endpointMethod: string;
  endpointBodyTemplate: string;
  recommendedGraders: string;
  graderRationale: string;
  recommendedDatasets: string;
  notes: string;
}

function toEditable(c: Candidate, settings?: LlmSettings): EditableCandidate {
  // Serialize weighted grader list back to "id:weight, id2:weight2" format
  const graderStr = c.recommendedGraders
    ? c.recommendedGraders
        .map((g) => {
          const w = c.graderWeights?.[g];
          return w != null && w !== 1 ? `${g}:${w}` : g;
        })
        .join(', ')
    : '';

  // Use settings as defaults for model config if candidate doesn't have its own values
  return {
    name: c.name || '',
    description: c.description || '',
    runnerType: c.runnerType || 'llm_prompt',
    systemPrompt: c.systemPrompt || '',
    userPromptTemplate: c.userPromptTemplate || '',
    temperature:
      c.modelConfig?.temperature !== undefined
        ? String(c.modelConfig.temperature)
        : settings?.temperature !== undefined
          ? String(settings.temperature)
          : '',
    maxTokens:
      c.modelConfig?.maxTokens !== undefined
        ? String(c.modelConfig.maxTokens)
        : settings?.maxTokens !== undefined
          ? String(settings.maxTokens)
          : '',
    provider: (c.modelConfig?.provider as string) || settings?.provider || '',
    model: (c.modelConfig?.model as string) || settings?.model || '',
    endpointUrl: c.endpointUrl || '',
    endpointMethod: c.endpointMethod || '',
    endpointBodyTemplate: c.endpointBodyTemplate || '',
    recommendedGraders: graderStr,
    graderRationale: c.graderRationale || '',
    recommendedDatasets: c.recommendedDatasets?.join(', ') || '',
    notes: c.notes || '',
  };
}

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [edited, setEdited] = useState<EditableCandidate | null>(null);
  const [original, setOriginal] = useState<EditableCandidate | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [allCandidates, setAllCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [llmDefaults, setLlmDefaults] = useState<LlmSettings | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<{
    output: string;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // Variant management
  const [variantModal, setVariantModal] = useState(false);
  const [variantForm, setVariantForm] = useState({
    label: '',
    name: '',
    description: '',
    systemPrompt: '',
  });
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [suggestingName, setSuggestingName] = useState(false);
  const [aiVariantModal, setAiVariantModal] = useState(false);
  const [aiVariantForm, setAiVariantForm] = useState({
    count: '3',
    customInstructions: '',
    provider: '',
    model: '',
    temperature: '',
    maxTokens: '',
  });
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Generate dataset modal
  const [genDatasetModal, setGenDatasetModal] = useState(false);
  const [genDatasetForm, setGenDatasetForm] = useState({
    name: '',
    topic: '',
    count: 5,
    style: 'qa' as 'qa' | 'classification' | 'extraction' | 'rag',
    customInstructions: '',
  });
  const [generatingDataset, setGeneratingDataset] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [c, ds, settings, all] = await Promise.all([
        promptsApi.get(id),
        datasetsApi.list(),
        settingsApi.getLlmSettings().catch(() => null),
        promptsApi.list(),
      ]);
      setCandidate(c);
      setLlmDefaults(settings);
      const e = toEditable(c, settings || undefined);
      setEdited(e);
      setOriginal(e);
      setDatasets(ds);
      setAllCandidates(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prompt');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Escape to close modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (genDatasetModal) {
          setGenDatasetModal(false);
          return;
        }
        if (aiVariantModal) {
          setAiVariantModal(false);
          return;
        }
        if (variantModal) {
          setVariantModal(false);
          return;
        }
        if (confirmDelete) {
          setConfirmDelete(false);
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [genDatasetModal, aiVariantModal, variantModal, confirmDelete]);

  const isDirty = useCallback(() => {
    if (!edited || !original) return false;
    return JSON.stringify(edited) !== JSON.stringify(original);
  }, [edited, original]);

  const handleSave = async () => {
    if (!edited || !candidate) return;
    setSaving(true);
    try {
      // Parse weighted grader list
      const graderEntries = edited.recommendedGraders
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const recommendedGraders: string[] = [];
      const graderWeights: Record<string, number> = {};
      for (const entry of graderEntries) {
        const colonIdx = entry.lastIndexOf(':');
        if (colonIdx > 0) {
          const maybeWeight = parseFloat(entry.slice(colonIdx + 1));
          if (!isNaN(maybeWeight)) {
            const gId = entry.slice(0, colonIdx);
            recommendedGraders.push(gId);
            graderWeights[gId] = maybeWeight;
            continue;
          }
        }
        recommendedGraders.push(entry);
        graderWeights[entry] = 1.0;
      }

      const recommendedDatasets = edited.recommendedDatasets
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await promptsApi.update(id, {
        name: edited.name,
        description: edited.description || undefined,
        runnerType: edited.runnerType,
        systemPrompt: edited.systemPrompt,
        userPromptTemplate: edited.userPromptTemplate || undefined,
        temperature: edited.temperature ? parseFloat(edited.temperature) : undefined,
        maxTokens: edited.maxTokens ? parseInt(edited.maxTokens, 10) : undefined,
        provider: edited.provider || undefined,
        model: edited.model || undefined,
        endpointUrl: edited.endpointUrl || undefined,
        endpointMethod: edited.endpointMethod || undefined,
        endpointBodyTemplate: edited.endpointBodyTemplate || undefined,
        recommendedGraders: recommendedGraders.length > 0 ? recommendedGraders : undefined,
        graderWeights: Object.keys(graderWeights).length > 0 ? graderWeights : undefined,
        recommendedDatasets: recommendedDatasets.length > 0 ? recommendedDatasets : undefined,
        graderRationale: edited.graderRationale || undefined,
        notes: edited.notes || undefined,
      });
      setCandidate(updated);
      const e = toEditable(updated);
      setEdited(e);
      setOriginal(e);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (original) setEdited({ ...original });
  };

  const handleTest = async () => {
    if (!testInput.trim()) return;
    setTestResult(null);
    setTesting(true);
    try {
      const result = await promptsApi.test(id, { input: testInput });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        output: '',
        latencyMs: 0,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
  };

  const openVariantModal = () => {
    setVariantForm({
      label: '',
      name: '',
      description: '',
      systemPrompt: candidate?.systemPrompt || '',
    });
    setVariantModal(true);
  };

  const openAiVariantModal = () => {
    setAiVariantForm({
      count: '3',
      customInstructions: '',
      provider: llmDefaults?.provider || '',
      model: llmDefaults?.model || '',
      temperature: llmDefaults?.temperature !== undefined ? String(llmDefaults.temperature) : '',
      maxTokens: llmDefaults?.maxTokens !== undefined ? String(llmDefaults.maxTokens) : '',
    });
    setAiVariantModal(true);
  };

  const handleCreateVariant = async () => {
    if (!variantForm.label.trim()) return;
    setCreatingVariant(true);
    try {
      const created = await promptsApi.createVariant(id, {
        variantLabel: variantForm.label.trim(),
        name: variantForm.name.trim() || undefined,
        description: variantForm.description.trim() || undefined,
        systemPrompt: variantForm.systemPrompt.trim() || undefined,
      });
      setVariantModal(false);
      router.push(`/candidates/${created.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create variant', 'error');
    } finally {
      setCreatingVariant(false);
    }
  };

  const handleSuggestName = async () => {
    if (!variantForm.label.trim()) return;
    setSuggestingName(true);
    try {
      const result = await promptsApi.suggestVariantName(id, {
        variantLabel: variantForm.label.trim(),
        systemPrompt: variantForm.systemPrompt || undefined,
      });
      setVariantForm({ ...variantForm, name: result.name });
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to suggest name', 'error');
    } finally {
      setSuggestingName(false);
    }
  };

  const handleGenerateVariants = async () => {
    const count = parseInt(aiVariantForm.count, 10);
    const temperature = aiVariantForm.temperature.trim()
      ? parseFloat(aiVariantForm.temperature)
      : undefined;
    const maxTokens = aiVariantForm.maxTokens.trim()
      ? parseInt(aiVariantForm.maxTokens, 10)
      : undefined;
    if (!Number.isInteger(count) || count < 1) {
      toast('Count must be a positive integer', 'warning');
      return;
    }
    if (temperature !== undefined && Number.isNaN(temperature)) {
      toast('Temperature must be a valid number', 'warning');
      return;
    }
    if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens <= 0)) {
      toast('Max tokens must be a positive integer', 'warning');
      return;
    }
    setGeneratingVariants(true);
    try {
      const result = await promptsApi.generateVariants(id, {
        count,
        customInstructions: aiVariantForm.customInstructions.trim() || undefined,
        provider: aiVariantForm.provider.trim()
          ? (aiVariantForm.provider.trim() as 'openai' | 'anthropic' | 'ollama')
          : undefined,
        model: aiVariantForm.model.trim() || undefined,
        temperature,
        maxTokens,
      });
      setAiVariantModal(false);
      await loadData();
      toast(
        `Generated ${result.created.length} variant(s)${result.skipped.length > 0 ? `, skipped ${result.skipped.length}.` : '.'}`,
        'success'
      );
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate variants', 'error');
    } finally {
      setGeneratingVariants(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await promptsApi.delete(id);
      router.push('/candidates');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const openGenDatasetModal = () => {
    setGenDatasetForm({
      name: `${candidate?.name || id} Dataset`,
      topic: candidate?.description || '',
      count: 5,
      style: 'qa',
      customInstructions: '',
    });
    setGenDatasetModal(true);
  };

  const handleGenerateDataset = async () => {
    if (!genDatasetForm.name.trim() || !genDatasetForm.topic.trim()) return;
    setGeneratingDataset(true);
    try {
      await presetsApi.generateSyntheticDataset({
        name: genDatasetForm.name.trim(),
        topic: genDatasetForm.topic.trim(),
        count: genDatasetForm.count,
        style: genDatasetForm.style,
        customInstructions: genDatasetForm.customInstructions.trim() || undefined,
        forCandidateId: id,
      });
      setGenDatasetModal(false);
      toast('Dataset generated and linked to this candidate', 'success');
      await loadData(); // Refresh to show new dataset in sidebar
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to generate dataset', 'error');
    } finally {
      setGeneratingDataset(false);
    }
  };

  const updateField = (field: keyof EditableCandidate, value: string) => {
    if (!edited) return;
    setEdited({ ...edited, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !candidate || !edited) {
    return (
      <div className="space-y-4">
        <Link
          href="/candidates"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Prompts
        </Link>
        <div className="card p-8 text-center">
          <p className="text-red-500">{error || 'Prompt not found'}</p>
        </div>
      </div>
    );
  }

  // Find linked datasets
  const linkedDatasets = datasets.filter((d) => candidate.recommendedDatasets?.includes(d.id));

  // Variant relationships
  const isVariant = !!candidate.parentId;
  const parentCandidate = isVariant ? allCandidates.find((c) => c.id === candidate.parentId) : null;
  const variants = isVariant
    ? [] // variants don't have sub-variants
    : allCandidates.filter((c) => c.parentId === id);

  // `filePath` should always be present for file-based prompts; avoid misleading fallbacks.
  const sourceFile = toWorkspaceRelativePath(candidate.filePath) || '(unknown file path)';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/candidates" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              {candidate.runnerType === 'llm_prompt' ? (
                <Bot className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Globe className="h-5 w-5 text-muted-foreground" />
              )}
              <h1 className="text-2xl font-semibold">{candidate.name}</h1>
              {isVariant && (
                <span className="text-xs px-2 py-0.5 bg-muted rounded font-mono">variant</span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <code className="text-xs">{sourceFile}</code>
              {isVariant && parentCandidate && (
                <span className="ml-2">
                  &larr; variant of{' '}
                  <Link
                    href={`/candidates/${candidate.parentId}`}
                    className="underline hover:text-foreground"
                  >
                    {parentCandidate.name}
                  </Link>
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty() && <span className="text-xs text-amber-500">Unsaved changes</span>}
          {!isVariant && (
            <>
              <button
                onClick={openVariantModal}
                className="btn-secondary flex items-center gap-2"
                title="Create a new variant"
              >
                <Plus className="h-4 w-4" />
                Variant
              </button>
              <button
                onClick={openAiVariantModal}
                className="btn-secondary flex items-center gap-2"
                title="Generate variants with AI"
              >
                AI
              </button>
            </>
          )}
          <button
            onClick={handleReset}
            disabled={!isDirty() || saving}
            className="btn-secondary flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty() || saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save to Disk
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-secondary text-red-500 hover:bg-red-500/10 p-2"
            title="Delete this prompt"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main editing area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic info */}
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Basic Info
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium block mb-1">Name</label>
                <input
                  type="text"
                  value={edited.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1 flex items-center gap-2">
                  Runner Type
                  <Tooltip text="LLM Prompt: sends system prompt + user template to an AI model (OpenAI, Anthropic, Ollama). HTTP Endpoint: calls an external API with test data — use for custom models or microservices." />
                </label>
                <select
                  value={edited.runnerType}
                  onChange={(e) =>
                    updateField('runnerType', e.target.value as 'llm_prompt' | 'http_endpoint')
                  }
                  className="input"
                >
                  <option value="llm_prompt">LLM Prompt</option>
                  <option value="http_endpoint">HTTP Endpoint</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Description</label>
              <input
                type="text"
                value={edited.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="input"
                placeholder="What does this prompt do?"
              />
            </div>
          </div>

          {/* System Prompt */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              System Prompt
            </h2>
            <textarea
              value={edited.systemPrompt}
              onChange={(e) => updateField('systemPrompt', e.target.value)}
              className="input font-mono text-sm min-h-[200px] resize-y"
              placeholder="Enter system prompt..."
            />
          </div>

          {/* User Template */}
          <div className="card p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              User Prompt Template
            </h2>
            <p className="text-xs text-muted-foreground">
              Use {'{{input}}'}, {'{{context}}'}, {'{{metadata.*}}'} as template variables.
            </p>
            <input
              type="text"
              value={edited.userPromptTemplate}
              onChange={(e) => updateField('userPromptTemplate', e.target.value)}
              className="input font-mono text-sm"
              placeholder="{{input}}"
            />
          </div>

          {/* Model Config (for LLM prompts) */}
          {edited.runnerType === 'llm_prompt' && (
            <div className="card p-4 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Model Configuration
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium block mb-1">Provider</label>
                  <select
                    value={edited.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value;
                      const models = MODEL_OPTIONS[newProvider] || MODEL_OPTIONS.openai;
                      setEdited((prev) =>
                        prev ? { ...prev, provider: newProvider, model: models[0] || '' } : prev
                      );
                    }}
                    className="input"
                  >
                    <option value="">Default ({llmDefaults?.provider || 'openai'})</option>
                    <option value="openai">OpenAI</option>
                    <option value="anthropic">Anthropic</option>
                    <option value="ollama">Ollama</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Model</label>
                  <select
                    value={edited.model}
                    onChange={(e) => updateField('model', e.target.value)}
                    className="input"
                  >
                    <option value="">Default ({llmDefaults?.model || 'gpt-5.2'})</option>
                    {(
                      MODEL_OPTIONS[edited.provider || llmDefaults?.provider || 'openai'] ||
                      MODEL_OPTIONS.openai
                    ).map((m) => (
                      <option key={m} value={m}>
                        {m}
                        {MODEL_PRICING[m] ? ` (${MODEL_PRICING[m]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Temperature</label>
                  <select
                    value={edited.temperature}
                    onChange={(e) => updateField('temperature', e.target.value)}
                    className="input"
                  >
                    <option value="">Default ({llmDefaults?.temperature ?? 0.7})</option>
                    {TEMPERATURE_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Max Tokens</label>
                  <select
                    value={edited.maxTokens}
                    onChange={(e) => updateField('maxTokens', e.target.value)}
                    className="input"
                  >
                    <option value="">Default ({llmDefaults?.maxTokens ?? 1024})</option>
                    {MAX_TOKEN_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Endpoint Config (for HTTP endpoints) */}
          {edited.runnerType === 'http_endpoint' && (
            <div className="card p-4 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Endpoint Configuration
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium block mb-1">Endpoint URL</label>
                  <input
                    type="text"
                    value={edited.endpointUrl}
                    onChange={(e) => updateField('endpointUrl', e.target.value)}
                    className="input"
                    placeholder="https://api.example.com/generate"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">HTTP Method</label>
                  <select
                    value={edited.endpointMethod || 'POST'}
                    onChange={(e) => updateField('endpointMethod', e.target.value)}
                    className="input"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">Body Template (JSON)</label>
                <textarea
                  value={edited.endpointBodyTemplate}
                  onChange={(e) => updateField('endpointBodyTemplate', e.target.value)}
                  className="input font-mono text-sm min-h-[100px] resize-y"
                  placeholder='{"prompt": "{{input}}"}'
                />
              </div>
            </div>
          )}

          {/* Advanced / Recommendations */}
          <div className="card overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full text-left px-4 py-3 flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium text-muted-foreground uppercase tracking-wide text-xs">
                Recommendations & Notes
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </button>
            {showAdvanced && (
              <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                <div>
                  <label className="text-xs font-medium block mb-1">Recommended Graders</label>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Comma-separated. Append :weight for weighted scoring (e.g.{' '}
                    <code>faithfulness:0.5, llm-judge-helpful:0.3</code>)
                  </p>
                  <input
                    type="text"
                    value={edited.recommendedGraders}
                    onChange={(e) => updateField('recommendedGraders', e.target.value)}
                    className="input font-mono text-sm"
                    placeholder="grader-id:0.5, other-grader:0.3"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Grader Rationale</label>
                  <input
                    type="text"
                    value={edited.graderRationale}
                    onChange={(e) => updateField('graderRationale', e.target.value)}
                    className="input"
                    placeholder="Why these graders and weights?"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Recommended Datasets</label>
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Comma-separated dataset IDs
                  </p>
                  <input
                    type="text"
                    value={edited.recommendedDatasets}
                    onChange={(e) => updateField('recommendedDatasets', e.target.value)}
                    className="input font-mono text-sm"
                    placeholder="context-qa, research-paper-extraction"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">Notes</label>
                  <textarea
                    value={edited.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    className="input min-h-[80px] resize-y"
                    placeholder="Testing notes, changelog, etc."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* File info */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source File
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <code className="text-xs">{sourceFile}</code>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Edit the <code>.md</code> file directly or use this form. Changes are saved to disk
              immediately.
            </p>
          </div>

          {/* Linked datasets */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              Linked Datasets
              <span className="group relative inline-block">
                <Info className="h-3.5 w-3.5 cursor-help opacity-60" />
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-normal z-50 w-56 text-center font-normal normal-case tracking-normal">
                  Datasets this candidate is designed to run against. Select one when creating an
                  experiment.
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </span>
              </span>
            </h3>
            {linkedDatasets.length > 0 ? (
              <div className="space-y-1">
                {linkedDatasets.map((d) => (
                  <Link
                    key={d.id}
                    href={`/datasets/${d.id}`}
                    className="block text-sm hover:text-foreground text-muted-foreground transition-colors"
                  >
                    {d.name}{' '}
                    <span className="text-xs opacity-60">({d.testCaseCount || 0} cases)</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No datasets linked yet.</p>
            )}
            <div className="pt-1">
              <button
                onClick={openGenDatasetModal}
                className="btn-ghost text-xs px-2 py-1 flex items-center gap-1"
              >
                <Wand2 className="h-3 w-3" /> Generate Dataset
              </button>
            </div>
          </div>

          {/* Variants list */}
          {!isVariant && variants.length > 0 && (
            <div className="card p-4 space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <GitBranch className="h-3.5 w-3.5" />
                Variants ({variants.length})
              </h3>
              <div className="space-y-1">
                {variants.map((v) => (
                  <Link
                    key={v.id}
                    href={`/candidates/${v.id}`}
                    className="block text-sm hover:text-foreground text-muted-foreground transition-colors"
                  >
                    {v.name}
                    {v.variantLabel && (
                      <span className="ml-1 text-xs opacity-60 font-mono">({v.variantLabel})</span>
                    )}
                  </Link>
                ))}
              </div>
              <div className="pt-2 flex gap-1">
                <button
                  onClick={openVariantModal}
                  className="btn-ghost text-xs px-2 py-1 flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Manual
                </button>
                <button onClick={openAiVariantModal} className="btn-ghost text-xs px-2 py-1">
                  AI Generate
                </button>
              </div>
            </div>
          )}

          {/* Quick test */}
          <div className="card p-4 space-y-3">
            <button
              onClick={() => setShowTest(!showTest)}
              className="w-full text-left flex items-center justify-between"
            >
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                <Play className="h-3.5 w-3.5" />
                Quick Test
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showTest ? 'rotate-180' : ''}`}
              />
            </button>
            {showTest && (
              <div className="space-y-2">
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Enter test input..."
                  className="input text-sm min-h-[80px] resize-y"
                />
                <button
                  onClick={handleTest}
                  disabled={!testInput.trim() || testing}
                  className={`btn-primary w-full flex items-center justify-center gap-2 ${testing ? 'animate-pulse' : ''}`}
                >
                  {testing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    'Run Test'
                  )}
                </button>
                {testResult && (
                  <div
                    className={`text-xs p-3 rounded ${testResult.error ? 'bg-red-500/10 text-red-500' : 'bg-muted'}`}
                  >
                    {testResult.error ? (
                      <p>Error: {testResult.error}</p>
                    ) : (
                      <>
                        <p className="font-mono whitespace-pre-wrap">{testResult.output}</p>
                        <p className="text-muted-foreground mt-2">{testResult.latencyMs}ms</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw frontmatter preview */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Frontmatter Preview
            </h3>
            <pre className="text-[11px] text-muted-foreground bg-muted/50 p-2 rounded font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
              {buildPreviewFrontmatter(edited)}
            </pre>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Prompt?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong>{candidate.name}</strong> ({id}.md) from disk.
              {variants.length > 0 && (
                <span className="text-amber-500 block mt-1">
                  This prompt has {variants.length} variant(s) that will become orphaned.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="btn-secondary"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn-primary bg-red-600 hover:bg-red-700"
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Variant Modal */}
      {variantModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create Variant of {candidate.name}</h2>
              <button onClick={() => setVariantModal(false)} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Variant Label *</label>
                <input
                  type="text"
                  value={variantForm.label}
                  onChange={(e) => setVariantForm({ ...variantForm, label: e.target.value })}
                  className="input"
                  placeholder="e.g., concise, formal, strict"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Creates{' '}
                  <code>
                    {id}-
                    {variantForm.label
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '') || '...'}
                    .md
                  </code>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Display Name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={variantForm.name}
                    onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                    className="input flex-1"
                    placeholder="Auto-generated if empty"
                  />
                  <button
                    onClick={handleSuggestName}
                    disabled={suggestingName || !variantForm.label.trim()}
                    className="btn-secondary px-2 shrink-0"
                    title="Auto-generate name with AI"
                  >
                    {suggestingName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Description</label>
                <input
                  type="text"
                  value={variantForm.description}
                  onChange={(e) => setVariantForm({ ...variantForm, description: e.target.value })}
                  className="input"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">System Prompt</label>
                <textarea
                  value={variantForm.systemPrompt}
                  onChange={(e) => setVariantForm({ ...variantForm, systemPrompt: e.target.value })}
                  className="input font-mono text-sm min-h-[160px] resize-y"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setVariantModal(false)}
                  className="btn-secondary"
                  disabled={creatingVariant}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateVariant}
                  className="btn-primary"
                  disabled={creatingVariant || !variantForm.label.trim()}
                >
                  {creatingVariant ? 'Creating...' : 'Create Variant'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Dataset Modal */}
      {genDatasetModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                Generate Dataset
              </h2>
              <button onClick={() => setGenDatasetModal(false)} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Generate a synthetic dataset for <strong>{candidate.name}</strong>. It will be
              auto-linked to this candidate.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={genDatasetForm.name}
                  onChange={(e) => setGenDatasetForm({ ...genDatasetForm, name: e.target.value })}
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Topic</label>
                <input
                  type="text"
                  value={genDatasetForm.topic}
                  onChange={(e) => setGenDatasetForm({ ...genDatasetForm, topic: e.target.value })}
                  placeholder="e.g., Basic arithmetic, Python programming"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1">Style</label>
                  <select
                    value={genDatasetForm.style}
                    onChange={(e) =>
                      setGenDatasetForm({
                        ...genDatasetForm,
                        style: e.target.value as typeof genDatasetForm.style,
                      })
                    }
                    className="input"
                  >
                    <option value="qa">Q&A</option>
                    <option value="classification">Classification</option>
                    <option value="extraction">Extraction</option>
                    <option value="rag">RAG</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">Count</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={genDatasetForm.count}
                    onChange={(e) =>
                      setGenDatasetForm({
                        ...genDatasetForm,
                        count: parseInt(e.target.value) || 5,
                      })
                    }
                    className="input"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={genDatasetForm.customInstructions}
                  onChange={(e) =>
                    setGenDatasetForm({
                      ...genDatasetForm,
                      customInstructions: e.target.value,
                    })
                  }
                  placeholder="e.g., Focus on edge cases, include multi-step questions"
                  className="input min-h-[80px] resize-y"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setGenDatasetModal(false)}
                  className="btn-secondary"
                  disabled={generatingDataset}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateDataset}
                  className="btn-primary"
                  disabled={
                    generatingDataset || !genDatasetForm.name.trim() || !genDatasetForm.topic.trim()
                  }
                >
                  {generatingDataset ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generate Variants Modal */}
      {aiVariantModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generate Variants (AI)</h2>
              <button onClick={() => setAiVariantModal(false)} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Generate multiple prompt variations for <strong>{candidate.name}</strong>. Variant
              names, labels, and system prompts are auto-generated by the AI. Config starts from
              your Settings defaults.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Number of Variants</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={aiVariantForm.count}
                  onChange={(e) => setAiVariantForm({ ...aiVariantForm, count: e.target.value })}
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">
                  Custom Instructions (optional)
                </label>
                <textarea
                  value={aiVariantForm.customInstructions}
                  onChange={(e) =>
                    setAiVariantForm({ ...aiVariantForm, customInstructions: e.target.value })
                  }
                  placeholder="e.g., keep outputs short, optimize for strict factual grounding"
                  className="input min-h-[90px] resize-y"
                />
              </div>
              <LlmConfigGrid
                form={aiVariantForm}
                setForm={setAiVariantForm}
                defaults={llmDefaults}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setAiVariantModal(false)}
                  className="btn-secondary"
                  disabled={generatingVariants}
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateVariants}
                  className="btn-primary"
                  disabled={generatingVariants}
                >
                  {generatingVariants ? 'Generating...' : 'Generate Variants'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPreviewFrontmatter(e: EditableCandidate): string {
  const lines: string[] = ['---'];
  lines.push(`name: ${e.name}`);
  if (e.description) lines.push(`description: ${e.description}`);
  lines.push(`runner: ${e.runnerType}`);
  if (e.temperature) lines.push(`temperature: ${e.temperature}`);
  if (e.maxTokens) lines.push(`max_tokens: ${e.maxTokens}`);
  if (e.provider) lines.push(`provider: ${e.provider}`);
  if (e.model) lines.push(`model: ${e.model}`);
  if (e.userPromptTemplate) lines.push(`user_template: "${e.userPromptTemplate}"`);
  if (e.endpointUrl) lines.push(`endpoint_url: ${e.endpointUrl}`);
  if (e.endpointMethod) lines.push(`endpoint_method: ${e.endpointMethod}`);
  if (e.recommendedGraders) lines.push(`recommended_graders: ${e.recommendedGraders}`);
  if (e.recommendedDatasets) lines.push(`recommended_datasets: ${e.recommendedDatasets}`);
  if (e.graderRationale) lines.push(`grader_rationale: ${e.graderRationale}`);
  if (e.notes) lines.push(`notes: ${e.notes}`);
  lines.push('---');
  return lines.join('\n');
}

const MODEL_OPTIONS: Record<string, string[]> = {
  openai: [
    'gpt-5.2',
    'gpt-5.1',
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4o',
    'gpt-4o-mini',
    'o3',
    'o4-mini',
    'o3-mini',
    'o1',
  ],
  anthropic: [
    'claude-opus-4-6',
    'claude-opus-4-5-20251101',
    'claude-sonnet-4-5-20250929',
    'claude-sonnet-4-20250514',
    'claude-haiku-4-5-20251001',
    'claude-haiku-3-5',
  ],
  ollama: [
    'dolphin-llama3:8b',
    'llama3.2:3b',
    'llama3:8b',
    'mistral',
    'codellama',
    'gemma:7b',
    'phi3',
  ],
};

/** Pricing per 1M tokens: in (input) · out (output) */
const MODEL_PRICING: Record<string, string> = {
  'gpt-5.2': 'in: $1.75 · out: $14 /1M tok',
  'gpt-5.1': 'in: $1.25 · out: $10 /1M tok',
  'gpt-5': 'in: $1.25 · out: $10 /1M tok',
  'gpt-5-mini': 'in: $0.25 · out: $2 /1M tok',
  'gpt-5-nano': 'in: $0.05 · out: $0.40 /1M tok',
  'gpt-4.1': 'in: $2 · out: $8 /1M tok',
  'gpt-4.1-mini': 'in: $0.40 · out: $1.60 /1M tok',
  'gpt-4.1-nano': 'in: $0.10 · out: $0.40 /1M tok',
  'gpt-4o': 'in: $2.50 · out: $10 /1M tok',
  'gpt-4o-mini': 'in: $0.15 · out: $0.60 /1M tok',
  o3: 'in: $2 · out: $8 /1M tok',
  'o4-mini': 'in: $1.10 · out: $4.40 /1M tok',
  'o3-mini': 'in: $0.55 · out: $2.20 /1M tok',
  o1: 'in: $15 · out: $60 /1M tok',
  'claude-opus-4-6': 'in: $5 · out: $25 /1M tok',
  'claude-opus-4-5-20251101': 'in: $5 · out: $25 /1M tok',
  'claude-sonnet-4-5-20250929': 'in: $3 · out: $15 /1M tok',
  'claude-sonnet-4-20250514': 'in: $3 · out: $15 /1M tok',
  'claude-haiku-4-5-20251001': 'in: $1 · out: $5 /1M tok',
  'claude-haiku-3-5': 'in: $0.80 · out: $4 /1M tok',
};

const TEMPERATURE_OPTIONS = ['0', '0.1', '0.3', '0.5', '0.7', '0.9', '1.0', '1.5', '2.0'];
const MAX_TOKEN_OPTIONS = ['256', '512', '1024', '2048', '4096', '8192'];

function LlmConfigGrid({
  form,
  setForm,
  defaults,
}: {
  form: { provider: string; model: string; temperature: string; maxTokens: string };
  setForm: (f: any) => void;
  defaults: { provider?: string; model?: string; temperature?: number; maxTokens?: number } | null;
}) {
  const activeProvider = form.provider || defaults?.provider || 'openai';
  const models = MODEL_OPTIONS[activeProvider] || MODEL_OPTIONS.openai;

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-sm font-medium block mb-1">Provider</label>
        <select
          value={form.provider}
          onChange={(e) => setForm({ ...form, provider: e.target.value, model: '' })}
          className="input"
        >
          <option value="">Default ({defaults?.provider || 'openai'})</option>
          <option value="ollama">Ollama</option>
          <option value="openai">OpenAI</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Model</label>
        <select
          value={form.model}
          onChange={(e) => setForm({ ...form, model: e.target.value })}
          className="input"
        >
          <option value="">Default ({defaults?.model || models[0]})</option>
          {models.map((m) => (
            <option key={m} value={m}>
              {m}
              {MODEL_PRICING[m] ? ` (${MODEL_PRICING[m]})` : ''}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Temperature</label>
        <select
          value={form.temperature}
          onChange={(e) => setForm({ ...form, temperature: e.target.value })}
          className="input"
        >
          <option value="">Default ({defaults?.temperature ?? 0.7})</option>
          {TEMPERATURE_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium block mb-1">Max Tokens</label>
        <select
          value={form.maxTokens}
          onChange={(e) => setForm({ ...form, maxTokens: e.target.value })}
          className="input"
        >
          <option value="">Default ({defaults?.maxTokens ?? 1024})</option>
          {MAX_TOKEN_OPTIONS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
