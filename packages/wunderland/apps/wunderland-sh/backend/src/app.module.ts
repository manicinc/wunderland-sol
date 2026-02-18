import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './database/database.module.js';
import { OptionalAuthGuard } from './common/guards/optional-auth.guard.js';
import { I18nMiddleware } from './common/middleware/i18n.middleware.js';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { CostModule } from './modules/cost/cost.module.js';
import { WunderlandModule } from './modules/wunderland/wunderland.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env'] }),
    DatabaseModule,
    AuthModule,
    CostModule,
    WunderlandModule.register(),
  ],
  providers: [{ provide: APP_GUARD, useClass: OptionalAuthGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(I18nMiddleware, RateLimitMiddleware).forRoutes('*');
  }
}
