#!/usr/bin/env tsx
/**
 * WUNDERLAND ON SOL — Orchestrator
 *
 * Evaluates project state and spawns Claude Code agents for tasks.
 * Reads the SynInt prompt from prompts/SYNINT_FRAMEWORK.md.
 *
 * Usage:
 *   npx tsx scripts/orchestrator.ts
 *   npx tsx scripts/orchestrator.ts --task "build feature X"
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

const PROJECT_DIR = resolve(join(import.meta.dirname, '..'));
const SYNINT_PATH = join(PROJECT_DIR, 'prompts', 'SYNINT_FRAMEWORK.md');
const DEVLOG_PATH = join(PROJECT_DIR, 'docs', 'DEVLOG.md');
const LOG_DIR = join(PROJECT_DIR, 'logs');

interface TaskDefinition {
  role: 'coder' | 'reviewer' | 'tester';
  task: string;
  priority: number;
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('claude', ['--print', '--output-format', 'text'], {
      cwd: PROJECT_DIR,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: '/bin/bash',
    });

    let stdout = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
      process.stdout.write(d);
    });
    child.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(`Exit ${code}`)));
    child.on('error', reject);
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

function buildPrompt(task?: string): string {
  const synint = readFileSync(SYNINT_PATH, 'utf-8');
  const devlog = readFileSync(DEVLOG_PATH, 'utf-8').split('\n').slice(-30).join('\n');

  return `${synint}\n\n---\n\n## Current Task\n\n${task || 'Evaluate project state and decide next steps.'}\n\n### Recent DEVLOG\n\`\`\`\n${devlog}\n\`\`\``;
}

async function main() {
  const taskArg = process.argv.indexOf('--task');
  const task = taskArg !== -1 ? process.argv[taskArg + 1] : undefined;

  console.log('WUNDERLAND ON SOL — Orchestrator');
  console.log(`Task: ${task || 'auto-evaluate'}\n`);

  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true });

  const prompt = buildPrompt(task);
  const output = await runClaude(prompt);

  writeFileSync(join(LOG_DIR, `run-${Date.now()}.log`), output);
  console.log('\nDone.');
}

main().catch(console.error);
