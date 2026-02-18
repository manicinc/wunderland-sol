/**
 * @file database.module.ts
 * @description Global database module wrapping the existing appDatabase.ts
 * StorageAdapter. Provides DatabaseService for injection across all modules.
 */

import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
