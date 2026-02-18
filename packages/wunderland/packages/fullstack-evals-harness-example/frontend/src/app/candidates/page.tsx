'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Globe,
  Play,
  Loader2,
  RefreshCw,
  Info,
  ChevronDown,
  FileText,
  GitBranch,
  Plus,
  Trash2,
  X,
  Wand2,
} from 'lucide-react';
import Link from 'next/link';
import { promptsApi, settingsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { Candidate } from '@/lib/types';

function toWorkspaceRelativePath(absPath?: string): string | null {
  if (!absPath) return null;
  const normalized = absPath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/backend/');
  if (idx !== -1) return normalized.slice(idx + 1);
  return absPath;
}

function normalizeVariantLabel(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return normalized || 'variant';
}

export default function CandidatesPage() {
  const { toast } = useToast();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('');
  const [runningTest, setRunningTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    output: string;
    latencyMs: number;
    error?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [variantModal, setVariantModal] = useState<string | null>(null);
  const [variantForm, setVariantForm] = useState({
    label: '',
    name: '',
    description: '',
    systemPrompt: '',
  });
  const [creatingVariant, setCreatingVariant] = useState(false);
  const [suggestingName, setSuggestingName] = useState(false);
  const [aiVariantModal, setAiVariantModal] = useState<string | null>(null);
  const [aiVariantForm, setAiVariantForm] = useState({
    count: '3',
    customInstructions: '',
    provider: '',
    model: '',
    temperature: '',
    maxTokens: '',
  });
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [llmDefaults, setLlmDefaults] = useState<{
    provider?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  } | null>(null);

  const loadCandidates = async () => {
    try {
      const data = await promptsApi.list();
      setCandidates(data);
    } catch (error) {
      console.error('Failed to load prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
    settingsApi
      .getLlmSettings()
      .then((settings) => setLlmDefaults(settings))
      .catch(() => null);
  }, []);

  // Escape to close modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (aiVariantModal) {
          setAiVariantModal(null);
          return;
        }
        if (variantModal) {
          setVariantModal(null);
          return;
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aiVariantModal, variantModal]);

  const handleReload = async () => {
    setReloading(true);
    try {
      const result = await promptsApi.reload();
      await loadCandidates();
      toast(`Reloaded ${result.loaded} prompts from disk.`, 'success');
    } catch (error) {
      console.error('Failed to reload prompts:', error);
    } finally {
      setReloading(false);
    }
  };

  const handleTest = async (candidate: Candidate) => {
    if (!testInput.trim()) return;
    setTestResult(null);
    setRunningTest(true);
    try {
      const result = await promptsApi.test(candidate.id, { input: testInput });
      setTestResult(result);
    } catch (error) {
      setTestResult({
        output: '',
        latencyMs: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setRunningTest(false);
    }
  };

  const handleDelete = async (candidate: Candidate) => {
    const file = toWorkspaceRelativePath(candidate.filePath) || 'the prompt file';
    const msg = candidate.parentId
      ? `Delete variant "${candidate.name}"? This will remove ${file} from disk.`
      : `Delete prompt "${candidate.name}"? This will remove ${file} from disk. Variants will remain on disk but become orphans.`;
    if (!confirm(msg)) return;
    try {
      await promptsApi.delete(candidate.id);
      await loadCandidates();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Delete failed', 'error');
    }
  };

  const openVariantModal = (parentId: string) => {
    const parent = candidates.find((c) => c.id === parentId);
    setVariantForm({
      label: '',
      name: '',
      description: '',
      systemPrompt: parent?.systemPrompt || '',
    });
    setVariantModal(parentId);
  };

  const openAiVariantModal = (parentId: string) => {
    setAiVariantForm({
      count: '3',
      customInstructions: '',
      provider: llmDefaults?.provider || '',
      model: llmDefaults?.model || '',
      temperature: llmDefaults?.temperature !== undefined ? String(llmDefaults.temperature) : '',
      maxTokens: llmDefaults?.maxTokens !== undefined ? String(llmDefaults.maxTokens) : '',
    });
    setAiVariantModal(parentId);
  };

  const handleCreateVariant = async () => {
    if (!variantModal || !variantForm.label.trim()) return;
    setCreatingVariant(true);
    try {
      await promptsApi.createVariant(variantModal, {
        variantLabel: variantForm.label.trim(),
        name: variantForm.name.trim() || undefined,
        description: variantForm.description.trim() || undefined,
        systemPrompt: variantForm.systemPrompt || undefined,
      });
      setVariantModal(null);
      await loadCandidates();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to create variant', 'error');
    } finally {
      setCreatingVariant(false);
    }
  };

  const handleSuggestName = async () => {
    if (!variantModal || !variantForm.label.trim()) return;
    setSuggestingName(true);
    try {
      const result = await promptsApi.suggestVariantName(variantModal, {
        variantLabel: variantForm.label.trim(),
        systemPrompt: variantForm.systemPrompt || undefined,
      });
      setVariantForm({ ...variantForm, name: result.name });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to suggest name', 'error');
    } finally {
      setSuggestingName(false);
    }
  };

  const handleGenerateVariants = async () => {
    if (!aiVariantModal) return;

    const count = parseInt(aiVariantForm.count, 10);
    const temperature =
      aiVariantForm.temperature.trim() !== '' ? parseFloat(aiVariantForm.temperature) : undefined;
    const maxTokens =
      aiVariantForm.maxTokens.trim() !== '' ? parseInt(aiVariantForm.maxTokens, 10) : undefined;

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
      const result = await promptsApi.generateVariants(aiVariantModal, {
        count,
        customInstructions: aiVariantForm.customInstructions.trim() || undefined,
        provider: aiVariantForm.provider.trim()
          ? (aiVariantForm.provider.trim() as 'openai' | 'anthropic' | 'ollama')
          : undefined,
        model: aiVariantForm.model.trim() || undefined,
        temperature,
        maxTokens,
      });
      setAiVariantModal(null);
      await loadCandidates();
      toast(
        `Generated ${result.created.length} variant(s)` +
          (result.skipped.length > 0 ? `, skipped ${result.skipped.length}.` : '.'),
        'success'
      );
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to generate variants', 'error');
    } finally {
      setGeneratingVariants(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prompts</h1>
          <p className="text-sm text-muted-foreground">
            Prompt templates loaded from{' '}
            <code className="text-xs">backend/prompts/{'{family}'}/*.md</code>
          </p>
        </div>
        <button
          onClick={handleReload}
          disabled={reloading}
          className="btn-secondary flex items-center gap-2"
          title="Re-scan backend/prompts/ and reload all .md files into memory"
        >
          <RefreshCw className={`h-4 w-4 ${reloading ? 'animate-spin' : ''}`} />
          Reload from Disk
        </button>
      </div>

      {/* Expandable guide */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full text-left px-4 py-3 card flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          How prompts &amp; variants work
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>
      {showGuide && (
        <div className="card p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            Each <strong className="text-foreground">prompt family</strong> lives in its own folder
            under <code>backend/prompts/</code>. The folder name becomes the parent ID; variant
            filenames become <code>{'{folder}-{filename}'}</code> IDs.
          </p>
          <div className="border border-border p-3 rounded-md">
            <strong className="text-foreground text-xs uppercase">File format</strong>
            <pre className="mt-1 text-xs font-mono whitespace-pre-wrap">{`---
name: My Prompt
description: What this prompt does
runner: llm_prompt
user_template: "{{input}}"
recommended_graders: faithfulness:0.5, llm-judge-helpful:0.3
recommended_datasets: context-qa
grader_rationale: Why these graders and weights
notes: Testing notes here
---
Your system prompt text goes here.`}</pre>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="border border-border p-3 rounded-md">
              <strong className="text-foreground text-xs uppercase">LLM Prompt</strong>
              <p className="mt-1 text-xs">
                System prompt + user template sent to an LLM. Use <code>{'{{input}}'}</code>,{' '}
                <code>{'{{context}}'}</code>, <code>{'{{metadata.*}}'}</code> for template
                variables.
              </p>
            </div>
            <div className="border border-border p-3 rounded-md">
              <strong className="text-foreground text-xs uppercase">HTTP Endpoint</strong>
              <p className="mt-1 text-xs">
                Calls an external API with the test case data. Set{' '}
                <code>runner: http_endpoint</code> and add <code>endpoint_url</code>,{' '}
                <code>endpoint_method</code> fields.
              </p>
            </div>
          </div>
          <div className="border border-border p-3 rounded-md">
            <strong className="text-foreground text-xs uppercase">Prompt Variations</strong>
            <p className="mt-1 text-xs">
              Click the <strong>+ Variant</strong> button on any prompt to create a new variation.
              Variants clone the parent&apos;s system prompt and config so you can tweak the
              instructions and compare results. Each variant is saved as a <code>.md</code> file in
              the parent&apos;s family folder.
            </p>
            <pre className="mt-1 text-xs font-mono whitespace-pre-wrap text-foreground/70">{`# Folder structure:
backend/prompts/summarizer/
  base.md        → ID: summarizer (parent)
  concise.md     → ID: summarizer-concise (variant)
  bullets.md     → ID: summarizer-bullets (variant)`}</pre>
          </div>
          <p>
            <strong className="text-foreground">A/B testing:</strong> Run variants in the same
            experiment to compare them head-to-head. The <strong>Play</strong> button lets you test
            a single input before running a full experiment.
          </p>
        </div>
      )}

      {/* Prompt list */}
      {candidates.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No prompts found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Add <code>.md</code> files to <code>backend/prompts/</code> and click Reload.
          </p>
          <button onClick={handleReload} className="btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload from Disk
          </button>
        </div>
      ) : (
        <PromptList
          candidates={candidates}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          testingId={testingId}
          setTestingId={setTestingId}
          testInput={testInput}
          setTestInput={setTestInput}
          testResult={testResult}
          setTestResult={setTestResult}
          runningTest={runningTest}
          handleTest={handleTest}
          handleDelete={handleDelete}
          openVariantModal={openVariantModal}
          openAiVariantModal={openAiVariantModal}
        />
      )}

      {/* Create Variant Modal */}
      {variantModal &&
        (() => {
          const parent = candidates.find((c) => c.id === variantModal);
          const labelSlug = normalizeVariantLabel(variantForm.label || 'label');
          const variantId = `${variantModal}-${labelSlug}`;
          const parentIsFamilyBase =
            !!parent?.filePath && parent.filePath.replace(/\\/g, '/').endsWith('/base.md');
          const variantFile = parentIsFamilyBase
            ? `backend/prompts/${variantModal}/${labelSlug}.md`
            : `backend/prompts/${variantId}.md`;

          return (
            <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="card p-6 w-full max-w-lg">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5" />
                    Create Variant of &ldquo;{candidates.find((c) => c.id === variantModal)?.name}
                    &rdquo;
                  </h2>
                  <button onClick={() => setVariantModal(null)} className="btn-ghost p-1">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Clone this prompt with a new label. The system prompt is pre-filled from the
                  parent — edit it to create your variation. A new <code>.md</code> file will be
                  saved to disk.
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Variant Label <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Creates ID <code>{variantId}</code> and writes <code>{variantFile}</code>
                    </p>
                    <input
                      type="text"
                      value={variantForm.label}
                      onChange={(e) => setVariantForm({ ...variantForm, label: e.target.value })}
                      placeholder="e.g., concise, formal, v2"
                      className="input"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">
                      Display Name (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={variantForm.name}
                        onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
                        placeholder={`e.g., ${candidates.find((c) => c.id === variantModal)?.name} (${variantForm.label || 'label'})`}
                        className="input flex-1"
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
                    <label className="text-sm font-medium block mb-1">Description (optional)</label>
                    <input
                      type="text"
                      value={variantForm.description}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, description: e.target.value })
                      }
                      placeholder="What makes this variant different?"
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1">System Prompt</label>
                    <p className="text-[11px] text-muted-foreground mb-1">
                      Pre-filled from parent. Edit to create your variation.
                    </p>
                    <textarea
                      value={variantForm.systemPrompt}
                      onChange={(e) =>
                        setVariantForm({ ...variantForm, systemPrompt: e.target.value })
                      }
                      className="input font-mono text-sm min-h-[200px] resize-y"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setVariantModal(null)}
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
          );
        })()}

      {/* AI Generate Variants Modal */}
      {aiVariantModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Generate Variants (AI)</h2>
              <button onClick={() => setAiVariantModal(null)} className="btn-ghost p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Generate multiple prompt variations for{' '}
              <strong className="text-foreground">
                {candidates.find((c) => c.id === aiVariantModal)?.name}
              </strong>
              . Variant names, labels, and system prompts are auto-generated by the AI. Config
              starts from your Settings defaults.
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
                    setAiVariantForm({
                      ...aiVariantForm,
                      customInstructions: e.target.value,
                    })
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
                  onClick={() => setAiVariantModal(null)}
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

/**
 * Groups candidates by parent -> variants. Only parent cards are shown;
 * variants are listed inside an expandable section of each parent card.
 */
function PromptList({
  candidates,
  expandedId,
  setExpandedId,
  testingId,
  setTestingId,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  runningTest,
  handleTest,
  handleDelete,
  openVariantModal,
  openAiVariantModal,
}: {
  candidates: Candidate[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  testingId: string | null;
  setTestingId: (id: string | null) => void;
  testInput: string;
  setTestInput: (v: string) => void;
  testResult: { output: string; latencyMs: number; error?: string } | null;
  setTestResult: (v: { output: string; latencyMs: number; error?: string } | null) => void;
  runningTest: boolean;
  handleTest: (c: Candidate) => void;
  handleDelete: (c: Candidate) => void;
  openVariantModal: (parentId: string) => void;
  openAiVariantModal: (parentId: string) => void;
}) {
  const [variantsOpen, setVariantsOpen] = useState<string | null>(null);
  const bases = candidates.filter((c) => !c.parentId);
  const variantMap = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (c.parentId) {
      const list = variantMap.get(c.parentId) || [];
      list.push(c);
      variantMap.set(c.parentId, list);
    }
  }

  const cardProps = {
    expandedId,
    setExpandedId,
    testingId,
    setTestingId,
    testInput,
    setTestInput,
    testResult,
    setTestResult,
    runningTest,
    handleTest,
    handleDelete,
    openVariantModal,
    openAiVariantModal,
    variantsOpen,
    setVariantsOpen,
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {bases.map((base) => (
        <PromptCard
          key={base.id}
          candidate={base}
          variants={variantMap.get(base.id) || []}
          {...cardProps}
        />
      ))}
    </div>
  );
}

function PromptCard({
  candidate,
  variants,
  expandedId,
  setExpandedId,
  testingId,
  setTestingId,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  runningTest,
  handleTest,
  handleDelete,
  openVariantModal,
  openAiVariantModal,
  variantsOpen,
  setVariantsOpen,
}: {
  candidate: Candidate;
  variants: Candidate[];
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  testingId: string | null;
  setTestingId: (id: string | null) => void;
  testInput: string;
  setTestInput: (v: string) => void;
  testResult: { output: string; latencyMs: number; error?: string } | null;
  setTestResult: (v: { output: string; latencyMs: number; error?: string } | null) => void;
  runningTest: boolean;
  handleTest: (c: Candidate) => void;
  handleDelete: (c: Candidate) => void;
  openVariantModal: (parentId: string) => void;
  openAiVariantModal: (parentId: string) => void;
  variantsOpen: string | null;
  setVariantsOpen: (id: string | null) => void;
}) {
  const showVariants = variantsOpen === candidate.id;

  return (
    <div className="card flex flex-col">
      {/* Clickable header area */}
      <Link
        href={`/candidates/${candidate.id}`}
        className="p-4 pb-3 hover:bg-muted/30 transition-colors block"
      >
        <div className="flex items-start gap-2">
          {candidate.runnerType === 'llm_prompt' ? (
            <Bot className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium truncate">{candidate.name}</h3>
            {candidate.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {candidate.description}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* Info section */}
      <div className="px-4 pb-3 space-y-2 flex-1">
        <div className="flex flex-wrap gap-1.5">
          <span className="badge bg-muted text-muted-foreground font-mono text-[10px]">
            {candidate.id}.md
          </span>
          <span className="badge bg-muted text-muted-foreground text-[10px]">
            {candidate.runnerType === 'llm_prompt' ? 'LLM Prompt' : 'HTTP Endpoint'}
          </span>
          {candidate.modelConfig?.provider && (
            <span className="badge bg-muted text-muted-foreground text-[10px]">
              {candidate.modelConfig.provider}
            </span>
          )}
          {candidate.modelConfig?.temperature !== undefined && (
            <span className="badge bg-muted text-muted-foreground text-[10px]">
              temp: {candidate.modelConfig.temperature}
            </span>
          )}
        </div>

        {/* Recommended graders */}
        {candidate.recommendedGraders && candidate.recommendedGraders.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            <span className="opacity-60">Graders:</span>
            {candidate.recommendedGraders.map((g) => {
              const weight = candidate.graderWeights?.[g];
              const hasWeight = weight != null && weight !== 1;
              return (
                <span key={g} className="badge bg-muted/50 text-muted-foreground text-[10px]">
                  {g}
                  {hasWeight && (
                    <span className="ml-0.5 text-foreground/70">{Math.round(weight * 100)}%</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        {/* Recommended datasets */}
        {candidate.recommendedDatasets && candidate.recommendedDatasets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
            <span className="opacity-60">Datasets:</span>
            {candidate.recommendedDatasets.map((d) => (
              <a
                key={d}
                href={`/datasets/${d}`}
                className="badge bg-muted/50 text-muted-foreground text-[10px] hover:text-foreground hover:bg-muted transition-colors"
              >
                {d}
              </a>
            ))}
          </div>
        )}

        {/* Grader rationale */}
        {candidate.graderRationale && (
          <p className="text-[10px] text-muted-foreground/80 italic">{candidate.graderRationale}</p>
        )}

        {/* System prompt preview */}
        {candidate.systemPrompt && (
          <div>
            <button
              onClick={() => setExpandedId(expandedId === candidate.id ? null : candidate.id)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ChevronDown
                className={`h-2.5 w-2.5 transition-transform ${expandedId === candidate.id ? 'rotate-180' : ''}`}
              />
              System prompt
            </button>
            {expandedId === candidate.id ? (
              <pre className="text-[10px] text-muted-foreground bg-muted/50 p-2 rounded font-mono whitespace-pre-wrap mt-1 max-h-48 overflow-y-auto">
                {candidate.systemPrompt}
              </pre>
            ) : (
              <div className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded font-mono overflow-hidden mt-1">
                {candidate.systemPrompt.substring(0, 100)}
                {candidate.systemPrompt.length > 100 && '...'}
              </div>
            )}
          </div>
        )}

        {/* User template preview */}
        {candidate.userPromptTemplate && candidate.userPromptTemplate !== '{{input}}' && (
          <div className="text-[10px] text-muted-foreground bg-muted/50 p-1.5 rounded font-mono overflow-hidden">
            <span className="opacity-50">Template:</span>{' '}
            {candidate.userPromptTemplate.substring(0, 100)}
            {candidate.userPromptTemplate.length > 100 && '...'}
          </div>
        )}

        {/* Variants section */}
        {variants.length > 0 && (
          <div>
            <button
              onClick={() => setVariantsOpen(showVariants ? null : candidate.id)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <GitBranch className="h-2.5 w-2.5" />
              <ChevronDown
                className={`h-2.5 w-2.5 transition-transform ${showVariants ? 'rotate-180' : ''}`}
              />
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </button>
            {showVariants && (
              <div className="mt-1.5 space-y-1 border-l-2 border-muted-foreground/20 pl-2.5">
                {variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/candidates/${v.id}`}
                      className="text-xs hover:text-foreground text-muted-foreground transition-colors truncate flex items-center gap-1.5"
                    >
                      <span className="font-medium text-foreground/80">
                        {v.variantLabel || v.name}
                      </span>
                      {v.variantLabel && v.name !== v.variantLabel && (
                        <span className="opacity-50 text-[10px]">{v.name}</span>
                      )}
                    </Link>
                    <button
                      onClick={() => handleDelete(v)}
                      className="btn-ghost p-0.5 text-muted-foreground hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-border px-3 py-2 flex items-center gap-1">
        <button
          onClick={() => openVariantModal(candidate.id)}
          className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
        >
          <Plus className="h-3 w-3" />
          Variant
        </button>
        <button
          onClick={() => openAiVariantModal(candidate.id)}
          className="btn-ghost px-2 py-1 text-xs flex items-center gap-1"
        >
          <GitBranch className="h-3 w-3" />
          AI Gen
        </button>
        <button
          onClick={() => {
            if (testingId === candidate.id) {
              setTestingId(null);
              setTestResult(null);
            } else {
              setTestingId(candidate.id);
              setTestInput('');
              setTestResult(null);
            }
          }}
          className={`btn-ghost px-2 py-1 text-xs flex items-center gap-1 ${testingId === candidate.id ? 'bg-muted' : ''}`}
        >
          <Play className="h-3 w-3" />
          Test
        </button>
        <div className="flex-1" />
        <button
          onClick={() => handleDelete(candidate)}
          className="btn-ghost px-2 py-1 text-xs text-muted-foreground hover:text-red-500 flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>

      {/* Test panel */}
      {testingId === candidate.id && (
        <div className="border-t border-border px-4 py-3 space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={testInput}
              onChange={(e) => setTestInput(e.target.value)}
              placeholder="Enter test input..."
              className="input flex-1 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleTest(candidate)}
            />
            <button
              onClick={() => handleTest(candidate)}
              className={`btn-primary text-sm flex items-center gap-1.5 ${runningTest ? 'animate-pulse' : ''}`}
              disabled={!testInput.trim() || runningTest}
            >
              {runningTest ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                'Run'
              )}
            </button>
          </div>
          {testResult && (
            <div
              className={`text-xs p-2 rounded ${testResult.error ? 'bg-red-500/10 text-red-500' : 'bg-muted'}`}
            >
              {testResult.error ? (
                <p>Error: {testResult.error}</p>
              ) : (
                <>
                  <p className="font-mono whitespace-pre-wrap">{testResult.output}</p>
                  <p className="text-muted-foreground mt-1">{testResult.latencyMs}ms</p>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
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
