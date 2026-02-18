# Contributing to SQL Storage Adapter

Thank you for your interest in contributing to SQL Storage Adapter! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our code of conduct: be respectful, inclusive, and constructive in all interactions.

## How to Contribute

### Reporting Issues

1. Check existing issues to avoid duplicates
2. Use issue templates when available
3. Provide clear reproduction steps
4. Include relevant environment information:
   - Node.js version
   - Operating system
   - Database versions
   - Package version

### Suggesting Features

1. Open a discussion first for major features
2. Explain the use case and benefits
3. Consider backward compatibility
4. Provide examples of how it would work

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Update documentation as needed
7. Commit with clear messages
8. Push to your fork
9. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Local Development

```bash
# Clone the repository
git clone https://github.com/framersai/sql-storage-adapter.git
cd sql-storage-adapter

# Install dependencies
npm install

# Build the package
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Generate API documentation
npm run docs

# View coverage report
npm run coverage:view

# Lint code
npm run lint

# Type check
npm run typecheck
```

### Testing with Different Adapters

```bash
# Test PostgreSQL adapter
DATABASE_URL=postgresql://user:pass@localhost/test pnpm test

# Test better-sqlite3
STORAGE_ADAPTER=better-sqlite3 pnpm test

# Test sql.js
STORAGE_ADAPTER=sqljs pnpm test
```

## Project Structure

```
sql-storage-adapter/
├── src/
│   ├── adapters/           # Adapter implementations
│   │   ├── betterSqliteAdapter.ts
│   │   ├── postgresAdapter.ts
│   │   ├── sqlJsAdapter.ts
│   │   └── capacitorSqliteAdapter.ts
│   ├── utils/              # Utility functions
│   ├── types.ts            # TypeScript definitions
│   ├── resolver.ts         # Adapter resolution logic
│   └── index.ts            # Main exports
├── tests/                  # Test files
├── docs/                   # Additional documentation
└── package.json
```

## Coding Standards

### TypeScript

- Use TypeScript for all source code
- Maintain strict type safety
- Document complex types
- Avoid `any` types

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Follow existing patterns in the codebase

### Documentation

- Document all public APIs with JSDoc
- Include examples in documentation
- Update README for user-facing changes
- Add inline comments for complex logic

### Testing

- Write tests for new features
- Maintain test coverage above 80%
- Test error conditions
- Test across different adapters

## Adding a New Adapter

1. Create adapter file in `src/adapters/`
2. Implement the `StorageAdapter` interface
3. Add capability flags appropriately
4. Update resolver.ts to include the adapter
5. Add tests for the adapter
6. Document pros/cons in README
7. Update TypeScript definitions if needed

Example adapter structure:

```typescript
export class MyAdapter implements StorageAdapter {
  public readonly kind = 'my-adapter';
  public readonly capabilities = new Set(['transactions', 'persistence']);

  public async open(options?: StorageOpenOptions): Promise<void> {
    // Implementation
  }

  // ... implement other required methods
}
```

## Commit Messages

Follow conventional commits format:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Examples:
```
feat: add streaming support for PostgreSQL adapter
fix: handle connection timeout in resolver
docs: update README with Capacitor examples
```

## Release Process

Releases are automated through GitHub Actions when a new release is published:

### Manual Release Steps

1. **Update version** in package.json following [semantic versioning](https://semver.org/):
   - **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
   - **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
   - **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

2. **Update CHANGELOG.md** with:
   - Version number and date
   - Added features
   - Changed functionality
   - Deprecated features
   - Removed features
   - Fixed bugs
   - Security updates

3. **Create and merge PR**:
   ```bash
   git checkout -b release/v1.2.3
   # Update version and changelog
   git commit -m "chore: prepare release v1.2.3"
   git push origin release/v1.2.3
   # Create PR and merge to main
   ```

4. **Tag and publish release**:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.3 -m "Release v1.2.3"
   git push origin v1.2.3
   ```

5. **Create GitHub Release**:
   - Go to GitHub Releases
   - Click "Create a new release"
   - Select the tag (v1.2.3)
   - Add release notes from CHANGELOG
   - Publish release

6. **Automated Publishing**:
   - GitHub Actions will automatically:
     - Run tests
     - Build the package
     - Publish to NPM
     - Deploy documentation to GitHub Pages
     - Create release assets

### Local Testing Before Release

```bash
# Build and test locally
npm run build
npm test

# Create a tarball to inspect package contents
npm pack

# Test the package locally in another project
npm install /path/to/framers-sql-storage-adapter-1.2.3.tgz
```

## Getting Help

- Open an issue for bugs
- Start a discussion for questions
- Check existing documentation
- Review closed issues for solutions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Acknowledgments

Thank you to all contributors who help make this project better!
