# Creating Personas for AgentOS

This guide explains how to create and submit personas to the AgentOS personas registry.

## Persona Anatomy

A persona consists of:

1. **manifest.json** - Metadata (author, version, category)
2. **persona.json** - The actual persona definition (system prompt, capabilities, etc.)
3. **README.md** - Documentation and usage examples
4. **examples/** - Optional example interactions

## Directory Structure

```
registry/community/your-persona/
├── manifest.json
├── persona.json
├── README.md
└── examples/
    └── example-conversation.md
```

## 1. Create manifest.json

```json
{
  "id": "unique_persona_id",
  "name": "Your Persona Name",
  "version": "1.0.0",
  "author": {
    "name": "Your Name",
    "email": "your@email.com",
    "url": "https://your-website.com"
  },
  "description": "Brief description of what makes this persona unique",
  "category": "research|coding|creative|productivity|entertainment|education",
  "minimumTier": "free|basic|pro|enterprise",
  "tags": ["tag1", "tag2"],
  "verified": false
}
```

## 2. Create persona.json

```json
{
  "id": "unique_persona_id",
  "name": "Your Persona Name",
  "version": "1.0.0",
  "baseSystemPrompt": "You are... [detailed persona description]",
  "greetingMessage": "Hello! I'm...",
  "capabilities": ["capability1", "capability2"],
  "minSubscriptionTier": "free",
  "isPublic": true,
  "metadata": {
    "personality": "friendly",
    "expertise": ["domain1", "domain2"],
    "communicationStyle": "concise|detailed|casual|formal"
  }
}
```

## 3. Write README.md

```markdown
# Your Persona Name

Brief description of the persona.

## Personality

Describe how the persona behaves, communicates, etc.

## Best For

- Use case 1
- Use case 2

## Example Usage

\`\`\`typescript
// Show how to use this persona
\`\`\`

## Author

Your Name - [website](https://...)
```

## 4. Submit via PR

1. Fork the `agentos-personas` repository
2. Create your persona in `registry/community/your-persona/`
3. Run `npm run validate` to check your persona
4. Submit a pull request

## Review Process

Community personas go through review for:
- ✅ Valid JSON structure
- ✅ Appropriate content
- ✅ Complete documentation
- ✅ Working examples

Verified personas (curated) require additional security review.

## Best Practices

### DO
- ✅ Provide clear, specific system prompts
- ✅ Include usage examples
- ✅ Document capabilities and limitations
- ✅ Specify appropriate minimum tier
- ✅ Test your persona thoroughly

### DON'T
- ❌ Include harmful or inappropriate content
- ❌ Copy other personas without permission
- ❌ Leave fields empty or with placeholder text
- ❌ Request unnecessary high tiers

## Examples

See existing personas in `registry/curated/` for examples:
- `v-researcher` - Research-focused persona
- `code-assistant` - Coding helper persona

## Questions?

Open an issue on GitHub or email support@frame.dev

