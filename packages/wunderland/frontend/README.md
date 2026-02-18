<div align="center">

<p align="center">
  <a href="https://agentos.sh"><img src="../logos/agentos-primary-no-tagline-transparent-2x.png" alt="AgentOS" height="64" /></a>
  &nbsp;&nbsp;&nbsp;
  <a href="https://frame.dev" target="_blank" rel="noopener"><img src="../logos/frame-logo-green-no-tagline.svg" alt="Frame.dev" height="40" /></a>
</p>

# Frontend (Voice Chat Assistant UI)

Multi-agent cockpit UI for Voice Chat Assistant, powered by AgentOS and part of the Frame.dev ecosystem.

_The OS for humans, the codex of humanity._

[Frame.dev](https://frame.dev) • [AgentOS](https://agentos.sh)

</div>

---

This package contains the Vue 3 + Vite front-end for Voice Chat Assistant. It serves as the multi-agent cockpit for voice conversations, diagramming, transcription and, when enabled, the embedded AgentOS orchestration path.

**Built with [`@framers/agentos`](https://github.com/framersai/agentos)** – adaptive agent runtime with streaming, tooling, and observability.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Getting Started](#getting-started)
3. [Project Structure](#project-structure)
4. [NPM Scripts](#npm-scripts)
5. [Environment Variables](#environment-variables)
6. [Runtime Architecture](#runtime-architecture)
7. [Working with Agents & Prompts](#working-with-agents--prompts)
8. [Voice, TTS, and AgentOS Integration](#voice-tts-and-agentos-integration)
9. [Testing & Linting](#testing--linting)
10. [Troubleshooting](#troubleshooting)

---

## Tech Stack

| Layer     | Details                                                                  |
| --------- | ------------------------------------------------------------------------ |
| Framework | Vue 3 (Composition API)                                                  |
| Tooling   | Vite 5, TypeScript, Pinia, Vue Router                                    |
| Styling   | Tailwind, custom Sass mixins (`src/styles`)                              |
| State     | Pinia stores (`src/store`) + local/session storage helpers               |
| HTTP      | Axios wrapper (`src/utils/api.ts`) with auth headers + streaming helpers |
| i18n      | `vue-i18n`, locale packs in `src/i18n/locales` (default `en`)            |
| Voice     | Web Speech API, custom STT/TTS managers, OpenAI Whisper fallback         |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- pnpm or npm (root workspace uses pnpm internally, but `npm run …` is available via the root scripts)
- Backend running (`npm run dev` or `npm run start`) because this UI proxies `/api/*`

### Install Dependencies

From the repo root:

```bash
pnpm install        # preferred
# or
npm run install-all # installs root + frontend + backend
```

### Development Server

```bash
cd frontend
npm run dev
```

Vite serves the app at [http://localhost:3000](http://localhost:3000) (or specified host). Requests under `/api/*` proxy to the backend dev server.

### Production Preview

```bash
npm run build        # from repo root or cd frontend && npm run build
npm run preview      # serves the built assets (default port 4173)
```

When running via the root `npm run start`, the backend serves `/api/*` while `frontend` runs `vite preview --host 0.0.0.0`.

---

## Project Structure

```
frontend/
├─ public/                # static assets copied verbatim
├─ src/
│  ├─ assets/             # logos, imagery, CSS-in-JS tokens
│  ├─ components/         # UI components, agents, layout pieces
│  │   ├─ agents/         # agent mini-apps (CodingAgent, VAgent, Diary, etc.)
│  │   └─ about/          # marketing/about page sections
│  ├─ composables/        # shared hooks (voice settings, animations)
│  ├─ router/             # vue-router config
│  ├─ services/           # prompt loading, conversation managers, local storage helpers
│  ├─ store/              # Pinia stores (chat, agent, UI, cost, reactive cues)
│  ├─ styles/             # Sass mixins, global styles, view-specific overrides
│  ├─ theme/              # CSS variables + theme switching
│  ├─ utils/              # Axios API helper, STT/TTS adapters, social links
│  └─ views/              # page-level views (Home, About, Agents)
├─ package.json
├─ vite.config.ts
└─ README.md (this file)
```

Key service layers:

- `src/utils/api.ts`: single axios instance, SSE helper (`sendMessageStream`), rate-limit/cost utilities.
- `src/services/agent.service.ts`: declarative registry of all available agents, prompts, capabilities, icons.
- `src/store/chat.store.ts`: conversation history, main content streaming state, persona caching, TTS flags.
- `src/services/advancedConversation.manager.ts`: recency/semantic history aggregator for API payloads.
- `src/components/agents/catalog/**`: each agent view + `useXYZAgent` composable.

---

## NPM Scripts

| Command           | Description                                     |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Launches Vite dev server (`localhost:3000`).    |
| `npm run build`   | Production build (outputs to `frontend/dist`).  |
| `npm run preview` | Serves the built assets locally (default 4173). |

The repo root exposes helpful wrappers:

| Root Command             | Description                                                        |
| ------------------------ | ------------------------------------------------------------------ |
| `npm run dev`            | Runs backend + frontend concurrently.                              |
| `npm run start`          | Runs built backend (`dist/server.js`) + `frontend` preview server. |
| `npm run build:frontend` | `npm --prefix frontend run build`.                                 |

---

## Environment Variables

Frontend uses Vite’s `import.meta.env`. Define variables in `frontend/.env` / `frontend/.env.local`, or start from `frontend/.env.example`.

| Variable                                             | Purpose                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------- |
| `VITE_API_BASE_URL`                                  | Base URL for API calls (defaults to `/api`).                  |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`        | Optional Supabase client configuration.                       |
| `VITE_STRIPE_*`                                      | Stripe price/plan IDs for billing UI.                         |
| `VITE_AGENTOS_ENABLED`                               | Enable UI toggles for AgentOS routing (default `false`).      |
| `VITE_AGENTOS_CLIENT_MODE`                           | `proxy` (use `/api/chat`) or `direct` (hit `/api/agentos/*`). |
| `VITE_AGENTOS_CHAT_PATH`, `VITE_AGENTOS_STREAM_PATH` | Override default AgentOS endpoints if needed.                 |
| `VITE_FEATURE_FLAG_ENABLE_*`                         | Frontend feature switches (interview mode, tutor mode, etc.). |
| `VITE_SHARED_PASSWORD`, `VITE_COST_THRESHOLD`, etc.  | Optional global demo parameters.                              |

When `VITE_AGENTOS_ENABLED=true` and `VITE_AGENTOS_CLIENT_MODE=direct`, `chatAPI` sends POST `/api/agentos/chat` and GET `/api/agentos/stream`. Ensure the backend exposes those routes (`AGENTOS_ENABLED=true`).

---

## Runtime Architecture

1. **Entry (`src/main.ts`)**
   - Creates the Vue app, configures Pinia, vue-router, i18n, and theme manager.
   - Loads voice settings and seeds the voice manager.

2. **Routing**
   - `src/router/index.ts` uses locale-aware routes (`/:locale?`) and lazy-loads views.
   - Guard ensures `i18n` locale matches the URL (`/en`, `/fr-FR`, etc.).

3. **State**
   - `chat.store.ts`: append messages, stream deltas, cache personas, maintain conversation IDs per agent.
   - `agent.store.ts`: track active agent, contexts, tutor level, etc.
   - `reactive.store.ts`: orchestrates UI cues (lights, voice indicators, waveform).
   - `cost.store.ts`: listens for `/api/cost` updates and SSE session cost events.

4. **Voice Pipeline**
   - `src/services/voice.settings.service.ts`: persistent voice preferences.
   - `src/components/voice-input` and `src/services/stt/tts` modules manage STT/TTS providers (Web Speech, OpenAI).
   - `api/stt` & `api/tts` endpoints are proxied through the backend (which uses OpenAI Whisper / TTS).

5. **AgentOS Integration**
   - `src/utils/api.ts` includes `shouldRouteThroughAgentOS` logic to toggle `/api/agentos/*`.
   - SSE streaming falls back to `/api/chat` if AgentOS is disabled.

---

## Working with Agents & Prompts

### Agent Registry

Defined in `src/services/agent.service.ts`. Each agent entry describes:

- `id`, `label`, `description`, `category`
- Prompt key (`systemPromptKey` matched with a Markdown file under `/prompts`)
- Capabilities (diagram support, compact renderer, voice input)
- Access tier (`public`, `member`, `premium`)
- Example prompts and placeholders

### Adding a New Agent

1. Create the Vue view (e.g., `src/components/agents/catalog/MyAgent/MyAgentView.vue`) plus composable.
2. Add the agent definition to `agent.service.ts`.
3. Provide a prompt markdown file under `prompts/`.
4. Optionally update `agentos.persona-registry.ts` (backend) so the AgentOS persona mirrors the front-end agent.

### Prompts

`src/utils/api.ts` exposes `promptAPI.getPrompt(filename)` for markdown prompts. The backend serves `/api/prompts/:filename.md`. During build, prompt requests are proxied to the backend; ensure the file exists under `prompts/`.

---

## Voice, TTS, and AgentOS Integration

| Feature     | Files / Notes                                                                                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| STT         | `src/services/speech/stt.*`, `api/stt` backend routes.                                                                                                                                |
| TTS         | `src/services/speech/tts*`, UI toggles in `Settings` view.                                                                                                                            |
| VAD/PTT     | `MainContentView.vue` + `voice` stores manage push-to-talk vs continuous.                                                                                                             |
| AgentOS SSE | `chatAPI.sendMessageStream` handles SSE from `/api/chat` or `/api/agentos/stream`. Build logs may warn about chunk sizes; adjust Vite config or split diagrams to reduce bundle size. |

**Backend prerequisites:** When enabling AgentOS (`AGENTOS_ENABLED=true`), ensure the backend exposes `/api/agentos/chat` and `/api/agentos/stream` and that the AgentOS package is built (`packages/agentos`).

---

## Testing & Linting

As of now, the frontend does not ship Vitest/Jest tests. Recommended TODOs:

- Add component tests (Vitest + Vue Test Utils) for `Agent` components.
- Add E2E coverage using Playwright or Cypress (voice-heavy flows can be simulated by mocking STT responses).
- Linting: integrate ESLint + Prettier with Vue/TypeScript configs.

For AgentOS (backend package), Vitest is configured in `packages/agentos/vitest.config.ts` and currently runs a placeholder test. Expand coverage alongside backend integration work.

---

## Troubleshooting

| Issue                                                                 | Fix                                                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 500 from `/api/rate-limit/status`, `/api/tts/voices`, `/prompts/*.md` | Backend isn’t running or the route is gated by `AGENTOS_ENABLED`. Start backend (`npm run dev`) or guard zero/500 states in UI.                        |
| SSE fetch errors (`ECONNREFUSED`)                                     | Vite proxies `/api/*` to backend on `localhost:3001`. Ensure backend dev server is up.                                                                 |
| Chunk size warning                                                    | Large diagram bundles (Mermaid, flowchart) exceed Vite’s `chunkSizeWarningLimit`. Consider dynamic imports or Rollup `manualChunks`.                   |
| AgentOS import errors                                                 | Run `npm run build:backend` from root to build the AgentOS package first. The backend referencing `@framers/agentos` requires `packages/agentos/dist`. |
| Locale path mismatch                                                  | Ensure routes use `/:locale?` and `Router.beforeEach` sets `i18n.global.locale`. See `router/index.ts`.                                                |

---

## Contributing Notes

- Keep agent definitions and persona registries in sync with the backend (`agentos.persona-registry.ts`).
- When adding new API calls, update `src/utils/api.ts` to centralize authentication headers and SSE logic.
- For feature flags, prefer the `VITE_FEATURE_FLAG_*` naming convention to keep front-end toggles consistent with documentation.

For the broader integration plan (AgentOS packaging, workspace structure, backend wiring), see `docs/AGENTOS_REINTEGRATION_NOTES.md`.
