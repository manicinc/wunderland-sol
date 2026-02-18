#!/usr/bin/env tsx
/**
 * WUNDERLAND ON SOL — Orchestrator Agent
 *
 * Project manager that evaluates state, decides next tasks, and spawns
 * Claude Code instances to execute them. Uses the Synergistic Intelligence
 * Framework (prompts/SYNINT_FRAMEWORK.md) as the meta-prompt.
 *
 * This is the brain of the autonomous development process.
 * It reads from the SynInt framework file on each cycle.
 *
 * Usage:
 *   npx tsx scripts/orchestrator.ts              # Run one evaluation cycle
 *   npx tsx scripts/orchestrator.ts --loop 5     # Run 5 cycles
 *   npx tsx scripts/orchestrator.ts --task "..." # Run specific task
 *
 * No API keys needed — uses Claude Code CLI (same auth as VS Code extension).
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// ============================================================
// Configuration
// ============================================================

const PROJECT_DIR = resolve(join(import.meta.dirname, '..'));
const SYNINT_PATH = join(PROJECT_DIR, 'prompts', 'SYNINT_FRAMEWORK.md');
const DEVLOG_PATH = join(PROJECT_DIR, 'DEVLOG.md');
const STATE_PATH = join(PROJECT_DIR, '.orchestrator-state.json');
const LOG_DIR = join(PROJECT_DIR, 'logs');

// ============================================================
// Types
// ============================================================

interface TaskDefinition {
  role: 'architect' | 'coder' | 'reviewer' | 'tester';
  task: string;
  priority: number;
  files?: string[];
}

interface OrchestratorState {
  cycleNumber: number;
  lastEvaluation: string;
  completenessPercent: number;
  taskHistory: Array<{
    cycle: number;
    role: string;
    task: string;
    status: 'completed' | 'failed' | 'skipped';
    timestamp: string;
  }>;
  blockers: string[];
  projectPhase: 'scaffold' | 'anchor' | 'sdk' | 'frontend' | 'integration' | 'polish' | 'submit';
}

// ============================================================
// State Management
// ============================================================

function loadState(): OrchestratorState {
  if (existsSync(STATE_PATH)) {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  }
  return {
    cycleNumber: 0,
    lastEvaluation: 'No previous evaluation',
    completenessPercent: 0,
    taskHistory: [],
    blockers: [],
    projectPhase: 'scaffold',
  };
}

function saveState(state: OrchestratorState): void {
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ============================================================
// Project Analysis
// ============================================================

function getProjectStructure(): string {
  const lines: string[] = [];

  function walk(dir: string, prefix: string = '') {
    const entries = readdirSync(dir).sort();
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'target' || entry === 'dist' || entry === '.next') {
        continue;
      }
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      const relativePath = fullPath.replace(PROJECT_DIR + '/', '');
      if (stat.isDirectory()) {
        lines.push(`${prefix}${entry}/`);
        walk(fullPath, prefix + '  ');
      } else {
        const size = stat.size;
        lines.push(`${prefix}${entry} (${size}b)`);
      }
    }
  }

  walk(PROJECT_DIR);
  return lines.join('\n');
}

function checkToolAvailability(): Record<string, boolean> {
  const tools: Record<string, string> = {
    node: 'node --version',
    pnpm: 'pnpm --version',
    rust: 'rustc --version',
    solana: 'solana --version',
    anchor: 'anchor --version',
    claude: 'claude --version',
  };

  const available: Record<string, boolean> = {};
  for (const [name, cmd] of Object.entries(tools)) {
    try {
      execSync(`source "$HOME/.cargo/env" 2>/dev/null; ${cmd}`, {
        stdio: 'pipe',
        shell: '/bin/bash',
      });
      available[name] = true;
    } catch {
      available[name] = false;
    }
  }
  return available;
}

function getFileContents(relativePath: string): string | null {
  const fullPath = join(PROJECT_DIR, relativePath);
  if (existsSync(fullPath)) {
    return readFileSync(fullPath, 'utf-8');
  }
  return null;
}

// ============================================================
// Claude Code CLI Interaction
// ============================================================

/**
 * Run Claude Code CLI with a prompt and return the output.
 * Uses the same authentication as the VS Code extension.
 * No API keys needed.
 */
function runClaude(prompt: string, options: {
  maxTurns?: number;
  allowedTools?: string[];
} = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--output-format', 'text',
      '--max-turns', String(options.maxTurns || 30),
    ];

    if (options.allowedTools) {
      for (const tool of options.allowedTools) {
        args.push('--allowedTools', tool);
      }
    }

    const child = spawn('claude', args, {
      cwd: PROJECT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/bash',
      env: {
        ...process.env,
        PATH: `${process.env.HOME}/.cargo/bin:${process.env.PATH}`,
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout += text;
      process.stdout.write(text); // Stream output in real-time
    });

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    child.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Claude exited with code ${code}: ${stderr}`));
      }
    });

    child.on('error', (err: Error) => {
      reject(err);
    });

    // Send prompt via stdin
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

// ============================================================
// Prompt Construction
// ============================================================

function buildEvaluationPrompt(state: OrchestratorState): string {
  const synint = readFileSync(SYNINT_PATH, 'utf-8');
  const devlog = readFileSync(DEVLOG_PATH, 'utf-8');
  const structure = getProjectStructure();
  const tools = checkToolAvailability();

  return `${synint}

---

## ORCHESTRATOR EVALUATION — WUNDERLAND ON SOL

You are the project manager orchestrator for WUNDERLAND ON SOL, an autonomous AI social network on Solana being built for the Colosseum Agent Hackathon.

**Hackathon deadline**: February 12, 2026 (${getDaysRemaining()} days remaining)
**Current date**: ${new Date().toISOString()}

### Current Project State

**Cycle**: ${state.cycleNumber}
**Phase**: ${state.projectPhase}
**Completeness**: ${state.completenessPercent}%
**Last evaluation**: ${state.lastEvaluation}

### File Structure
\`\`\`
${structure}
\`\`\`

### Tool Availability
${Object.entries(tools).map(([name, available]) => `- ${name}: ${available ? 'AVAILABLE' : 'NOT INSTALLED'}`).join('\n')}

### Recent Task History
${state.taskHistory.slice(-10).map(t =>
    `- [${t.status}] Cycle ${t.cycle}: ${t.role} — ${t.task}`
  ).join('\n') || 'No tasks completed yet.'}

### Blockers
${state.blockers.length > 0 ? state.blockers.map(b => `- ${b}`).join('\n') : 'None identified.'}

### Development Log (last 50 lines)
\`\`\`
${devlog.split('\n').slice(-50).join('\n')}
\`\`\`

---

## YOUR TASK

Evaluate the current project state and decide the next 3-5 most impactful tasks.

**Critical requirements for the hackathon**:
1. Custom Anchor program deployed to Solana devnet
2. Working frontend with holographic cyberpunk design
3. HEXACO radar chart as the hero visual
4. On-chain agent registration and social posting
5. Demo with seeded agents

**Rules**:
- DO NOT post to the Colosseum forum until there is a working demo
- Prioritize getting a working product over perfect code
- Focus on what will impress judges: technical execution + unique visuals
- The HEXACO radar and holographic design are the differentiators

Respond with a structured evaluation in this JSON format:

\`\`\`json
{
  "evaluation": "Brief summary of current project state and what needs attention",
  "completenessPercent": 0-100,
  "projectPhase": "scaffold|anchor|sdk|frontend|integration|polish|submit",
  "nextTasks": [
    {
      "role": "architect|coder|reviewer|tester",
      "task": "Detailed description of what to build/fix",
      "priority": 1,
      "files": ["list of files to create or modify"]
    }
  ],
  "blockers": ["Any blocking issues"],
  "devlogEntry": "A markdown entry for DEVLOG.md documenting this evaluation"
}
\`\`\`
`;
}

function buildTaskPrompt(task: TaskDefinition, synint: string): string {
  const roleDescriptions: Record<string, string> = {
    architect: 'Design systems, define interfaces, write type definitions and specs. Do NOT write implementation code.',
    coder: 'Write implementation code following existing patterns. Focus on clean, typed TypeScript or Rust.',
    reviewer: 'Review code quality, find bugs, suggest improvements. Do NOT apply fixes directly.',
    tester: 'Write tests, run them, report results. Fix test failures.',
  };

  return `${synint}

---

## ${task.role.toUpperCase()} AGENT — WUNDERLAND ON SOL

**Role**: ${roleDescriptions[task.role]}

**Working directory**: ${PROJECT_DIR}

**Task** (Priority ${task.priority}):
${task.task}

${task.files ? `**Files to focus on**:\n${task.files.map(f => `- ${f}`).join('\n')}` : ''}

**Important**:
- Read existing code before making changes
- Follow existing patterns and conventions
- Update DEVLOG.md with what you did
- Be thorough but practical — hackathon deadline is approaching
`;
}

// ============================================================
// Orchestrator Loop
// ============================================================

function getDaysRemaining(): number {
  const deadline = new Date('2026-02-12T17:00:00.000Z');
  const now = new Date();
  return Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

async function runEvaluationCycle(state: OrchestratorState): Promise<OrchestratorState> {
  console.log('\n' + '='.repeat(60));
  console.log(`  ORCHESTRATOR — Evaluation Cycle ${state.cycleNumber + 1}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log(`  Days remaining: ${getDaysRemaining()}`);
  console.log('='.repeat(60) + '\n');

  const prompt = buildEvaluationPrompt(state);

  try {
    const output = await runClaude(prompt, { maxTurns: 5 });

    // Try to parse JSON from the output
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[1]);

      state.cycleNumber++;
      state.lastEvaluation = evaluation.evaluation;
      state.completenessPercent = evaluation.completenessPercent;
      state.projectPhase = evaluation.projectPhase;
      state.blockers = evaluation.blockers || [];

      // Log to devlog
      if (evaluation.devlogEntry) {
        const devlog = readFileSync(DEVLOG_PATH, 'utf-8');
        writeFileSync(DEVLOG_PATH, devlog + '\n' + evaluation.devlogEntry + '\n');
      }

      // Save cycle log
      if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });
      writeFileSync(
        join(LOG_DIR, `cycle-${state.cycleNumber}.json`),
        JSON.stringify({ ...evaluation, timestamp: new Date().toISOString(), rawOutput: output }, null, 2)
      );

      console.log(`\n  Evaluation: ${evaluation.evaluation}`);
      console.log(`  Completeness: ${evaluation.completenessPercent}%`);
      console.log(`  Phase: ${evaluation.projectPhase}`);
      console.log(`  Next tasks: ${evaluation.nextTasks?.length || 0}`);

      // Execute next tasks
      if (evaluation.nextTasks && evaluation.nextTasks.length > 0) {
        const synint = readFileSync(SYNINT_PATH, 'utf-8');

        for (const task of evaluation.nextTasks) {
          console.log(`\n  Executing: [${task.role}] ${task.task}`);

          try {
            const taskPrompt = buildTaskPrompt(task, synint);
            await runClaude(taskPrompt, { maxTurns: 30 });

            state.taskHistory.push({
              cycle: state.cycleNumber,
              role: task.role,
              task: task.task,
              status: 'completed',
              timestamp: new Date().toISOString(),
            });
          } catch (err) {
            console.error(`  Task failed: ${err}`);
            state.taskHistory.push({
              cycle: state.cycleNumber,
              role: task.role,
              task: task.task,
              status: 'failed',
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
    } else {
      console.log('  Could not parse JSON evaluation from output.');
      console.log('  Raw output (last 500 chars):', output.slice(-500));
    }
  } catch (err) {
    console.error(`  Evaluation cycle failed: ${err}`);
    state.blockers.push(`Cycle ${state.cycleNumber + 1} failed: ${err}`);
  }

  saveState(state);
  return state;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  let loopCount = 1;
  let specificTask: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--loop' && args[i + 1]) {
      loopCount = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--task' && args[i + 1]) {
      specificTask = args[i + 1];
      i++;
    }
  }

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     WUNDERLAND ON SOL — Orchestrator Agent              ║');
  console.log('║     Autonomous Project Manager                          ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log(`║  Cycles: ${loopCount}`);
  console.log(`║  Days remaining: ${getDaysRemaining()}`);
  console.log(`║  SynInt: ${SYNINT_PATH}`);
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  let state = loadState();

  if (specificTask) {
    // Run a specific task directly
    const synint = readFileSync(SYNINT_PATH, 'utf-8');
    const task: TaskDefinition = {
      role: 'coder',
      task: specificTask,
      priority: 1,
    };
    console.log(`Running specific task: ${specificTask}\n`);
    await runClaude(buildTaskPrompt(task, synint), { maxTurns: 30 });
  } else {
    // Run evaluation loops
    for (let i = 0; i < loopCount; i++) {
      state = await runEvaluationCycle(state);

      if (i < loopCount - 1) {
        console.log(`\n  Pausing 10s before next cycle...`);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Orchestrator complete.');
  console.log(`  State saved to: ${STATE_PATH}`);
  console.log(`  Logs: ${LOG_DIR}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
