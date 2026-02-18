// File: backend/server.ts
/**
 * @file Main backend server setup for Voice Chat Assistant.
 * @description Initializes Express app, configures middleware, sets up routes,
 * and starts the HTTP server.
 * @version 1.3.0 - Added rateLimiter initialization and graceful shutdown.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http'; // Added for graceful shutdown
import fs from 'fs'; // Import fs for file system operations

import { configureRouter } from './config/router.js';
import { optionalAuthMiddleware } from './middleware/optionalAuth.js';
import { rateLimiter } from './middleware/ratelimiter.js'; // Import the instance
import { setupI18nMiddleware } from './middleware/i18n.js';
import { initializeLlmServices } from './src/core/llm/llm.factory.js';
import { NoLlmProviderConfiguredError, LlmConfigService } from './src/core/llm/llm.config.service.js';
import { setLlmBootstrapStatus, getLlmBootstrapStatus, mapAvailabilityToStatus } from './src/core/llm/llm.status.js';
import { sqliteMemoryAdapter } from './src/core/memory/SqliteMemoryAdapter.js'; // Import for shutdown
import { initializeAppDatabase, closeAppDatabase } from './src/core/database/appDatabase.js';
import { schedulePredictiveTtsPrewarm } from './src/core/audio/ttsPrewarm.service.js';
import { createLogger, getErrorMessage } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const logger = createLogger('Server');
const bootstrapLogger = logger.child('Bootstrap');
const llmLogger = logger.child('LLM');
const middlewareLogger = logger.child('Middleware');
const routerLogger = logger.child('Router');
const frontendLogger = logger.child('Frontend');
const httpLogger = logger.child('Http');
const shutdownLogger = logger.child('Shutdown');
const storageLogger = logger.child('Storage');
const costLogger = logger.child('Costs');
const rateLimiterLogger = logger.child('RateLimiter');
const i18nLogger = logger.child('i18n');

const envCandidatePaths = [
  path.join(projectRoot, '.env'),
  path.resolve(projectRoot, '..', '.env'),
];

for (const candidate of envCandidatePaths) {
  try {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate });
      bootstrapLogger.info('Loaded environment variables from %s', candidate);
    }
  } catch (error) {
    bootstrapLogger.warn('Failed to load env file at %s:', candidate, error);
  }
}

setLlmBootstrapStatus({
  ready: false,
  code: 'BOOTSTRAP_PENDING',
  message: 'LLM services are initializing.',
  timestamp: new Date().toISOString(),
  providers: {},
});

const PORT = process.env.PORT || 3001;
const app: Express = express();
let server: http.Server; // To store the server instance for graceful shutdown

app.set('trust proxy', 1);

// --- Middleware Configuration ---
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
app.use(cors({
  origin: [
    frontendUrl,
    'http://localhost:5173', // Default Vite dev port, useful for flexibility
    'http://localhost:5175', // Vite dev port used by agentos-workbench
    ...(process.env.ADDITIONAL_CORS_ORIGINS ? process.env.ADDITIONAL_CORS_ORIGINS.split(',') : []),
  ],
  credentials: true,
  exposedHeaders: ['X-RateLimit-Limit-Day-IP', 'X-RateLimit-Remaining-Day-IP', 'X-RateLimit-Reset-Day-IP', 'X-RateLimit-Status'],
}));

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '50mb' })); // For parsing application/json
app.use(express.urlencoded({ extended: true, limit: '50mb' })); // For parsing application/x-www-form-urlencoded
app.use(cookieParser());

// --- Server Initialization and Middleware Application ---
async function startServer() {
  bootstrapLogger.info('Initializing application services...');
  try {
    await initializeAppDatabase();
    await initializeLlmServices();
    const availabilitySnapshot = LlmConfigService.getInstance().getProviderAvailabilitySnapshot();
    setLlmBootstrapStatus({
      ready: true,
      code: 'LLM_READY',
      message: 'LLM services initialized successfully.',
      timestamp: new Date().toISOString(),
      providers: mapAvailabilityToStatus(availabilitySnapshot),
    });
  } catch (error) {
    if (error instanceof NoLlmProviderConfiguredError) {
      llmLogger.error('No configured providers detected. Running in degraded mode.', error.availability);
      setLlmBootstrapStatus({
        ready: false,
        code: 'NO_LLM_PROVIDER',
        message: error.message,
        timestamp: new Date().toISOString(),
        providers: mapAvailabilityToStatus(error.availability),
      });
    } else {
      const msg = (error as Error)?.message || 'Failed to initialize LLM services.';
      llmLogger.error('LLM initialization failed, continuing in degraded mode: %s', msg);
      setLlmBootstrapStatus({
        ready: false,
        code: 'LLM_INIT_FAILURE',
        message: msg,
        timestamp: new Date().toISOString(),
        providers: {},
      });
      // Do NOT rethrow here; backend should still start so /health works even if LLM is misconfigured.
    }
  }

  await sqliteMemoryAdapter.initialize();
  await rateLimiter.initialize();
  bootstrapLogger.info('Core services initialized.');

  const i18nHandlers = await setupI18nMiddleware();
  app.use(i18nHandlers);
  i18nLogger.info('Middleware configured.');

  app.use('/api', optionalAuthMiddleware);
  app.use('/api', rateLimiter.middleware());
  middlewareLogger.info('Authentication and rate limiting configured for /api.');

  const apiRouter = await configureRouter();
  app.use('/api', apiRouter);
  routerLogger.info('API routes configured under /api');

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      llm: getLlmBootstrapStatus(),
    });
  });

  if (process.env.SERVE_FRONTEND === 'true') {
    const frontendBuildPath = path.join(projectRoot, 'frontend', 'dist');
    const indexPath = path.join(frontendBuildPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      app.use(express.static(frontendBuildPath));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          return next();
        }
        if (req.headers.accept && req.headers.accept.includes('text/html')) {
          res.sendFile(indexPath);
        } else {
          next();
        }
      });
      frontendLogger.info('Serving static assets from %s', frontendBuildPath);
    } else {
      frontendLogger.warn('SERVE_FRONTEND is true, but index.html not found at %s', indexPath);
    }
  }

  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!res.headersSent) {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ message: `API endpoint not found: ${req.method} ${req.originalUrl}` });
      } else {
        res.status(404).type('text/plain').send('Resource not found on this server.');
      }
    } else {
      next();
    }
  });

  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    httpLogger.error('Unhandled application error:', err.stack || err);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? { name: err.name, message: err.message, stack: err.stack } : { message: 'An unexpected error occurred.' }
      });
    } else {
      next(err);
    }
  });

  server = app.listen(PORT, () => {
    httpLogger.info('Listening on port %s', PORT);
    httpLogger.info('Frontend URL (configured): %s', frontendUrl);
    httpLogger.info('Node ENV: %s', process.env.NODE_ENV || 'development');
    if (process.env.ENABLE_SQLITE_MEMORY === 'true') {
      storageLogger.info('SQLite memory persistence: ENABLED');
    } else {
      storageLogger.warn('SQLite memory persistence: DISABLED (server is stateless regarding conversation history)');
    }
    if (process.env.DISABLE_COST_LIMITS === 'true') {
      costLogger.warn('Cost limits: DISABLED.');
    }
    if (process.env.REDIS_URL) {
      rateLimiterLogger.info('Redis configured at %s.', process.env.REDIS_URL);
    } else {
      rateLimiterLogger.warn('REDIS_URL not provided. Using in-memory store.');
    }
    const llmStatusAtStart = getLlmBootstrapStatus();
    if (!llmStatusAtStart.ready) {
      llmLogger.warn('Server running without an active LLM provider. Configure provider credentials to enable chat endpoints.');
    }
    // Optional: TTS prewarm can be noisy; enable via PREWARM_TTS=true
    if (process.env.PREWARM_TTS === 'true') {
      schedulePredictiveTtsPrewarm();
    } else {
      httpLogger.info('TTS prewarm: disabled (set PREWARM_TTS=true to enable)');
    }
    httpLogger.info('Ready at http://localhost:%s', PORT);

    // Quick links (clickable)
    const base = `http://localhost:${PORT}`;
    const links = [
      `${base}/health`,
      `${base}/api/test`,
      `${base}/api/system/llm-status`,
      `${base}/api/system/storage-status`,
      `${base}/api/docs`,
      `${base}/api/agentos/personas`,
      `${base}/api/agentos/workflows/definitions`
    ];
    console.log('\n\x1b[36m› Quick links:\x1b[0m');
    for (const url of links) console.log('  -', url);
  }).on('error', (error: NodeJS.ErrnoException) => {
    httpLogger.error('Failed to start:', error);
    if (error.code === 'EADDRINUSE') {
      httpLogger.error('Port %s is already in use.', PORT);
    }
    process.exit(1);
  });



}

async function gracefulShutdown(signal: string) {
  shutdownLogger.info('\n🚦 Received %s. Starting graceful shutdown...', signal);

  if (server) {
    server.close(async () => {
      shutdownLogger.info('🔌 HTTP server closed.');

      try {
        await rateLimiter.disconnectStore();
        rateLimiterLogger.info('🛡️ Rate limiter store disconnected.');
      } catch (error) {
        rateLimiterLogger.error('Error disconnecting rate limiter: %s', getErrorMessage(error));
      }

      try {
        await sqliteMemoryAdapter.disconnect();
        storageLogger.info('💾 SQLite Memory Adapter disconnected.');
      } catch (error) {
        storageLogger.error('Error disconnecting SQLite adapter: %s', getErrorMessage(error));
      }

      try {
        await closeAppDatabase();
      } catch (error) {
        storageLogger.error('Error closing application database: %s', getErrorMessage(error));
      }

      shutdownLogger.info('👋 Graceful shutdown complete. Exiting.');
      process.exit(0);
    });

    setTimeout(() => {
      shutdownLogger.error('⏰ Graceful shutdown timeout. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// Listen for termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Export for Electron embedding
export { startServer, gracefulShutdown };

// Only auto-start when run directly (not imported by Electron)
// Check if this module is being run directly vs imported
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, '/')}`;

if (isMainModule) {
  startServer().catch((error: unknown) => {
    bootstrapLogger.error('💥 Failed to start server due to unhandled error during initialization: %s', getErrorMessage(error));
    process.exit(1);
  });
}
