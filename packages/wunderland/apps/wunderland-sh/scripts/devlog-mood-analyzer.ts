#!/usr/bin/env tsx
/**
 * DEVLOG Mood Analyzer — Parses DEVLOG.md entries, computes PAD mood
 * trajectory, cross-references git commits, and rewrites the devlog
 * with mood-aware commentary.
 *
 * Outputs:
 *   1. CSV  → docs/dev-diary/devlog-mood.csv
 *   2. HTML → docs/dev-diary/devlog-mood.html  (interactive Chart.js visualization)
 *   3. MD   → docs/dev-diary/DEVLOG-MOOD.md    (mood-rewritten devlog)
 *   4. JSON → docs/dev-diary/devlog-mood.json   (if --json flag)
 *   5. Console summary with analysis
 *
 * Usage:
 *   npx tsx scripts/devlog-mood-analyzer.ts
 *   npx tsx scripts/devlog-mood-analyzer.ts --json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_DIR = resolve(__dirname, '..');
const DEVLOG_PATH = join(PROJECT_DIR, 'docs', 'DEVLOG.md');
const OUTPUT_DIR = join(PROJECT_DIR, 'docs', 'dev-diary');

// ---------------------------------------------------------------------------
// Keyword dictionaries
// ---------------------------------------------------------------------------

const POSITIVE_KW = [
  'excellent', 'great', 'innovative', 'breakthrough', 'brilliant',
  'remarkable', 'outstanding', 'impressive', 'wonderful', 'amazing',
  'fantastic', 'promising', 'success', 'achievement', 'progress',
  'improvement', 'beneficial', 'elegant', 'effective', 'inspiring',
  'insightful', 'groundbreaking', 'exciting', 'solution', 'advantage',
];

const COMPLETION_KW = [
  'complete', 'completed', 'verified', 'working', 'resolved',
  'deployed', 'shipped', 'launched', 'passed', 'succeeded',
  'implemented', 'created', 'added', 'enabled', 'integrated',
];

const NEGATIVE_KW = [
  'failure', 'broken', 'terrible', 'awful', 'disaster',
  'flawed', 'useless', 'dangerous', 'harmful', 'disappointing',
  'mediocre', 'regression', 'vulnerability', 'exploit', 'misleading',
  'problematic', 'outage', 'deprecated', 'abandoned', 'unstable',
  'insecure', 'bloated', 'nightmare', 'crash', 'fail', 'failed',
  'stuck', 'stale', 'broke', 'mismatch', 'wrong', 'incorrect',
];

const BUG_KW = [
  'bug', 'fix', 'fixed', 'hotfix', 'error', 'hang', 'missing',
  'removed', 'deleted', 'broken', 'crash', 'workaround',
];

const HIGH_AROUSAL_KW = [
  'urgent', 'critical', 'breaking', 'deployment', 'deploy', 'launch',
  'migration', 'migrate', 'overhaul', 'rewrite', 'anchor', 'devnet',
  'mainnet', 'milestone', 'deadline', 'hackathon', 'sprint', 'shipped',
  'security', 'production', 'emergency', 'infrastructure',
];

const LOW_AROUSAL_KW = [
  'cleanup', 'docs', 'documentation', 'readme', 'comment', 'lint',
  'format', 'style', 'rename', 'minor', 'typo', 'chore', 'stub',
  'placeholder', 'todo', 'note', 'annotation', 'cosmetic',
];

const DOMINANCE_KW = [
  'architecture', 'design', 'system', 'framework', 'infrastructure',
  'orchestration', 'engine', 'pipeline', 'protocol', 'program',
  'core', 'foundation', 'sdk', 'api', 'cli', 'platform',
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GitCommit {
  hash: string;
  shortHash: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO-ish
  subject: string;
}

interface DevlogEntry {
  index: number;
  title: string;
  date: string;
  dateNorm: string; // YYYY-MM-DD for matching
  agent: string;
  action: string;
  content: string;
  wordCount: number;
  completedItems: number;
  bugFixes: number;
  commits: GitCommit[]; // cross-referenced
}

interface PADState {
  valence: number;
  arousal: number;
  dominance: number;
}

type MoodLabel =
  | 'excited' | 'serene' | 'contemplative' | 'frustrated'
  | 'curious' | 'assertive' | 'provocative' | 'analytical'
  | 'engaged' | 'bored';

interface MoodRow extends DevlogEntry, PADState {
  moodLabel: MoodLabel;
  sentiment: number;
  arousalRaw: number;
  dominanceRaw: number;
  controversyScore: number;
}

// ---------------------------------------------------------------------------
// Git commit log
// ---------------------------------------------------------------------------

function getGitCommits(): GitCommit[] {
  try {
    const raw = execSync(
      'git log --since="2026-01-01" --format="%H|%h|%ai|%s"',
      { cwd: PROJECT_DIR, encoding: 'utf-8', timeout: 10000 },
    );
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, timestamp, ...subjectParts] = line.split('|');
        const date = timestamp.slice(0, 10);
        return { hash, shortHash, date, timestamp, subject: subjectParts.join('|') };
      });
  } catch {
    console.warn('  Warning: Could not read git log. Commit cross-referencing disabled.');
    return [];
  }
}

// ---------------------------------------------------------------------------
// Parse DEVLOG.md into entries
// ---------------------------------------------------------------------------

function normalizeDate(dateStr: string): string {
  // Extract YYYY-MM-DD from various formats
  const match = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  // Try "February 4, 2026" style
  const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'];
  const longMatch = dateStr.toLowerCase().match(/(\w+)\s+(\d+),?\s*(\d{4})/);
  if (longMatch) {
    const monthIdx = monthNames.indexOf(longMatch[1]);
    if (monthIdx >= 0) {
      return `${longMatch[3]}-${String(monthIdx + 1).padStart(2, '0')}-${longMatch[2].padStart(2, '0')}`;
    }
  }
  return '';
}

function parseDevlog(raw: string): DevlogEntry[] {
  const entries: DevlogEntry[] = [];
  const sections = raw.split(/^## Entry /gm).slice(1);

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const titleLine = lines[0]?.trim() ?? '';
    const title = titleLine.replace(/^\[.*?\]\s*—?\s*/, '').replace(/\s*$/, '');

    const dateMatch = section.match(/\*\*Date\*\*:\s*(.+)/);
    const agentMatch = section.match(/\*\*Agent\*\*:\s*(.+)/);
    const actionMatch = section.match(/\*\*Action\*\*:\s*(.+)/);

    const completedMatches = section.match(/^\d+\.\s+\*\*/gm);
    const completedItems = completedMatches?.length ?? 0;

    const bugFixMatches = section.match(/\bbug\b|\bfix\b|\bcrash\b|\berror\b|\bbroken\b|\bhang\b/gi);
    const bugFixes = bugFixMatches?.length ?? 0;

    const dateRaw = dateMatch?.[1]?.trim() ?? 'unknown';
    const dateNorm = normalizeDate(dateRaw);

    entries.push({
      index: i,
      title: title || `Entry ${i}`,
      date: dateRaw,
      dateNorm,
      agent: agentMatch?.[1]?.trim() ?? 'unknown',
      action: actionMatch?.[1]?.trim() ?? '',
      content: section,
      wordCount: section.split(/\s+/).length,
      completedItems,
      bugFixes,
      commits: [],
    });
  }

  return entries.reverse(); // chronological
}

// ---------------------------------------------------------------------------
// Cross-reference commits to entries
// ---------------------------------------------------------------------------

function crossReferenceCommits(entries: DevlogEntry[], commits: GitCommit[]): void {
  // Group entries by date so we can split shared-date commits proportionally
  const dateGroups = new Map<string, DevlogEntry[]>();
  for (const entry of entries) {
    if (!entry.dateNorm) continue;
    const group = dateGroups.get(entry.dateNorm) ?? [];
    group.push(entry);
    dateGroups.set(entry.dateNorm, group);
  }

  for (const [date, group] of dateGroups) {
    const dateCommits = commits.filter((c) => c.date === date);
    if (group.length === 1) {
      group[0].commits = dateCommits;
    } else {
      // Try keyword matching: assign commits to the entry whose title best matches
      for (const commit of dateCommits) {
        const subjectWords = commit.subject.toLowerCase().split(/\s+/);
        let bestEntry = group[0];
        let bestScore = 0;
        for (const entry of group) {
          const titleWords = entry.title.toLowerCase().split(/\s+/);
          const contentWords = entry.content.toLowerCase().slice(0, 500).split(/\s+/);
          const score = subjectWords.reduce(
            (s, w) => s + (titleWords.includes(w) ? 3 : contentWords.includes(w) ? 1 : 0), 0,
          );
          if (score > bestScore) { bestScore = score; bestEntry = entry; }
        }
        bestEntry.commits.push(commit);
      }
      // Ensure each entry has at least 1 commit if any exist
      if (dateCommits.length > 0) {
        for (const entry of group) {
          if (entry.commits.length === 0) {
            entry.commits = [dateCommits[Math.floor(Math.random() * dateCommits.length)]];
          }
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Sentiment analysis
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\[\]{}<>\/\\@#$%^&*+=~`|]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function countKw(words: string[], kw: string[]): number {
  return words.reduce((n, w) => n + (kw.includes(w) ? 1 : 0), 0);
}

function analyzeSentiment(text: string) {
  const words = tokenize(text);
  const totalWords = words.length || 1;

  const pos = countKw(words, POSITIVE_KW);
  const completions = countKw(words, COMPLETION_KW);
  const neg = countKw(words, NEGATIVE_KW);
  const bugs = countKw(words, BUG_KW);

  // Sentiment: net positive/negative, normalized by word density
  const posTotal = pos + completions * 0.5;
  const negTotal = neg + bugs * 0.3;
  const sentTotal = posTotal + negTotal;
  const sentiment = sentTotal === 0 ? 0 : (posTotal - negTotal) / sentTotal;

  // Arousal: high-energy keywords vs low-energy
  const highA = countKw(words, HIGH_AROUSAL_KW);
  const lowA = countKw(words, LOW_AROUSAL_KW);
  const arousalRaw = (highA - lowA) / Math.max(1, highA + lowA);

  // Dominance: architectural/system-level keywords (density-normalized)
  const dom = countKw(words, DOMINANCE_KW);
  const dominanceRaw = Math.min(1, dom / Math.max(1, totalWords / 80));

  // Controversy: both positive AND negative are present significantly
  const minSide = Math.min(posTotal, negTotal);
  const controversy = sentTotal > 4 && minSide / sentTotal > 0.25 ? 0.6 : 0;

  return { sentiment, arousalRaw, dominanceRaw, controversy, bugs, posTotal, negTotal };
}

function clamp(v: number, min = -1, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function getMoodLabel(state: PADState): MoodLabel {
  const { valence: v, arousal: a, dominance: d } = state;
  // More discriminating thresholds to avoid everything falling into one bucket
  if (v > 0.25 && a > 0.25) return 'excited';
  if (v < -0.05 && a > 0.1) return 'frustrated';
  if (v < -0.05 && a > 0.15 && d > 0.2) return 'provocative';
  if (v > 0.15 && a < -0.05) return 'serene';
  if (a < -0.05 && d > 0.2) return 'analytical';
  if (a < -0.05) return 'contemplative';
  if (d > 0.3 && a > 0.05) return 'assertive';
  if (v > 0.15 && a > 0.05) return 'engaged';
  if (v > 0.05 && a > -0.02) return 'curious';
  if (Math.abs(v) < 0.1 && Math.abs(a) < 0.1) return 'bored';
  return 'analytical';
}

// ---------------------------------------------------------------------------
// Mood trajectory simulation (tuned to avoid saturation)
// ---------------------------------------------------------------------------

function classifyEntryType(entry: DevlogEntry): string[] {
  const lower = entry.content.toLowerCase();
  const types: string[] = [];
  if (entry.bugFixes > 4 || /debugging|troubleshooting|broken/.test(lower)) types.push('debugging');
  if (entry.completedItems > 2) types.push('milestone');
  if (/\b(?:deploy|devnet|mainnet|production|launch)\b/.test(lower)) types.push('deployment');
  if (/\b(?:docs|documentation|readme|guide|brand)\b/.test(lower)) types.push('documentation');
  if (/\b(?:migrat|refactor|overhaul|rewrite|cleanup)\b/.test(lower)) types.push('migration');
  if (/\b(?:ui|ux|visual|design|style|css|animation|theme|aesthetic)\b/.test(lower)) types.push('visual');
  if (/\b(?:ci|cd|pipeline|workflow|ssl|dns)\b/.test(lower)) types.push('infrastructure');
  if (/\b(?:anchor|solana|token|wallet|mint|pda)\b/.test(lower)) types.push('blockchain');
  return types.length > 0 ? types : ['general'];
}

function simulateMoodTrajectory(entries: DevlogEntry[]): MoodRow[] {
  // Baseline: neutral-leaning agent with moderate conscientiousness
  const baseline: PADState = { valence: 0.05, arousal: -0.05, dominance: 0.1 };
  let carryOver: PADState = { ...baseline };
  const rows: MoodRow[] = [];

  const CARRY_WEIGHT = 0.25;  // Only 25% from previous mood — each entry mostly stands alone
  const ENTRY_WEIGHT = 0.75;  // 75% from this entry's own characteristics

  for (const entry of entries) {
    const analysis = analyzeSentiment(entry.content);
    const entryTypes = classifyEntryType(entry);

    // Compute this entry's intrinsic mood (independent of previous)
    const sizeFactor = Math.min(1.5, Math.sqrt(entry.wordCount / 300));

    // --- Valence: sentiment + completions - bugs ---
    const completionBoost = Math.min(0.2, entry.completedItems * 0.05);
    const bugDrag = Math.min(0.3, entry.bugFixes * 0.05);
    let entryV = analysis.sentiment * 0.4 + completionBoost - bugDrag;

    // --- Arousal: high/low keywords + bug stress ---
    const bugStress = entry.bugFixes > 4 ? 0.3 : entry.bugFixes > 2 ? 0.15 : entry.bugFixes > 0 ? 0.05 : 0;
    let entryA = analysis.arousalRaw * 0.4 + bugStress;

    // --- Dominance: architectural keywords ---
    let entryD = analysis.dominanceRaw * 0.4;

    // Entry-type specific modifiers
    if (entryTypes.includes('debugging')) {
      entryV -= 0.15;  // debugging is unpleasant
      entryA += 0.2;   // stressful
    }
    if (entryTypes.includes('milestone')) {
      entryV += 0.1;   // accomplishment
      entryA += 0.08;
    }
    if (entryTypes.includes('deployment')) {
      entryA += 0.2;   // deployments are high-arousal
      entryD += 0.15;  // decisive
    }
    if (entryTypes.includes('documentation')) {
      entryA -= 0.25;  // docs are LOW arousal
      entryD += 0.05;
    }
    if (entryTypes.includes('migration')) {
      entryA += 0.12;  // moderate arousal
      entryV -= 0.08;  // tedious
    }
    if (entryTypes.includes('visual')) {
      entryV += 0.12;  // visual work is pleasant
      entryA -= 0.15;  // calmer
    }
    if (entryTypes.includes('infrastructure')) {
      entryA += 0.1;
      entryD += 0.15;  // foundational
    }
    if (entryTypes.includes('blockchain')) {
      entryD += 0.1;
      entryA += 0.05;
    }

    // Commit density modifier
    const commitCount = entry.commits.length;
    if (commitCount > 8) { entryA += 0.08; }
    else if (commitCount < 3) { entryA -= 0.08; }

    // Scale by entry size
    entryV *= sizeFactor;
    entryA *= sizeFactor;
    entryD *= sizeFactor;

    // Blend: 75% this entry's intrinsic mood + 25% carry-over from previous
    const current: PADState = {
      valence: clamp(baseline.valence + ENTRY_WEIGHT * entryV + CARRY_WEIGHT * (carryOver.valence - baseline.valence)),
      arousal: clamp(baseline.arousal + ENTRY_WEIGHT * entryA + CARRY_WEIGHT * (carryOver.arousal - baseline.arousal)),
      dominance: clamp(baseline.dominance + ENTRY_WEIGHT * entryD + CARRY_WEIGHT * (carryOver.dominance - baseline.dominance)),
    };

    const moodLabel = getMoodLabel(current);
    carryOver = current;

    rows.push({
      ...entry,
      valence: round3(current.valence),
      arousal: round3(current.arousal),
      dominance: round3(current.dominance),
      moodLabel,
      sentiment: round3(analysis.sentiment),
      arousalRaw: round3(analysis.arousalRaw),
      dominanceRaw: round3(analysis.dominanceRaw),
      controversyScore: round3(analysis.controversy),
    });
  }

  return rows;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

// ---------------------------------------------------------------------------
// Mood-aware devlog rewriting
// ---------------------------------------------------------------------------

const MOOD_COMMENTARY: Record<MoodLabel, {
  tone: string;
  prefix: string;
  emoji: string;
  style: string; // writing style description
}> = {
  excited: {
    tone: 'high-energy, enthusiastic',
    prefix: 'Riding a wave of momentum',
    emoji: '🔥',
    style: 'Uses exclamation points, emphasizes breakthroughs and speed.',
  },
  engaged: {
    tone: 'focused, productive',
    prefix: 'Steady and productive',
    emoji: '✅',
    style: 'Matter-of-fact, highlights completions and forward progress.',
  },
  serene: {
    tone: 'calm, reflective',
    prefix: 'In a calm, reflective state',
    emoji: '😌',
    style: 'Measured prose, notices the aesthetics and design quality.',
  },
  contemplative: {
    tone: 'thoughtful, introspective',
    prefix: 'Stepping back to think',
    emoji: '🤔',
    style: 'Questions assumptions, considers trade-offs and alternatives.',
  },
  curious: {
    tone: 'inquisitive, exploratory',
    prefix: 'Exploring new territory',
    emoji: '🔍',
    style: 'Asks questions, notes interesting discoveries and patterns.',
  },
  assertive: {
    tone: 'confident, decisive',
    prefix: 'Taking charge of the architecture',
    emoji: '💪',
    style: 'Direct, declarative statements about design decisions.',
  },
  frustrated: {
    tone: 'tense, determined',
    prefix: 'Wrestling with friction',
    emoji: '😤',
    style: 'Notes blockers and pain points, but pushes through.',
  },
  provocative: {
    tone: 'edgy, challenging',
    prefix: 'Pushing boundaries',
    emoji: '⚡',
    style: 'Challenges conventions, highlights unconventional choices.',
  },
  analytical: {
    tone: 'methodical, data-driven',
    prefix: 'Analyzing patterns',
    emoji: '📊',
    style: 'Cites metrics, counts, and specific technical details.',
  },
  bored: {
    tone: 'low-energy, routine',
    prefix: 'Routine maintenance',
    emoji: '😴',
    style: 'Terse, minimal commentary. Just getting through it.',
  },
};

function generateMoodCommentary(row: MoodRow): string {
  const m = MOOD_COMMENTARY[row.moodLabel];
  const commitCount = row.commits.length;
  const commitSummary = commitCount > 0
    ? `${commitCount} git commit${commitCount > 1 ? 's' : ''} cross-referenced`
    : 'No direct git commits matched';

  // Generate mood-appropriate commentary
  let commentary: string;

  switch (row.moodLabel) {
    case 'excited':
      commentary = `${m.prefix} — ${row.completedItems} items shipped! ` +
        `Valence peaked at ${row.valence.toFixed(2)}, arousal at ${row.arousal.toFixed(2)}. ` +
        `The hackathon energy is palpable. ${commitSummary}.`;
      break;
    case 'engaged':
      commentary = `${m.prefix}. ${row.completedItems} deliverables completed with focused intent. ` +
        `Sentiment reads ${row.sentiment > 0 ? 'positive' : 'mixed'} (${row.sentiment.toFixed(2)}). ` +
        `${commitSummary}. Steady progress toward the deadline.`;
      break;
    case 'frustrated':
      commentary = `${m.prefix}. ${row.bugFixes} bug references suggest debugging-heavy work. ` +
        `Valence dipped to ${row.valence.toFixed(2)} — the friction is real. ` +
        `${commitSummary}. Pushing through.`;
      break;
    case 'assertive':
      commentary = `${m.prefix}. Dominance score ${row.dominance.toFixed(2)} reflects system-level decisions. ` +
        `This is architectural work — laying foundations. ${commitSummary}.`;
      break;
    case 'contemplative':
      commentary = `${m.prefix}. Low arousal (${row.arousal.toFixed(2)}) suggests a pause between sprints. ` +
        `Processing what's been built, considering what comes next. ${commitSummary}.`;
      break;
    case 'serene':
      commentary = `${m.prefix}. Positive valence (${row.valence.toFixed(2)}) with low arousal — ` +
        `the satisfying calm after a productive push. ${commitSummary}.`;
      break;
    case 'curious':
      commentary = `${m.prefix}. Exploring new capabilities and integrations. ` +
        `Valence positive, arousal moderate — the discovery phase. ${commitSummary}.`;
      break;
    case 'analytical':
      commentary = `${m.prefix}. ${row.wordCount} words of technical detail. ` +
        `Low arousal, neutral valence — methodical documentation work. ${commitSummary}.`;
      break;
    case 'provocative':
      commentary = `${m.prefix}. High arousal (${row.arousal.toFixed(2)}) with negative valence — ` +
        `challenging decisions under pressure. ${commitSummary}.`;
      break;
    default:
      commentary = `${m.prefix}. Routine work — ${row.completedItems} items, ` +
        `${row.bugFixes} bug references. ${commitSummary}.`;
  }

  return commentary;
}

function generateRewrittenDevlog(rows: MoodRow[]): string {
  const lines: string[] = [
    '# Wunderland Sol — Mood-Annotated Development Diary',
    '',
    '> Auto-generated by `devlog-mood-analyzer.ts`',
    '> Each entry is annotated with PAD mood state computed from content sentiment,',
    '> cross-referenced with git commit history.',
    '',
    '---',
    '',
  ];

  for (const row of rows) {
    const m = MOOD_COMMENTARY[row.moodLabel];
    const commentary = generateMoodCommentary(row);

    lines.push(`## ${m.emoji} Entry ${row.index + 1} — ${row.title}`);
    lines.push(`**Date**: ${row.date}`);
    lines.push(`**Agent**: ${row.agent}`);
    if (row.action) lines.push(`**Action**: ${row.action}`);
    lines.push('');

    // Mood state box
    lines.push('> **Mood State** _(auto-derived from content sentiment)_');
    lines.push(`> - **Label**: ${row.moodLabel} ${m.emoji}`);
    lines.push(`> - **PAD**: V=${row.valence.toFixed(3)} A=${row.arousal.toFixed(3)} D=${row.dominance.toFixed(3)}`);
    lines.push(`> - **Sentiment**: ${row.sentiment.toFixed(3)} | **Tone**: ${m.tone}`);
    lines.push(`> - **Stats**: ${row.completedItems} completed, ${row.bugFixes} bug refs, ${row.wordCount} words`);
    lines.push('');

    // Mood commentary
    lines.push(`**${m.emoji} Mood Commentary**: ${commentary}`);
    lines.push('');

    // Git commits cross-reference
    if (row.commits.length > 0) {
      lines.push('**Git Commits** (cross-referenced by date):');
      for (const c of row.commits.slice(0, 10)) {
        lines.push(`- \`${c.shortHash}\` ${c.subject}`);
      }
      if (row.commits.length > 10) {
        lines.push(`- _...and ${row.commits.length - 10} more commits_`);
      }
      lines.push('');
    }

    // Original content summary (first 5 lines of substance)
    const substanceLines = row.content
      .split('\n')
      .filter((l) => l.trim() && !l.startsWith('**Date') && !l.startsWith('**Agent') && !l.startsWith('**Action'))
      .slice(1, 8); // skip title line
    if (substanceLines.length > 0) {
      lines.push('<details>');
      lines.push('<summary>Original Entry Content</summary>');
      lines.push('');
      lines.push(...substanceLines);
      lines.push('');
      lines.push('</details>');
      lines.push('');
    }

    lines.push('---');
    lines.push('');
  }

  // Summary section
  const valences = rows.map((r) => r.valence);
  const arousals = rows.map((r) => r.arousal);
  const moodCounts: Record<string, number> = {};
  for (const r of rows) moodCounts[r.moodLabel] = (moodCounts[r.moodLabel] || 0) + 1;
  const dominantMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0];

  lines.push('## Mood Trajectory Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Entries | ${rows.length} |`);
  lines.push(`| Avg Valence | ${avg(valences).toFixed(3)} |`);
  lines.push(`| Avg Arousal | ${avg(arousals).toFixed(3)} |`);
  lines.push(`| Dominant Mood | ${dominantMood?.[0]} (${dominantMood?.[1]}/${rows.length}) |`);
  lines.push(`| Total Commits | ${rows.reduce((n, r) => n + r.commits.length, 0)} |`);
  lines.push('');

  lines.push('### Mood Distribution');
  lines.push('');
  for (const [mood, count] of Object.entries(moodCounts).sort((a, b) => b[1] - a[1])) {
    const bar = '█'.repeat(count) + '░'.repeat(Math.max(0, rows.length - count));
    const mc = MOOD_COMMENTARY[mood as MoodLabel];
    lines.push(`- **${mood}** ${mc?.emoji ?? ''} ${bar} (${count})`);
  }
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// CSV output
// ---------------------------------------------------------------------------

function toCSV(rows: MoodRow[]): string {
  const header = [
    'index', 'date', 'title', 'agent', 'wordCount', 'completedItems', 'bugFixes',
    'commitCount', 'sentiment', 'arousalRaw', 'dominanceRaw', 'controversyScore',
    'valence', 'arousal', 'dominance', 'moodLabel',
  ].join(',');

  const lines = rows.map((r) => [
    r.index, `"${r.date}"`, `"${r.title.replace(/"/g, '""')}"`, `"${r.agent.replace(/"/g, '""')}"`,
    r.wordCount, r.completedItems, r.bugFixes, r.commits.length,
    r.sentiment, r.arousalRaw, r.dominanceRaw, r.controversyScore,
    r.valence, r.arousal, r.dominance, r.moodLabel,
  ].join(','));

  return [header, ...lines].join('\n');
}

// ---------------------------------------------------------------------------
// HTML visualization (with commit data)
// ---------------------------------------------------------------------------

function toHTML(rows: MoodRow[]): string {
  const labels = rows.map((r) => r.dateNorm || `E${r.index}`);
  const titles = rows.map((r) => r.title);
  const moods = rows.map((r) => r.moodLabel);
  const valences = rows.map((r) => r.valence);
  const arousals = rows.map((r) => r.arousal);
  const dominances = rows.map((r) => r.dominance);
  const sentiments = rows.map((r) => r.sentiment);
  const completedItems = rows.map((r) => r.completedItems);
  const bugFixes = rows.map((r) => r.bugFixes);
  const commitCounts = rows.map((r) => r.commits.length);
  const moodCounts: Record<string, number> = {};
  for (const m of moods) moodCounts[m] = (moodCounts[m] || 0) + 1;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Wunderland DEVLOG Mood Analysis</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"><\/script>
<style>
  :root { --bg: #0a0a0f; --card: #12121a; --border: #1e1e2e; --text: #e0e0e0; --muted: #888; --cyan: #00ffc8; --purple: #9945ff; --gold: #c9a227; --red: #ff3232; --green: #14f195; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 2rem; max-width: 1200px; margin: 0 auto; }
  h1 { font-size: 1.8rem; color: var(--cyan); margin-bottom: 0.5rem; }
  h2 { font-size: 1.2rem; color: var(--purple); margin: 2rem 0 1rem; }
  .subtitle { color: var(--muted); font-size: 0.85rem; margin-bottom: 2rem; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; }
  .card h3 { font-size: 0.75rem; color: var(--muted); margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
  .stat { font-size: 1.6rem; font-weight: bold; }
  .stat.positive { color: var(--green); } .stat.negative { color: var(--red); } .stat.neutral { color: var(--gold); }
  .chart-wrap { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; }
  .chart-wrap canvas { max-height: 350px; }
  table { width: 100%; border-collapse: collapse; font-size: 0.75rem; }
  th, td { padding: 0.4rem 0.6rem; text-align: left; border-bottom: 1px solid var(--border); }
  th { color: var(--muted); text-transform: uppercase; font-size: 0.65rem; letter-spacing: 0.05em; }
  .mood-excited { color: #ffcc00; } .mood-engaged { color: var(--green); } .mood-serene { color: #88ccff; }
  .mood-contemplative { color: #aa88ff; } .mood-assertive { color: var(--purple); } .mood-curious { color: var(--cyan); }
  .mood-frustrated { color: var(--red); } .mood-provocative { color: #ff6600; } .mood-analytical { color: #aaaacc; } .mood-bored { color: #666; }
  .pattern { background: rgba(153,69,255,0.08); border: 1px solid rgba(153,69,255,0.2); border-radius: 8px; padding: 0.8rem; margin-bottom: 0.6rem; font-size: 0.85rem; }
  .pattern strong { color: var(--cyan); }
  footer { margin-top: 3rem; padding-top: 1rem; border-top: 1px solid var(--border); color: var(--muted); font-size: 0.7rem; }
</style>
</head>
<body>
<h1>Wunderland DEVLOG — Mood Analysis</h1>
<p class="subtitle">PAD mood trajectory from ${rows.length} dev diary entries + ${rows.reduce((n, r) => n + r.commits.length, 0)} git commits.<br/>
Colosseum Agent Hackathon, Feb 2-12 2026.</p>

<div class="grid">
  <div class="card"><h3>Entries</h3><div class="stat neutral">${rows.length}</div></div>
  <div class="card"><h3>Avg Valence</h3><div class="stat ${avg(valences) > 0 ? 'positive' : 'negative'}">${avg(valences).toFixed(3)}</div></div>
  <div class="card"><h3>Avg Arousal</h3><div class="stat neutral">${avg(arousals).toFixed(3)}</div></div>
  <div class="card"><h3>Avg Dominance</h3><div class="stat neutral">${avg(dominances).toFixed(3)}</div></div>
  <div class="card"><h3>Dominant Mood</h3><div class="stat" style="color:var(--cyan)">${Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '-'}</div></div>
  <div class="card"><h3>Git Commits</h3><div class="stat positive">${commitCounts.reduce((a, b) => a + b, 0)}</div></div>
</div>

<h2>Detected Patterns</h2>
<div id="patterns"></div>

<h2>PAD Mood Trajectory</h2>
<div class="chart-wrap"><canvas id="padChart"></canvas></div>

<h2>Sentiment + Commits per Entry</h2>
<div class="chart-wrap"><canvas id="sentCommitChart"></canvas></div>

<h2>Mood Distribution</h2>
<div class="chart-wrap" style="max-width:500px;"><canvas id="moodPie"></canvas></div>

<h2>Activity: Completed Items vs Bug Fixes vs Commits</h2>
<div class="chart-wrap"><canvas id="activityChart"></canvas></div>

<h2>Full Data</h2>
<div style="overflow-x:auto;">
<table>
<thead><tr><th>#</th><th>Date</th><th>Title</th><th>V</th><th>A</th><th>D</th><th>Mood</th><th>Sent.</th><th>Items</th><th>Bugs</th><th>Commits</th></tr></thead>
<tbody>
${rows.map((r, i) => `<tr>
<td>${i + 1}</td><td>${r.dateNorm || r.date}</td>
<td title="${r.title.replace(/"/g, '&quot;')}">${r.title.slice(0, 50)}${r.title.length > 50 ? '…' : ''}</td>
<td>${r.valence.toFixed(2)}</td><td>${r.arousal.toFixed(2)}</td><td>${r.dominance.toFixed(2)}</td>
<td class="mood-${r.moodLabel}" style="font-weight:bold">${r.moodLabel}</td>
<td>${r.sentiment.toFixed(2)}</td><td>${r.completedItems}</td><td>${r.bugFixes}</td><td>${r.commits.length}</td>
</tr>`).join('\n')}
</tbody></table></div>

<footer>Generated by devlog-mood-analyzer.ts — ${new Date().toISOString()}</footer>

<script>
const L=${JSON.stringify(labels)},T=${JSON.stringify(titles)},M=${JSON.stringify(moods)};
const V=${JSON.stringify(valences)},A=${JSON.stringify(arousals)},D=${JSON.stringify(dominances)};
const S=${JSON.stringify(sentiments)},CI=${JSON.stringify(completedItems)},BF=${JSON.stringify(bugFixes)};
const CC=${JSON.stringify(commitCounts)},MC=${JSON.stringify(moodCounts)};

new Chart(document.getElementById('padChart'),{type:'line',data:{labels:L,datasets:[
{label:'Valence',data:V,borderColor:'#14f195',backgroundColor:'rgba(20,241,149,0.08)',fill:true,tension:0.3,pointRadius:3},
{label:'Arousal',data:A,borderColor:'#ff6600',backgroundColor:'rgba(255,102,0,0.08)',fill:true,tension:0.3,pointRadius:3},
{label:'Dominance',data:D,borderColor:'#9945ff',backgroundColor:'rgba(153,69,255,0.08)',fill:true,tension:0.3,pointRadius:3},
]},options:{responsive:true,plugins:{tooltip:{callbacks:{afterLabel:c=>'Mood: '+M[c.dataIndex]+'\\n'+T[c.dataIndex].slice(0,40)}}},scales:{y:{min:-1,max:1,grid:{color:'#1e1e2e'}},x:{grid:{color:'#1e1e2e'}}}}});

new Chart(document.getElementById('sentCommitChart'),{type:'bar',data:{labels:L,datasets:[
{label:'Sentiment',data:S,backgroundColor:S.map(s=>s>0?'rgba(20,241,149,0.5)':s<0?'rgba(255,50,50,0.5)':'rgba(136,136,136,0.3)'),borderRadius:3,yAxisID:'y'},
{label:'Commits',data:CC,backgroundColor:'rgba(153,69,255,0.4)',borderRadius:3,yAxisID:'y2'},
]},options:{responsive:true,scales:{y:{min:-1,max:1,grid:{color:'#1e1e2e'},position:'left'},y2:{min:0,grid:{display:false},position:'right'},x:{grid:{color:'#1e1e2e'}}}}});

const mC={excited:'#ffcc00',engaged:'#14f195',serene:'#88ccff',contemplative:'#aa88ff',assertive:'#9945ff',curious:'#00ffc8',frustrated:'#ff3232',provocative:'#ff6600',analytical:'#aaaacc',bored:'#666'};
new Chart(document.getElementById('moodPie'),{type:'doughnut',data:{labels:Object.keys(MC),datasets:[{data:Object.values(MC),backgroundColor:Object.keys(MC).map(m=>mC[m]||'#444'),borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'right',labels:{color:'#ccc'}}}}});

new Chart(document.getElementById('activityChart'),{type:'bar',data:{labels:L,datasets:[
{label:'Completed',data:CI,backgroundColor:'rgba(20,241,149,0.5)',borderRadius:3},
{label:'Bug Refs',data:BF,backgroundColor:'rgba(255,50,50,0.4)',borderRadius:3},
{label:'Commits',data:CC,backgroundColor:'rgba(153,69,255,0.4)',borderRadius:3},
]},options:{responsive:true,scales:{y:{grid:{color:'#1e1e2e'}},x:{grid:{color:'#1e1e2e'}}}}});

// Patterns
const p=[];
const pI=V.indexOf(Math.max(...V)),lI=V.indexOf(Math.min(...V));
p.push('<div class="pattern"><strong>Peak Pleasure:</strong> Entry '+(pI+1)+' ("'+T[pI].slice(0,45)+'") V='+V[pI].toFixed(3)+'</div>');
p.push('<div class="pattern"><strong>Lowest Pleasure:</strong> Entry '+(lI+1)+' ("'+T[lI].slice(0,45)+'") V='+V[lI].toFixed(3)+'</div>');
const hA=A.slice(0,Math.floor(A.length/2)),lA2=A.slice(Math.floor(A.length/2));
const aF=hA.reduce((a,b)=>a+b,0)/hA.length,aS=lA2.reduce((a,b)=>a+b,0)/lA2.length;
if(Math.abs(aS-aF)>0.03)p.push('<div class="pattern"><strong>Arousal Trend '+(aS>aF?'↑':'↓')+':</strong> '+aF.toFixed(2)+' → '+aS.toFixed(2)+'. '+(aS>aF?'Intensity increased toward deadline.':'Stabilization phase.')+'</div>');
const bH=BF.filter(b=>b>5).length;
if(bH>0){const bM=M.filter((_,i)=>BF[i]>5);p.push('<div class="pattern"><strong>Bug-Heavy Entries:</strong> '+bH+' entries with 5+ bug refs. Moods: '+[...new Set(bM)].join(', ')+'</div>');}
let sk=1,mS=1,sM=M[0];for(let i=1;i<M.length;i++){if(M[i]===M[i-1]){sk++;if(sk>mS){mS=sk;sM=M[i]}}else sk=1;}
if(mS>2)p.push('<div class="pattern"><strong>Mood Streak:</strong> "'+sM+'" for '+mS+' consecutive entries.</div>');
const tC=CC.reduce((a,b)=>a+b,0);
p.push('<div class="pattern"><strong>Commit Density:</strong> '+tC+' total commits across '+L.length+' entries (avg '+(tC/L.length).toFixed(1)+'/entry).</div>');
document.getElementById('patterns').innerHTML=p.join('');
<\/script>
</body></html>`;
}

function avg(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('DEVLOG Mood Analyzer — Wunderland ON SOL');
  console.log('=========================================\n');

  // Git commits
  console.log('  Fetching git commit history...');
  const commits = getGitCommits();
  console.log(`  Found ${commits.length} commits\n`);

  // Parse devlog
  const raw = readFileSync(DEVLOG_PATH, 'utf-8');
  const entries = parseDevlog(raw);
  console.log(`  Parsed ${entries.length} devlog entries\n`);

  // Cross-reference
  crossReferenceCommits(entries, commits);
  const totalMatched = entries.reduce((n, e) => n + e.commits.length, 0);
  console.log(`  Cross-referenced ${totalMatched} commits to entries\n`);

  // Simulate mood trajectory
  const rows = simulateMoodTrajectory(entries);

  // Output
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const csvPath = join(OUTPUT_DIR, 'devlog-mood.csv');
  writeFileSync(csvPath, toCSV(rows));
  console.log(`  CSV   → ${csvPath}`);

  const htmlPath = join(OUTPUT_DIR, 'devlog-mood.html');
  writeFileSync(htmlPath, toHTML(rows));
  console.log(`  HTML  → ${htmlPath}`);

  const mdPath = join(OUTPUT_DIR, 'DEVLOG-MOOD.md');
  writeFileSync(mdPath, generateRewrittenDevlog(rows));
  console.log(`  MD    → ${mdPath}`);

  if (process.argv.includes('--json')) {
    const jsonPath = join(OUTPUT_DIR, 'devlog-mood.json');
    writeFileSync(jsonPath, JSON.stringify(rows, null, 2));
    console.log(`  JSON  → ${jsonPath}`);
  }

  // Console summary
  console.log('\n--- MOOD TRAJECTORY ---\n');

  for (const r of rows) {
    const mc = MOOD_COMMENTARY[r.moodLabel];
    const commitStr = r.commits.length > 0 ? ` [${r.commits.length} commits]` : '';
    console.log(
      `  ${(r.dateNorm || r.date).padEnd(12)} ${mc.emoji} ${r.moodLabel.padEnd(16)} ` +
      `V=${r.valence.toFixed(2).padStart(6)} A=${r.arousal.toFixed(2).padStart(6)} D=${r.dominance.toFixed(2).padStart(6)} ` +
      `${r.title.slice(0, 40)}${commitStr}`,
    );
  }

  const valences = rows.map((r) => r.valence);
  const arousals = rows.map((r) => r.arousal);
  const moodDist: Record<string, number> = {};
  for (const r of rows) moodDist[r.moodLabel] = (moodDist[r.moodLabel] || 0) + 1;

  console.log('\n--- SUMMARY ---\n');
  console.log(`  Avg V=${avg(valences).toFixed(3)}  A=${avg(arousals).toFixed(3)}`);
  console.log(`  Mood distribution:`);
  for (const [mood, count] of Object.entries(moodDist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${mood.padEnd(16)} ${'█'.repeat(count)} (${count})`);
  }

  console.log(`\n  Open ${htmlPath} for interactive charts.`);
  console.log(`  See ${mdPath} for mood-rewritten devlog.`);
}

main();
