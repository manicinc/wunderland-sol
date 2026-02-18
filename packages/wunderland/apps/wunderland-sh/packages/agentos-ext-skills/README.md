# @framers/agentos-ext-skills

AgentOS extension pack that provides **skills discovery + enablement tools** for `SKILL.md` prompt modules.

This extension is intended to be used alongside:

- `@framers/agentos` (core runtime)
- `@framers/agentos-skills-registry` (curated SKILL.md files + typed catalog)

## Tools

- `skills_list` — list curated skills from the catalog (with basic eligibility checks)
- `skills_read` — read a curated skill’s `SKILL.md`
- `skills_enable` — copy a curated skill into a local skills directory (side-effects; should be HITL-gated)
- `skills_status` — OpenClaw-style status report (enabled/eligible/missing requirements)
- `skills_install` — install missing dependencies from `metadata.install` (side-effects; HITL-gated unless running autonomous)

## Usage

```ts
import { AgentOS } from '@framers/agentos';
import { createExtensionPack } from '@framers/agentos-ext-skills';

const agentos = new AgentOS();
await agentos.initialize({
  // ...
  extensionManifest: {
    packs: [
      { factory: () => createExtensionPack({ options: {}, logger: console }), enabled: true },
    ],
  },
});
```
