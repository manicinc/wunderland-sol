'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronRight, RefreshCw, Upload, ChevronDown, Wand2, Info, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { datasetsApi, presetsApi, promptsApi } from '@/lib/api';
import { useToast } from '@/components/Toast';
import { Tooltip } from '@/components/Tooltip';
import type { Dataset, Candidate } from '@/lib/types';

const SYNTHETIC_STYLES = [
  { value: 'qa', label: 'Q&A', description: 'Question-answer pairs' },
  { value: 'classification', label: 'Classification', description: 'Text with category labels' },
  { value: 'extraction', label: 'Extraction', description: 'Text with extracted data' },
  { value: 'rag', label: 'RAG', description: 'Questions with context documents' },
] as const;

export default function DatasetsPage() {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showSyntheticModal, setShowSyntheticModal] = useState(false);
  const [generatingSynthetic, setGeneratingSynthetic] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [syntheticForm, setSyntheticForm] = useState({
    name: '',
    topic: '',
    count: 5,
    style: 'qa' as 'qa' | 'classification' | 'extraction' | 'rag',
    customInstructions: '',
    forCandidateId: '' as string,
  });

  useEffect(() => {
    loadDatasets();
    promptsApi
      .list()
      .then(setCandidates)
      .catch(() => {});
  }, []);

  async function loadDatasets() {
    try {
      const data = await datasetsApi.list();
      setDatasets(data);
    } catch (error) {
      console.error('Failed to load datasets:', error);
    } finally {
      setLoading(false);
    }
  }

  // Map dataset IDs to candidate names that use them
  const datasetCandidateMap = new Map<string, string[]>();
  for (const c of candidates) {
    if (c.recommendedDatasets) {
      for (const dsId of c.recommendedDatasets) {
        const list = datasetCandidateMap.get(dsId) || [];
        list.push(c.name);
        datasetCandidateMap.set(dsId, list);
      }
    }
  }

  async function reloadFromDisk() {
    setReloading(true);
    try {
      const result = await datasetsApi.reload();
      await loadDatasets();
      toast(`Reloaded ${result.loaded} datasets from disk`, 'success');
    } catch (error) {
      console.error('Failed to reload:', error);
    } finally {
      setReloading(false);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csv = await file.text();
      const filename = file.name.replace(/\.csv$/, '');
      await datasetsApi.importCsv({ filename, csv });
      await loadDatasets();
    } catch (error) {
      console.error('Failed to import CSV:', error);
      toast('Failed to import CSV. Check the file format.', 'error');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function generateSyntheticDataset() {
    if (!syntheticForm.name.trim() || !syntheticForm.topic.trim()) return;

    setGeneratingSynthetic(true);
    try {
      await presetsApi.generateSyntheticDataset({
        name: syntheticForm.name.trim(),
        topic: syntheticForm.topic.trim(),
        count: syntheticForm.count,
        style: syntheticForm.style,
        customInstructions: syntheticForm.customInstructions.trim() || undefined,
        forCandidateId: syntheticForm.forCandidateId || undefined,
      });
      setSyntheticForm({
        name: '',
        topic: '',
        count: 5,
        style: 'qa',
        customInstructions: '',
        forCandidateId: '',
      });
      setShowSyntheticModal(false);
      loadDatasets();
    } catch (error) {
      console.error('Failed to generate synthetic dataset:', error);
      toast('Failed to generate. Check LLM configuration.', 'error');
    } finally {
      setGeneratingSynthetic(false);
    }
  }

  async function handleDelete(dataset: Dataset) {
    if (
      !confirm(`Delete "${dataset.name}"? This removes the folder from disk and cannot be undone.`)
    )
      return;
    try {
      await datasetsApi.delete(dataset.id);
      toast(`Deleted "${dataset.name}"`, 'success');
      await loadDatasets();
    } catch (error) {
      console.error('Failed to delete dataset:', error);
      toast('Failed to delete dataset.', 'error');
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
          <h1 className="text-2xl font-semibold">Datasets</h1>
          <p className="text-muted-foreground mt-1">
            CSV files loaded from <code className="text-xs">backend/datasets/</code>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={reloadFromDisk}
            disabled={reloading}
            className="btn-secondary"
            title="Re-read all CSV files from disk"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${reloading ? 'animate-spin' : ''}`} />
            {reloading ? 'Reloading...' : 'Reload from Disk'}
          </button>
          <button
            onClick={() => setShowSyntheticModal(true)}
            className="btn-secondary"
            title="Use AI to generate test cases and save as CSV"
          >
            <Wand2 className="h-4 w-4 mr-2" />
            Generate
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-primary"
            title="Upload a CSV file to the datasets directory"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Expandable guide */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full text-left px-4 py-3 card flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          How datasets work
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>
      {showGuide && (
        <div className="card p-5 space-y-3 text-sm text-muted-foreground">
          <p>
            Datasets are <strong className="text-foreground">CSV files</strong> in{' '}
            <code>backend/datasets/</code>. Each CSV has columns: <code>input</code>,{' '}
            <code>expected_output</code>, <code>context</code>, <code>metadata</code>.
          </p>
          <p>
            <strong className="text-foreground">To add a dataset:</strong> Create a subfolder in the
            datasets directory with a <code>data.csv</code> file and click &ldquo;Reload from
            Disk&rdquo;, or use &ldquo;Upload CSV&rdquo; to import directly.
          </p>
          <p>
            An optional <code>meta.yaml</code> in the subfolder provides the dataset name and
            description. Without it, the name is derived from the folder name.
          </p>
          <p>
            <strong className="text-foreground">Generate</strong> uses AI to create test cases and
            saves them as a new CSV file.
          </p>
        </div>
      )}

      {datasets.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-muted-foreground">No datasets found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Add CSV files to <code>backend/datasets/</code> and reload, or upload a CSV.
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <button onClick={reloadFromDisk} className="btn-secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload from Disk
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
              <Upload className="h-4 w-4 mr-2" />
              Upload CSV
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="card p-4 flex items-center justify-between">
              <Link
                href={`/datasets/${dataset.id}`}
                className="flex-1 flex items-center gap-4 hover:opacity-80"
              >
                <div>
                  <h3 className="font-medium flex items-center gap-2">
                    {dataset.name}
                    {dataset.synthetic && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-[11px] font-medium">
                        <Wand2 className="h-3 w-3" />
                        AI Generated
                      </span>
                    )}
                  </h3>
                  {dataset.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{dataset.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    <code className="text-[11px]">{dataset.filePath || `${dataset.id}.csv`}</code>
                    {' · '}
                    {dataset.testCaseCount || 0} records (test cases)
                  </p>
                  {datasetCandidateMap.get(dataset.id) && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 flex-wrap">
                      <span className="opacity-60">Used by:</span>
                      {datasetCandidateMap.get(dataset.id)!.map((name) => (
                        <span
                          key={name}
                          className="inline-block px-1.5 py-0.5 bg-muted rounded text-[11px]"
                        >
                          {name}
                        </span>
                      ))}
                    </p>
                  )}
                </div>
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(dataset);
                  }}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                  title="Delete dataset"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link href={`/datasets/${dataset.id}`}>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Synthetic Generation Modal */}
      {showSyntheticModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              Generate Synthetic Dataset
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Use AI to generate test cases and save as a CSV file.
            </p>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={syntheticForm.name}
                  onChange={(e) => setSyntheticForm({ ...syntheticForm, name: e.target.value })}
                  placeholder="Physics Questions"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                  For Candidate (optional)
                  <Tooltip text="Link this dataset to a candidate prompt. The dataset will auto-appear in its recommended datasets." />
                </label>
                <select
                  value={syntheticForm.forCandidateId}
                  onChange={(e) => {
                    const candidateId = e.target.value;
                    const candidate = candidates.find((c) => c.id === candidateId);
                    setSyntheticForm({
                      ...syntheticForm,
                      forCandidateId: candidateId,
                      // Auto-fill topic from candidate description if topic is empty
                      ...(candidateId && candidate?.description && !syntheticForm.topic
                        ? { topic: candidate.description }
                        : {}),
                    });
                  }}
                  className="input"
                >
                  <option value="">None (standalone dataset)</option>
                  {candidates
                    .filter((c) => !c.parentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  {candidates
                    .filter((c) => c.parentId)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        &nbsp;&nbsp;{c.variantLabel ? `↳ ${c.name}` : c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                  Topic
                  <Tooltip text="What subject area should the test cases cover?" />
                </label>
                <input
                  type="text"
                  value={syntheticForm.topic}
                  onChange={(e) => setSyntheticForm({ ...syntheticForm, topic: e.target.value })}
                  placeholder="e.g., Basic arithmetic, Python programming, US History"
                  className="input"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                    Style
                    <Tooltip text="The format of generated test cases" />
                  </label>
                  <select
                    value={syntheticForm.style}
                    onChange={(e) =>
                      setSyntheticForm({
                        ...syntheticForm,
                        style: e.target.value as typeof syntheticForm.style,
                      })
                    }
                    className="input"
                  >
                    {SYNTHETIC_STYLES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1 flex items-center gap-2">
                    Count
                    <Tooltip text="Number of test cases to generate" />
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={syntheticForm.count}
                    onChange={(e) =>
                      setSyntheticForm({
                        ...syntheticForm,
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
                  value={syntheticForm.customInstructions}
                  onChange={(e) =>
                    setSyntheticForm({
                      ...syntheticForm,
                      customInstructions: e.target.value,
                    })
                  }
                  placeholder="e.g., Focus on addition and subtraction only. Keep answers as single numbers."
                  className="input min-h-[80px] resize-y"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowSyntheticModal(false)}
                  className="btn-secondary"
                  disabled={generatingSynthetic}
                >
                  Cancel
                </button>
                <button
                  onClick={generateSyntheticDataset}
                  className="btn-primary"
                  disabled={generatingSynthetic || !syntheticForm.name || !syntheticForm.topic}
                >
                  {generatingSynthetic ? 'Generating...' : 'Generate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
