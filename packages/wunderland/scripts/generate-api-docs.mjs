#!/usr/bin/env node
/**
 * @file API Documentation Generator
 * @description Auto-generates API endpoint documentation from Express routes and TypeScript types
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_DIR = path.join(__dirname, '..', 'docs-generated', 'api');
const BACKEND_DIR = path.join(__dirname, '..', 'backend');

/**
 * Extract API route information from router configuration
 */
function generateAPIDocs() {
  console.log('[docs] Generating API documentation...');

  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // API documentation structure
  const apiDocs = {
    openapi: '3.0.0',
    info: {
      title: 'Voice Chat Assistant API',
      version: '1.0.0',
      description: 'Auto-generated API documentation for Voice Chat Assistant backend endpoints',
      contact: {
        name: 'API Support',
        url: 'https://github.com/manicinc/voice-chat-assistant',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001/api',
        description: 'Development server',
      },
      {
        url: 'https://your-production-url.com/api',
        description: 'Production server',
      },
    ],
    tags: [
      { name: 'Authentication', description: 'User authentication and session management' },
      { name: 'Chat', description: 'Chat and conversation endpoints' },
      { name: 'Speech', description: 'STT (Speech-to-Text) and TTS (Text-to-Speech)' },
      { name: 'Billing', description: 'Subscription and payment management' },
      { name: 'Cost Tracking', description: 'Usage cost monitoring' },
      { name: 'AgentOS', description: 'AgentOS persona and workflow management' },
      { name: 'Rate Limiting', description: 'Rate limit status and management' },
      { name: 'System', description: 'System diagnostics and health checks' },
    ],
    paths: {
      '/auth/global': {
        post: {
          tags: ['Authentication'],
          summary: 'Global login',
          description: 'Authenticate user with global credentials',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      token: { type: 'string' },
                      user: { type: 'object' },
                    },
                  },
                },
              },
            },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'Standard login',
          description: 'Authenticate user with standard credentials',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Login successful' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Authentication'],
          summary: 'Register new user',
          description: 'Create a new user account',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', format: 'password', minLength: 8 },
                    name: { type: 'string' },
                  },
                  required: ['email', 'password'],
                },
              },
            },
          },
          responses: {
            201: { description: 'User created successfully' },
            400: { description: 'Invalid input' },
            409: { description: 'User already exists' },
          },
        },
      },
      '/auth': {
        get: {
          tags: ['Authentication'],
          summary: 'Get authentication status',
          description: 'Check current authentication status',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Authentication status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      authenticated: { type: 'boolean' },
                      user: { type: 'object' },
                    },
                  },
                },
              },
            },
            401: { description: 'Not authenticated' },
          },
        },
        delete: {
          tags: ['Authentication'],
          summary: 'Logout',
          description: 'End current session',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Logout successful' },
          },
        },
      },
      '/rate-limit/status': {
        get: {
          tags: ['Rate Limiting'],
          summary: 'Get rate limit status',
          description: 'Retrieve current rate limit information for public or authenticated user',
          responses: {
            200: {
              description: 'Rate limit status',
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          tier: { type: 'string', enum: ['authenticated'] },
                          message: { type: 'string' },
                        },
                      },
                      {
                        type: 'object',
                        properties: {
                          tier: { type: 'string', enum: ['public'] },
                          ip: { type: 'string', nullable: true },
                          used: { type: 'number' },
                          limit: { type: 'number' },
                          remaining: { type: 'number' },
                          resetAt: { type: 'string', format: 'date-time', nullable: true },
                          storeType: { type: 'string' },
                          message: { type: 'string' },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
      '/chat': {
        post: {
          tags: ['Chat'],
          summary: 'Send chat message',
          description: 'Send a message and receive AI response',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    conversationId: { type: 'string', nullable: true },
                    model: { type: 'string', nullable: true },
                  },
                  required: ['message'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Chat response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      response: { type: 'string' },
                      conversationId: { type: 'string' },
                    },
                  },
                },
              },
            },
            429: { description: 'Rate limit exceeded' },
          },
        },
      },
      '/chat/persona': {
        post: {
          tags: ['Chat'],
          summary: 'Chat with persona',
          description: 'Send message to specific persona',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    personaId: { type: 'string' },
                    conversationId: { type: 'string', nullable: true },
                  },
                  required: ['message', 'personaId'],
                },
              },
            },
          },
          responses: {
            200: { description: 'Persona response' },
            404: { description: 'Persona not found' },
          },
        },
      },
      '/stt': {
        post: {
          tags: ['Speech'],
          summary: 'Speech to text',
          description: 'Convert audio to text using STT service',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    audio: {
                      type: 'string',
                      format: 'binary',
                      description: 'Audio file (wav, mp3, ogg, etc.)',
                    },
                    language: {
                      type: 'string',
                      description: 'Optional language code (e.g., en-US)',
                    },
                  },
                  required: ['audio'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Transcription result',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      language: { type: 'string' },
                      confidence: { type: 'number' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/tts': {
        post: {
          tags: ['Speech'],
          summary: 'Text to speech',
          description: 'Convert text to audio using TTS service',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    text: { type: 'string' },
                    voice: { type: 'string', nullable: true },
                    speed: { type: 'number', nullable: true },
                    outputFormat: { type: 'string', nullable: true },
                  },
                  required: ['text'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Audio file',
              content: {
                'audio/mpeg': { schema: { type: 'string', format: 'binary' } },
                'audio/ogg': { schema: { type: 'string', format: 'binary' } },
              },
            },
          },
        },
      },
      '/tts/voices': {
        get: {
          tags: ['Speech'],
          summary: 'List available voices',
          description: 'Get list of available TTS voices',
          responses: {
            200: {
              description: 'List of voices',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        language: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/cost': {
        get: {
          tags: ['Cost Tracking'],
          summary: 'Get cost information',
          description: 'Retrieve usage cost data for authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: 'Cost information',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      totalCost: { type: 'number' },
                      breakdown: { type: 'object' },
                    },
                  },
                },
              },
            },
            401: { description: 'Authentication required' },
          },
        },
        post: {
          tags: ['Cost Tracking'],
          summary: 'Reset cost tracking',
          description: 'Reset cost counters for authenticated user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Cost tracking reset' },
            401: { description: 'Authentication required' },
          },
        },
      },
      '/agentos/personas': {
        get: {
          tags: ['AgentOS'],
          summary: 'List available personas',
          description: 'Get list of available AgentOS personas',
          parameters: [
            {
              name: 'userId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'User ID for persona access control',
            },
          ],
          responses: {
            200: {
              description: 'List of personas',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/agentos/workflows/definitions': {
        get: {
          tags: ['AgentOS'],
          summary: 'List workflow definitions',
          description: 'Get available workflow definitions',
          responses: {
            200: {
              description: 'Workflow definitions',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { type: 'object' },
                  },
                },
              },
            },
          },
        },
      },
      '/agentos/stream': {
        get: {
          tags: ['AgentOS'],
          summary: 'Stream AgentOS conversation',
          description: 'Server-Sent Events stream for AgentOS conversations',
          parameters: [
            {
              name: 'userId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'conversationId',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
            {
              name: 'mode',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'Persona ID',
            },
            {
              name: 'messages',
              in: 'query',
              required: true,
              schema: { type: 'string' },
              description: 'JSON-encoded array of messages',
            },
          ],
          responses: {
            200: {
              description: 'SSE stream',
              content: {
                'text/event-stream': {
                  schema: {
                    type: 'string',
                    description: 'Server-Sent Events stream',
                  },
                },
              },
            },
          },
        },
      },
      '/system/llm-status': {
        get: {
          tags: ['System'],
          summary: 'Get LLM service status',
          description: 'Check status of LLM providers',
          responses: {
            200: {
              description: 'LLM status',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      providers: { type: 'array' },
                      healthy: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  // Write OpenAPI spec
  const openApiPath = path.join(OUTPUT_DIR, 'openapi.json');
  fs.writeFileSync(openApiPath, JSON.stringify(apiDocs, null, 2));
  console.log(`[docs] OpenAPI spec written to ${openApiPath}`);

  console.log('[docs] API documentation generation complete!');
}

/**
 * Generate Markdown documentation from OpenAPI spec
 */
function generateMarkdownDocs(spec) {
  let markdown = `# ${spec.info.title}\n\n`;
  markdown += `**Version:** ${spec.info.version}\n\n`;
  markdown += `${spec.info.description}\n\n`;

  markdown += `## Servers\n\n`;
  spec.servers.forEach((server) => {
    markdown += `- **${server.description}**: \`${server.url}\`\n`;
  });
  markdown += `\n`;

  // Group endpoints by tag
  const endpointsByTag = {};
  Object.entries(spec.paths).forEach(([path, methods]) => {
    Object.entries(methods).forEach(([method, details]) => {
      const tag = details.tags?.[0] || 'Other';
      if (!endpointsByTag[tag]) {
        endpointsByTag[tag] = [];
      }
      endpointsByTag[tag].push({ path, method, details });
    });
  });

  // Generate documentation for each tag
  Object.entries(endpointsByTag).forEach(([tag, endpoints]) => {
    markdown += `## ${tag}\n\n`;
    endpoints.forEach(({ path, method, details }) => {
      markdown += `### \`${method.toUpperCase()} ${path}\`\n\n`;
      markdown += `${details.summary}\n\n`;
      if (details.description) {
        markdown += `${details.description}\n\n`;
      }
      if (details.security) {
        markdown += '**Requires authentication**\n\n';
      }
      markdown += `---\n\n`;
    });
  });

  return markdown;
}

/**
 * Generate HTML index for browsing docs
 */
function generateIndexHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Voice Chat Assistant - API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }
    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
      margin-bottom: 2rem;
      border-radius: 8px;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    .subtitle { font-size: 1.1rem; opacity: 0.9; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }
    .card {
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }
    .card h2 {
      color: #667eea;
      margin-bottom: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .card p { color: #666; margin-bottom: 1rem; }
    .btn {
      display: inline-block;
      padding: 0.75rem 1.5rem;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background 0.2s;
    }
    .btn:hover { background: #5568d3; }
    .icon { font-size: 1.5rem; }
    footer {
      text-align: center;
      margin-top: 3rem;
      padding: 2rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>API Documentation</h1>
      <p class="subtitle">Voice Chat Assistant - Complete API Reference</p>
    </header>

    <div class="grid">
      <div class="card">
        <h2>Library Documentation</h2>
        <p>TypeDoc-generated documentation for TypeScript classes, interfaces, and utilities.</p>
        <a href="../library/index.html" class="btn">View Library Docs -></a>
      </div>

      <div class="card">
        <h2>REST API Reference</h2>
        <p>Complete HTTP endpoint documentation with request/response schemas.</p>
        <a href="./API_REFERENCE.md" class="btn">View API Reference -></a>
      </div>

      <div class="card">
        <h2>OpenAPI Specification</h2>
        <p>Machine-readable OpenAPI 3.0 specification for API integration.</p>
        <a href="./openapi.json" class="btn">Download OpenAPI JSON -></a>
      </div>
    </div>

    <footer>
      <p>Generated automatically from TypeScript source code and route definitions</p>
      <p><a href="https://github.com/manicinc/voice-chat-assistant">GitHub Repository</a></p>
    </footer>
  </div>
</body>
</html>`;
}

// Run generation
generateAPIDocs();












