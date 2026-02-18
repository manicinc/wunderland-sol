import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';
import { spawn } from 'node:child_process';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import type {
  ITool,
  JSONSchemaObject,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@framers/agentos';
import type { SkillRegistryEntry as SkillCatalogEntry, SkillInstallSpec } from '@framers/agentos-skills-registry';

import { findSkillEntry, loadSkillsRegistry } from '../catalog.js';

type NodeManager = 'npm' | 'pnpm' | 'yarn' | 'bun';

type SkillsInstallInput = {
  skill: string;
  installId?: string;
  platform?: string;
  timeoutMs?: number;
  dryRun?: boolean;
  preferBrew?: boolean;
  nodeManager?: NodeManager;
  useSudo?: boolean;
};

type SkillsInstallOutput = {
  ok: boolean;
  message: string;
  stdout: string;
  stderr: string;
  code: number | null;
  warnings?: string[];
  details?: {
    skill: string;
    installId: string;
    kind: SkillInstallSpec['kind'];
    argv?: string[];
    downloadPath?: string;
    extractedTo?: string;
  };
};

const DEFAULT_TIMEOUT_MS = 5 * 60_000;

function resolveInstallId(spec: SkillInstallSpec, index: number): string {
  return (spec.id ?? `${spec.kind}-${index}`).trim();
}

function filterByPlatform(specs: SkillInstallSpec[], platform: string): SkillInstallSpec[] {
  return specs.filter((spec) => {
    const osList = spec.os ?? [];
    return osList.length === 0 || osList.includes(platform);
  });
}

function hasBinary(bin: string): boolean {
  const pathEnv = process.env.PATH ?? '';
  const parts = pathEnv.split(path.delimiter).filter(Boolean);
  const candidates =
    process.platform === 'win32' ? [bin, `${bin}.exe`, `${bin}.cmd`, `${bin}.bat`] : [bin];
  for (const part of parts) {
    for (const name of candidates) {
      const candidate = path.join(part, name);
      try {
        fsSync.accessSync(candidate, fsSync.constants.X_OK);
        return true;
      } catch {
        // keep scanning
      }
    }
  }
  return false;
}

function selectPreferredInstallSpec(
  specs: SkillInstallSpec[],
  opts: { preferBrew: boolean; nodeManager: NodeManager }
): { spec: SkillInstallSpec; index: number } | undefined {
  if (specs.length === 0) return undefined;
  const indexed = specs.map((spec, index) => ({ spec, index }));
  const findKind = (kind: SkillInstallSpec['kind']) =>
    indexed.find((item) => item.spec.kind === kind);

  const brewSpec = findKind('brew');
  const uvSpec = findKind('uv');
  const nodeSpec = findKind('node');
  const aptSpec = findKind('apt');
  const goSpec = findKind('go');

  if (opts.preferBrew && hasBinary('brew') && brewSpec) return brewSpec;
  if (uvSpec) return uvSpec;
  if (nodeSpec) return nodeSpec;
  if (brewSpec) return brewSpec;
  if (aptSpec) return aptSpec;
  if (goSpec) return goSpec;
  return indexed[0];
}

function buildNodeInstallCommand(packageName: string, manager: NodeManager): string[] {
  switch (manager) {
    case 'pnpm':
      return ['pnpm', 'add', '-g', packageName];
    case 'yarn':
      return ['yarn', 'global', 'add', packageName];
    case 'bun':
      return ['bun', 'add', '-g', packageName];
    default:
      return ['npm', 'install', '-g', packageName];
  }
}

function buildInstallArgv(
  spec: SkillInstallSpec,
  opts: { nodeManager: NodeManager; useSudo: boolean }
): { argv: string[] | null; error?: string } {
  switch (spec.kind) {
    case 'brew':
      return spec.formula
        ? { argv: ['brew', 'install', spec.formula] }
        : { argv: null, error: 'missing brew formula' };
    case 'apt':
      return spec.package
        ? {
            argv: opts.useSudo
              ? ['sudo', 'apt-get', 'install', '-y', spec.package]
              : ['apt-get', 'install', '-y', spec.package],
          }
        : { argv: null, error: 'missing apt package' };
    case 'node':
      return spec.package
        ? { argv: buildNodeInstallCommand(spec.package, opts.nodeManager) }
        : { argv: null, error: 'missing node package' };
    case 'go':
      return spec.module
        ? { argv: ['go', 'install', spec.module] }
        : { argv: null, error: 'missing go module' };
    case 'uv':
      return spec.package
        ? { argv: ['uv', 'tool', 'install', spec.package] }
        : { argv: null, error: 'missing uv package' };
    case 'download':
      return { argv: null };
    default:
      return { argv: null, error: `unsupported install kind: ${String((spec as any).kind)}` };
  }
}

async function runCommand(
  argv: string[],
  opts: { timeoutMs: number; cwd?: string }
): Promise<{ stdout: string; stderr: string; code: number | null; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: opts.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    child.stdout?.on('data', (chunk: Buffer) => stdoutChunks.push(Buffer.from(chunk)));
    child.stderr?.on('data', (chunk: Buffer) => stderrChunks.push(Buffer.from(chunk)));

    let timedOut = false;
    const timeoutId = setTimeout(
      () => {
        timedOut = true;
        try {
          child.kill('SIGKILL');
        } catch {
          // ignore
        }
      },
      Math.max(1_000, opts.timeoutMs)
    );

    child.on('error', (err) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat([...stderrChunks, Buffer.from(String(err))]).toString('utf-8'),
        code: null,
        timedOut,
      });
    });

    child.on('close', (code) => {
      clearTimeout(timeoutId);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString('utf-8'),
        stderr: Buffer.concat(stderrChunks).toString('utf-8'),
        code: typeof code === 'number' ? code : null,
        timedOut,
      });
    });
  });
}

function normalizeUrl(raw: unknown): string | null {
  const url = typeof raw === 'string' ? raw.trim() : '';
  if (!url) return null;
  if (url.startsWith('https://') || url.startsWith('http://')) return url;
  return null;
}

async function downloadToFile(opts: {
  url: string;
  destPath: string;
  timeoutMs: number;
}): Promise<{ bytes: number }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), Math.max(1_000, opts.timeoutMs));
  try {
    const res = await fetch(opts.url, { signal: controller.signal });
    if (!res.ok || !res.body) {
      throw new Error(`Download failed (${res.status} ${res.statusText})`);
    }
    await fs.mkdir(path.dirname(opts.destPath), { recursive: true });
    const body = Readable.fromWeb(res.body as any);
    const file = fsSync.createWriteStream(opts.destPath);
    await pipeline(body, file);
    const stat = await fs.stat(opts.destPath);
    return { bytes: stat.size };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function extractArchive(opts: {
  archivePath: string;
  targetDir: string;
  stripComponents?: number;
  timeoutMs: number;
}): Promise<{ extractedTo: string; stdout: string; stderr: string; code: number | null }> {
  await fs.mkdir(opts.targetDir, { recursive: true });
  const lower = opts.archivePath.toLowerCase();

  if (lower.endsWith('.zip')) {
    const result = await runCommand(['unzip', '-o', opts.archivePath, '-d', opts.targetDir], {
      timeoutMs: opts.timeoutMs,
    });
    return {
      extractedTo: opts.targetDir,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    };
  }

  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    const argv = ['tar', '-xzf', opts.archivePath, '-C', opts.targetDir];
    if (
      typeof opts.stripComponents === 'number' &&
      Number.isFinite(opts.stripComponents) &&
      opts.stripComponents > 0
    ) {
      argv.push(`--strip-components=${Math.floor(opts.stripComponents)}`);
    }
    const result = await runCommand(argv, { timeoutMs: opts.timeoutMs });
    return {
      extractedTo: opts.targetDir,
      stdout: result.stdout,
      stderr: result.stderr,
      code: result.code,
    };
  }

  throw new Error('Unsupported archive format (supported: .zip, .tar.gz, .tgz)');
}

async function executeDownloadInstall(
  spec: SkillInstallSpec,
  opts: { timeoutMs: number }
): Promise<SkillsInstallOutput> {
  const url = normalizeUrl(spec.url);
  if (!url) {
    return {
      ok: false,
      message: 'download install missing/invalid url (must be http/https)',
      stdout: '',
      stderr: '',
      code: null,
    };
  }

  const fileName =
    (spec.archive && String(spec.archive).trim()) || url.split('/').pop() || 'download';
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentos-skills-install-'));
  const archivePath = path.join(tmpDir, fileName);

  try {
    await downloadToFile({ url, destPath: archivePath, timeoutMs: opts.timeoutMs });

    if (spec.extract !== true) {
      return {
        ok: true,
        message: `Downloaded to ${archivePath}`,
        stdout: '',
        stderr: '',
        code: 0,
        details: {
          skill: '',
          installId: spec.id ?? spec.kind,
          kind: spec.kind,
          downloadPath: archivePath,
        },
      };
    }

    const targetDir = (spec.targetDir && String(spec.targetDir).trim()) || '';
    if (!targetDir) {
      return {
        ok: false,
        message: 'download install requires targetDir when extract=true',
        stdout: '',
        stderr: '',
        code: null,
      };
    }

    const extracted = await extractArchive({
      archivePath,
      targetDir: path.resolve(targetDir),
      stripComponents: spec.stripComponents,
      timeoutMs: opts.timeoutMs,
    });

    const ok = extracted.code === 0;
    return {
      ok,
      message: ok ? `Extracted to ${extracted.extractedTo}` : 'Extraction failed',
      stdout: extracted.stdout,
      stderr: extracted.stderr,
      code: extracted.code,
      details: {
        skill: '',
        installId: spec.id ?? spec.kind,
        kind: spec.kind,
        downloadPath: archivePath,
        extractedTo: extracted.extractedTo,
      },
    };
  } catch (error: any) {
    return {
      ok: false,
      message: error?.message || String(error),
      stdout: '',
      stderr: '',
      code: null,
    };
  }
}

export class SkillsInstallTool implements ITool<SkillsInstallInput, SkillsInstallOutput> {
  public readonly id = 'agentos-skills-install-v1';
  public readonly name = 'skills_install';
  public readonly displayName = 'Install Skill Dependencies';
  public readonly description =
    'Install missing dependencies for a curated skill, using the skill’s metadata.install specs (brew/apt/node/go/uv/download). Side-effectful.';
  public readonly category = 'system';
  public readonly hasSideEffects = true;

  public readonly inputSchema: JSONSchemaObject = {
    type: 'object',
    required: ['skill'],
    properties: {
      skill: { type: 'string', description: 'Skill name or id' },
      installId: {
        type: 'string',
        description: 'Install spec id (defaults to preferred for your platform)',
      },
      platform: {
        type: 'string',
        description: 'Platform for OS filtering (default: process.platform)',
      },
      timeoutMs: {
        type: 'number',
        description: 'Timeout in milliseconds',
        default: 300000,
        minimum: 1000,
        maximum: 3600000,
      },
      dryRun: {
        type: 'boolean',
        description: 'Return the resolved command without executing',
        default: false,
      },
      preferBrew: { type: 'boolean', description: 'Prefer brew when available', default: true },
      nodeManager: {
        type: 'string',
        description: 'Node manager: npm|pnpm|yarn|bun',
        default: 'npm',
      },
      useSudo: {
        type: 'boolean',
        description: 'Use sudo for apt installs (linux)',
        default: false,
      },
    },
    additionalProperties: false,
  };

  async execute(
    input: SkillsInstallInput,
    _context: ToolExecutionContext
  ): Promise<ToolExecutionResult<SkillsInstallOutput>> {
    try {
      const ref = (input.skill || '').trim();
      if (!ref) return { success: false, error: 'Missing required field: skill' };

      const platform = (input.platform && String(input.platform).trim()) || process.platform;
      const timeoutMs =
        typeof input.timeoutMs === 'number'
          ? Math.max(1_000, Math.min(3_600_000, input.timeoutMs))
          : DEFAULT_TIMEOUT_MS;
      const dryRun = input.dryRun === true;
      const preferBrew = input.preferBrew !== false;
      const nodeManagerRaw =
        typeof input.nodeManager === 'string' ? input.nodeManager.trim().toLowerCase() : '';
      const nodeManager: NodeManager =
        nodeManagerRaw === 'pnpm' ||
        nodeManagerRaw === 'yarn' ||
        nodeManagerRaw === 'bun' ||
        nodeManagerRaw === 'npm'
          ? (nodeManagerRaw as NodeManager)
          : 'npm';
      const useSudo = input.useSudo === true;

      const registry = await loadSkillsRegistry();
      const entry = findSkillEntry(registry, ref);
      if (!entry) {
        return { success: false, error: `Skill not found in catalog: ${ref}` };
      }

      const installSpecsRaw = entry.metadata?.install ?? [];
      const installSpecs = filterByPlatform(installSpecsRaw, platform);
      if (installSpecs.length === 0) {
        return {
          success: false,
          error: `No install specs available for ${entry.name} on platform ${platform}`,
        };
      }

      let chosen: { spec: SkillInstallSpec; index: number } | undefined;
      if (typeof input.installId === 'string' && input.installId.trim()) {
        const installId = input.installId.trim();
        for (const [index, spec] of installSpecs.entries()) {
          if (resolveInstallId(spec, index) === installId) {
            chosen = { spec, index };
            break;
          }
        }
        if (!chosen) {
          return { success: false, error: `Install spec not found: ${installId}` };
        }
      } else {
        chosen = selectPreferredInstallSpec(installSpecs, { preferBrew, nodeManager });
      }

      if (!chosen) {
        return { success: false, error: `No install spec resolved for ${entry.name}` };
      }

      const resolvedInstallId = resolveInstallId(chosen.spec, chosen.index);

      if (chosen.spec.kind === 'download') {
        if (dryRun) {
          return {
            success: true,
            output: {
              ok: true,
              message: 'download install (dryRun): would download url and optionally extract',
              stdout: '',
              stderr: '',
              code: 0,
              details: {
                skill: entry.name,
                installId: resolvedInstallId,
                kind: chosen.spec.kind,
              },
            },
          };
        }

        const result = await executeDownloadInstall(chosen.spec, { timeoutMs });
        return {
          success: result.ok,
          output: {
            ...result,
            details: {
              ...(result.details ?? {}),
              skill: entry.name,
              installId: resolvedInstallId,
              kind: chosen.spec.kind,
            },
          },
          error: result.ok ? undefined : result.message,
        };
      }

      const { argv, error } = buildInstallArgv(chosen.spec, { nodeManager, useSudo });
      if (!argv) {
        const msg = error ? `Invalid install spec: ${error}` : 'Invalid install spec';
        return { success: false, error: msg };
      }

      if (dryRun) {
        return {
          success: true,
          output: {
            ok: true,
            message: 'dryRun: resolved install command',
            stdout: '',
            stderr: '',
            code: 0,
            details: {
              skill: entry.name,
              installId: resolvedInstallId,
              kind: chosen.spec.kind,
              argv,
            },
          },
        };
      }

      const executed = await runCommand(argv, { timeoutMs });
      const ok = executed.code === 0 && !executed.timedOut;
      const message = executed.timedOut
        ? 'Install timed out'
        : ok
          ? 'Install succeeded'
          : `Install failed (exit ${executed.code ?? 'unknown'})`;

      return {
        success: ok,
        output: {
          ok,
          message,
          stdout: executed.stdout,
          stderr: executed.stderr,
          code: executed.code,
          details: {
            skill: entry.name,
            installId: resolvedInstallId,
            kind: chosen.spec.kind,
            argv,
          },
        },
        error: ok ? undefined : message,
      };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }
}
