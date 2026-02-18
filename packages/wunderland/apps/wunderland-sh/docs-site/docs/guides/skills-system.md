---
sidebar_position: 8
---

# Skills System

Skills are modular capabilities that extend what Wunderland agents can do. Each skill is defined by a `SKILL.md` file with YAML frontmatter and markdown content. The skills system handles loading, filtering, and presenting skills to agents as part of their LLM context.

## NPM Packages

The skills system is split across three packages with increasing levels of functionality:

| Package | What | Install |
|---------|------|---------|
| [`@framers/agentos-skills-registry`](https://www.npmjs.com/package/@framers/agentos-skills-registry) | 18 SKILL.md files + typed SDK — catalog queries, search, factories | `npm install @framers/agentos-skills-registry` |
| `wunderland/skills` | Full runtime — SkillRegistry, loading, snapshots | `npm install wunderland` |

**`@framers/agentos-skills-registry`** is the single package for AgentOS skills. It bundles 18 curated SKILL.md prompt modules, a `registry.json` index, and a typed SDK with query helpers (`searchSkills`, `getSkillsByCategory`, `getSkillsByTag`, etc.) and factory functions that lazy-load `@framers/agentos` for live registry/snapshot creation.

```typescript
// Lightweight — no peer deps needed
import { searchSkills, getSkillsByCategory } from '@framers/agentos-skills-registry/catalog';

const devTools = getSkillsByCategory('developer-tools');
const matches = searchSkills('github');

// Full registry — requires @framers/agentos peer dep
import { createCuratedSkillRegistry, createCuratedSkillSnapshot } from '@framers/agentos-skills-registry';

const registry = await createCuratedSkillRegistry();
const snapshot = await createCuratedSkillSnapshot({ skills: 'all', platform: 'darwin' });
```

## Curated Skills Reference

All curated skills ship with [`@framers/agentos-skills-registry`](https://www.npmjs.com/package/@framers/agentos-skills-registry) and are maintained in the [agentos-skills-registry](https://github.com/framersai/agentos-skills-registry) GitHub repository.

### Information

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **web-search** | Search the web for up-to-date information, news, documentation, and answers | `web-search` | — |
| **weather** | Look up current weather conditions, forecasts, and severe weather alerts | `web-search` | — |
| **summarize** | Summarize text content, web pages, and long-form articles | `web-search` | — |

### Developer Tools

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **github** | Manage GitHub repositories, issues, pull requests, releases, and Actions workflows | — | `GITHUB_TOKEN` |
| **coding-agent** | Write, review, debug, refactor, and explain code across multiple languages | `filesystem` | — |
| **git** | Work with Git repositories — inspect history, create branches, commit changes | — | — |

### Communication

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **slack-helper** | Manage Slack workspaces, channels, messages, and integrations | — | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN` |
| **discord-helper** | Manage Discord servers, channels, roles, and messages | — | `DISCORD_BOT_TOKEN` |

### Productivity

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **notion** | Read, create, and manage pages, databases, and content blocks in Notion | — | `NOTION_API_KEY` |
| **obsidian** | Read, create, and manage notes, links, and metadata in Obsidian vaults | `filesystem` | — |
| **trello** | Manage Trello boards, lists, cards, checklists, and team workflows | — | `TRELLO_API_KEY`, `TRELLO_TOKEN` |
| **apple-notes** | Create, read, search, and manage notes in Apple Notes (macOS only) | `filesystem` | — |
| **apple-reminders** | Create, manage, and query reminders in Apple Reminders (macOS only) | `filesystem` | — |

### DevOps

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **healthcheck** | Monitor health and availability of systems, services, APIs, and endpoints | `web-search` | — |

### Media

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **spotify-player** | Control Spotify playback, manage playlists, search music | — | `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` |
| **whisper-transcribe** | Transcribe audio and video files to text using OpenAI Whisper | `filesystem` | `OPENAI_API_KEY` |

### Security

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **1password** | Query and retrieve items from 1Password vaults using the 1Password CLI | — | — |

### Creative

| Skill | Description | Required Tools | Required Secrets |
|-------|-------------|----------------|------------------|
| **image-gen** | Generate images from text prompts using DALL-E, Stable Diffusion, or Midjourney | — | `OPENAI_API_KEY` |

:::tip
Enable a skill via the CLI with `wunderland skills enable <name>`, or programmatically via the SDK. See [Enabling a Skill](#enabling-a-skill-in-your-agent) below.
:::

## What Are Skills?

A skill is a directory containing a `SKILL.md` file. The file has two parts:

1. **YAML frontmatter** -- Metadata, requirements, and installation specs.
2. **Markdown body** -- Instructions and documentation that get injected into the agent's system prompt.

Skills can represent anything from tool usage guides to platform-specific workflows.

## SKILL.md Format

```markdown
---
name: github
description: Interact with GitHub repositories and issues
metadata:
  openclaw:
    emoji: "\U0001F419"
    primaryEnv: GITHUB_TOKEN
    os: ["darwin", "linux"]
    requires:
      bins: ["gh"]
    install:
      - id: brew
        kind: brew
        formula: gh
        bins: ["gh"]
        label: "Install GitHub CLI (brew)"
      - id: apt
        kind: apt
        package: gh
        bins: ["gh"]
        os: ["linux"]
---

# GitHub Integration

Use the `gh` CLI to interact with GitHub.

## Available Commands

- `gh issue list` -- List open issues
- `gh pr create` -- Create a pull request
- `gh repo clone` -- Clone a repository

## Authentication

Run `gh auth login` to authenticate with your GitHub account.
```

### Frontmatter Fields

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Skill name (defaults to directory name) |
| `description` | `string` | Short description (defaults to first paragraph) |
| `metadata.openclaw.emoji` | `string` | Display emoji |
| `metadata.openclaw.primaryEnv` | `string` | Primary environment variable |
| `metadata.openclaw.os` | `string[]` | Platform restriction (darwin, linux, win32) |
| `metadata.openclaw.requires.bins` | `string[]` | All of these binaries must exist |
| `metadata.openclaw.requires.anyBins` | `string[]` | At least one of these must exist |
| `metadata.openclaw.requires.env` | `string[]` | Required environment variables |
| `metadata.openclaw.install` | `SkillInstallSpec[]` | Installation instructions |
| `metadata.openclaw.always` | `boolean` | Always include this skill |
| `metadata.openclaw.skillKey` | `string` | Override the skill key |
| `metadata.openclaw.homepage` | `string` | Homepage URL |

### Install Spec

Each entry in the `install` array describes one way to install a skill's dependencies.

```typescript
interface SkillInstallSpec {
  id?: string;                  // Unique identifier
  kind: 'brew' | 'apt' | 'node' | 'go' | 'uv' | 'download';
  label?: string;               // Human-readable label
  bins?: string[];              // Expected binaries after install
  os?: readonly string[];       // Platform restriction
  formula?: string;             // Homebrew formula (brew)
  package?: string;             // Apt package name (apt)
  module?: string;              // npm/pnpm/yarn package (node)
  url?: string;                 // Download URL (download)
  archive?: string;             // Archive filename (download)
  extract?: boolean;            // Extract archive (download)
  stripComponents?: number;     // Strip path components (download)
  targetDir?: string;           // Target directory (download)
}
```

## SkillLoader

The `SkillLoader` module handles parsing SKILL.md files and loading skills from directories.

### parseSkillFrontmatter()

Parses YAML frontmatter from raw SKILL.md content. Uses a built-in simple YAML parser for basic `key: value` pairs and inline JSON objects.

```typescript
import { parseSkillFrontmatter } from 'wunderland/skills';

const content = `---
name: my-skill
description: A custom skill
---

# My Skill

Instructions for the agent...
`;

const { frontmatter, body } = parseSkillFrontmatter(content);
console.log(frontmatter.name);  // 'my-skill'
console.log(body);              // '# My Skill\n\nInstructions for the agent...'
```

### loadSkillFromDir()

Loads a single skill from a directory containing a `SKILL.md` file.

```typescript
import { loadSkillFromDir } from 'wunderland/skills';

const entry = await loadSkillFromDir('/path/to/skills/github');
if (entry) {
  console.log(entry.skill.name);         // 'github'
  console.log(entry.skill.description);  // From frontmatter or first paragraph
  console.log(entry.metadata?.emoji);    // From metadata
  console.log(entry.sourcePath);         // '/path/to/skills/github'
}
```

Returns `null` if the directory does not contain a valid `SKILL.md`.

### loadSkillsFromDir()

Scans a parent directory for subdirectories containing skills.

```typescript
import { loadSkillsFromDir } from 'wunderland/skills';

const entries = await loadSkillsFromDir('/path/to/skills');
console.log(`Loaded ${entries.length} skills`);
```

Skips directories that start with `.` and silently handles missing or inaccessible directories.

## SkillRegistry

The `SkillRegistry` is the runtime container for managing loaded skills. It provides registration, querying, filtering, and snapshot generation.

### Initialization

```typescript
import { SkillRegistry } from 'wunderland/skills';

// Basic registry
const registry = new SkillRegistry();

// Registry with config (disable specific skills)
const configuredRegistry = new SkillRegistry({
  entries: {
    'deprecated-skill': { enabled: false },
  },
});
```

### Loading Skills

```typescript
// Load from multiple directories
const count = await registry.loadFromDirs([
  '/workspace/skills',
  '/bundled/skills',
]);
console.log(`Loaded ${count} skills`);

// Reload from configured directories
await registry.reload({
  workspaceDir: '/workspace/skills',
  bundledSkillsDir: '/bundled/skills',
  extraDirs: ['/additional/skills'],
});
```

### Registration

```typescript
import { loadSkillFromDir } from 'wunderland/skills';

// Manual registration
const entry = await loadSkillFromDir('/path/to/my-skill');
if (entry) {
  const registered = registry.register(entry);
  // false if skill already exists or is disabled in config
}

// Unregister
registry.unregister('my-skill');

// Clear all
registry.clear();
```

### Querying

```typescript
// Get by name
const skill = registry.getByName('github');

// List all
const all = registry.listAll();

// Check existence
if (registry.has('github')) { /* ... */ }

// Count
console.log(`${registry.size} skills registered`);
```

## Platform-Aware Filtering

### filterByPlatform()

Filters skills by the current operating system. Skills without an `os` restriction pass through.

```typescript
// As a standalone function
import { filterByPlatform } from 'wunderland/skills';

const macSkills = filterByPlatform(allEntries, 'darwin');
const linuxSkills = filterByPlatform(allEntries, 'linux');

// Via registry
const platformSkills = registry.filterByPlatform('darwin');
```

Platform normalization is applied:
- `darwin`, `macos`, `mac` are all normalized to `darwin`
- `win32`, `windows` are normalized to `win32`
- `linux` stays as `linux`

### filterByEligibility()

Filters skills by a full eligibility context that checks binaries, environment variables, and platforms.

```typescript
import { filterByEligibility } from 'wunderland/skills';
import { commandExistsSync } from 'command-exists';

const eligible = filterByEligibility(allEntries, {
  platforms: ['darwin'],
  hasBin: (bin) => commandExistsSync(bin),
  hasAnyBin: (bins) => bins.some((b) => commandExistsSync(b)),
  hasEnv: (envVar) => !!process.env[envVar],
});

// Via registry
const eligibleViaRegistry = registry.filterByEligibility({
  platforms: ['darwin'],
  hasBin: (bin) => commandExistsSync(bin),
  hasAnyBin: (bins) => bins.some((b) => commandExistsSync(b)),
});
```

### Invocability Filters

```typescript
// Skills that users can invoke via slash commands
const userSkills = registry.getUserInvocableSkills();

// Skills the LLM model can invoke autonomously
const modelSkills = registry.getModelInvocableSkills();
```

### Requirement Checking

```typescript
import { commandExistsSync } from 'command-exists';

// Check all skills
const allReqs = registry.checkAllRequirements(
  (bin) => commandExistsSync(bin)
);
// Map<string, { met: boolean; missing: string[] }>

// Get only skills with missing requirements
const missing = registry.getSkillsWithMissingRequirements(
  (bin) => commandExistsSync(bin)
);
// [{ skill: 'github', missing: ['gh'] }, ...]
```

## Snapshots for Agent Context

Snapshots compile the currently available skills into a formatted prompt string that can be injected into an agent's system prompt.

```typescript
const snapshot = registry.buildSnapshot({
  platform: 'darwin',
  eligibility: {
    platforms: ['darwin'],
    hasBin: (bin) => commandExistsSync(bin),
    hasAnyBin: (bins) => bins.some((b) => commandExistsSync(b)),
  },
  filter: ['github', 'docker'],  // Optional: only include specific skills
});

// The formatted prompt for the LLM
console.log(snapshot.prompt);
// Output:
// # Available Skills
//
// ## github
// Interact with GitHub repositories and issues
// [full SKILL.md body content]
//
// ---
//
// ## docker
// Manage Docker containers and images
// [full SKILL.md body content]

// Skill metadata
console.log(snapshot.skills);
// [{ name: 'github', primaryEnv: 'GITHUB_TOKEN' }, ...]

// Full resolved skill objects
console.log(snapshot.resolvedSkills);

// Version for cache invalidation
console.log(snapshot.version);

// Timestamp
console.log(snapshot.createdAt);
```

### Command Specs

Build slash-command specifications from skills for user-facing interfaces.

```typescript
const specs = registry.buildCommandSpecs({
  platform: 'darwin',
  reservedNames: new Set(['help', 'clear']),
});

for (const spec of specs) {
  console.log(`/${spec.name} -- ${spec.description}`);
  // /github -- Interact with GitHub repositories and issues
}
```

Command names are sanitized (lowercased, non-alphanumeric replaced with hyphens, max 32 chars) and deduplicated automatically.

## Complete Example: Creating a Skill

### 1. Create the directory structure

```
my-workspace/
  skills/
    web-scraper/
      SKILL.md
```

### 2. Write the SKILL.md

```markdown
---
name: web-scraper
description: Scrape and extract content from web pages
metadata:
  openclaw:
    emoji: "\U0001F578"
    requires:
      bins: ["node"]
    install:
      - id: node
        kind: node
        module: cheerio
        bins: ["node"]
---

# Web Scraper

You can scrape web pages using the browser automation tools.

## Guidelines

1. Always respect robots.txt
2. Rate-limit requests to 1 per second
3. Extract only the relevant content

## Output Format

Return scraped data as structured JSON:

\`\`\`json
{
  "title": "Page Title",
  "content": "Main content text",
  "links": ["https://..."]
}
\`\`\`
```

### 3. Load and use the skill

```typescript
import { SkillRegistry } from 'wunderland/skills';

const registry = new SkillRegistry();
await registry.loadFromDirs(['/my-workspace/skills']);

const snapshot = registry.buildSnapshot({ platform: process.platform });

// Inject snapshot.prompt into your agent's system message
const systemPrompt = `You are an autonomous agent.\n\n${snapshot.prompt}`;
```

## Types Reference

### SkillEntry

```typescript
interface SkillEntry {
  skill: Skill;                        // Core skill data (name, description, content)
  frontmatter: ParsedSkillFrontmatter; // Raw frontmatter values
  metadata?: SkillMetadata;            // Parsed metadata
  invocation?: SkillInvocationPolicy;  // Invocation rules
  sourcePath?: string;                 // Directory path
}
```

### SkillSnapshot

```typescript
interface SkillSnapshot {
  prompt: string;                                  // Formatted LLM prompt
  skills: Array<{ name: string; primaryEnv?: string }>;
  resolvedSkills?: Skill[];
  version?: number;                                // Cache invalidation
  createdAt: Date;
}
```

### SkillEligibilityContext

```typescript
interface SkillEligibilityContext {
  platforms: string[];
  hasBin: (bin: string) => boolean;
  hasAnyBin: (bins: string[]) => boolean;
  hasEnv?: (envVar: string) => boolean;
}
```

## Finding Skills

Use the catalog helpers from `@framers/agentos-skills-registry/catalog` to browse, search, and filter available skills.

### Browse by category

```typescript
import { getCategories, getSkillsByCategory } from '@framers/agentos-skills-registry/catalog';

// List all categories
const categories = getCategories();
// ['communication', 'creative', 'developer-tools', 'devops', 'information', 'media', 'productivity', 'security']

// Get skills in a specific category
const productivitySkills = getSkillsByCategory('productivity');
```

### Search by keyword

```typescript
import { searchSkills } from '@framers/agentos-skills-registry/catalog';

const results = searchSkills('docker');
// Matches against name, description, and tags
```

### Check tool requirements

```typescript
import { getAvailableSkills } from '@framers/agentos-skills-registry/catalog';

// Only return skills whose required tools are present
const available = getAvailableSkills(['web-search', 'filesystem', 'gh']);
```

### Filter by tag

```typescript
import { getSkillsByTag } from '@framers/agentos-skills-registry/catalog';

const automationSkills = getSkillsByTag('automation');
```

## Enabling a Skill in Your Agent

Follow these steps to add skills to your agent's system prompt:

### 1. Install the packages

```bash
npm install @framers/agentos-skills-registry @framers/agentos
```

### 2. Import the catalog and select skills

```typescript
import { SKILLS_CATALOG, getSkillsByCategory } from '@framers/agentos-skills-registry/catalog';
import { createCuratedSkillSnapshot } from '@framers/agentos-skills-registry';

// Option A: Pick specific skills by name
const snapshot = await createCuratedSkillSnapshot({
  skills: ['github', 'weather', 'notion'],
  platform: 'darwin',
});

// Option B: Include all skills for the current platform
const fullSnapshot = await createCuratedSkillSnapshot({
  skills: 'all',
  platform: process.platform,
});
```

### 3. Inject the snapshot into the system prompt

```typescript
const systemPrompt = `You are a helpful assistant.\n\n${snapshot.prompt}`;
```

The `snapshot.prompt` string contains formatted markdown with each skill's instructions, ready for LLM consumption.

## Community vs Curated Skills

Skills are organized into two tiers, both shipped in the same NPM package:

| Tier | Source | Maintained By | Verified |
|------|--------|---------------|:--------:|
| **Curated** | `registry/curated/` | AgentOS core team | Yes |
| **Community** | `registry/community/` | External contributors | No |

- **Curated** skills carry the `source: 'curated'` field. They are maintained by staff, tested in CI, and guaranteed to follow the latest SKILL.md schema.
- **Community** skills carry the `source: 'community'` field. They are submitted via pull request and reviewed before merge, but are not staff-maintained after acceptance.

You can filter by source at runtime:

```typescript
import { getCuratedSkills, getCommunitySkills } from '@framers/agentos-skills-registry/catalog';

const curated = getCuratedSkills();
const community = getCommunitySkills();
```

## Publishing a New Skill

To contribute a skill to the catalog:

1. **Fork** the [`agentos-skills`](https://github.com/framersai/agentos-skills) repository.
2. **Create** a new directory under `registry/community/<your-skill>/` containing a `SKILL.md` file with valid YAML frontmatter and markdown instructions.
3. **Validate** your skill locally by running the registry build and ensuring it appears in `registry.json`.
4. **Open a PR** against the `main` branch. The CI pipeline will validate your SKILL.md format automatically.

See the full [`CONTRIBUTING.md`](https://github.com/framersai/agentos-skills/blob/main/CONTRIBUTING.md) for the SKILL.md format spec, naming conventions, and review criteria.
