# Contributing to Frame Codex

Guide for contributing to Frame Codex.

## Overview

Frame Codex is a community-driven project. We welcome contributions:
- New knowledge content
- Technical improvements
- Documentation enhancements
- Translations
- Bug fixes

## Quick Start

1. Fork the repository
   ```bash
   git clone https://github.com/framersai/codex.git
   cd codex
   ```

2. Create a branch
   ```bash
   git checkout -b add-quantum-computing-strand
   ```

3. Make changes following schemas
4. Validate content
5. Submit pull request

## Content Contributions

### Adding a New Strand

1. Choose the right location:
   ```
   weaves/
   └── technology/          # Choose weave
       └── looms/
           └── quantum/     # Find or create loom
               └── strands/
                   └── your-strand.md  # Add here
   ```

2. Use strand template:
   ```bash
   npm run create -- --type=strand \
     --weave=technology \
     --loom=quantum \
     --title="Quantum Entanglement Explained"
   ```

3. Fill frontmatter:
   ```yaml
   ---
   id: "generate-uuid"
   slug: "quantum-entanglement"
   title: "Quantum Entanglement Explained"
   summary: "Comprehensive guide to quantum entanglement covering principles, verification, and applications."
   version: "1.0.0"
   contentType: "text/markdown"
   difficulty: "intermediate"
   
   taxonomy:
     subjects: ["Physics", "Quantum Mechanics"]
     topics: ["Quantum Entanglement"]
     subtopics: ["Bell's Theorem"]
   
   relationships:
     - type: "prerequisite"
       target: "quantum-basics-uuid"
   
   publishing:
     author: "Your Name"
     created: "2024-11-15"
     license: "CC-BY-4.0"
   ---
   ```

4. Write quality content with clear explanations, accurate information, and proper citations.

### Adding a New Loom

1. Create loom directory:
   ```bash
   mkdir -p weaves/technology/looms/your-loom/strands
   ```

2. Create loom.yaml:
   ```yaml
   slug: your-loom
   title: "Your Loom Title"
   summary: "Description of what this loom covers..."
   tags: ["relevant", "tags"]
   ordering:
     type: sequential
     sequence: []
   ```

### Content Guidelines

Write for both humans and AI:
- Include examples
- Cite sources
- Use clear language
- Structure content logically
- Add diagrams with alt text

Avoid:
- Copying without attribution
- Personal opinions as facts
- Unexplained jargon
- Incomplete content
- Schema violations
- Promotional content

### Quality Standards

Content must be:
- Factually accurate
- Well-structured
- Easy to understand
- Complete coverage
- Properly formatted

## Technical Contributions

### Development Setup

```bash
# Install dependencies
npm install

# Run validation
npm run validate

# Build index
npm run build-index
```

### Code Standards
- TypeScript for scripts
- ES Modules
- Prettier formatting
- ESLint rules

### Testing

```bash
# Run all tests
npm test

# Validate schemas
npm run test:schemas

# Check links
npm run test:links

# Validate content
npm run test:content
```

## Translations

Help make Frame Codex globally accessible:

1. Create language directory:
   ```
   strands/
   ├── transformer.md         # Original
   └── i18n/
       ├── es/
       │   └── transformer.md # Spanish
       └── zh/
           └── transformer.md # Chinese
   ```

2. Translate frontmatter:
   ```yaml
   # Keep IDs unchanged
   id: "same-uuid"
   slug: "transformer-architecture"
   
   # Translate these
   title: "Architecture Transformer"
   summary: "Guide complet..."
   
   # Add marker
   language: "fr"
   translatedFrom: "en"
   ```

## Pull Request Process

### Before Submitting

- [ ] Content follows schemas
- [ ] Validation passes
- [ ] Links are valid
- [ ] Clear commit messages
- [ ] Branch is up-to-date

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New content
- [ ] Content update
- [ ] Bug fix
- [ ] Documentation
- [ ] Translation

## Checklist
- [ ] Schemas validated
- [ ] Tests pass
- [ ] Documentation updated
- [ ] Related issues linked
```

### Review Process

1. Automated checks run immediately
2. Community review within 48 hours
3. Maintainer approval for merge
4. Auto-deployment after merge

## Resources

### Documentation
- [Schema Reference](./schema.md)
- [API Documentation](./api.md)

### Tools
- [UUID Generator](https://www.uuidgenerator.net/)
- [Markdown Linter](https://github.com/DavidAnson/markdownlint)
- [Schema Validator](https://www.jsonschemavalidator.net/)

### Community
- GitHub Discussions
- Discord Server
- Twitter Updates

## License

By contributing, you agree that contributions will be licensed under CC-BY-4.0.

## Code of Conduct

Frame Codex follows the Contributor Covenant Code of Conduct.

Standards:
- Respectful communication
- Inclusive environment
- Constructive feedback
- Collaborative approach
- Professional conduct

## Getting Help

Need assistance?

1. Check existing issues
2. Ask in Discord
3. Read the FAQ
4. Email codex@frame.dev