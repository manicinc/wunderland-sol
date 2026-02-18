# Development Guide

This guide covers setting up and developing Quarry Codex locally.

## Prerequisites

- **Node.js** 18.17.0 or later
- **npm** 9.6.0 or later
- **Git** for version control

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/framersai/quarry.git
cd quarry
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the following environment variables:

```env
# Optional: GitHub Personal Access Token for private repos
GITHUB_TOKEN=your_token_here

# Optional: OpenAI API key for AI features
OPENAI_API_KEY=sk-...

# Optional: Anthropic API key
ANTHROPIC_API_KEY=sk-ant-...
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. REST API Server (Optional)

The REST API runs alongside the Next.js development server:

```bash
# Development mode starts both servers automatically
npm run dev

# API server: http://localhost:3847
# Swagger docs: http://localhost:3847/api/v1/docs
```

To generate an API token, go to your profile settings in the app or use the first-time startup token shown in the console.

See [API_GUIDE.md](./API_GUIDE.md) for full API documentation.

## Project Structure

```
apps/frame.dev/
├── app/                    # Next.js App Router pages
│   ├── quarry/            # Main Quarry application
│   ├── api/               # Next.js API routes
│   └── layout.tsx         # Root layout
├── components/
│   └── quarry/            # Quarry-specific components
├── lib/                   # Shared utilities and modules
│   ├── api/               # Fastify REST API server
│   │   ├── auth/          # Token auth & audit logging
│   │   ├── routes/        # API route handlers
│   │   └── cache.ts       # LRU caching
│   ├── audit/             # Audit logging system
│   ├── nlp/               # NLP processing
│   ├── ai/                # AI integrations
│   └── search/            # Search functionality
├── hooks/                 # Custom React hooks
├── docs/                  # Documentation
├── public/                # Static assets
└── types/                 # TypeScript type definitions
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run type-check` | Run TypeScript type checking |

## Building for Production

### Standard Build

```bash
npm run build
npm run start
```

### Static Export (GitHub Pages)

```bash
npm run build:static
```

This generates a fully static export in the `out/` directory.

## Testing

### Unit Tests

```bash
npm run test
```

### Watch Mode

```bash
npm run test:watch
```

### Coverage Report

```bash
npm run test:coverage
```

## Code Style

We use:
- **ESLint** for linting
- **Prettier** for formatting
- **TypeScript** for type safety

Run the linter:

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add new feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

## Troubleshooting

### Common Issues

**Module not found errors**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

**Build failures**
```bash
npm run type-check
# Fix any TypeScript errors shown
```

**Port already in use**
```bash
# Kill the process on port 3000
npx kill-port 3000
npm run dev
```

## Related Documentation

- [API Guide](./API_GUIDE.md)
- [NLP Guide](./NLP_GUIDE.md)
- [Strand Architecture](./STRAND_ARCHITECTURE.md)
- [Learning System Guide](./LEARNING_SYSTEM_GUIDE.md)

