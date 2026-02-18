# Wunderland & RabbitHole Implementation Summary

## Overview

Wunderland builds on AgentOS to provide:

- **Wunderland** (`packages/wunderland`) - SDK + CLI for building agents with personality + security primitives.
- **Rabbit Hole** (`apps/rabbithole`) - Cloud-hosted control plane dashboard for creating/configuring agents and exporting self-hosted runtime configs (default). Managed runtimes are enterprise-only.
- **Backend** (`backend`) - NestJS API + SQLite storage that powers the dashboard, registry, credentials, channels, and (for managed/enterprise) orchestration.

---

## Wunderland Package

### Core + Personality

| File                         | Description                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------- |
| `src/core/types.ts`          | HEXACO traits, SecurityProfile, InferenceHierarchyConfig, StepUpAuthorizationConfig |
| `src/core/WunderlandSeed.ts` | HEXACO-based adaptive agent persona extending IPersonaDefinition                    |

### Security Pipeline (3-Layer Defense)

| File                                         | Description                                                |
| -------------------------------------------- | ---------------------------------------------------------- |
| `src/security/PreLLMClassifier.ts`           | Layer 1: Pattern-based injection/jailbreak detection       |
| `src/security/DualLLMAuditor.ts`             | Layer 2: LLM-based output verification using auditor model |
| `src/security/SignedOutputVerifier.ts`       | Layer 3: HMAC-SHA256 signing with intent chain audit trail |
| `src/security/WunderlandSecurityPipeline.ts` | Unified pipeline implementing IGuardrailService            |
| `src/security/types.ts`                      | Security-related type definitions                          |

### CLI

- Entry point: `bin/wunderland.js` (bootstraps compiled CLI)
- Commands live in `src/cli/commands/*` (init, start, chat, skills, channels, etc.)

---

## RabbitHole Package

Rabbit Hole is a Next.js dashboard that consumes the backend API.

Key UI entry points:

- Agent builder (voice/text → config): `apps/rabbithole/src/app/app/agent-builder/page.tsx`
- Getting started: `apps/rabbithole/src/app/app/getting-started/page.tsx`
- Self-hosted runtime guide: `apps/rabbithole/src/app/app/self-hosted/page.tsx`
- Per-agent self-hosted setup: `apps/rabbithole/src/app/app/dashboard/[seedId]/self-hosted/page.tsx`

Key API route:

- Voice config extraction: `apps/rabbithole/src/app/api/voice/extract-config/route.ts`

---

## Backend (Wunderland Modules)

Notable backend areas:

- Agent registry + hosting mode: `backend/src/modules/wunderland/agent-registry/*`
- Runtime state + hosting mode flip: `backend/src/modules/wunderland/runtime/*`
- Orchestration (managed runtime) filters out `self_hosted` agents: `backend/src/modules/wunderland/orchestration/*`
- Channels + bindings: `backend/src/modules/wunderland/channels/*`
- Encrypted credential vault (optional): `backend/src/modules/wunderland/credentials/*`

---

## Key Features Implemented

### HEXACO Personality Model

- 6-factor personality traits (Honesty-Humility, Emotionality, Extraversion, Agreeableness, Conscientiousness, Openness)
- Traits map to mood and communication style
- Preset personalities: HELPFUL_ASSISTANT, CREATIVE_THINKER, ANALYTICAL_RESEARCHER, EMPATHETIC_COUNSELOR, DECISIVE_EXECUTOR

### Security Pipeline

1. **Pre-LLM Classifier** - Detects injection patterns, jailbreaks, command injection, SQL injection
2. **Dual-LLM Auditor** - Uses separate auditor model to verify primary model outputs
3. **Signed Output Verifier** - HMAC-SHA256 signing with full intent chain for audit trail

### Hosting Modes

- `self_hosted` (default): agent is configurable in Rabbit Hole but not executed on shared runtime; you run it on your own VPS.
- `managed` (enterprise): agent may execute on a managed runtime with restricted toolsets and stronger isolation.

---

## What's Next

1. **One-command runtime installer** (VPS) + AWS “Launch Stack” template
2. **Runtime auth** (service tokens) for secure config sync from control plane to runtime
3. **Prompt injection hardening** at the server/tool-proxy layer (egress allowlists, DLP/redaction)
4. **Accessibility polish** across the dashboard (keyboard, contrast, reduced motion)
5. **More tests** covering hosting mode, orchestration, and self-hosted flows

---

## Notes

This repo is evolving quickly; some older docs and marketing copy may still reference “managed hosting”
as the default. Current direction is self-hosted-first with enterprise managed runtimes.
