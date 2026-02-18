import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  // Enable CORS for frontend
  app.enableCors({
    origin: ['http://localhost:3020', 'http://localhost:3000'],
    credentials: true,
  });

  // Global prefix for all routes
  app.setGlobalPrefix('api');

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Eval Harness API')
    .setDescription(
      `
API for the fullstack evaluation harness.

## Overview
This API provides endpoints for managing datasets, graders, experiments, and settings.

## Authentication
No authentication required for local development.

## Core Concepts
- **Datasets**: Collections of test cases with input/expected output pairs
- **Graders**: Evaluation criteria (exact-match, llm-judge, semantic-similarity, faithfulness)
- **Experiments**: Run graders against datasets to evaluate AI outputs
- **Settings**: Runtime configuration for LLM providers and models
    `
    )
    .setVersion('1.0')
    .addTag('datasets', 'Manage test case datasets')
    .addTag('graders', 'Define evaluation criteria')
    .addTag('experiments', 'Run and view experiment results')
    .addTag('settings', 'Configure LLM providers and runtime settings')
    .addTag('presets', 'Load preset graders and datasets')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Eval Harness API',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .info .title { font-size: 2rem; }
    `,
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
  });

  const port = Number(process.env.PORT) || 3021;
  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}`);
  console.log(`API docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
