/**
 * @file app.module.ts
 * @description Root application module. Imports all feature modules and configures
 * global providers (database, config, guards). Replaces the Express router.ts.
 */

import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { OptionalAuthGuard } from './common/guards/optional-auth.guard.js';
import { I18nMiddleware } from './common/middleware/i18n.middleware.js';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { SpeechModule } from './modules/speech/speech.module.js';
import { BillingModule } from './modules/billing/billing.module.js';
import { CostModule } from './modules/cost/cost.module.js';
import { OrganizationModule } from './modules/organization/organization.module.js';
import { AgentsModule } from './modules/agents/agents.module.js';
import { MarketplaceModule } from './modules/marketplace/marketplace.module.js';
import { SystemModule } from './modules/system/system.module.js';
import { SettingsModule } from './modules/settings/settings.module.js';
import { AgentOSModule } from './modules/agentos/agentos.module.js';
import { SupportModule } from './modules/support/support.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    ChatModule,
    SpeechModule,
    BillingModule,
    CostModule,
    OrganizationModule,
    AgentsModule,
    MarketplaceModule,
    SystemModule,
    SettingsModule,
    AgentOSModule,
    SupportModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: OptionalAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  /**
   * Apply global middleware to all API routes.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(I18nMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}
