'use client';

import { useState, useEffect, useCallback, use } from 'react';
import {
  ArrowLeft,
  FileJson,
  FileSpreadsheet,
  Save,
  Plus,
  X,
  FileText,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { datasetsApi, promptsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Tooltip } from '@/components/Tooltip';
import type { Dataset, TestCase, Candidate } from '@/lib/types';

interface EditableCase {
  input: string;
  expectedOutput: string;
  context: string;
  metadata: string;
  customFields: Record<string, string>;
}

function toEditable(tc: TestCase): EditableCase {
  return {
    input: tc.input,
    expectedOutput: tc.expectedOutput || '',
    context: tc.context || '',
    metadata: tc.metadata ? JSON.stringify(tc.metadata) : '',
    customFields: { ...(tc.customFields || {}) },
  };
}

function extractCustomColumns(testCases: TestCase[]): string[] {
  return Array.from(new Set(testCases.flatMap((tc) => Object.keys(tc.customFields || {}))));
}

function normalizeCases(cases: EditableCase[], customColumns: string[]): EditableCase[] {
  return cases.map((testCase) => ({
    ...testCase,
    customFields: Object.fromEntries(
      customColumns.map((column) => [column, testCase.customFields[column] || ''])
    ),
  }));
}

export default function DatasetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedCases, setEditedCases] = useState<EditableCase[]>([]);
  const [originalCases, setOriginalCases] = useState<EditableCase[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);
  const [linkedPrompts, setLinkedPrompts] = useState<Candidate[]>([]);
  const [showMeta, setShowMeta] = useState(false);

  const loadDataset = useCallback(async () => {
    try {
      const data = await datasetsApi.get(id);
      setDataset(data);
      const detectedCustomColumns = extractCustomColumns(data.testCases || []);
      const cases = normalizeCases((data.testCases || []).map(toEditable), detectedCustomColumns);
      setCustomColumns(detectedCustomColumns);
      setEditedCases(cases);
      setOriginalCases(cases);
    } catch (error) {
      console.error('Failed to load dataset:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadLinkedPrompts = useCallback(async () => {
    try {
      const all = await promptsApi.list();
      setLinkedPrompts(all.filter((p) => p.recommendedDatasets?.includes(id)));
    } catch {
      // non-critical
    }
  }, [id]);

  useEffect(() => {
    loadDataset();
    loadLinkedPrompts();
  }, [loadDataset, loadLinkedPrompts]);

  const isDirty = useCallback(() => {
    return JSON.stringify(editedCases) !== JSON.stringify(originalCases);
  }, [editedCases, originalCases]);

  function updateCase(index: number, field: keyof EditableCase, value: string) {
    setEditedCases((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRow() {
    setEditedCases((prev) => [
      ...prev,
      {
        input: '',
        expectedOutput: '',
        context: '',
        metadata: '',
        customFields: Object.fromEntries(customColumns.map((column) => [column, ''])),
      },
    ]);
  }

  function removeRow(index: number) {
    setEditedCases((prev) => prev.filter((_, i) => i !== index));
  }

  function addCustomColumn() {
    const name = prompt('Custom field name');
    if (!name) return;

    const normalizedName = name.trim();
    if (!normalizedName) return;

    const reserved = ['input', 'expected_output', 'context', 'metadata'];
    if (reserved.includes(normalizedName.toLowerCase())) {
      toast(`"${normalizedName}" is reserved. Choose another field name.`, 'warning');
      return;
    }

    if (customColumns.includes(normalizedName)) {
      toast(`"${normalizedName}" already exists.`, 'warning');
      return;
    }

    setCustomColumns((prev) => [...prev, normalizedName]);
    setEditedCases((prev) =>
      prev.map((testCase) => ({
        ...testCase,
        customFields: { ...testCase.customFields, [normalizedName]: '' },
      }))
    );
  }

  function removeCustomColumn(column: string) {
    setCustomColumns((prev) => prev.filter((c) => c !== column));
    setEditedCases((prev) =>
      prev.map((testCase) => {
        const next = { ...testCase.customFields };
        delete next[column];
        return { ...testCase, customFields: next };
      })
    );
  }

  function updateCustomField(index: number, column: string, value: string) {
    setEditedCases((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        customFields: { ...next[index].customFields, [column]: value },
      };
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const testCases = editedCases
        .filter((ec) => ec.input.trim())
        .map((ec) => {
          let metadata: Record<string, unknown> | undefined;
          if (ec.metadata.trim()) {
            try {
              metadata = JSON.parse(ec.metadata);
            } catch {
              // ignore invalid JSON
            }
          }
          return {
            input: ec.input,
            expectedOutput: ec.expectedOutput || undefined,
            context: ec.context || undefined,
            metadata,
            customFields: { ...ec.customFields },
          };
        });

      const updated = await datasetsApi.update(id, { testCases });
      setDataset(updated);
      const detectedCustomColumns = extractCustomColumns(updated.testCases || []);
      const cases = normalizeCases(
        (updated.testCases || []).map(toEditable),
        detectedCustomColumns
      );
      setCustomColumns(detectedCustomColumns);
      setEditedCases(cases);
      setOriginalCases(cases);
    } catch (error) {
      console.error('Failed to save:', error);
      toast('Failed to save dataset. Check the console for details.', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dataset not found</p>
        <Link href="/datasets" className="btn-secondary mt-4">
          Back to datasets
        </Link>
      </div>
    );
  }

  const dirty = isDirty();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/datasets" className="btn-ghost p-2">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{dataset.name}</h1>
            {dataset.description && <p className="text-muted-foreground">{dataset.description}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="btn-primary"
            title="Save changes to CSV on disk"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save to Disk'}
          </button>
          <a
            href={datasetsApi.exportCsvUrl(id)}
            download
            className="btn-secondary"
            title="Download as CSV"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV
          </a>
          <a
            href={datasetsApi.exportJsonUrl(id)}
            download
            className="btn-secondary"
            title="Download as JSON"
          >
            <FileJson className="h-4 w-4 mr-2" />
            JSON
          </a>
        </div>
      </div>

      {/* File info */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{editedCases.length} records (test cases)</span>
        {dataset.filePath && (
          <span className="flex items-center gap-1">
            <FileText className="h-3.5 w-3.5" />
            <code className="text-xs">{dataset.filePath}</code>
          </span>
        )}
        {dataset.metaPath && (
          <button
            onClick={() => setShowMeta(!showMeta)}
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <FileJson className="h-3.5 w-3.5" />
            <code className="text-xs">{dataset.metaPath}</code>
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showMeta ? 'rotate-180' : ''}`}
            />
          </button>
        )}
        {dirty && <span className="text-amber-500 font-medium">Unsaved changes</span>}
      </div>

      {/* Dataset metadata JSON */}
      {showMeta && dataset.metaPath && (
        <div className="card p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Dataset Configuration
          </h4>
          <pre className="text-xs font-mono bg-muted/50 p-3 rounded overflow-x-auto">
            {JSON.stringify(
              {
                name: dataset.name,
                description: dataset.description || null,
                filePath: dataset.filePath,
                metaPath: dataset.metaPath,
                testCaseCount: dataset.testCaseCount || editedCases.length,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* Linked prompts */}
      {linkedPrompts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Used by:</span>
          {linkedPrompts.map((p) => (
            <a
              key={p.id}
              href={`/candidates/${p.id}`}
              className="badge bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors text-xs"
            >
              {p.name}
            </a>
          ))}
        </div>
      )}

      {/* Editable records (test cases) table */}
      <div className="card overflow-hidden">
        <table className="table">
          <thead>
            <tr>
              <th className="w-10">#</th>
              <th>
                <span className="flex items-center">
                  Input
                  <Tooltip text="Required. The query or prompt that will be sent to the LLM candidate during evaluation." />
                </span>
              </th>
              <th>
                <span className="flex items-center">
                  Expected Output
                  <Tooltip text="Optional. The ground truth answer used by graders like exact-match, contains, and semantic-similarity to compare against the LLM's response." />
                </span>
              </th>
              <th>
                <span className="flex items-center">
                  Context
                  <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>
                  <Tooltip text="Optional. Supporting context for RAGAS-style faithfulness evaluation. Provides the source material the LLM should reference — used to detect hallucinations (claims not supported by context)." />
                </span>
              </th>
              <th>
                <span className="flex items-center">
                  Metadata JSON
                  <span className="text-muted-foreground text-xs font-normal ml-1">(optional)</span>
                  <Tooltip text="Optional JSON object. Useful for extra per-row context, labels, or task settings." />
                </span>
              </th>
              {customColumns.map((column) => (
                <th key={column}>
                  <div className="flex items-center gap-1">
                    <span>{column}</span>
                    <button
                      onClick={() => removeCustomColumn(column)}
                      className="btn-ghost p-0.5 text-muted-foreground hover:text-red-500"
                      title={`Remove "${column}" column`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {editedCases.map((ec, idx) => (
              <tr key={idx} className="group">
                <td className="text-muted-foreground text-xs align-top pt-3">{idx + 1}</td>
                <td className="p-1">
                  <textarea
                    value={ec.input}
                    onChange={(e) => updateCase(idx, 'input', e.target.value)}
                    className="input min-h-[60px] resize-y text-sm font-mono w-full"
                    placeholder="Input text..."
                  />
                </td>
                <td className="p-1">
                  <textarea
                    value={ec.expectedOutput}
                    onChange={(e) => updateCase(idx, 'expectedOutput', e.target.value)}
                    className="input min-h-[60px] resize-y text-sm font-mono w-full"
                    placeholder="Expected output..."
                  />
                </td>
                <td className="p-1">
                  <textarea
                    value={ec.context}
                    onChange={(e) => updateCase(idx, 'context', e.target.value)}
                    className="input min-h-[60px] resize-y text-sm font-mono w-full"
                    placeholder="Context..."
                  />
                </td>
                <td className="p-1">
                  <textarea
                    value={ec.metadata}
                    onChange={(e) => updateCase(idx, 'metadata', e.target.value)}
                    className="input min-h-[60px] resize-y text-sm font-mono w-full"
                    placeholder='{"difficulty":"easy"}'
                  />
                </td>
                {customColumns.map((column) => (
                  <td key={column} className="p-1">
                    <input
                      value={ec.customFields[column] || ''}
                      onChange={(e) => updateCustomField(idx, column, e.target.value)}
                      className="input h-10 text-sm font-mono w-full"
                      placeholder={`${column}...`}
                    />
                  </td>
                ))}
                <td className="align-top pt-2">
                  <button
                    onClick={() => removeRow(idx)}
                    className="btn-ghost p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                    title="Remove row"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row / column controls */}
      <div className="flex gap-2">
        <button onClick={addRow} className="btn-secondary flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Add Test Case
        </button>
        <button onClick={addCustomColumn} className="btn-secondary">
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Field
        </button>
      </div>
    </div>
  );
}
