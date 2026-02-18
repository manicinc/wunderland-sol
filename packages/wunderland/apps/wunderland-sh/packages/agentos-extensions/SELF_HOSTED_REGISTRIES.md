# Self-Hosted Registries

AgentOS supports loading extensions and personas from self-hosted registries. Point to your own GitHub repos, git servers, or file systems.

## Configuration

### In AgentOSConfig

```typescript
import { AgentOS } from '@framers/agentos';

const agentos = new AgentOS();
await agentos.initialize({
  registryConfig: {
    registries: {
      'my-extensions': {
        type: 'github',
        location: 'your-org/your-extensions',
        branch: 'main',
        verified: true,
      },
      'my-personas': {
        type: 'github',
        location: 'your-org/your-personas',
        branch: 'main',
      }
    },
    defaultRegistries: {
      tool: 'my-extensions',
      guardrail: 'my-extensions',
      workflow: 'my-extensions',
      persona: 'my-personas',
    }
  }
});
```

## Registry Sources

### GitHub (Public)

```typescript
registryConfig: {
  registries: {
    'custom': {
      type: 'github',
      location: 'your-org/extensions-repo',
      branch: 'main',
    }
  }
}
```

### GitHub (Private)

```typescript
registryConfig: {
  registries: {
    'custom': {
      type: 'github',
      location: 'your-org/private-repo',
      branch: 'main',
      token: process.env.GITHUB_TOKEN,
    }
  }
}
```

### Self-Hosted Git

```typescript
registryConfig: {
  registries: {
    'custom': {
      type: 'git',
      location: 'https://git.yourcompany.com/extensions.git',
      branch: 'production',
    }
  }
}
```

### Local File System

```typescript
registryConfig: {
  registries: {
    'local': {
      type: 'file',
      location: '/path/to/local/registry',
    }
  }
}
```

### HTTP(S) URL

```typescript
registryConfig: {
  registries: {
    'hosted': {
      type: 'url',
      location: 'https://registry.yourcompany.com',
    }
  }
}
```

## Repository Structure

Your self-hosted registry must follow this structure:

```
your-extensions-repo/
├── registry.json              # Registry metadata
└── registry/
    ├── curated/
    │   ├── your-tool/
    │   │   ├── manifest.json
    │   │   └── src/
    │   └── your-workflow/
    └── community/
```

### registry.json Format

```json
{
  "version": "1.0.0",
  "updated": "2024-11-14T00:00:00.000Z",
  "categories": {
    "curated": ["tools", "workflows"],
    "community": []
  },
  "extensions": {
    "curated": [
      {
        "id": "com.yourorg.your-tool",
        "name": "Your Tool",
        "version": "1.0.0",
        "path": "curated/your-tool",
        "author": {
          "name": "Your Org",
          "email": "support@yourorg.com"
        }
      }
    ]
  }
}
```

## Use Cases

### Air-Gapped Deployment

```typescript
registryConfig: {
  registries: {
    'internal': {
      type: 'file',
      location: '/opt/agentos/extensions',
    }
  },
  defaultRegistries: {
    tool: 'internal',
    persona: 'internal',
  }
}
```

### Enterprise with Private Git

```typescript
registryConfig: {
  registries: {
    'enterprise-extensions': {
      type: 'git',
      location: 'https://git.corp.com/agentos-extensions.git',
      branch: 'stable',
      token: process.env.CORP_GIT_TOKEN,
    },
    'enterprise-personas': {
      type: 'git',
      location: 'https://git.corp.com/agentos-personas.git',
      branch: 'stable',
      token: process.env.CORP_GIT_TOKEN,
    }
  },
  defaultRegistries: {
    tool: 'enterprise-extensions',
    persona: 'enterprise-personas',
  }
}
```

### Hybrid (Official + Custom)

```typescript
registryConfig: {
  registries: {
    'official': {
      type: 'npm',
      location: '@framers/agentos-extensions',
    },
    'custom': {
      type: 'github',
      location: 'your-org/custom-extensions',
    }
  },
  resolver: (kind) => {
    // Use custom for tools, official for everything else
    return kind === 'tool' ? 'custom' : 'official';
  }
}
```

## Caching

Control caching behavior:

```typescript
registryConfig: {
  registries: {
    'custom': {
      type: 'github',
      location: 'your-org/extensions',
      cacheDuration: 3600000, // 1 hour in ms
    }
  },
  cacheSettings: {
    enabled: true,
    directory: '/var/cache/agentos',
    maxAge: 86400000, // 24 hours
  }
}
```

## Security

### Verification

Mark trusted sources as verified:

```typescript
{
  type: 'github',
  location: 'your-org/vetted-extensions',
  verified: true,
}
```

### Private Tokens

Use environment variables for tokens:

```typescript
{
  type: 'github',
  location: 'your-org/private-repo',
  token: process.env.GITHUB_PAT,
}
```

## Complete Example

```typescript
import { AgentOS } from '@framers/agentos';
import { createAuthExtension } from '@framers/agentos-extensions/auth';

const agentos = new AgentOS();
await agentos.initialize({
  // Point to your self-hosted registries
  registryConfig: {
    registries: {
      'corp-extensions': {
        type: 'git',
        location: 'https://git.corp.com/agentos-extensions.git',
        branch: 'production',
        token: process.env.GIT_TOKEN,
        verified: true,
        cacheDuration: 7200000,
      },
      'corp-personas': {
        type: 'git',
        location: 'https://git.corp.com/agentos-personas.git',
        branch: 'production',
        token: process.env.GIT_TOKEN,
        verified: true,
      }
    },
    defaultRegistries: {
      tool: 'corp-extensions',
      guardrail: 'corp-extensions',
      workflow: 'corp-extensions',
      persona: 'corp-personas',
    },
    cacheSettings: {
      enabled: true,
      directory: '/var/cache/agentos',
    }
  },
  
  // Use auth from your self-hosted registry
  authService: /* loaded from corp-extensions */,
  subscriptionService: /* loaded from corp-extensions */,
});
```

## Benefits

✅ **Full Control** - Host your own extensions and personas  
✅ **Air-Gapped** - Works without internet access  
✅ **Private** - Keep sensitive extensions internal  
✅ **Compliance** - Meet regulatory requirements  
✅ **Custom** - Mix official and custom sources  
✅ **Cached** - Reduce network calls

## Support

For help setting up self-hosted registries:
- GitHub: https://github.com/framersai/agentos
- Docs: https://agentos.sh/docs/self-hosted
- Email: support@frame.dev

