/**
 * Migration Module for Electron SQL Storage Adapter.
 *
 * Provides automatic database migration management for Electron applications.
 *
 * @packageDocumentation
 */

export {
  AutoMigrator,
  createAutoMigrator,
  type AutoMigratorConfig,
  type MigrationFile,
  type AppliedMigration,
  type MigrationResult,
} from './autoMigrator';
