# Contributing to AgentOS Extensions

Thank you for your interest in contributing to the AgentOS Extensions ecosystem!

## Getting Started

1. **Fork the repository**: https://github.com/framersai/agentos-extensions
2. **Clone your fork**:
   ```bash
   git clone https://github.com/yourusername/agentos-extensions
   cd agentos-extensions
   pnpm install
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feat/my-extension
   ```

## Creating a New Extension

1. **Use the scaffolding script** or copy a template:
   ```bash
   pnpm run create-extension
   # or
   cp -r templates/basic-tool registry/curated/category/my-extension
   ```

2. **Configure your extension**:
   - Update `package.json`:
     - Set `"name"` to `@framers/agentos-ext-{name}`
     - Set `"private": false`
     - Add `"publishConfig": { "access": "public" }`
   - Update `manifest.json` with proper metadata
   - Implement tools in `src/tools/`

3. **Add to the workspace**:
   - Add your package path to `pnpm-workspace.yaml`

4. **Follow the standards**:
   - Use TypeScript with strict mode
   - Implement the ITool interface correctly
   - Include comprehensive tests (>80% coverage)
   - MIT license

### Package Naming

All extensions use the `@framers/agentos-ext-{name}` pattern:

| Package | Name |
|---------|------|
| Auth | `@framers/agentos-ext-auth` |
| Web Search | `@framers/agentos-ext-web-search` |
| Web Browser | `@framers/agentos-ext-web-browser` |
| Telegram | `@framers/agentos-ext-telegram` |
| CLI Executor | `@framers/agentos-ext-cli-executor` |

## Development

### Code Quality

- **Linting**: `pnpm run lint`
- **Type checking**: `pnpm run build`
- **Testing**: `pnpm run test` (maintain >80% coverage)
- **Documentation**: Update README with examples

### Testing Locally

```bash
cd registry/curated/category/my-extension
pnpm test
```

### Integration with AgentOS

```typescript
import { AgentOS } from '@framers/agentos';
import myExtension from '@framers/agentos-ext-my-extension';

const agentos = new AgentOS();
await agentos.initialize({
  extensionManifest: {
    packs: [{
      factory: () => myExtension({ /* options */ })
    }]
  }
});
```

## Pull Request Process

1. **Ensure all checks pass**:
   ```bash
   pnpm test
   pnpm run lint
   pnpm run build
   ```

2. **Add a changeset** describing your changes:
   ```bash
   pnpm changeset
   ```
   Select your package, choose the bump type (patch/minor/major), and describe the change.

3. **Create pull request** with:
   - Title: `feat: add [extension-name] extension`
   - What the extension does
   - Configuration required
   - Example usage

4. **Automated CI checks** will:
   - Validate extension structure
   - Run linting and tests on Node 18 & 20
   - Check test coverage
   - Build the extension
   - Security scanning

## After Your PR is Merged

Once merged to `master`:

1. The **Release** workflow detects pending changesets
2. A **"chore: version packages"** PR is auto-created with version bumps
3. When that PR is merged, packages are **published to npm**
4. **GitHub releases** are created with changelogs
5. **registry.json** is updated

See [RELEASING.md](./RELEASING.md) for the full publishing workflow.

## Extension Guidelines

### Security

- Never hardcode API keys or secrets
- Use environment variables for sensitive data
- Validate all inputs
- Handle errors gracefully

### Performance

- Keep bundle size minimal
- Use async/await properly
- Implement timeouts for external calls
- Cache results when appropriate

### Compatibility

- Specify minimum AgentOS version in `peerDependencies`
- Handle missing configuration gracefully
- Provide sensible defaults

## Getting Help

- **Issues**: Report bugs at https://github.com/framersai/agentos-extensions/issues
- **Discussions**: Questions at https://github.com/framersai/agentos-extensions/discussions
- **Email**: team@frame.dev

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
