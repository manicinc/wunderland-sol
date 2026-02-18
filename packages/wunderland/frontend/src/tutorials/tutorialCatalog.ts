/**
 * @file tutorialCatalog.ts
 * @description Curated onboarding tutorials backed by the markdown docs in /docs.
 */
import workflowsGuide from '@docs/WORKFLOWS.md?raw';
import agencyGuide from '@docs/GMIS_AGENTS_AGENCY.md?raw';
import clientStorageGuide from '@docs/CLIENT_STORAGE_AND_EXPORTS.md?raw';

export interface TutorialEntry {
  id: string;
  title: string;
  summary: string;
  duration: string;
  tags: string[];
  content: string;
  source: string;
}

export const tutorialCatalog: TutorialEntry[] = [
  {
    id: 'workflow-runtime',
    title: 'Authoring and monitoring workflows',
    summary: 'Design task graphs, attach GMIs, and stream telemetry with WORKFLOW_UPDATE / AGENCY_UPDATE events.',
    duration: '10 min read',
    tags: ['workflows', 'automation', 'agencies'],
    content: workflowsGuide,
    source: 'docs/WORKFLOWS.md',
  },
  {
    id: 'gmis-and-agencies',
    title: 'GMIs, Agents & Agency collaboration',
    summary: 'Understand how persona definitions, marketplace agents, and multi-seat agencies cooperate inside AgentOS.',
    duration: '8 min read',
    tags: ['gmis', 'personas', 'agency'],
    content: agencyGuide,
    source: 'docs/GMIS_AGENTS_AGENCY.md',
  },
  {
    id: 'local-runtime',
    title: 'Local-first workbench & SQL persistence',
    summary: 'Run AgentOS entirely in the browser using the SQL adapter, manage exports, and keep telemetry offline.',
    duration: '6 min read',
    tags: ['client', 'persistence', 'local-first'],
    content: clientStorageGuide,
    source: 'docs/CLIENT_STORAGE_AND_EXPORTS.md',
  },
];
