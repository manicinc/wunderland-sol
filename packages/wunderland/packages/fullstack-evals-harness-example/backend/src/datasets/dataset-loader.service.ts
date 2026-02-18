import { Injectable, Logger, OnModuleInit, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface LoadedDataset {
  id: string;
  name: string;
  description: string | null;
  source: 'file';
  filePath: string;
  metaPath: string | null;
  testCaseCount: number;
  testCases: LoadedTestCase[];
  synthetic?: boolean;
}

export interface LoadedTestCase {
  id: string;
  datasetId: string;
  input: string;
  expectedOutput: string | null;
  context: string | null;
  metadata: Record<string, unknown> | null;
  customFields: Record<string, string>;
}

@Injectable()
export class DatasetLoaderService implements OnModuleInit {
  private readonly logger = new Logger(DatasetLoaderService.name);
  private datasets = new Map<string, LoadedDataset>();
  private datasetsDir: string;

  constructor() {
    // datasets/ directory lives next to src/ in the backend package
    // In compiled dist: __dirname = dist/src/datasets/, so go up 3 levels
    // In tests (ts-jest): __dirname = src/datasets/, so go up 2 levels
    const candidate = path.resolve(__dirname, '..', '..', '..', 'datasets');
    const fallback = path.resolve(__dirname, '..', '..', 'datasets');
    this.datasetsDir = fs.existsSync(candidate) ? candidate : fallback;
  }

  onModuleInit() {
    this.loadAll();
  }

  /**
   * Scan subdirectories of datasetsDir for data.csv + meta.yaml and parse them.
   */
  loadAll(): { loaded: number } {
    this.datasets.clear();

    if (!fs.existsSync(this.datasetsDir)) {
      this.logger.warn(`Datasets directory not found: ${this.datasetsDir}`);
      return { loaded: 0 };
    }

    const entries = fs.readdirSync(this.datasetsDir, { withFileTypes: true });
    const dirs = entries.filter((e) => e.isDirectory());

    for (const dir of dirs) {
      const id = dir.name;
      const csvPath = path.join(this.datasetsDir, id, 'data.csv');

      if (!fs.existsSync(csvPath)) continue;

      try {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const meta = this.loadMeta(id);
        const testCases = this.parseCsv(id, csvContent);

        const hasMetaFile = fs.existsSync(path.join(this.datasetsDir, id, 'meta.yaml'));

        const dataset: LoadedDataset = {
          id,
          name: meta.name || this.idToName(id),
          description: meta.description || null,
          source: 'file',
          filePath: `datasets/${id}/data.csv`,
          metaPath: hasMetaFile ? `datasets/${id}/meta.yaml` : null,
          testCaseCount: testCases.length,
          testCases,
          ...(meta.synthetic ? { synthetic: true } : {}),
        };

        this.datasets.set(id, dataset);
      } catch (err) {
        this.logger.error(`Failed to parse dataset ${id}: ${err}`);
      }
    }

    this.logger.log(`Loaded ${this.datasets.size} datasets from ${this.datasetsDir}`);
    return { loaded: this.datasets.size };
  }

  findAll(): LoadedDataset[] {
    return Array.from(this.datasets.values());
  }

  findOne(id: string): LoadedDataset {
    const dataset = this.datasets.get(id);
    if (!dataset) {
      throw new NotFoundException(`Dataset "${id}" not found`);
    }
    return dataset;
  }

  findMany(ids: string[]): LoadedDataset[] {
    return ids.map((id) => this.findOne(id));
  }

  /**
   * Import a CSV file: write to subfolder on disk, then reload into memory.
   */
  importCsv(
    filename: string,
    csvContent: string,
    meta?: { name?: string; description?: string; synthetic?: boolean }
  ): LoadedDataset {
    const id = filename.replace(/\.csv$/, '');
    const subDir = path.join(this.datasetsDir, id);

    // Ensure subfolder exists
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }

    // Write CSV file
    fs.writeFileSync(path.join(subDir, 'data.csv'), csvContent, 'utf-8');

    // Write meta.yaml if provided
    if (meta && (meta.name || meta.description || meta.synthetic)) {
      const metaObj: Record<string, unknown> = {};
      if (meta.name) metaObj.name = meta.name;
      if (meta.description) metaObj.description = meta.description;
      if (meta.synthetic) metaObj.synthetic = true;
      fs.writeFileSync(
        path.join(subDir, 'meta.yaml'),
        yaml.dump(metaObj, { lineWidth: 100 }),
        'utf-8'
      );
    }

    // Parse and store
    const testCases = this.parseCsv(id, csvContent);
    const loadedMeta = this.loadMeta(id);

    const hasMeta = meta && (meta.name || meta.description || meta.synthetic);
    const dataset: LoadedDataset = {
      id,
      name: loadedMeta.name || this.idToName(id),
      description: loadedMeta.description || null,
      source: 'file',
      filePath: `datasets/${id}/data.csv`,
      metaPath: hasMeta ? `datasets/${id}/meta.yaml` : null,
      testCaseCount: testCases.length,
      testCases,
      ...(loadedMeta.synthetic ? { synthetic: true } : {}),
    };

    this.datasets.set(id, dataset);
    this.logger.log(`Imported dataset "${id}" with ${testCases.length} test cases`);
    return dataset;
  }

  /**
   * Update a dataset: rewrite CSV (and optionally meta.json) on disk.
   */
  updateDataset(
    id: string,
    data: {
      name?: string;
      description?: string;
      testCases?: Array<{
        input: string;
        expectedOutput?: string;
        context?: string;
        metadata?: Record<string, unknown>;
        customFields?: Record<string, string>;
      }>;
    }
  ): LoadedDataset {
    const existing = this.datasets.get(id);
    if (!existing) {
      throw new NotFoundException(`Dataset "${id}" not found`);
    }

    const subDir = path.join(this.datasetsDir, id);

    // Rewrite CSV if testCases provided
    if (data.testCases) {
      const esc = (val: string) => '"' + (val || '').replace(/"/g, '""') + '"';
      const customHeaders = Array.from(
        new Set(data.testCases.flatMap((tc) => Object.keys(tc.customFields || {})))
      );
      const headers = ['input', 'expected_output', 'context', 'metadata', ...customHeaders];
      const lines = [headers.join(',')];
      for (const tc of data.testCases) {
        const metaStr = tc.metadata ? JSON.stringify(tc.metadata) : '';
        const customValues = customHeaders.map((header) => tc.customFields?.[header] || '');
        lines.push(
          [
            esc(tc.input),
            esc(tc.expectedOutput || ''),
            esc(tc.context || ''),
            esc(metaStr),
            ...customValues.map((v) => esc(v)),
          ].join(',')
        );
      }
      fs.writeFileSync(path.join(subDir, 'data.csv'), lines.join('\n') + '\n', 'utf-8');
    }

    // Update meta.yaml if name or description changed
    if (data.name !== undefined || data.description !== undefined) {
      const currentMeta = this.loadMeta(id);
      const newMeta: Record<string, unknown> = {
        name: data.name ?? currentMeta.name,
        description: data.description ?? currentMeta.description,
      };
      fs.writeFileSync(
        path.join(subDir, 'meta.yaml'),
        yaml.dump(newMeta, { lineWidth: 100 }),
        'utf-8'
      );
    }

    // Re-read from disk to get clean state
    const csvContent = fs.readFileSync(path.join(subDir, 'data.csv'), 'utf-8');
    const meta = this.loadMeta(id);
    const testCases = this.parseCsv(id, csvContent);
    const hasMetaFile = fs.existsSync(path.join(subDir, 'meta.yaml'));

    const dataset: LoadedDataset = {
      id,
      name: meta.name || this.idToName(id),
      description: meta.description || null,
      source: 'file',
      filePath: `datasets/${id}/data.csv`,
      metaPath: hasMetaFile ? `datasets/${id}/meta.yaml` : null,
      testCaseCount: testCases.length,
      testCases,
      ...(meta.synthetic ? { synthetic: true } : {}),
    };

    this.datasets.set(id, dataset);
    this.logger.log(`Updated dataset "${id}" (${testCases.length} test cases)`);
    return dataset;
  }

  /**
   * Delete a dataset: remove its subfolder from disk and from memory.
   */
  deleteDataset(id: string): { deleted: boolean } {
    const existing = this.datasets.get(id);
    if (!existing) {
      throw new NotFoundException(`Dataset "${id}" not found`);
    }

    const subDir = path.join(this.datasetsDir, id);
    if (fs.existsSync(subDir)) {
      fs.rmSync(subDir, { recursive: true, force: true });
    }

    this.datasets.delete(id);
    this.logger.log(`Deleted dataset "${id}"`);
    return { deleted: true };
  }

  /**
   * Load optional meta.yaml sidecar for a dataset.
   */
  private loadMeta(id: string): { name?: string; description?: string; synthetic?: boolean } {
    const metaPath = path.join(this.datasetsDir, id, 'meta.yaml');
    if (fs.existsSync(metaPath)) {
      try {
        return (yaml.load(fs.readFileSync(metaPath, 'utf-8')) as any) || {};
      } catch {
        this.logger.warn(`Failed to parse ${id}/meta.yaml`);
      }
    }
    return {};
  }

  /**
   * Convert a kebab-case ID to a human-readable name.
   */
  private idToName(id: string): string {
    return id
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  /**
   * Parse a CSV string into test cases.
   * Handles RFC 4180: quoted fields, escaped double-quotes, newlines in quotes.
   * Expected columns: input, expected_output, context, metadata
   */
  parseCsv(datasetId: string, content: string): LoadedTestCase[] {
    const rows = this.parseRawCsv(content);
    if (rows.length < 2) return []; // Need header + at least 1 data row

    const header = rows[0].map((h) => h.trim());
    const normalizedHeader = header.map((h) => h.toLowerCase());
    const inputIdx = normalizedHeader.indexOf('input');
    const expectedIdx = normalizedHeader.indexOf('expected_output');
    const contextIdx = normalizedHeader.indexOf('context');
    const metadataIdx = normalizedHeader.indexOf('metadata');
    const customColumns = header
      .map((name, index) => ({ name, index, normalized: normalizedHeader[index] }))
      .filter(
        ({ normalized }) =>
          normalized !== 'input' &&
          normalized !== 'expected_output' &&
          normalized !== 'context' &&
          normalized !== 'metadata'
      );

    if (inputIdx === -1) {
      throw new Error('CSV missing required "input" column');
    }

    const testCases: LoadedTestCase[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const input = row[inputIdx]?.trim();
      if (!input) continue; // Skip empty rows

      const expectedRaw = expectedIdx >= 0 ? row[expectedIdx]?.trim() : null;
      const contextRaw = contextIdx >= 0 ? row[contextIdx]?.trim() : null;
      const metadataRaw = metadataIdx >= 0 ? row[metadataIdx]?.trim() : null;
      const customFields: Record<string, string> = {};

      let metadata: Record<string, unknown> | null = null;
      if (metadataRaw) {
        try {
          metadata = JSON.parse(metadataRaw);
        } catch {
          // Not valid JSON — ignore
        }
      }

      for (const { name, index } of customColumns) {
        customFields[name] = row[index] ?? '';
      }

      testCases.push({
        id: `${datasetId}-${i - 1}`,
        datasetId,
        input,
        expectedOutput: expectedRaw || null,
        context: contextRaw || null,
        metadata,
        customFields,
      });
    }

    return testCases;
  }

  /**
   * RFC 4180 CSV parser. Returns array of rows, each row an array of field strings.
   * Handles: quoted fields, escaped double-quotes (""), newlines within quoted fields.
   */
  private parseRawCsv(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < content.length) {
      const ch = content[i];

      if (inQuotes) {
        if (ch === '"') {
          // Check for escaped quote ""
          if (i + 1 < content.length && content[i + 1] === '"') {
            currentField += '"';
            i += 2;
          } else {
            // End of quoted field
            inQuotes = false;
            i++;
          }
        } else {
          currentField += ch;
          i++;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
          i++;
        } else if (ch === ',') {
          currentRow.push(currentField);
          currentField = '';
          i++;
        } else if (
          ch === '\n' ||
          (ch === '\r' && i + 1 < content.length && content[i + 1] === '\n')
        ) {
          currentRow.push(currentField);
          currentField = '';
          if (currentRow.some((f) => f.trim())) {
            rows.push(currentRow);
          }
          currentRow = [];
          i += ch === '\r' ? 2 : 1;
        } else if (ch === '\r') {
          currentRow.push(currentField);
          currentField = '';
          if (currentRow.some((f) => f.trim())) {
            rows.push(currentRow);
          }
          currentRow = [];
          i++;
        } else {
          currentField += ch;
          i++;
        }
      }
    }

    // Handle last field/row
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some((f) => f.trim())) {
        rows.push(currentRow);
      }
    }

    return rows;
  }
}
