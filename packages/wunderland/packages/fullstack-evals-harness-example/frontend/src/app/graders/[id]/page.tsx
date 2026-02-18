'use client';

import { useState, useEffect, useCallback, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Save,
  Loader2,
  ChevronDown,
  FileText,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { gradersApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import type { Grader } from '@/lib/types';

const GRADER_TYPE_INFO: Record<
  string,
  { label: string; category: 'deterministic' | 'llm-powered' }
> = {
  'exact-match': { label: 'Exact Match', category: 'deterministic' },
  'llm-judge': { label: 'LLM Judge', category: 'llm-powered' },
  'semantic-similarity': { label: 'Semantic Similarity', category: 'llm-powered' },
  contains: { label: 'Contains', category: 'deterministic' },
  regex: { label: 'Regex Match', category: 'deterministic' },
  'json-schema': { label: 'JSON Schema', category: 'deterministic' },
  promptfoo: { label: 'Promptfoo', category: 'llm-powered' },
};

interface EditableGrader {
  name: string;
  description: string;
  rubric: string;
  threshold: string;
  inspiration: string;
  reference: string;
  configJson: string;
}

function toEditable(g: Grader): EditableGrader {
  const threshold =
    g.config && typeof g.config === 'object' && 'threshold' in g.config
      ? String(g.config.threshold)
      : '';

  // Build config JSON excluding threshold (shown separately)
  const configWithoutThreshold = g.config
    ? Object.fromEntries(Object.entries(g.config).filter(([k]) => k !== 'threshold'))
    : {};
  const hasExtra = Object.keys(configWithoutThreshold).length > 0;

  return {
    name: g.name || '',
    description: g.description || '',
    rubric: g.rubric || '',
    threshold,
    inspiration: g.inspiration || '',
    reference: g.reference || '',
    configJson: hasExtra ? JSON.stringify(configWithoutThreshold, null, 2) : '',
  };
}

function buildConfig(edited: EditableGrader): Record<string, unknown> | undefined {
  const config: Record<string, unknown> = {};

  if (edited.threshold.trim()) {
    const t = parseFloat(edited.threshold);
    if (!isNaN(t) && t >= 0 && t <= 1) {
      config.threshold = t;
    }
  }

  if (edited.configJson.trim()) {
    try {
      const extra = JSON.parse(edited.configJson);
      if (typeof extra === 'object' && extra !== null) {
        Object.assign(config, extra);
      }
    } catch {
      // invalid JSON, skip
    }
  }

  return Object.keys(config).length > 0 ? config : undefined;
}

function buildYamlPreview(grader: Grader, edited: EditableGrader): string {
  const lines: string[] = [];
  lines.push(`name: "${edited.name}"`);
  if (edited.description) lines.push(`description: "${edited.description}"`);
  lines.push(`type: ${grader.type}`);
  if (edited.rubric) {
    lines.push('rubric: |');
    for (const line of edited.rubric.split('\n')) {
      lines.push(`  ${line}`);
    }
  }
  const config = buildConfig(edited);
  if (config && Object.keys(config).length > 0) {
    lines.push('config:');
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object') {
        lines.push(`  ${key}:`);
        const subLines = JSON.stringify(value, null, 2).split('\n');
        for (const sl of subLines) {
          lines.push(`    ${sl}`);
        }
      } else {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }
  if (edited.inspiration) {
    lines.push('inspiration: |');
    for (const line of edited.inspiration.split('\n')) {
      lines.push(`  ${line}`);
    }
  }
  if (edited.reference) lines.push(`reference: "${edited.reference}"`);
  return lines.join('\n');
}

export default function GraderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const [grader, setGrader] = useState<Grader | null>(null);
  const [edited, setEdited] = useState<EditableGrader | null>(null);
  const [original, setOriginal] = useState<EditableGrader | null>(null);
  const [rawYaml, setRawYaml] = useState<string | null>(null);
  const [showRawYaml, setShowRawYaml] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [g, yaml] = await Promise.all([
        gradersApi.get(id),
        gradersApi.getRawYaml(id).catch(() => null),
      ]);
      setGrader(g);
      setRawYaml(yaml);
      const e = toEditable(g);
      setEdited(e);
      setOriginal(e);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load grader');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmDelete) {
        setConfirmDelete(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmDelete]);

  const isDirty = useCallback(() => {
    if (!edited || !original) return false;
    return JSON.stringify(edited) !== JSON.stringify(original);
  }, [edited, original]);

  const handleSave = async () => {
    if (!edited || !grader) return;
    setSaving(true);
    try {
      const config = buildConfig(edited);
      // Merge threshold back into existing config
      const mergedConfig = { ...grader.config, ...config };
      // If threshold was cleared, remove it
      if (!edited.threshold.trim() && mergedConfig && 'threshold' in mergedConfig) {
        delete mergedConfig.threshold;
      }

      const updated = await gradersApi.update(id, {
        name: edited.name.trim(),
        description: edited.description.trim() || undefined,
        rubric: edited.rubric.trim() || undefined,
        config: Object.keys(mergedConfig || {}).length > 0 ? mergedConfig : undefined,
        inspiration: edited.inspiration.trim() || undefined,
        reference: edited.reference.trim() || undefined,
      });
      setGrader(updated);
      const e = toEditable(updated);
      setEdited(e);
      setOriginal(e);
      // Refresh raw YAML
      const yaml = await gradersApi.getRawYaml(id).catch(() => null);
      setRawYaml(yaml);
      toast('Saved to disk', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (original) setEdited({ ...original });
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await gradersApi.delete(id);
      router.push('/graders');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to delete', 'error');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const updateField = (field: keyof EditableGrader, value: string) => {
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

  if (error || !grader || !edited) {
    return (
      <div className="space-y-4">
        <Link
          href="/graders"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Graders
        </Link>
        <div className="card p-8 text-center">
          <p className="text-red-500">{error || 'Grader not found'}</p>
        </div>
      </div>
    );
  }

  const typeInfo = GRADER_TYPE_INFO[grader.type];
  const hasRubric = grader.type === 'llm-judge' || grader.type === 'promptfoo' || !!grader.rubric;
  const hasThreshold =
    grader.type === 'semantic-similarity' ||
    grader.type === 'promptfoo' ||
    grader.type === 'llm-judge' ||
    (grader.config && 'threshold' in grader.config);
  const hasSchema = grader.type === 'json-schema' && grader.config && 'schema' in grader.config;
  const assertionType =
    grader.type === 'promptfoo' && grader.config && 'assertion' in grader.config
      ? String(grader.config.assertion)
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/graders" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{grader.name}</h1>
              <span
                className={`badge text-xs ${
                  typeInfo?.category === 'llm-powered'
                    ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {typeInfo?.label || grader.type}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              <code className="text-xs">{grader.filePath || `graders/${id}.yaml`}</code>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDirty() && <span className="text-xs text-amber-500">Unsaved changes</span>}
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
            title="Delete this grader"
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
                <label className="text-xs font-medium block mb-1">Type</label>
                <div className="input bg-muted/30 cursor-not-allowed flex items-center gap-2">
                  <span
                    className={`badge text-xs ${
                      typeInfo?.category === 'llm-powered'
                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {typeInfo?.label || grader.type}
                  </span>
                  <span className="text-xs text-muted-foreground">(immutable)</span>
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">Description</label>
              <input
                type="text"
                value={edited.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="input"
                placeholder="What does this grader evaluate?"
              />
            </div>
          </div>

          {/* Rubric */}
          {hasRubric && (
            <div className="card p-4 space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Rubric
              </h2>
              <p className="text-xs text-muted-foreground">
                {grader.type === 'llm-judge'
                  ? 'Instructions the LLM uses to evaluate responses. Be specific about what passes and fails.'
                  : 'Evaluation criteria used by the grader.'}
              </p>
              <textarea
                value={edited.rubric}
                onChange={(e) => updateField('rubric', e.target.value)}
                className="input font-mono text-sm min-h-[160px] resize-y"
                placeholder="Evaluate the response for..."
              />
            </div>
          )}

          {/* Configuration */}
          <div className="card p-4 space-y-4">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Configuration
            </h2>

            {assertionType && (
              <div>
                <label className="text-xs font-medium block mb-1">Assertion Type (promptfoo)</label>
                <div className="input bg-muted/30 cursor-not-allowed text-sm">{assertionType}</div>
              </div>
            )}

            {hasThreshold && (
              <div>
                <label className="text-xs font-medium block mb-1">
                  Threshold <span className="text-muted-foreground font-normal">(0.0 - 1.0)</span>
                </label>
                <p className="text-[11px] text-muted-foreground mb-1">
                  Score threshold for pass/fail. Common: 0.7 (moderate), 0.85 (balanced), 0.9+
                  (strict)
                </p>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={edited.threshold || '0.7'}
                    onChange={(e) => updateField('threshold', e.target.value)}
                    className="flex-1"
                  />
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={edited.threshold}
                    onChange={(e) => updateField('threshold', e.target.value)}
                    className="input w-20 text-sm text-center"
                    placeholder="0.7"
                  />
                </div>
              </div>
            )}

            {hasSchema && (
              <div>
                <label className="text-xs font-medium block mb-1">JSON Schema</label>
                <p className="text-[11px] text-muted-foreground mb-1">
                  Schema that output JSON must match. Edit in the advanced config below.
                </p>
                <pre className="text-xs text-muted-foreground bg-muted/50 p-3 rounded font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {JSON.stringify((grader.config as Record<string, unknown>)?.schema, null, 2)}
                </pre>
              </div>
            )}

            {/* Advanced config JSON */}
            <div>
              <button
                onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${showAdvancedConfig ? 'rotate-180' : ''}`}
                />
                Advanced config (JSON)
              </button>
              {showAdvancedConfig && (
                <div className="mt-2">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Raw config JSON (excluding threshold). For json-schema type, this includes the
                    schema definition.
                  </p>
                  <textarea
                    value={edited.configJson}
                    onChange={(e) => updateField('configJson', e.target.value)}
                    className="input font-mono text-xs min-h-[120px] resize-y"
                    placeholder='{"assertion": "context-faithfulness"}'
                  />
                </div>
              )}
            </div>
          </div>

          {/* YAML Preview */}
          <div className="card p-4 space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              YAML Preview
            </h2>
            <pre className="text-[11px] text-muted-foreground bg-muted/50 p-3 rounded font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
              {buildYamlPreview(grader, edited)}
            </pre>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Source file */}
          <div className="card p-4 space-y-2">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Source File
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <code className="text-xs">{grader.filePath || `graders/${id}.yaml`}</code>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Edit the <code>.yaml</code> file directly or use this form. Changes are saved to disk
              immediately.
            </p>
          </div>

          {/* Inspiration & Research */}
          <div className="card p-4 space-y-3">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Technique & Inspiration
            </h3>
            <textarea
              value={edited.inspiration}
              onChange={(e) => updateField('inspiration', e.target.value)}
              className="input text-xs min-h-[80px] resize-y"
              placeholder="Research background, technique description..."
            />
            <div>
              <label className="text-xs font-medium block mb-1">Reference URL</label>
              <input
                type="text"
                value={edited.reference}
                onChange={(e) => updateField('reference', e.target.value)}
                className="input text-xs w-full"
                placeholder="https://arxiv.org/abs/..."
              />
              {edited.reference && (
                <a
                  href={edited.reference}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground underline hover:text-foreground inline-flex items-center gap-1 mt-1 break-all"
                >
                  {edited.reference} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
              )}
            </div>
          </div>

          {/* Raw YAML from disk */}
          <div className="card p-4 space-y-2">
            <button
              onClick={() => setShowRawYaml(!showRawYaml)}
              className="w-full text-left flex items-center justify-between"
            >
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Raw YAML (from disk)
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${showRawYaml ? 'rotate-180' : ''}`}
              />
            </button>
            {showRawYaml && rawYaml && (
              <pre className="text-[11px] text-muted-foreground bg-muted/50 p-3 rounded font-mono whitespace-pre-wrap max-h-64 overflow-y-auto">
                {rawYaml}
              </pre>
            )}
          </div>

          {/* Metadata */}
          <div className="card p-4 space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Metadata
            </h3>
            <div className="text-[11px] text-muted-foreground space-y-0.5">
              <div>
                ID: <code>{grader.id}</code>
              </div>
              {grader.createdAt && (
                <div>Created: {new Date(grader.createdAt).toLocaleDateString()}</div>
              )}
              {grader.updatedAt && (
                <div>Updated: {new Date(grader.updatedAt).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Delete Grader?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong>{grader.name}</strong> ({id}.yaml) from disk.
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
    </div>
  );
}
