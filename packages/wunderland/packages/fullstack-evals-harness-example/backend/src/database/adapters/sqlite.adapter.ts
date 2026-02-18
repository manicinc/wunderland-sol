import { Injectable, Logger } from '@nestjs/common';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { eq, inArray } from 'drizzle-orm';
import * as BetterSqlite3 from 'better-sqlite3';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

import {
  IDbAdapter,
  Dataset,
  TestCase,
  Grader,
  Candidate,
  Experiment,
  ExperimentResult,
  MetadataSchema,
  Settings,
  InsertDataset,
  InsertTestCase,
  InsertGrader,
  InsertCandidate,
  InsertExperiment,
  InsertExperimentResult,
} from '../interfaces/db-adapter.interface';
import * as schema from '../schema';

// Handle CommonJS/ESM interop
const Database = (BetterSqlite3 as any).default || BetterSqlite3;

@Injectable()
export class SqliteAdapter implements IDbAdapter {
  private readonly logger = new Logger(SqliteAdapter.name);
  private db: BetterSQLite3Database<typeof schema>;
  private sqlite: any;
  private filePath: string;

  constructor(filePath?: string) {
    this.filePath = filePath || process.env.DATABASE_PATH || './data/evals.sqlite';
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.sqlite = new Database(this.filePath);
    this.db = drizzle(this.sqlite, { schema });

    // Create tables
    this.sqlite.exec(`
      CREATE TABLE IF NOT EXISTS datasets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS test_cases (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
        input TEXT NOT NULL,
        expected_output TEXT,
        context TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS graders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        rubric TEXT,
        config TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS candidates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        runner_type TEXT NOT NULL,
        system_prompt TEXT,
        user_prompt_template TEXT,
        model_config TEXT,
        endpoint_url TEXT,
        endpoint_method TEXT,
        endpoint_headers TEXT,
        endpoint_body_template TEXT,
        parent_id TEXT,
        variant_label TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS experiments (
        id TEXT PRIMARY KEY,
        name TEXT,
        dataset_id TEXT NOT NULL REFERENCES datasets(id),
        grader_ids TEXT NOT NULL,
        candidate_ids TEXT,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS experiment_results (
        id TEXT PRIMARY KEY,
        experiment_id TEXT NOT NULL REFERENCES experiments(id) ON DELETE CASCADE,
        test_case_id TEXT NOT NULL REFERENCES test_cases(id),
        grader_id TEXT NOT NULL REFERENCES graders(id),
        candidate_id TEXT,
        pass INTEGER NOT NULL,
        score REAL,
        reason TEXT,
        output TEXT,
        generated_output TEXT,
        latency_ms INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS metadata_schemas (
        id TEXT PRIMARY KEY,
        dataset_id TEXT NOT NULL UNIQUE REFERENCES datasets(id) ON DELETE CASCADE,
        schema_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_test_cases_dataset ON test_cases(dataset_id);
      CREATE INDEX IF NOT EXISTS idx_results_experiment ON experiment_results(experiment_id);
      CREATE INDEX IF NOT EXISTS idx_candidates_parent ON candidates(parent_id);
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);

    // Migrations for existing databases (must run before indexes on new columns)
    this.migrateColumns();

    // Indexes on migrated columns (safe after migration)
    this.sqlite.exec(`
      CREATE INDEX IF NOT EXISTS idx_results_candidate ON experiment_results(candidate_id);
    `);

    this.logger.log(`SQLite database initialized at: ${this.filePath}`);
  }

  private migrateColumns() {
    const migrations: Array<{ table: string; column: string; sql: string }> = [
      {
        table: 'experiments',
        column: 'candidate_ids',
        sql: 'ALTER TABLE experiments ADD COLUMN candidate_ids TEXT',
      },
      {
        table: 'experiment_results',
        column: 'candidate_id',
        sql: 'ALTER TABLE experiment_results ADD COLUMN candidate_id TEXT',
      },
      {
        table: 'experiment_results',
        column: 'generated_output',
        sql: 'ALTER TABLE experiment_results ADD COLUMN generated_output TEXT',
      },
      {
        table: 'experiment_results',
        column: 'latency_ms',
        sql: 'ALTER TABLE experiment_results ADD COLUMN latency_ms INTEGER',
      },
      {
        table: 'experiments',
        column: 'model_config',
        sql: 'ALTER TABLE experiments ADD COLUMN model_config TEXT',
      },
      {
        table: 'experiment_results',
        column: 'model_provider',
        sql: 'ALTER TABLE experiment_results ADD COLUMN model_provider TEXT',
      },
      {
        table: 'experiment_results',
        column: 'model_name',
        sql: 'ALTER TABLE experiment_results ADD COLUMN model_name TEXT',
      },
    ];

    for (const migration of migrations) {
      try {
        const cols = this.sqlite.pragma(`table_info(${migration.table})`);
        if (!cols.find((c: any) => c.name === migration.column)) {
          this.sqlite.exec(migration.sql);
        }
      } catch {
        /* table may not exist yet */
      }
    }
  }

  async close(): Promise<void> {
    if (this.sqlite) {
      this.sqlite.close();
    }
  }

  // ============================================================
  // Datasets
  // ============================================================

  async findAllDatasets(): Promise<Dataset[]> {
    return this.db.select().from(schema.datasets);
  }

  async findDatasetById(id: string): Promise<Dataset | null> {
    const [result] = await this.db.select().from(schema.datasets).where(eq(schema.datasets.id, id));
    return result || null;
  }

  async insertDataset(dataset: InsertDataset): Promise<Dataset> {
    await this.db.insert(schema.datasets).values(dataset);
    return dataset as Dataset;
  }

  async updateDataset(
    id: string,
    updates: Partial<Omit<Dataset, 'id' | 'createdAt'>>
  ): Promise<Dataset | null> {
    await this.db.update(schema.datasets).set(updates).where(eq(schema.datasets.id, id));
    return this.findDatasetById(id);
  }

  async deleteDataset(id: string): Promise<boolean> {
    await this.db.delete(schema.datasets).where(eq(schema.datasets.id, id));
    return true;
  }

  // ============================================================
  // Test Cases
  // ============================================================

  async findTestCasesByDatasetId(datasetId: string): Promise<TestCase[]> {
    return this.db.select().from(schema.testCases).where(eq(schema.testCases.datasetId, datasetId));
  }

  async findTestCaseById(id: string): Promise<TestCase | null> {
    const [result] = await this.db
      .select()
      .from(schema.testCases)
      .where(eq(schema.testCases.id, id));
    return result || null;
  }

  async insertTestCase(testCase: InsertTestCase): Promise<TestCase> {
    await this.db.insert(schema.testCases).values(testCase);
    return testCase as TestCase;
  }

  async updateTestCase(
    id: string,
    updates: Partial<Omit<TestCase, 'id' | 'datasetId' | 'createdAt'>>
  ): Promise<TestCase | null> {
    await this.db.update(schema.testCases).set(updates).where(eq(schema.testCases.id, id));
    return this.findTestCaseById(id);
  }

  async deleteTestCase(id: string): Promise<boolean> {
    await this.db.delete(schema.testCases).where(eq(schema.testCases.id, id));
    return true;
  }

  async countTestCasesByDatasetId(datasetId: string): Promise<number> {
    const cases = await this.findTestCasesByDatasetId(datasetId);
    return cases.length;
  }

  // ============================================================
  // Graders
  // ============================================================

  async findAllGraders(): Promise<Grader[]> {
    return this.db.select().from(schema.graders);
  }

  async findGraderById(id: string): Promise<Grader | null> {
    const [result] = await this.db.select().from(schema.graders).where(eq(schema.graders.id, id));
    return result || null;
  }

  async findGradersByIds(ids: string[]): Promise<Grader[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(schema.graders).where(inArray(schema.graders.id, ids));
  }

  async insertGrader(grader: InsertGrader): Promise<Grader> {
    await this.db.insert(schema.graders).values(grader);
    return grader as Grader;
  }

  async updateGrader(
    id: string,
    updates: Partial<Omit<Grader, 'id' | 'createdAt'>>
  ): Promise<Grader | null> {
    await this.db.update(schema.graders).set(updates).where(eq(schema.graders.id, id));
    return this.findGraderById(id);
  }

  async deleteGrader(id: string): Promise<boolean> {
    await this.db.delete(schema.graders).where(eq(schema.graders.id, id));
    return true;
  }

  // ============================================================
  // Candidates
  // ============================================================

  async findAllCandidates(): Promise<Candidate[]> {
    return this.db.select().from(schema.candidates);
  }

  async findCandidateById(id: string): Promise<Candidate | null> {
    const [result] = await this.db
      .select()
      .from(schema.candidates)
      .where(eq(schema.candidates.id, id));
    return result || null;
  }

  async findCandidatesByIds(ids: string[]): Promise<Candidate[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(schema.candidates).where(inArray(schema.candidates.id, ids));
  }

  async findCandidateVariants(parentId: string): Promise<Candidate[]> {
    return this.db.select().from(schema.candidates).where(eq(schema.candidates.parentId, parentId));
  }

  async insertCandidate(candidate: InsertCandidate): Promise<Candidate> {
    await this.db.insert(schema.candidates).values(candidate);
    return candidate as Candidate;
  }

  async updateCandidate(
    id: string,
    updates: Partial<Omit<Candidate, 'id' | 'createdAt'>>
  ): Promise<Candidate | null> {
    await this.db.update(schema.candidates).set(updates).where(eq(schema.candidates.id, id));
    return this.findCandidateById(id);
  }

  async deleteCandidate(id: string): Promise<boolean> {
    await this.db.delete(schema.candidates).where(eq(schema.candidates.id, id));
    return true;
  }

  // ============================================================
  // Experiments
  // ============================================================

  async findAllExperiments(): Promise<Experiment[]> {
    return this.db.select().from(schema.experiments);
  }

  async findExperimentById(id: string): Promise<Experiment | null> {
    const [result] = await this.db
      .select()
      .from(schema.experiments)
      .where(eq(schema.experiments.id, id));
    return result || null;
  }

  async insertExperiment(experiment: InsertExperiment): Promise<Experiment> {
    await this.db.insert(schema.experiments).values(experiment);
    return experiment as Experiment;
  }

  async updateExperiment(
    id: string,
    updates: Partial<Omit<Experiment, 'id' | 'createdAt'>>
  ): Promise<Experiment | null> {
    await this.db.update(schema.experiments).set(updates).where(eq(schema.experiments.id, id));
    return this.findExperimentById(id);
  }

  async deleteExperiment(id: string): Promise<boolean> {
    await this.db.delete(schema.experiments).where(eq(schema.experiments.id, id));
    return true;
  }

  // ============================================================
  // Experiment Results
  // ============================================================

  async findResultsByExperimentId(experimentId: string): Promise<ExperimentResult[]> {
    return this.db
      .select()
      .from(schema.experimentResults)
      .where(eq(schema.experimentResults.experimentId, experimentId));
  }

  async insertResult(result: InsertExperimentResult): Promise<ExperimentResult> {
    await this.db.insert(schema.experimentResults).values(result);
    return result as ExperimentResult;
  }

  async deleteResultsByExperimentId(experimentId: string): Promise<boolean> {
    await this.db
      .delete(schema.experimentResults)
      .where(eq(schema.experimentResults.experimentId, experimentId));
    return true;
  }

  // ============================================================
  // Aggregate Queries
  // ============================================================

  async getExperimentStats(experimentId: string): Promise<{
    total: number;
    passed: number;
    failed: number;
    byGrader: Record<string, { total: number; passed: number; avgScore: number }>;
    byCandidate: Record<
      string,
      {
        total: number;
        passed: number;
        avgScore: number;
        byGrader: Record<string, { total: number; passed: number; avgScore: number }>;
      }
    >;
  }> {
    const results = await this.findResultsByExperimentId(experimentId);

    const byGrader: Record<string, { total: number; passed: number; scores: number[] }> = {};
    const byCandidate: Record<
      string,
      {
        total: number;
        passed: number;
        scores: number[];
        byGrader: Record<string, { total: number; passed: number; scores: number[] }>;
      }
    > = {};

    for (const result of results) {
      // By grader
      if (!byGrader[result.graderId]) {
        byGrader[result.graderId] = { total: 0, passed: 0, scores: [] };
      }
      byGrader[result.graderId].total++;
      if (result.pass) byGrader[result.graderId].passed++;
      if (result.score !== null) byGrader[result.graderId].scores.push(result.score);

      // By candidate
      const candId = result.candidateId || '_default';
      if (!byCandidate[candId]) {
        byCandidate[candId] = { total: 0, passed: 0, scores: [], byGrader: {} };
      }
      byCandidate[candId].total++;
      if (result.pass) byCandidate[candId].passed++;
      if (result.score !== null) byCandidate[candId].scores.push(result.score);

      if (!byCandidate[candId].byGrader[result.graderId]) {
        byCandidate[candId].byGrader[result.graderId] = { total: 0, passed: 0, scores: [] };
      }
      byCandidate[candId].byGrader[result.graderId].total++;
      if (result.pass) byCandidate[candId].byGrader[result.graderId].passed++;
      if (result.score !== null) {
        byCandidate[candId].byGrader[result.graderId].scores.push(result.score);
      }
    }

    const avgOf = (scores: number[]) =>
      scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    const finalByGrader: Record<string, { total: number; passed: number; avgScore: number }> = {};
    for (const [graderId, data] of Object.entries(byGrader)) {
      finalByGrader[graderId] = {
        total: data.total,
        passed: data.passed,
        avgScore: avgOf(data.scores),
      };
    }

    const finalByCandidate: Record<
      string,
      {
        total: number;
        passed: number;
        avgScore: number;
        byGrader: Record<string, { total: number; passed: number; avgScore: number }>;
      }
    > = {};
    for (const [candId, data] of Object.entries(byCandidate)) {
      const candByGrader: Record<string, { total: number; passed: number; avgScore: number }> = {};
      for (const [gid, gdata] of Object.entries(data.byGrader)) {
        candByGrader[gid] = {
          total: gdata.total,
          passed: gdata.passed,
          avgScore: avgOf(gdata.scores),
        };
      }
      finalByCandidate[candId] = {
        total: data.total,
        passed: data.passed,
        avgScore: avgOf(data.scores),
        byGrader: candByGrader,
      };
    }

    return {
      total: results.length,
      passed: results.filter((r) => r.pass).length,
      failed: results.filter((r) => !r.pass).length,
      byGrader: finalByGrader,
      byCandidate: finalByCandidate,
    };
  }

  // ============================================================
  // Metadata Schemas
  // ============================================================

  async findMetadataSchemaByDatasetId(datasetId: string): Promise<MetadataSchema | null> {
    const [result] = await this.db
      .select()
      .from(schema.metadataSchemas)
      .where(eq(schema.metadataSchemas.datasetId, datasetId));
    return result || null;
  }

  async upsertMetadataSchema(datasetId: string, schemaJson: string): Promise<MetadataSchema> {
    const existing = await this.findMetadataSchemaByDatasetId(datasetId);
    const now = new Date();

    if (existing) {
      await this.db
        .update(schema.metadataSchemas)
        .set({ schemaJson, updatedAt: now })
        .where(eq(schema.metadataSchemas.datasetId, datasetId));
      return { ...existing, schemaJson, updatedAt: now };
    }

    const newSchema: MetadataSchema = {
      id: randomUUID(),
      datasetId,
      schemaJson,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.insert(schema.metadataSchemas).values(newSchema);
    return newSchema;
  }

  async deleteMetadataSchema(datasetId: string): Promise<boolean> {
    await this.db
      .delete(schema.metadataSchemas)
      .where(eq(schema.metadataSchemas.datasetId, datasetId));
    return true;
  }

  // ============================================================
  // Settings
  // ============================================================

  async findAllSettings(): Promise<Settings[]> {
    return this.db.select().from(schema.settings);
  }

  async findSettingByKey(key: string): Promise<Settings | null> {
    const [result] = await this.db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key));
    return result || null;
  }

  async upsertSetting(key: string, value: string): Promise<Settings> {
    const existing = await this.findSettingByKey(key);
    const now = new Date();

    if (existing) {
      await this.db
        .update(schema.settings)
        .set({ value, updatedAt: now })
        .where(eq(schema.settings.key, key));
      return { ...existing, value, updatedAt: now };
    } else {
      const setting: Settings = {
        id: randomUUID(),
        key,
        value,
        updatedAt: now,
      };
      await this.db.insert(schema.settings).values(setting);
      return setting;
    }
  }

  async deleteSetting(key: string): Promise<boolean> {
    await this.db.delete(schema.settings).where(eq(schema.settings.key, key));
    return true;
  }
}
