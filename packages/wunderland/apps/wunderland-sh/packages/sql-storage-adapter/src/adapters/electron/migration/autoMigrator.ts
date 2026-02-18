/**
 * Auto-Migration System for Electron Apps.
 *
 * Automatically runs database migrations when the application version
 * changes. Tracks applied migrations and supports rollback.
 *
 * ## Features
 * - Version detection via package.json or app.getVersion()
 * - Automatic migration on app update
 * - Migration file discovery and ordering
 * - Rollback support
 * - Transaction-wrapped migrations
 *
 * @example
 * ```typescript
 * const migrator = new AutoMigrator(adapter, {
 *   migrationsPath: path.join(__dirname, 'migrations'),
 *   runOnVersionChange: true,
 * });
 *
 * await migrator.initialize();
 * await migrator.runPending();
 * ```
 */

import fs from 'fs';
import path from 'path';
import type { StorageAdapter } from '../../../core/contracts';

// ============================================================================
// Types
// ============================================================================

/**
 * Migration file definition.
 */
export interface MigrationFile {
  /** Migration version/order number */
  version: number;
  /** Migration name */
  name: string;
  /** Full file path */
  path: string;
  /** SQL content (up migration) */
  up: string;
  /** SQL content (down migration, optional) */
  down?: string;
}

/**
 * Applied migration record.
 */
export interface AppliedMigration {
  version: number;
  name: string;
  appliedAt: number;
  appVersion: string;
  checksum: string;
}

/**
 * Migration result.
 */
export interface MigrationResult {
  success: boolean;
  migrationsRun: number;
  migrationsFailed: number;
  duration: number;
  appliedMigrations: string[];
  errors: Array<{ migration: string; error: string }>;
}

/**
 * Auto-migrator configuration.
 */
export interface AutoMigratorConfig {
  /** Path to migrations directory */
  migrationsPath: string;
  /** Run migrations on version change (default: true) */
  runOnVersionChange?: boolean;
  /** Table name for tracking migrations (default: '_migrations') */
  tableName?: string;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
  /** Get current app version (default: reads from package.json or electron) */
  getAppVersion?: () => string;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG = {
  runOnVersionChange: true,
  tableName: '_migrations',
  verbose: false,
};

// ============================================================================
// Auto Migrator
// ============================================================================

/**
 * Auto Migration Manager.
 *
 * Handles automatic database migrations for Electron applications.
 */
export class AutoMigrator {
  private readonly config: Required<AutoMigratorConfig>;
  private migrations: MigrationFile[] = [];
  private isInitialized = false;
  private lastMigrationResult: MigrationResult | null = null;

  constructor(
    private readonly adapter: StorageAdapter,
    config: AutoMigratorConfig
  ) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      getAppVersion: config.getAppVersion ?? this.defaultGetAppVersion.bind(this),
    };
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the migration system.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create migrations table
    await this.createMigrationsTable();

    // Load migration files
    this.migrations = await this.loadMigrations();

    // Check for version change and run if configured
    if (this.config.runOnVersionChange) {
      const shouldRun = await this.shouldRunMigrations();
      if (shouldRun) {
        this.log('App version changed, running migrations...');
        await this.runPending();
      }
    }

    this.isInitialized = true;
    this.log(`AutoMigrator initialized with ${this.migrations.length} migrations`);
  }

  /**
   * Create the migrations tracking table.
   */
  private async createMigrationsTable(): Promise<void> {
    await this.adapter.exec(`
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL,
        app_version TEXT NOT NULL,
        checksum TEXT NOT NULL
      )
    `);
  }

  // ============================================================================
  // Migration Discovery
  // ============================================================================

  /**
   * Load all migration files from the migrations directory.
   */
  private async loadMigrations(): Promise<MigrationFile[]> {
    const migrationsPath = this.config.migrationsPath;

    if (!fs.existsSync(migrationsPath)) {
      this.log(`Migrations directory not found: ${migrationsPath}`);
      return [];
    }

    const files = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql') || f.endsWith('.js') || f.endsWith('.ts'))
      .sort();

    const migrations: MigrationFile[] = [];

    for (const file of files) {
      const filePath = path.join(migrationsPath, file);
      const migration = await this.parseMigrationFile(filePath);
      if (migration) {
        migrations.push(migration);
      }
    }

    // Sort by version
    migrations.sort((a, b) => a.version - b.version);

    return migrations;
  }

  /**
   * Parse a migration file.
   */
  private async parseMigrationFile(filePath: string): Promise<MigrationFile | null> {
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath);

    // Extract version and name from filename (e.g., "001_create_users.sql")
    const match = fileName.match(/^(\d+)[_-](.+)\.(sql|js|ts)$/);
    if (!match) {
      this.log(`Skipping invalid migration filename: ${fileName}`);
      return null;
    }

    const version = parseInt(match[1], 10);
    const name = match[2];

    if (ext === '.sql') {
      return this.parseSqlMigration(filePath, version, name);
    } else {
      return this.parseJsMigration(filePath, version, name);
    }
  }

  /**
   * Parse a SQL migration file.
   * Supports UP and DOWN sections separated by `-- DOWN`.
   */
  private parseSqlMigration(filePath: string, version: number, name: string): MigrationFile {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Split on -- DOWN marker
    const parts = content.split(/^--\s*DOWN\s*$/im);
    const up = parts[0].trim();
    const down = parts[1]?.trim();

    return { version, name, path: filePath, up, down };
  }

  /**
   * Parse a JS/TS migration file.
   * Expects exports: { up: string, down?: string }
   */
  private async parseJsMigration(
    filePath: string,
    version: number,
    name: string
  ): Promise<MigrationFile | null> {
    try {
      // Dynamic import for ESM compatibility
      const module = await import(filePath);
      const exports = module.default ?? module;

      if (!exports.up) {
        this.log(`Migration ${name} missing 'up' export`);
        return null;
      }

      return {
        version,
        name,
        path: filePath,
        up: typeof exports.up === 'function' ? await exports.up() : exports.up,
        down: typeof exports.down === 'function' ? await exports.down() : exports.down,
      };
    } catch (error) {
      this.log(`Failed to load migration ${name}: ${error}`);
      return null;
    }
  }

  // ============================================================================
  // Migration Execution
  // ============================================================================

  /**
   * Run all pending migrations.
   */
  public async runPending(): Promise<MigrationResult> {
    const startTime = Date.now();
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    const pending = this.migrations.filter(m => !appliedVersions.has(m.version));

    if (pending.length === 0) {
      this.log('No pending migrations');
      return {
        success: true,
        migrationsRun: 0,
        migrationsFailed: 0,
        duration: Date.now() - startTime,
        appliedMigrations: [],
        errors: [],
      };
    }

    const result: MigrationResult = {
      success: true,
      migrationsRun: 0,
      migrationsFailed: 0,
      duration: 0,
      appliedMigrations: [],
      errors: [],
    };

    for (const migration of pending) {
      try {
        await this.applyMigration(migration);
        result.migrationsRun++;
        result.appliedMigrations.push(migration.name);
        this.log(`Applied migration: ${migration.name}`);
      } catch (error) {
        result.migrationsFailed++;
        result.success = false;
        result.errors.push({
          migration: migration.name,
          error: error instanceof Error ? error.message : String(error),
        });
        this.log(`Failed migration: ${migration.name} - ${error}`);
        break; // Stop on first failure
      }
    }

    result.duration = Date.now() - startTime;
    this.lastMigrationResult = result;

    return result;
  }

  /**
   * Run a single migration.
   */
  private async applyMigration(migration: MigrationFile): Promise<void> {
    const appVersion = this.config.getAppVersion();
    const checksum = this.calculateChecksum(migration.up);

    // Run in transaction
    await this.adapter.transaction(async (trx) => {
      // Execute the migration SQL
      await trx.exec(migration.up);

      // Record the migration
      await trx.run(
        `INSERT INTO ${this.config.tableName} (version, name, applied_at, app_version, checksum) VALUES (?, ?, ?, ?, ?)`,
        [migration.version, migration.name, Date.now(), appVersion, checksum]
      );
    });
  }

  /**
   * Run a specific migration by version.
   */
  public async runMigrationByVersion(version: number): Promise<void> {
    const migration = this.migrations.find(m => m.version === version);
    if (!migration) {
      throw new Error(`Migration version ${version} not found`);
    }
    await this.applyMigration(migration);
  }

  // ============================================================================
  // Rollback
  // ============================================================================

  /**
   * Rollback the last applied migration.
   */
  public async rollbackLast(): Promise<MigrationResult> {
    const startTime = Date.now();
    const applied = await this.getAppliedMigrations();

    if (applied.length === 0) {
      return {
        success: true,
        migrationsRun: 0,
        migrationsFailed: 0,
        duration: Date.now() - startTime,
        appliedMigrations: [],
        errors: [],
      };
    }

    // Get the last applied migration
    const lastApplied = applied[applied.length - 1];
    const migration = this.migrations.find(m => m.version === lastApplied.version);

    if (!migration) {
      throw new Error(`Migration ${lastApplied.version} not found in migration files`);
    }

    if (!migration.down) {
      throw new Error(`Migration ${migration.name} does not have a rollback script`);
    }

    try {
      await this.adapter.transaction(async (trx) => {
        // Execute rollback SQL
        await trx.exec(migration.down!);

        // Remove migration record
        await trx.run(
          `DELETE FROM ${this.config.tableName} WHERE version = ?`,
          [migration.version]
        );
      });

      this.log(`Rolled back migration: ${migration.name}`);

      return {
        success: true,
        migrationsRun: 1,
        migrationsFailed: 0,
        duration: Date.now() - startTime,
        appliedMigrations: [migration.name],
        errors: [],
      };
    } catch (error) {
      return {
        success: false,
        migrationsRun: 0,
        migrationsFailed: 1,
        duration: Date.now() - startTime,
        appliedMigrations: [],
        errors: [{
          migration: migration.name,
          error: error instanceof Error ? error.message : String(error),
        }],
      };
    }
  }

  /**
   * Rollback to a specific version.
   */
  public async rollbackTo(targetVersion: number): Promise<MigrationResult> {
    const startTime = Date.now();
    const applied = await this.getAppliedMigrations();
    const toRollback = applied
      .filter(m => m.version > targetVersion)
      .reverse(); // Rollback in reverse order

    const result: MigrationResult = {
      success: true,
      migrationsRun: 0,
      migrationsFailed: 0,
      duration: 0,
      appliedMigrations: [],
      errors: [],
    };

    for (const migration of toRollback) {
      const migrationFile = this.migrations.find(m => m.version === migration.version);

      if (!migrationFile?.down) {
        result.migrationsFailed++;
        result.success = false;
        result.errors.push({
          migration: migration.name,
          error: 'No rollback script available',
        });
        break;
      }

      try {
        await this.adapter.transaction(async (trx) => {
          await trx.exec(migrationFile.down!);
          await trx.run(
            `DELETE FROM ${this.config.tableName} WHERE version = ?`,
            [migration.version]
          );
        });

        result.migrationsRun++;
        result.appliedMigrations.push(migration.name);
      } catch (error) {
        result.migrationsFailed++;
        result.success = false;
        result.errors.push({
          migration: migration.name,
          error: error instanceof Error ? error.message : String(error),
        });
        break;
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  // ============================================================================
  // Status & Query
  // ============================================================================

  /**
   * Get all applied migrations.
   */
  public async getAppliedMigrations(): Promise<AppliedMigration[]> {
    const rows = await this.adapter.all<{
      version: number;
      name: string;
      applied_at: number;
      app_version: string;
      checksum: string;
    }>(`SELECT * FROM ${this.config.tableName} ORDER BY version ASC`);

    return rows.map(row => ({
      version: row.version,
      name: row.name,
      appliedAt: row.applied_at,
      appVersion: row.app_version,
      checksum: row.checksum,
    }));
  }

  /**
   * Get pending migrations.
   */
  public async getPendingMigrations(): Promise<MigrationFile[]> {
    const applied = await this.getAppliedMigrations();
    const appliedVersions = new Set(applied.map(m => m.version));
    return this.migrations.filter(m => !appliedVersions.has(m.version));
  }

  /**
   * Get migration status.
   */
  public async getStatus(): Promise<{
    currentVersion: number;
    latestVersion: number;
    pending: string[];
    applied: string[];
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();

    return {
      currentVersion: applied.length > 0 ? applied[applied.length - 1].version : 0,
      latestVersion: this.migrations.length > 0 ? this.migrations[this.migrations.length - 1].version : 0,
      pending: pending.map(m => m.name),
      applied: applied.map(m => m.name),
    };
  }

  /**
   * Check if migrations should run based on version change.
   */
  private async shouldRunMigrations(): Promise<boolean> {
    const pending = await this.getPendingMigrations();
    return pending.length > 0;
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  /**
   * Default app version getter.
   */
  private defaultGetAppVersion(): string {
    try {
      // Try Electron first
      const { app } = require('electron');
      if (app?.getVersion) {
        return app.getVersion();
      }
    } catch {
      // Not in Electron or electron not available
    }

    try {
      // Fall back to package.json
      const packagePath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packagePath)) {
        const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
        return pkg.version ?? '0.0.0';
      }
    } catch {
      // Ignore errors
    }

    return '0.0.0';
  }

  /**
   * Calculate checksum of migration content.
   */
  private calculateChecksum(content: string): string {
    // Simple hash for verification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Log a message if verbose mode is enabled.
   */
  private log(message: string): void {
    if (this.config.verbose) {
      console.log(`[AutoMigrator] ${message}`);
    }
  }

  /**
   * Get the last migration result.
   */
  public getLastResult(): MigrationResult | null {
    return this.lastMigrationResult;
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an Auto Migrator.
 *
 * @param adapter - Storage adapter to manage
 * @param config - Migrator configuration
 * @returns AutoMigrator instance
 */
export function createAutoMigrator(
  adapter: StorageAdapter,
  config: AutoMigratorConfig
): AutoMigrator {
  return new AutoMigrator(adapter, config);
}
