import { Module, Global, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DB_ADAPTER, DbAdapterType, IDbAdapter } from './interfaces/db-adapter.interface';
import { SqliteAdapter } from './adapters/sqlite.adapter';

/**
 * Database Module
 *
 * Provides a database adapter using the adapter pattern.
 * Currently supports SQLite, with PostgreSQL adapter ready to implement.
 *
 * Configure via environment variables:
 * - DB_TYPE: 'sqlite' | 'postgres' (default: 'sqlite')
 * - DATABASE_PATH: path to SQLite file (default: './data/evals.sqlite')
 * - DATABASE_URL: PostgreSQL connection string (for postgres adapter)
 */
@Global()
@Module({
  providers: [
    {
      provide: DB_ADAPTER,
      useFactory: async (configService: ConfigService): Promise<IDbAdapter> => {
        const dbType = (configService.get('DB_TYPE') || 'sqlite') as DbAdapterType;

        let adapter: IDbAdapter;

        switch (dbType) {
          case 'postgres':
            // Future: implement PostgresAdapter
            throw new Error('PostgreSQL adapter not yet implemented. Use sqlite.');

          case 'sqlite':
          default:
            const dbPath = configService.get('DATABASE_PATH') || './data/evals.sqlite';
            adapter = new SqliteAdapter(dbPath);
            break;
        }

        await adapter.initialize();
        return adapter;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DB_ADAPTER],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor() {}

  onModuleInit() {
    // Adapter initialization happens in factory
  }

  async onModuleDestroy() {
    // Cleanup handled by adapter.close() if needed
  }
}

// Re-export for convenience
export { DB_ADAPTER } from './interfaces/db-adapter.interface';
export type { IDbAdapter } from './interfaces/db-adapter.interface';
