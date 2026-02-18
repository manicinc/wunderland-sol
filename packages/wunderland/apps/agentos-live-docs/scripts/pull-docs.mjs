#!/usr/bin/env node

/**
 * pull-docs.mjs — Prebuild script that copies markdown from source packages
 * into the Docusaurus docs/ tree, injecting frontmatter and rewriting links.
 *
 * Run: node scripts/pull-docs.mjs
 * Auto-runs via `npm run prebuild` before `npm run build`.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, cpSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DOCS_OUT = resolve(ROOT, 'docs');

// Source directories (relative to monorepo root)
const MONO_ROOT = resolve(ROOT, '../..');
const AGENTOS_PKG = resolve(MONO_ROOT, 'packages/agentos');
const AGENTOS_DOCS = resolve(MONO_ROOT, 'packages/agentos/docs');
const EXTENSIONS_ROOT = resolve(MONO_ROOT, 'packages/agentos-extensions');
const CURATED_ROOT = resolve(EXTENSIONS_ROOT, 'registry/curated');
const SKILLS_REGISTRY_PKG = resolve(MONO_ROOT, 'packages/agentos-skills-registry');
const SKILLS_EXTENSION_PKG = resolve(MONO_ROOT, 'packages/agentos-ext-skills');
const SQL_STORAGE_ADAPTER_PKG = resolve(MONO_ROOT, 'packages/sql-storage-adapter');
const REPO_DOCS = resolve(MONO_ROOT, 'docs');
const EXTENSIONS_GITHUB_REPO = 'https://github.com/framersai/agentos-extensions';

// ── Mapping tables ──────────────────────────────────────────────────

/** @type {{ src: string; dest: string; title: string; position: number }[]} */
const agentosGuides = [
  { src: 'README.md', dest: 'getting-started/documentation-index.md', title: 'Documentation Index', position: 1 },
  { src: 'ECOSYSTEM.md', dest: 'getting-started/ecosystem.md', title: 'Ecosystem', position: 2 },
  { src: 'RELEASING.md', dest: 'getting-started/releasing.md', title: 'Releasing', position: 3 },
  { src: 'ARCHITECTURE.md', dest: 'architecture/system-architecture.md', title: 'System Architecture', position: 1 },
  { src: 'PLATFORM_SUPPORT.md', dest: 'architecture/platform-support.md', title: 'Platform Support', position: 2 },
  { src: 'OBSERVABILITY.md', dest: 'architecture/observability.md', title: 'Observability (OpenTelemetry)', position: 3 },
  { src: 'LOGGING.md', dest: 'architecture/logging.md', title: 'Logging (Pino + OpenTelemetry)', position: 4 },
  { src: 'TOOL_CALLING_AND_LOADING.md', dest: 'architecture/tool-calling-and-loading.md', title: 'Tool Calling & Lazy Loading', position: 5 },
  { src: 'IMMUTABLE_AGENTS.md', dest: 'features/immutable-agents.md', title: 'Immutable Agents', position: 13 },
  { src: 'PROVENANCE_IMMUTABILITY.md', dest: 'features/provenance-immutability.md', title: 'Provenance & Immutability', position: 14 },
  { src: 'PLANNING_ENGINE.md', dest: 'features/planning-engine.md', title: 'Planning Engine', position: 1 },
  { src: 'HUMAN_IN_THE_LOOP.md', dest: 'features/human-in-the-loop.md', title: 'Human-in-the-Loop', position: 2 },
  { src: 'AGENT_COMMUNICATION.md', dest: 'features/agent-communication.md', title: 'Agent Communication', position: 3 },
  { src: 'GUARDRAILS_USAGE.md', dest: 'features/guardrails.md', title: 'Guardrails', position: 4 },
  { src: 'RAG_MEMORY_CONFIGURATION.md', dest: 'features/rag-memory.md', title: 'RAG Memory Configuration', position: 5 },
  { src: 'MULTIMODAL_RAG.md', dest: 'features/multimodal-rag.md', title: 'Multimodal RAG (Image + Audio)', position: 6 },
  { src: 'SQL_STORAGE_QUICKSTART.md', dest: 'features/sql-storage.md', title: 'SQL Storage Quickstart', position: 7 },
  { src: 'CLIENT_SIDE_STORAGE.md', dest: 'features/client-side-storage.md', title: 'Client-Side Storage', position: 8 },
  { src: 'STRUCTURED_OUTPUT.md', dest: 'features/structured-output.md', title: 'Structured Output', position: 9 },
  { src: 'EVALUATION_FRAMEWORK.md', dest: 'features/evaluation-framework.md', title: 'Evaluation Framework', position: 10 },
  { src: 'COST_OPTIMIZATION.md', dest: 'features/cost-optimization.md', title: 'Cost Optimization', position: 11 },
  { src: 'RECURSIVE_SELF_BUILDING_AGENTS.md', dest: 'features/recursive-self-building.md', title: 'Recursive Self-Building Agents', position: 12 },
  { src: 'RFC_EXTENSION_STANDARDS.md', dest: 'extensions/extension-standards.md', title: 'Extension Standards (RFC)', position: 5 },
];

/** @type {{ src: string; dest: string; title: string; position: number }[]} */
const extensionGuides = [
  { src: 'README.md', dest: 'extensions/overview.md', title: 'Extensions Overview', position: 1 },
  { src: 'HOW_EXTENSIONS_WORK.md', dest: 'extensions/how-extensions-work.md', title: 'How Extensions Work', position: 2 },
  { src: 'EXTENSION_ARCHITECTURE.md', dest: 'extensions/extension-architecture.md', title: 'Extension Architecture', position: 3 },
  { src: 'AUTO_LOADING_EXTENSIONS.md', dest: 'extensions/auto-loading.md', title: 'Auto-Loading Extensions', position: 4 },
  { src: 'CONTRIBUTING.md', dest: 'extensions/contributing.md', title: 'Contributing', position: 6 },
  { src: 'SELF_HOSTED_REGISTRIES.md', dest: 'extensions/self-hosted-registries.md', title: 'Self-Hosted Registries', position: 7 },
  { src: 'MIGRATION_GUIDE.md', dest: 'extensions/migration-guide.md', title: 'Migration Guide', position: 8 },
  { src: 'RELEASING.md', dest: 'extensions/releasing.md', title: 'Releasing', position: 9 },
  { src: 'AGENCY_COLLABORATION_EXAMPLE.md', dest: 'features/agency-collaboration.md', title: 'Agency Collaboration', position: 12 },
];

/** @type {{ dir: string; dest: string; title: string; position: number }[]} */
const builtInExtensions = [
  { dir: 'auth', dest: 'extensions/built-in/auth.md', title: 'Auth', position: 1 },
  { dir: 'research/web-search', dest: 'extensions/built-in/web-search.md', title: 'Web Search', position: 2 },
  { dir: 'research/web-browser', dest: 'extensions/built-in/web-browser.md', title: 'Web Browser', position: 3 },
  { dir: 'research/news-search', dest: 'extensions/built-in/news-search.md', title: 'News Search', position: 4 },
  { dir: 'media/giphy', dest: 'extensions/built-in/giphy.md', title: 'Giphy', position: 5 },
  { dir: 'media/image-search', dest: 'extensions/built-in/image-search.md', title: 'Image Search', position: 6 },
  { dir: 'media/voice-synthesis', dest: 'extensions/built-in/voice-synthesis.md', title: 'Voice Synthesis', position: 7 },
  { dir: 'system/cli-executor', dest: 'extensions/built-in/cli-executor.md', title: 'CLI Executor', position: 8 },
  { dir: 'integrations/telegram', dest: 'extensions/built-in/telegram.md', title: 'Telegram', position: 9 },
  { dir: 'provenance/anchor-providers', dest: 'extensions/built-in/anchor-providers.md', title: 'Anchor Providers', position: 10 },
  { dir: 'provenance/wunderland-tip-ingestion', dest: 'extensions/built-in/tip-ingestion.md', title: 'Tip Ingestion', position: 11 },
  { dir: 'communications/telegram-bot', dest: 'extensions/built-in/telegram-bot.md', title: 'Telegram Bot (Comms)', position: 12 },
  { dir: 'channels/telegram', dest: 'extensions/built-in/channel-telegram.md', title: 'Channel: Telegram', position: 13 },
  { dir: 'channels/whatsapp', dest: 'extensions/built-in/channel-whatsapp.md', title: 'Channel: WhatsApp', position: 14 },
  { dir: 'channels/discord', dest: 'extensions/built-in/channel-discord.md', title: 'Channel: Discord', position: 15 },
  { dir: 'channels/slack', dest: 'extensions/built-in/channel-slack.md', title: 'Channel: Slack', position: 16 },
  { dir: 'channels/webchat', dest: 'extensions/built-in/channel-webchat.md', title: 'Channel: WebChat', position: 17 },
];

/** @type {{ srcPath: string; dest: string; title: string; position: number }[]} */
const skillsDocs = [
  // Keep `docs/skills/overview.md` as the hand-curated landing page.
  { srcPath: resolve(AGENTOS_DOCS, 'SKILLS.md'), dest: 'skills/skill-format.md', title: 'Skills (SKILL.md)', position: 2 },
  { srcPath: resolve(SKILLS_EXTENSION_PKG, 'README.md'), dest: 'skills/skills-extension.md', title: 'Skills Extension', position: 3 },
  { srcPath: resolve(SKILLS_REGISTRY_PKG, 'README.md'), dest: 'skills/agentos-skills-registry.md', title: '@framers/agentos-skills-registry', position: 4 },
];

/** @type {{ srcPath: string; dest: string; title: string; position: number }[]} */
const extraDocs = [
  { srcPath: resolve(AGENTOS_PKG, 'CHANGELOG.md'), dest: 'getting-started/changelog.md', title: 'Changelog', position: 4 },
  { srcPath: resolve(REPO_DOCS, 'EMERGENT_AGENCY_SYSTEM.md'), dest: 'architecture/emergent-agency-system.md', title: 'Emergent Agency System', position: 4 },
  { srcPath: resolve(REPO_DOCS, 'BACKEND_API.md'), dest: 'architecture/backend-api.md', title: 'Backend API', position: 5 },
  { srcPath: resolve(SQL_STORAGE_ADAPTER_PKG, 'PLATFORM_STRATEGY.md'), dest: 'features/platform-strategy.md', title: 'Platform Strategy', position: 8 },
];

// ── Link rewrite rules ──────────────────────────────────────────────

/** Map old filename references to new Docusaurus paths */
const linkRewrites = {
  'ARCHITECTURE.md': '/docs/architecture/system-architecture',
  'EMERGENT_AGENCY_SYSTEM.md': '/docs/architecture/emergent-agency-system',
  'BACKEND_API.md': '/docs/architecture/backend-api',
  'MULTI_GMI_IMPLEMENTATION_PLAN.md': '/docs/architecture/multi-gmi-implementation-plan',
  'OBSERVABILITY.md': '/docs/architecture/observability',
  'LOGGING.md': '/docs/architecture/logging',
  'PLATFORM_SUPPORT.md': '/docs/architecture/platform-support',
  'TOOL_CALLING_AND_LOADING.md': '/docs/architecture/tool-calling-and-loading',
  'PLANNING_ENGINE.md': '/docs/features/planning-engine',
  'HUMAN_IN_THE_LOOP.md': '/docs/features/human-in-the-loop',
  'AGENT_COMMUNICATION.md': '/docs/features/agent-communication',
  'GUARDRAILS_USAGE.md': '/docs/features/guardrails',
  'RAG_MEMORY_CONFIGURATION.md': '/docs/features/rag-memory',
  'MULTIMODAL_RAG.md': '/docs/features/multimodal-rag',
  'SQL_STORAGE_QUICKSTART.md': '/docs/features/sql-storage',
  'CLIENT_SIDE_STORAGE.md': '/docs/features/client-side-storage',
  'PLATFORM_STRATEGY.md': '/docs/features/platform-strategy',
  'IMMUTABLE_AGENTS.md': '/docs/features/immutable-agents',
  'PROVENANCE_IMMUTABILITY.md': '/docs/features/provenance-immutability',
  'STRUCTURED_OUTPUT.md': '/docs/features/structured-output',
  'EVALUATION_FRAMEWORK.md': '/docs/features/evaluation-framework',
  'COST_OPTIMIZATION.md': '/docs/features/cost-optimization',
  'RECURSIVE_SELF_BUILDING_AGENTS.md': '/docs/features/recursive-self-building',
  'RFC_EXTENSION_STANDARDS.md': '/docs/extensions/extension-standards',
  'RELEASING.md': '/docs/getting-started/releasing',
  'ECOSYSTEM.md': '/docs/getting-started/ecosystem',
  'SKILLS.md': '/docs/skills/skill-format',
  'README.md': '/docs/getting-started/documentation-index',
  'CHANGELOG.md': '/docs/getting-started/changelog',
  'MIGRATION_TO_STORAGE_ADAPTER.md': '/docs/features/sql-storage',
  'HOW_EXTENSIONS_WORK.md': '/docs/extensions/how-extensions-work',
  'EXTENSION_ARCHITECTURE.md': '/docs/extensions/extension-architecture',
  'AUTO_LOADING_EXTENSIONS.md': '/docs/extensions/auto-loading',
  'CONTRIBUTING.md': '/docs/extensions/contributing',
  'SELF_HOSTED_REGISTRIES.md': '/docs/extensions/self-hosted-registries',
  'MIGRATION_GUIDE.md': '/docs/extensions/migration-guide',
  'AGENCY_COLLABORATION_EXAMPLE.md': '/docs/features/agency-collaboration',
};

/** Rewrite curated registry folder links -> docs pages */
const curatedLinkRewrites = Object.fromEntries(
  builtInExtensions.map(({ dir, dest }) => {
    const from = `./registry/curated/${dir}`;
    const to = `/docs/${dest.replace(/\.md$/, '')}`;
    return [from, to];
  }),
);

/** Exact-path rewrites that don't fit the filename-only table. */
const exactLinkRewrites = {
  './api/index.html': '/docs/api/',
  './docs/api/index.html': '/docs/api/',
  '../src/core/tools/ITool.ts': '/docs/api/interfaces/ITool',
  '../src/extensions/ExtensionManager.ts': '/docs/api/classes/ExtensionManager',
};

// ── Helpers ──────────────────────────────────────────────────────────

function ensureDir(filePath) {
  mkdirSync(dirname(filePath), { recursive: true });
}

function injectFrontmatter(content, title, position) {
  // Strip existing frontmatter if present
  const stripped = content.replace(/^---[\s\S]*?---\n*/, '');

  // Strip leading h1 if it matches the title (Docusaurus uses frontmatter title)
  const withoutH1 = stripped.replace(/^#\s+.*\n+/, '');

  return `---
title: "${title}"
sidebar_position: ${position}
---

${withoutH1}`;
}

function rewriteLinks(content) {
  return content.replace(/\[([^\]]*)\]\(([^)]+)\)/g, (match, text, hrefRaw) => {
    const href = String(hrefRaw || '').trim();
    if (!href) return match;

    // Skip external URLs + anchors
    if (
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('#') ||
      href.startsWith('mailto:')
    ) {
      return match;
    }

    const [hrefPathRaw, anchorRaw] = href.split('#');
    const hrefPath = String(hrefPathRaw || '').trim();
    const anchor = anchorRaw ? `#${anchorRaw}` : '';
    const hrefNoTrailing = hrefPath.endsWith('/') ? hrefPath.slice(0, -1) : hrefPath;

    const exact = exactLinkRewrites[hrefPath] || exactLinkRewrites[hrefNoTrailing];
    if (exact) return `[${text}](${exact}${anchor})`;

    const curated = curatedLinkRewrites[hrefPath] || curatedLinkRewrites[hrefNoTrailing];
    if (curated) return `[${text}](${curated}${anchor})`;

    const base = basename(hrefPath);
    const rewritten = linkRewrites[base];
    if (rewritten) return `[${text}](${rewritten}${anchor})`;

    return match;
  });
}

function stripBadgeHtml(content) {
  // Remove GitHub badge HTML that renders poorly in Docusaurus
  return content
    .replace(/<p align="center">[\s\S]*?<\/p>/g, '')
    .replace(/\[!\[npm\]\(https:\/\/img\.shields\.io[^\]]*\)\]\([^)]*\)/g, '')
    .replace(/\[!\[GitHub\]\(https:\/\/img\.shields\.io[^\]]*\)\]\([^)]*\)/g, '');
}

function processMarkdown(content, title, position) {
  let result = content;
  result = stripBadgeHtml(result);
  result = rewriteLinks(result);
  result = injectFrontmatter(result, title, position);
  return result;
}

// ── Main ─────────────────────────────────────────────────────────────

let copied = 0;
let skipped = 0;

// 1. Copy AgentOS guides
for (const { src, dest, title, position } of agentosGuides) {
  const srcPath = resolve(AGENTOS_DOCS, src);
  const destPath = resolve(DOCS_OUT, dest);

  if (!existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${src}`);
    skipped++;
    continue;
  }

  const content = readFileSync(srcPath, 'utf8');
  ensureDir(destPath);
  writeFileSync(destPath, processMarkdown(content, title, position));
  copied++;
}

// 2. Copy agentos-extensions guides
for (const { src, dest, title, position } of extensionGuides) {
  const srcPath = resolve(EXTENSIONS_ROOT, src);
  const destPath = resolve(DOCS_OUT, dest);

  if (!existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${src}`);
    skipped++;
    continue;
  }

  const content = readFileSync(srcPath, 'utf8');
  ensureDir(destPath);
  writeFileSync(destPath, processMarkdown(content, title, position));
  copied++;
}

// 3. Copy built-in extension READMEs
for (const { dir, dest, title, position } of builtInExtensions) {
  const srcPath = resolve(CURATED_ROOT, dir, 'README.md');
  const destPath = resolve(DOCS_OUT, dest);

  if (!existsSync(srcPath)) {
    // Generate a stub for extensions without READMEs
    ensureDir(destPath);
    writeFileSync(destPath, `---
title: "${title}"
sidebar_position: ${position}
---

# ${title}

Documentation coming soon. See the [extension source](https://github.com/framersai/agentos-extensions/tree/master/registry/curated/${dir}) for usage details.
`);
    console.warn(`  STUB (no README): ${dir}`);
    skipped++;
    continue;
  }

  let content = readFileSync(srcPath, 'utf8');
  // Many extension READMEs link to local ./examples/ folders. In docs, those
  // directories aren't imported as pages, so point to the source repo instead.
  content = content.replace(/\[([^\]]+)\]\(\.\/examples\/?\)/g, (_m, label) => {
    const url = `${EXTENSIONS_GITHUB_REPO}/tree/master/registry/curated/${dir}/examples`;
    return `[${label}](${url})`;
  });
  ensureDir(destPath);
  writeFileSync(destPath, processMarkdown(content, title, position));
  copied++;
}

// 4. Copy skills docs (skills are a separate section from extensions)
for (const { srcPath, dest, title, position } of skillsDocs) {
  const destPath = resolve(DOCS_OUT, dest);

  if (!existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${srcPath}`);
    skipped++;
    continue;
  }

  const content = readFileSync(srcPath, 'utf8');
  ensureDir(destPath);
  writeFileSync(destPath, processMarkdown(content, title, position));
  copied++;
}

// 5. Copy extra monorepo docs referenced by guides
for (const { srcPath, dest, title, position } of extraDocs) {
  const destPath = resolve(DOCS_OUT, dest);

  if (!existsSync(srcPath)) {
    console.warn(`  SKIP (not found): ${srcPath}`);
    skipped++;
    continue;
  }

  const content = readFileSync(srcPath, 'utf8');
  ensureDir(destPath);
  writeFileSync(destPath, processMarkdown(content, title, position));
  copied++;
}

console.log(`\npull-docs: ${copied} files copied, ${skipped} skipped/stubbed`);
