/**
 * @file main.ts
 * @description NestJS bootstrap entry point for the standalone Wunderland backend.
 * Initializes the NestJS application with CORS, cookie-parser, validation,
 * and all global middleware/filters/interceptors.
 */

import 'reflect-metadata';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { createLogger, getErrorMessage } from '../utils/logger.js';
import { shutdownOtel, startOtel } from './observability/otel.js';

const logger = createLogger('WunderlandServer');

/**
 * Bootstrap the NestJS application.
 */
async function bootstrap(): Promise<void> {
  await startOtel();
  logger.info('Initializing Wunderland services...');

  const { NestFactory } = await import('@nestjs/core');
  const { ValidationPipe } = await import('@nestjs/common');
  const cookieParser = (await import('cookie-parser')).default;
  const { AppModule } = await import('./app.module.js');
  const { HttpExceptionFilter } = await import('./common/filters/http-exception.filter.js');
  const { NotFoundFilter } = await import('./common/filters/not-found.filter.js');
  const { LoggingInterceptor } = await import('./common/interceptors/logging.interceptor.js');
  const { initializeAppDatabase, closeAppDatabase } = await import('./core/database/appDatabase.js');
  const { initializeLlmServices } = await import('./core/llm/llm.factory.js');
  const { NoLlmProviderConfiguredError, LlmConfigService } = await import(
    './core/llm/llm.config.service.js',
  );
  const { setLlmBootstrapStatus, getLlmBootstrapStatus, mapAvailabilityToStatus } = await import(
    './core/llm/llm.status.js',
  );
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const { rateLimiter } = await import('../middleware/ratelimiter.js');

  // ── Pre-NestJS service initialization ──────────────────────────────────
  setLlmBootstrapStatus({
    ready: false,
    code: 'BOOTSTRAP_PENDING',
    message: 'LLM services are initializing.',
    timestamp: new Date().toISOString(),
    providers: {},
  });

  try {
    await initializeAppDatabase();
    await initializeLlmServices();
    const snapshot = LlmConfigService.getInstance().getProviderAvailabilitySnapshot();
    setLlmBootstrapStatus({
      ready: true,
      code: 'LLM_READY',
      message: 'LLM services initialized successfully.',
      timestamp: new Date().toISOString(),
      providers: mapAvailabilityToStatus(snapshot),
    });
  } catch (error) {
    if (error instanceof NoLlmProviderConfiguredError) {
      const llmError = error as InstanceType<typeof NoLlmProviderConfiguredError>;
      logger.error('No configured providers detected. Running in degraded mode.');
      setLlmBootstrapStatus({
        ready: false,
        code: 'NO_LLM_PROVIDER',
        message: llmError.message,
        timestamp: new Date().toISOString(),
        providers: mapAvailabilityToStatus(llmError.availability),
      });
    } else {
      const msg = (error as Error)?.message || 'Failed to initialize LLM services.';
      logger.error('LLM initialization failed, continuing in degraded mode: %s', msg);
      setLlmBootstrapStatus({
        ready: false,
        code: 'LLM_INIT_FAILURE',
        message: msg,
        timestamp: new Date().toISOString(),
        providers: {},
      });
    }
  }

  await rateLimiter.initialize();
  logger.info('Core services initialized.');

  // ── Create NestJS app ──────────────────────────────────────────────────
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ── Global prefix ─────────────────────────────────────────────────────
  app.setGlobalPrefix('api', {
    exclude: ['health'],
  });

  // ── Trust proxy (for rate limiting behind reverse proxies) ─────────────
  app.set('trust proxy', 1);

  // ── CORS ───────────────────────────────────────────────────────────────
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3010',
      'http://localhost:5173',
      'http://localhost:5175',
      ...(process.env.ADDITIONAL_CORS_ORIGINS
        ? process.env.ADDITIONAL_CORS_ORIGINS.split(',')
        : []),
    ],
    credentials: true,
    exposedHeaders: [
      'X-RateLimit-Limit-Day-IP',
      'X-RateLimit-Remaining-Day-IP',
      'X-RateLimit-Reset-Day-IP',
      'X-RateLimit-Status',
      'X-RateLimit-Tier',
      'X-RateLimit-Limit-RPM',
      'X-RateLimit-Remaining-RPM',
    ],
  });

  // ── Middleware ──────────────────────────────────────────────────────────
  app.use(cookieParser());

  // ── Global pipes ───────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // ── Global filters ─────────────────────────────────────────────────────
  app.useGlobalFilters(new NotFoundFilter(), new HttpExceptionFilter());

  // ── Global interceptors ────────────────────────────────────────────────
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ── Swagger / OpenAPI ───────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Wunderland API')
    .setDescription(
      'Wunderland on Sol — autonomous agent social network'
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('system', 'Health checks and diagnostics')
    .addTag('auth', 'Authentication and user management')
    .addTag('wunderland', 'Agent social network')
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDoc);
  logger.info('Swagger docs available at /api/docs');

  // ── Body parsing limits ────────────────────────────────────────────────
  app.useBodyParser('json', { limit: '50mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '50mb' });

  // ── Start listening ────────────────────────────────────────────────────
  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);

  const llmStatus = getLlmBootstrapStatus();
  if (!llmStatus.ready) {
    logger.warn('Server running without an active LLM provider.');
  }

  logger.info('Ready at http://localhost:%s', PORT);
  logger.info('Node ENV: %s', process.env.NODE_ENV || 'development');

  // ── Quick links ────────────────────────────────────────────────────────
  const base = `http://localhost:${PORT}`;
  const links = [
    `${base}/health`,
    `${base}/api/system/llm-status`,
    `${base}/api/docs`,
  ];
  console.log('\n\x1b[36m\u203a Quick links:\x1b[0m');
  for (const url of links) console.log('  -', url);

  // ── Graceful shutdown ──────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info('Received %s. Starting graceful shutdown...', signal);
    try {
      await rateLimiter.disconnectStore();
    } catch {
      /* ignore */
    }
    try {
      await closeAppDatabase();
    } catch {
      /* ignore */
    }
    await app.close();
    try {
      await shutdownOtel();
    } catch {
      /* ignore */
    }
    logger.info('Graceful shutdown complete.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// ── Auto-start ────────────────────────────────────────────────────────────────
bootstrap().catch((error: unknown) => {
  logger.error('Failed to start server: %s', getErrorMessage(error));
  void shutdownOtel();
  process.exit(1);
});

export { bootstrap };
