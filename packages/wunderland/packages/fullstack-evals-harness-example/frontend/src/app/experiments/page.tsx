'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Check,
  X,
  Loader2,
  Bot,
  ChevronDown,
  Trash2,
  Download,
  FileSpreadsheet,
  Info,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { datasetsApi, gradersApi, promptsApi, experimentsApi, settingsApi } from '@/lib/api';
import type { LlmSettings } from '@/lib/api';
import { Tooltip } from '@/components/Tooltip';
import { useToast } from '@/components/Toast';
import type {
  Dataset,
  Grader,
  Candidate,
  Experiment,
  ExperimentProgress,
  ExperimentStats,
  CandidateComparison,
} from '@/lib/types';

export default function ExperimentsPage() {
  const { toast } = useToast();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [graders, setGraders] = useState<Grader[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [selectedGraders, setSelectedGraders] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Model selection state
  const [llmDefaults, setLlmDefaults] = useState<LlmSettings | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  // Results view
  const [activeExperiment, setActiveExperiment] = useState<Experiment | null>(null);
  const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
  const [activeStats, setActiveStats] = useState<ExperimentStats | null>(null);
  const [baselineCandidateId, setBaselineCandidateId] = useState<string>('');
  const [challengerCandidateId, setChallengerCandidateId] = useState<string>('');
  const [comparison, setComparison] = useState<CandidateComparison | null>(null);
  const [comparing, setComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [expandedExperiments, setExpandedExperiments] = useState<Set<string>>(new Set());
  const [expandedData, setExpandedData] = useState<
    Map<string, { experiment: Experiment; dataset: Dataset | null; stats: ExperimentStats | null }>
  >(new Map());

  useEffect(() => {
    loadData();
  }, []);

  // Auto-select recommended candidates when dataset changes
  useEffect(() => {
    if (!selectedDataset || candidates.length === 0) return;
    const recommended: string[] = [];
    for (const c of candidates) {
      if (c.recommendedDatasets?.includes(selectedDataset)) {
        recommended.push(c.id);
      }
    }
    if (recommended.length > 0) {
      setSelectedCandidates(recommended);
    }
  }, [selectedDataset, candidates]);

  // Auto-select recommended graders when candidates change
  useEffect(() => {
    if (selectedCandidates.length === 0 || graders.length === 0) return;
    const recommended = new Set<string>();
    for (const candidateId of selectedCandidates) {
      const candidate = candidates.find((c) => c.id === candidateId);
      if (candidate?.recommendedGraders) {
        for (const graderId of candidate.recommendedGraders) {
          recommended.add(graderId);
        }
      }
    }
    if (recommended.size > 0) {
      setSelectedGraders(Array.from(recommended));
    }
  }, [selectedCandidates, candidates, graders]);

  async function loadData() {
    try {
      const [datasetsData, gradersData, candidatesData, experimentsData, llmSettings] =
        await Promise.all([
          datasetsApi.list(),
          gradersApi.list(),
          promptsApi.list(),
          experimentsApi.list(),
          settingsApi.getLlmSettings().catch(() => null),
        ]);
      setDatasets(datasetsData);
      setGraders(gradersData);
      setCandidates(candidatesData);
      setSelectedCandidates((prev) =>
        prev.filter((id) => candidatesData.some((candidate) => candidate.id === id))
      );
      setExperiments(experimentsData);
      if (llmSettings) setLlmDefaults(llmSettings);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const toggleGrader = useCallback((graderId: string) => {
    setSelectedGraders((prev) =>
      prev.includes(graderId) ? prev.filter((id) => id !== graderId) : [...prev, graderId]
    );
  }, []);

  const toggleCandidate = useCallback((candidateId: string) => {
    setSelectedCandidates((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId) : [...prev, candidateId]
    );
  }, []);

  const selectAllCandidates = useCallback(() => {
    setSelectedCandidates(candidates.map((candidate) => candidate.id));
  }, [candidates]);

  const clearCandidateSelection = useCallback(() => {
    setSelectedCandidates([]);
  }, []);

  const toggleCandidateFamily = useCallback((familyIds: string[]) => {
    setSelectedCandidates((prev) => {
      const allSelected = familyIds.every((id) => prev.includes(id));
      if (allSelected) {
        return prev.filter((id) => !familyIds.includes(id));
      }
      return Array.from(new Set([...prev, ...familyIds]));
    });
  }, []);

  async function runExperiment() {
    if (!selectedDataset || selectedGraders.length === 0) return;

    setIsRunning(true);
    setProgress(null);

    try {
      const modelConfig =
        selectedProvider || selectedModel
          ? {
              provider: selectedProvider || undefined,
              model: selectedModel || undefined,
            }
          : undefined;

      const experiment = await experimentsApi.create({
        datasetId: selectedDataset,
        graderIds: selectedGraders,
        candidateIds: selectedCandidates.length > 0 ? selectedCandidates : undefined,
        modelConfig,
      });

      // Connect to SSE stream for progress
      const eventSource = experimentsApi.streamProgress(experiment.id);

      eventSource.onmessage = (event) => {
        const data: ExperimentProgress = JSON.parse(event.data);

        if (data.type === 'progress' || data.type === 'result') {
          setProgress({ current: data.current || 0, total: data.total || 1 });
        }

        if (data.type === 'complete') {
          eventSource.close();
          setIsRunning(false);
          setProgress(null);
          loadData();
          viewExperiment(experiment.id);
        }

        if (data.type === 'error' && !data.testCaseId) {
          console.error('Experiment error:', data.error);
          eventSource.close();
          setIsRunning(false);
          setProgress(null);
          loadData();
        }
      };

      eventSource.onerror = () => {
        // Let EventSource auto-reconnect on transient disconnects.
        if (eventSource.readyState === 0) {
          return;
        }
        eventSource.close();
        setIsRunning(false);
        setProgress(null);
        loadData();
      };
    } catch (error) {
      console.error('Failed to run experiment:', error);
      setIsRunning(false);
    }
  }

  async function viewExperiment(experimentId: string) {
    try {
      const [experiment, stats] = await Promise.all([
        experimentsApi.get(experimentId),
        experimentsApi.getStats(experimentId),
      ]);
      setActiveExperiment(experiment);
      setActiveStats(stats);

      // Load the dataset for this experiment (may not exist if stale)
      try {
        const dataset = await datasetsApi.get(experiment.datasetId);
        setActiveDataset(dataset);
      } catch {
        setActiveDataset(null);
        toast(
          `Dataset "${experiment.datasetId}" not found — this experiment references a deleted dataset`,
          'error'
        );
      }
    } catch (error) {
      console.error('Failed to load experiment:', error);
      toast('Failed to load experiment', 'error');
    }
  }

  async function toggleExpandExperiment(experimentId: string) {
    const next = new Set(expandedExperiments);
    if (next.has(experimentId)) {
      next.delete(experimentId);
      setExpandedExperiments(next);
      return;
    }
    next.add(experimentId);
    setExpandedExperiments(next);

    // Load data if not already cached
    if (!expandedData.has(experimentId)) {
      try {
        const [experiment, stats] = await Promise.all([
          experimentsApi.get(experimentId),
          experimentsApi.getStats(experimentId),
        ]);
        let dataset: Dataset | null = null;
        try {
          dataset = await datasetsApi.get(experiment.datasetId);
        } catch {
          // dataset may have been deleted
        }
        setExpandedData((prev) => new Map(prev).set(experimentId, { experiment, dataset, stats }));
      } catch (error) {
        console.error('Failed to load experiment:', error);
        toast('Failed to load experiment details', 'error');
        next.delete(experimentId);
        setExpandedExperiments(new Set(next));
      }
    }
  }

  // Determine if active experiment has candidates
  const hasCandidates = !!(
    activeExperiment?.candidateIds && activeExperiment.candidateIds.length > 0
  );
  const baseCandidates = candidates.filter((candidate) => !candidate.parentId);
  const baseIds = new Set(baseCandidates.map((candidate) => candidate.id));
  const variantsByParent = new Map<string, Candidate[]>();

  for (const candidate of candidates) {
    if (!candidate.parentId || !baseIds.has(candidate.parentId)) continue;
    const variants = variantsByParent.get(candidate.parentId) || [];
    variants.push(candidate);
    variantsByParent.set(candidate.parentId, variants);
  }

  const candidateFamilies = baseCandidates.map((base) => {
    const variants = variantsByParent.get(base.id) || [];
    return {
      key: base.id,
      label: base.name,
      members: [base, ...variants],
    };
  });

  const orphanVariants = candidates.filter(
    (candidate) => candidate.parentId && !baseIds.has(candidate.parentId)
  );
  for (const orphan of orphanVariants) {
    candidateFamilies.push({
      key: orphan.id,
      label: orphan.name,
      members: [orphan],
    });
  }

  // Compute recommended datasets from selected candidates
  const recommendedDatasetIds: Set<string> = new Set();
  for (const candidateId of selectedCandidates) {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (candidate?.recommendedDatasets) {
      for (const dsId of candidate.recommendedDatasets) {
        recommendedDatasetIds.add(dsId);
      }
    }
  }

  // Compute which candidates match the selected dataset
  const candidatesForDataset: Set<string> = new Set();
  if (selectedDataset) {
    for (const candidate of candidates) {
      if (candidate.recommendedDatasets?.includes(selectedDataset)) {
        candidatesForDataset.add(candidate.id);
      }
    }
  }

  const selectedDatasetMeta = datasets.find((dataset) => dataset.id === selectedDataset);
  const selectedCaseCount = selectedDatasetMeta?.testCaseCount || 0;
  const candidateRunCount = selectedCandidates.length > 0 ? selectedCandidates.length : 1;
  const estimatedEvaluations = selectedDatasetMeta
    ? selectedCaseCount * selectedGraders.length * candidateRunCount
    : 0;

  const sortedCandidateStats = activeStats?.candidateStats
    ? [...activeStats.candidateStats].sort(
        (a, b) => (b.weightedScore ?? b.avgScore) - (a.weightedScore ?? a.avgScore)
      )
    : [];
  const bestCandidateId = sortedCandidateStats[0]?.candidateId;
  const activeCandidateIds = activeExperiment?.candidateIds ?? [];
  const compareCandidateOptions = activeCandidateIds.map((candidateId) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    return {
      id: candidateId,
      name: candidate?.name || candidateId,
    };
  });
  const testCaseById = new Map((activeDataset?.testCases ?? []).map((tc) => [tc.id, tc]));
  const rankedCandidateIds = sortedCandidateStats
    .map((cs) => cs.candidateId)
    .filter((id) => activeCandidateIds.includes(id));
  const activeCandidateSignature = activeCandidateIds.join('|');
  const rankedCandidateSignature = rankedCandidateIds.join('|');

  // We intentionally key this effect off the signature strings to avoid deep dependency churn.
  useEffect(() => {
    if (!activeExperiment || !hasCandidates || activeCandidateIds.length < 2) {
      setBaselineCandidateId('');
      setChallengerCandidateId('');
      setComparison(null);
      setCompareError(null);
      return;
    }

    const fallbackIds = rankedCandidateIds.length > 0 ? rankedCandidateIds : activeCandidateIds;
    const nextBaseline = fallbackIds.includes(baselineCandidateId)
      ? baselineCandidateId
      : fallbackIds[0];
    const nextChallenger =
      fallbackIds.includes(challengerCandidateId) && challengerCandidateId !== nextBaseline
        ? challengerCandidateId
        : (fallbackIds.find((id) => id !== nextBaseline) ?? '');

    setBaselineCandidateId(nextBaseline);
    setChallengerCandidateId(nextChallenger);
    setComparison(null);
    setCompareError(null);
  }, [activeExperiment?.id, hasCandidates, activeCandidateSignature, rankedCandidateSignature]);

  useEffect(() => {
    setComparison(null);
    setCompareError(null);
  }, [activeExperiment?.id, baselineCandidateId, challengerCandidateId]);

  async function runComparison() {
    if (!activeExperiment || !baselineCandidateId || !challengerCandidateId) return;
    if (baselineCandidateId === challengerCandidateId) {
      setCompareError('Baseline and challenger must be different candidates.');
      return;
    }

    setComparing(true);
    setCompareError(null);
    try {
      const data = await experimentsApi.compare(
        activeExperiment.id,
        baselineCandidateId,
        challengerCandidateId
      );
      setComparison(data);
    } catch (error) {
      console.error('Failed to compare candidates:', error);
      setCompareError('Failed to load comparison. Try again.');
      setComparison(null);
    } finally {
      setComparing(false);
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
      <div>
        <h1 className="text-2xl font-semibold">Experiments</h1>
        <p className="text-muted-foreground mt-1">Run candidates and graders against datasets</p>
      </div>

      {/* Expandable walkthrough */}
      <button
        onClick={() => setShowGuide(!showGuide)}
        className="w-full text-left px-4 py-3 card flex items-center justify-between text-sm hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-muted-foreground">
          <Info className="h-4 w-4" />
          Quick start guide
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${showGuide ? 'rotate-180' : ''}`}
        />
      </button>
      {showGuide && (
        <div className="card p-5 space-y-3 text-sm text-muted-foreground">
          <p className="text-foreground font-medium">Run your first experiment in 4 steps:</p>
          <ol className="list-decimal ml-5 space-y-2">
            <li>
              <strong className="text-foreground">Load a dataset</strong> — Go to{' '}
              <Link href="/datasets" className="underline hover:text-foreground">
                Datasets
              </Link>{' '}
              and choose one of the loaded CSV datasets (or upload your own CSV).
            </li>
            <li>
              <strong className="text-foreground">Choose graders</strong> — Go to{' '}
              <Link href="/graders" className="underline hover:text-foreground">
                Graders
              </Link>{' '}
              to create/edit grader definitions, then select one or more graders here.
            </li>
            <li>
              <strong className="text-foreground">Select candidates</strong> (optional) — Go to{' '}
              <Link href="/candidates" className="underline hover:text-foreground">
                Candidates
              </Link>{' '}
              to review prompt files. Each candidate is a prompt configuration (system prompt +
              template + model settings). Without candidates, graders evaluate the expected output
              directly (useful for testing grader behavior).
            </li>
            <li>
              <strong className="text-foreground">Run the experiment</strong> — Select your dataset,
              toggle graders, optionally select candidates below, and click{' '}
              <strong>Run Experiment</strong>. Results stream in real-time with pass/fail badges.
              Hover over any result for the score, reason, and generated output.
            </li>
          </ol>
          <div className="border-t border-border pt-3 space-y-2">
            <p className="text-foreground font-medium">Suggested first experiments:</p>
            <ul className="list-disc ml-5 space-y-1 text-xs">
              <li>
                <strong>Extraction quality:</strong> Research Paper Extraction dataset + Strict JSON
                Extractor + Loose JSON Extractor candidates + Extraction Completeness + Faithfulness
                graders. Compare strict (nulls for unknowns) vs loose (infers missing data).
              </li>
              <li>
                <strong>Summarization:</strong> Summarization dataset + Summarizer + Concise
                Summarizer candidates + Faithfulness + Semantic Similarity graders. Does brevity
                hurt faithfulness?
              </li>
              <li>
                <strong>Grounding check:</strong> Q&amp;A with Context dataset + Full Structured
                Analyst + Citation-Focused Analyst candidates + Faithfulness grader. Which analysis
                style scores higher on grounding?
              </li>
            </ul>
          </div>
          <div className="border-t border-border pt-3 space-y-1">
            <p className="text-foreground font-medium">Where is data stored?</p>
            <p className="text-xs">
              <strong className="text-foreground">Disk (definitions):</strong> Datasets (
              <code>backend/datasets/*.csv</code>), prompts (
              <code>backend/prompts/{'{family}'}/*.md</code>), graders (
              <code>backend/graders/*.yaml</code>). All editable on disk or via the UI — changes
              write back to files immediately.
            </p>
            <p className="text-xs">
              <strong className="text-foreground">SQLite (runtime only):</strong> Experiment runs,
              results, and settings. You can delete the database and start fresh — all definitions
              reload from disk automatically.
            </p>
          </div>
        </div>
      )}

      {/* Run Form */}
      <div className="card p-6 space-y-4">
        <h2 className="font-medium">Run New Experiment</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium block mb-2 flex items-center gap-2">
              Dataset <span className="text-red-400 text-xs">*</span>
              <Tooltip text="The records (test cases) to evaluate. Each has input, expected output, and optional context." />
            </label>
            {datasets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No datasets available. Create one first.
              </p>
            ) : (
              <>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="input"
                  disabled={isRunning}
                >
                  <option value="">Select a dataset...</option>
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {recommendedDatasetIds.size > 0 &&
                      recommendedDatasetIds.has(ds.id) &&
                      ds.id !== selectedDataset
                        ? '\u2605 '
                        : ''}
                      {ds.name} ({ds.testCaseCount || 0} records)
                    </option>
                  ))}
                </select>
                {recommendedDatasetIds.size > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="text-foreground">{'\u2605'}</span> Recommended for selected
                    candidates
                  </p>
                )}
              </>
            )}
          </div>

          <div>
            <label className="text-sm font-medium block mb-2 flex items-center gap-2">
              Graders <span className="text-red-400 text-xs">*</span>
              <Tooltip text="How to score outputs. Toggle one or more. Each grader runs independently on every test case." />
            </label>
            {graders.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No graders available. Create one first.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {graders.map((grader) => (
                  <button
                    key={grader.id}
                    onClick={() => toggleGrader(grader.id)}
                    disabled={isRunning}
                    className={`
                      px-3 py-1.5 text-sm rounded-md border transition-colors
                      ${
                        selectedGraders.includes(grader.id)
                          ? 'bg-foreground text-background border-foreground'
                          : 'border-border hover:border-foreground/50'
                      }
                      ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {grader.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Model selection */}
        <div>
          <label className="text-sm font-medium block mb-2 flex items-center gap-2">
            Model
            <span className="text-muted-foreground text-xs font-normal">(optional override)</span>
            <Tooltip text="Override the LLM provider/model for this experiment. Defaults to your global Settings if not specified." />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  const newProvider = e.target.value;
                  setSelectedProvider(newProvider);
                  setSelectedModel('');
                }}
                className="input"
                disabled={isRunning}
              >
                <option value="">Default ({llmDefaults?.provider || 'openai'})</option>
                <option value="openai">OpenAI</option>
                <option value="anthropic">Anthropic</option>
                <option value="ollama">Ollama</option>
              </select>
            </div>
            <div>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="input"
                disabled={isRunning}
              >
                <option value="">
                  Default (
                  {llmDefaults?.model ||
                    MODEL_OPTIONS[selectedProvider || llmDefaults?.provider || 'openai']?.[0] ||
                    'gpt-4.1'}
                  )
                </option>
                {(
                  MODEL_OPTIONS[selectedProvider || llmDefaults?.provider || 'openai'] ||
                  MODEL_OPTIONS.openai
                ).map((m) => (
                  <option key={m} value={m}>
                    {m}
                    {MODEL_PRICING[m] ? ` (${MODEL_PRICING[m]})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Candidate selection */}
        {candidates.length > 0 && (
          <div>
            <label className="text-sm font-medium block mb-2 flex items-center gap-2">
              Candidates{' '}
              <span className="text-muted-foreground text-xs font-normal">(optional)</span>
              <Tooltip text="Optional. Prompt configurations that generate output for each test case. If none selected, graders evaluate expected_output directly (useful for testing grader behavior)." />
            </label>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={selectAllCandidates}
                disabled={isRunning || candidates.length === 0}
                className="btn-secondary px-3 py-1 text-xs"
              >
                Select all
              </button>
              <button
                onClick={clearCandidateSelection}
                disabled={isRunning || selectedCandidates.length === 0}
                className="btn-secondary px-3 py-1 text-xs"
              >
                Clear
              </button>
              {candidatesForDataset.size > 0 && selectedDataset && (
                <button
                  onClick={() => setSelectedCandidates(Array.from(candidatesForDataset))}
                  disabled={isRunning}
                  className="btn-secondary px-3 py-1 text-xs"
                >
                  Select recommended
                </button>
              )}
              <span className="text-xs text-muted-foreground">
                {selectedCandidates.length} selected
              </span>
            </div>
            {candidatesForDataset.size > 0 &&
              selectedDataset &&
              selectedCandidates.length === 0 && (
                <p className="text-xs text-muted-foreground mb-2">
                  <span className="text-foreground">{'\u2605'}</span> {candidatesForDataset.size}{' '}
                  candidate{candidatesForDataset.size !== 1 ? 's' : ''} designed for{' '}
                  <strong className="text-foreground">
                    {selectedDatasetMeta?.name || selectedDataset}
                  </strong>
                </p>
              )}
            <div className="space-y-3">
              {candidateFamilies.map((family) => {
                const familyIds = family.members.map((member) => member.id);
                const selectedInFamily = familyIds.filter((id) =>
                  selectedCandidates.includes(id)
                ).length;
                const allFamilySelected = selectedInFamily === familyIds.length;
                const familyPartiallySelected = selectedInFamily > 0 && !allFamilySelected;
                const base = family.members[0];
                const isMulti = family.members.length > 1;

                return (
                  <div
                    key={family.key}
                    className={`border border-border rounded-md overflow-hidden ${
                      isMulti ? 'border-l-2 border-l-foreground/30' : ''
                    }`}
                  >
                    {/* Family header */}
                    <div
                      className={`flex items-center justify-between p-2 ${isMulti ? 'bg-muted/30 border-b border-border' : ''}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Bot className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium truncate">{family.label}</span>
                            {isMulti && (
                              <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full flex-shrink-0">
                                {family.members.length} candidates
                              </span>
                            )}
                            {base.runnerType === 'http_endpoint' && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                HTTP
                              </span>
                            )}
                          </div>
                          {base.description && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {base.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {isMulti ? (
                        <button
                          onClick={() => toggleCandidateFamily(familyIds)}
                          disabled={isRunning}
                          className={`btn-secondary px-2 py-1 text-xs flex-shrink-0 ${
                            allFamilySelected ? 'bg-foreground/10' : ''
                          }`}
                        >
                          {allFamilySelected
                            ? 'Deselect all'
                            : familyPartiallySelected
                              ? 'Select remaining'
                              : 'Select all'}
                        </button>
                      ) : (
                        <button
                          onClick={() => toggleCandidate(base.id)}
                          disabled={isRunning}
                          className={`px-2 py-1 text-xs rounded-md border transition-colors flex-shrink-0 ${
                            selectedCandidates.includes(base.id)
                              ? 'bg-foreground text-background border-foreground'
                              : candidatesForDataset.has(base.id) && selectedDataset
                                ? 'border-foreground/30 bg-muted/50 hover:border-foreground/50'
                                : 'border-border hover:border-foreground/50'
                          }`}
                        >
                          {selectedCandidates.includes(base.id) ? 'Selected' : 'Select'}
                          {candidatesForDataset.has(base.id) &&
                            selectedDataset &&
                            !selectedCandidates.includes(base.id) && (
                              <span className="ml-1 text-[10px]">{'\u2605'}</span>
                            )}
                        </button>
                      )}
                    </div>

                    {/* Members (only show individually for multi-member families) */}
                    {isMulti && (
                      <div className="p-2 flex flex-wrap gap-2">
                        {family.members.map((candidate) => {
                          const isSelected = selectedCandidates.includes(candidate.id);
                          const isVariant = Boolean(candidate.parentId);
                          const matchesDataset = candidatesForDataset.has(candidate.id);

                          return (
                            <button
                              key={candidate.id}
                              onClick={() => toggleCandidate(candidate.id)}
                              disabled={isRunning}
                              className={`
                                px-3 py-1.5 text-sm rounded-md border transition-colors flex items-center gap-1.5
                                ${
                                  isSelected
                                    ? 'bg-foreground text-background border-foreground'
                                    : matchesDataset && selectedDataset
                                      ? 'border-foreground/30 bg-muted/50 hover:border-foreground/50'
                                      : 'border-border hover:border-foreground/50'
                                }
                                ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}
                              `}
                              title={candidate.id}
                            >
                              {!isVariant ? (
                                <span className="text-[10px] font-semibold bg-foreground/10 px-1 rounded">
                                  BASE
                                </span>
                              ) : (
                                <span className="text-[10px] opacity-60 px-1">
                                  v:{candidate.variantLabel || 'variant'}
                                </span>
                              )}
                              {candidate.name}
                              {matchesDataset && selectedDataset && !isSelected && (
                                <span className="text-[10px] opacity-50">{'\u2605'}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {selectedCandidates.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                No candidates selected: graders will evaluate <code>expected_output</code> directly.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-4">
          <button
            onClick={runExperiment}
            disabled={!selectedDataset || selectedGraders.length === 0 || isRunning}
            className="btn-primary"
            title="Run all test cases (through selected candidates if any) and grade the outputs"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Experiment
              </>
            )}
          </button>

          {progress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-foreground transition-all"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              {progress.current} / {progress.total}
            </div>
          )}
        </div>
        {selectedDatasetMeta && selectedGraders.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Estimated evaluations: {estimatedEvaluations} ({selectedCaseCount} records ×{' '}
            {selectedCandidates.length > 0
              ? `${selectedCandidates.length} candidate(s)`
              : 'baseline'}{' '}
            × {selectedGraders.length} grader(s))
          </p>
        )}
      </div>

      {/* Results View */}
      {activeExperiment && activeDataset && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-medium">Results: {activeExperiment.name || 'Experiment'}</h2>
            <p className="text-sm text-muted-foreground">
              Dataset: {activeDataset.name} · Status: {activeExperiment.status}
              {hasCandidates && ` · ${activeExperiment.candidateIds!.length} candidate(s)`}
              {activeExperiment.modelConfig?.provider && (
                <span className="ml-2">
                  · Model: {activeExperiment.modelConfig.provider}
                  {activeExperiment.modelConfig.model && `/${activeExperiment.modelConfig.model}`}
                </span>
              )}
              {activeExperiment.createdAt && (
                <span className="ml-2">
                  · <Clock className="h-3 w-3 inline-block" />{' '}
                  {new Date(activeExperiment.createdAt).toLocaleString()}
                </span>
              )}
            </p>
          </div>

          {/* Candidate score summary */}
          {hasCandidates && sortedCandidateStats.length > 0 && (
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex flex-wrap gap-4">
                {sortedCandidateStats.map((cs) => {
                  const candidate = candidates.find((c) => c.id === cs.candidateId);
                  const hasWeighted =
                    cs.weightedScore != null &&
                    Math.abs((cs.weightedScore ?? 0) - cs.avgScore) > 0.001;
                  return (
                    <div key={cs.candidateId} className="text-sm">
                      <span className="font-medium">{candidate?.name || cs.candidateId}</span>
                      {cs.candidateId === bestCandidateId && (
                        <span className="ml-2 badge badge-pass">Best</span>
                      )}
                      <span className="text-muted-foreground ml-2">
                        Avg: {(cs.avgScore * 100).toFixed(0)}%
                      </span>
                      {hasWeighted && (
                        <span
                          className="ml-2 text-foreground"
                          title="Weighted score using the prompt's grader weight configuration"
                        >
                          Weighted: {((cs.weightedScore ?? 0) * 100).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-muted-foreground ml-2">
                        ({cs.passed}/{cs.total} passed)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Candidate comparison */}
          {hasCandidates && activeCandidateIds.length >= 2 && (
            <div className="px-4 py-3 border-b border-border space-y-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Baseline</label>
                  <select
                    value={baselineCandidateId}
                    onChange={(e) => setBaselineCandidateId(e.target.value)}
                    className="input text-sm"
                    disabled={comparing}
                  >
                    {compareCandidateOptions.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Challenger</label>
                  <select
                    value={challengerCandidateId}
                    onChange={(e) => setChallengerCandidateId(e.target.value)}
                    className="input text-sm"
                    disabled={comparing}
                  >
                    {compareCandidateOptions.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={runComparison}
                  disabled={
                    comparing ||
                    !baselineCandidateId ||
                    !challengerCandidateId ||
                    baselineCandidateId === challengerCandidateId
                  }
                  className="btn-secondary"
                >
                  {comparing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Comparing...
                    </>
                  ) : (
                    'Compare'
                  )}
                </button>
              </div>

              {compareError && <p className="text-sm text-red-600">{compareError}</p>}

              {comparison && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>
                      Baseline pass rate:{' '}
                      <strong>{(comparison.summary.baselinePassRate * 100).toFixed(1)}%</strong>
                    </span>
                    <span>
                      Challenger pass rate:{' '}
                      <strong>{(comparison.summary.challengerPassRate * 100).toFixed(1)}%</strong>
                    </span>
                    <span>
                      Delta:{' '}
                      <strong
                        className={
                          comparison.summary.deltaPassRate >= 0 ? 'text-green-700' : 'text-red-700'
                        }
                      >
                        {comparison.summary.deltaPassRate >= 0 ? '+' : ''}
                        {(comparison.summary.deltaPassRate * 100).toFixed(1)}%
                      </strong>
                    </span>
                    <span className="text-muted-foreground">
                      Improved: {comparison.summary.improved} · Regressed:{' '}
                      {comparison.summary.regressed} · Same: {comparison.summary.same}
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Test Case</th>
                          <th>Grader</th>
                          <th>Baseline</th>
                          <th>Challenger</th>
                          <th>Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.comparisons.map((item) => {
                          const testCase = testCaseById.get(item.testCaseId);
                          const grader = graders.find((g) => g.id === item.graderId);

                          return (
                            <tr key={`${item.testCaseId}-${item.graderId}`}>
                              <td
                                className="font-mono text-xs max-w-[280px] truncate"
                                title={testCase?.input || item.testCaseId}
                              >
                                {testCase?.input || item.testCaseId}
                              </td>
                              <td>{grader?.name || item.graderId}</td>
                              <td>{item.baseline.pass ? 'Pass' : 'Fail'}</td>
                              <td>{item.challenger.pass ? 'Pass' : 'Fail'}</td>
                              <td>
                                {item.delta === 'improved' && (
                                  <span className="badge badge-pass">Improved</span>
                                )}
                                {item.delta === 'regressed' && (
                                  <span className="badge badge-fail">Regressed</span>
                                )}
                                {item.delta === 'same' && (
                                  <span className="text-muted-foreground">Same</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeExperiment.results && activeExperiment.results.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Input</th>
                    {hasCandidates
                      ? // Multi-candidate: columns grouped by candidate, sub-columns by grader
                        activeExperiment.candidateIds!.map((candidateId) => {
                          const candidate = candidates.find((c) => c.id === candidateId);
                          return activeExperiment.graderIds.map((graderId) => {
                            const grader = graders.find((g) => g.id === graderId);
                            return (
                              <th key={`${candidateId}-${graderId}`}>
                                <div className="text-xs">
                                  <div className="font-medium">
                                    {candidate?.name || candidateId.slice(0, 8)}
                                  </div>
                                  <div className="text-muted-foreground font-normal">
                                    {grader?.name || graderId.slice(0, 8)}
                                  </div>
                                </div>
                              </th>
                            );
                          });
                        })
                      : // Legacy: single column per grader
                        activeExperiment.graderIds.map((graderId) => {
                          const grader = graders.find((g) => g.id === graderId);
                          return <th key={graderId}>{grader?.name || graderId}</th>;
                        })}
                  </tr>
                </thead>
                <tbody>
                  {activeDataset.testCases?.map((tc) => (
                    <tr key={tc.id}>
                      <td className="font-mono text-sm max-w-[200px] truncate">{tc.input}</td>
                      {hasCandidates
                        ? activeExperiment.candidateIds!.map((candidateId) =>
                            activeExperiment.graderIds.map((graderId) => {
                              const result = activeExperiment.results?.find(
                                (r) =>
                                  r.testCaseId === tc.id &&
                                  r.graderId === graderId &&
                                  r.candidateId === candidateId
                              );
                              return (
                                <td key={`${candidateId}-${graderId}`}>
                                  {result ? (
                                    <ResultCell result={result} />
                                  ) : (
                                    <span className="text-muted-foreground">-</span>
                                  )}
                                </td>
                              );
                            })
                          )
                        : activeExperiment.graderIds.map((graderId) => {
                            const result = activeExperiment.results?.find(
                              (r) => r.testCaseId === tc.id && r.graderId === graderId
                            );
                            return (
                              <td key={graderId}>
                                {result ? (
                                  <ResultCell result={result} />
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">No results yet</div>
          )}
        </div>
      )}

      {/* Past Experiments */}
      {experiments.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Past Experiments</h2>
            <div className="flex items-center gap-2">
              <a
                href={experimentsApi.exportAllCsvUrl()}
                title="Export all experiments as one CSV"
                className="btn-secondary px-3 py-1 text-xs flex items-center gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export All CSV
              </a>
              <button
                onClick={async () => {
                  if (
                    !confirm(`Delete ALL ${experiments.length} experiments? This cannot be undone.`)
                  )
                    return;
                  try {
                    await experimentsApi.clearAll();
                    setExperiments([]);
                    setActiveExperiment(null);
                    setActiveStats(null);
                    setActiveDataset(null);
                    toast('All experiments cleared', 'success');
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Clear failed', 'error');
                  }
                }}
                className="btn-secondary px-3 py-1 text-xs text-red-500 hover:bg-red-500/10 flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear All
              </button>
            </div>
          </div>
          <div className="grid gap-2">
            {experiments.slice(0, 10).map((exp) => {
              const dataset = datasets.find((d) => d.id === exp.datasetId);
              const hasCands = exp.candidateIds && exp.candidateIds.length > 0;
              const ts = exp.createdAt ? new Date(exp.createdAt).toLocaleString() : null;
              const isExpanded = expandedExperiments.has(exp.id);
              const expData = expandedData.get(exp.id);
              return (
                <div
                  key={exp.id}
                  className={`
                    card hover:bg-muted/50 transition-colors overflow-hidden
                    ${activeExperiment?.id === exp.id ? 'ring-2 ring-foreground' : ''}
                  `}
                >
                  <div className="flex items-center justify-between p-3">
                    <button
                      onClick={() => toggleExpandExperiment(exp.id)}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                        />
                        <div className="min-w-0">
                          <p className="font-medium">{exp.name || 'Experiment'}</p>
                          <p className="text-sm text-muted-foreground">
                            {dataset?.name || 'Unknown dataset'} · {exp.graderIds.length} grader(s)
                            {hasCands && ` · ${exp.candidateIds!.length} candidate(s)`}
                            {exp.passRate != null && (
                              <span
                                className={`ml-2 font-medium ${
                                  exp.passRate >= 0.8
                                    ? 'text-green-600'
                                    : exp.passRate >= 0.5
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }`}
                              >
                                {(exp.passRate * 100).toFixed(0)}% pass
                              </span>
                            )}
                            {exp.totalResults != null && exp.totalResults > 0 && (
                              <span className="ml-1 text-xs">
                                ({exp.passed}/{exp.totalResults})
                              </span>
                            )}
                          </p>
                          {(ts || exp.modelConfig) && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              {ts && (
                                <>
                                  <Clock className="h-3 w-3" />
                                  {ts}
                                </>
                              )}
                              {exp.modelConfig?.model && (
                                <span className="ml-2">
                                  {exp.modelConfig.provider && `${exp.modelConfig.provider}/`}
                                  {exp.modelConfig.model}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span
                        className={`badge text-xs ${
                          exp.status === 'completed'
                            ? 'bg-success/20 text-success'
                            : exp.status === 'failed'
                              ? 'bg-error/20 text-error'
                              : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {exp.status}
                      </span>
                      <a
                        href={experimentsApi.exportCsvUrl(exp.id)}
                        title="Export CSV"
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      </a>
                      <a
                        href={experimentsApi.exportJsonUrl(exp.id)}
                        title="Export JSON"
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => viewExperiment(exp.id)}
                        title="Load into results view"
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-muted transition-colors"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm(`Delete experiment "${exp.name || exp.id}"?`)) return;
                          try {
                            await experimentsApi.delete(exp.id);
                            setExperiments((prev) => prev.filter((e) => e.id !== exp.id));
                            if (activeExperiment?.id === exp.id) {
                              setActiveExperiment(null);
                              setActiveStats(null);
                              setActiveDataset(null);
                            }
                            toast('Experiment deleted', 'success');
                          } catch (err) {
                            toast(err instanceof Error ? err.message : 'Delete failed', 'error');
                          }
                        }}
                        title="Delete experiment"
                        className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded inline results */}
                  {isExpanded && (
                    <div className="border-t border-border">
                      {!expData ? (
                        <div className="p-4 text-center text-muted-foreground text-sm">
                          <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                          Loading results...
                        </div>
                      ) : (
                        <>
                          {/* Score summary */}
                          {expData.stats?.candidateStats &&
                            expData.stats.candidateStats.length > 0 && (
                              <div className="px-4 py-2 bg-muted/30 flex flex-wrap gap-4 text-sm">
                                {expData.stats.candidateStats
                                  .sort(
                                    (a, b) =>
                                      (b.weightedScore ?? b.avgScore) -
                                      (a.weightedScore ?? a.avgScore)
                                  )
                                  .map((cs, i) => {
                                    const candidate = candidates.find(
                                      (c) => c.id === cs.candidateId
                                    );
                                    return (
                                      <span key={cs.candidateId}>
                                        {i === 0 && (
                                          <span className="badge badge-pass mr-1">Best</span>
                                        )}
                                        <span className="font-medium">
                                          {candidate?.name || cs.candidateId}
                                        </span>
                                        <span className="text-muted-foreground ml-1">
                                          {(cs.avgScore * 100).toFixed(0)}%
                                        </span>
                                        <span className="text-muted-foreground ml-1">
                                          ({cs.passed}/{cs.total})
                                        </span>
                                      </span>
                                    );
                                  })}
                              </div>
                            )}

                          {/* Results table */}
                          {expData.experiment.results &&
                          expData.experiment.results.length > 0 &&
                          expData.dataset ? (
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                              <table className="table text-xs">
                                <thead className="sticky top-0 bg-card">
                                  <tr>
                                    <th>Input</th>
                                    {exp.candidateIds && exp.candidateIds.length > 0
                                      ? exp.candidateIds.map((cId) =>
                                          exp.graderIds.map((gId) => {
                                            const c = candidates.find((x) => x.id === cId);
                                            const g = graders.find((x) => x.id === gId);
                                            return (
                                              <th key={`${cId}-${gId}`}>
                                                <div>
                                                  <div className="font-medium">
                                                    {c?.name || cId.slice(0, 8)}
                                                  </div>
                                                  <div className="text-muted-foreground font-normal">
                                                    {g?.name || gId.slice(0, 8)}
                                                  </div>
                                                </div>
                                              </th>
                                            );
                                          })
                                        )
                                      : exp.graderIds.map((gId) => {
                                          const g = graders.find((x) => x.id === gId);
                                          return <th key={gId}>{g?.name || gId}</th>;
                                        })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {expData.dataset.testCases?.map((tc) => (
                                    <tr key={tc.id}>
                                      <td className="font-mono max-w-[180px] truncate">
                                        {tc.input}
                                      </td>
                                      {exp.candidateIds && exp.candidateIds.length > 0
                                        ? exp.candidateIds.map((cId) =>
                                            exp.graderIds.map((gId) => {
                                              const result = expData.experiment.results?.find(
                                                (r) =>
                                                  r.testCaseId === tc.id &&
                                                  r.graderId === gId &&
                                                  r.candidateId === cId
                                              );
                                              return (
                                                <td key={`${cId}-${gId}`}>
                                                  {result ? (
                                                    <ResultCell result={result} />
                                                  ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                  )}
                                                </td>
                                              );
                                            })
                                          )
                                        : exp.graderIds.map((gId) => {
                                            const result = expData.experiment.results?.find(
                                              (r) => r.testCaseId === tc.id && r.graderId === gId
                                            );
                                            return (
                                              <td key={gId}>
                                                {result ? (
                                                  <ResultCell result={result} />
                                                ) : (
                                                  <span className="text-muted-foreground">-</span>
                                                )}
                                              </td>
                                            );
                                          })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="p-4 text-center text-muted-foreground text-sm">
                              {expData.dataset ? 'No results' : 'Dataset not found'}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCell({
  result,
}: {
  result: {
    pass: boolean;
    score?: number;
    reason?: string;
    generatedOutput?: string;
    latencyMs?: number;
    modelProvider?: string;
    modelName?: string;
  };
}) {
  return (
    <div className="group relative">
      <span className={`badge ${result.pass ? 'badge-pass' : 'badge-fail'}`}>
        {result.pass ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
        {result.pass ? 'Pass' : 'Fail'}
      </span>

      <div className="absolute hidden group-hover:block z-50 top-full left-0 mt-2 w-72 p-2 bg-card border border-border rounded-md shadow-lg text-xs">
        <p className="font-medium mb-1">
          Score: {((result.score || 0) * 100).toFixed(0)}%
          {result.latencyMs !== undefined && (
            <span className="text-muted-foreground ml-2">{result.latencyMs}ms</span>
          )}
        </p>
        {(result.modelProvider || result.modelName) && (
          <p className="text-muted-foreground mb-1">
            Model: {result.modelProvider && <span>{result.modelProvider}/</span>}
            {result.modelName || 'default'}
          </p>
        )}
        <p className="text-muted-foreground">{result.reason}</p>
        {result.generatedOutput && (
          <div className="mt-2 pt-2 border-t border-border">
            <p className="font-medium mb-0.5">Generated Output:</p>
            <p className="text-muted-foreground font-mono whitespace-pre-wrap">
              {result.generatedOutput.substring(0, 200)}
              {result.generatedOutput.length > 200 && '...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Model options and pricing (shared with candidates page)
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
