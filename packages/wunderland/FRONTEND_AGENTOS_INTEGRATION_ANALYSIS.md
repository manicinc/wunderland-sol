# Frontend AgentOS Integration - Deep Investigation & Restructuring Plan

**Date:** November 1, 2025  
**Status:** Investigation Phase  
**Goal:** Determine if frontend is fully integrated with @framers/agentos and @framers/sql-storage-adapter for local-first persistence

---

## Executive Summary

The **voice-chat-assistant** frontend is currently **NOT integrated** with the public packages (`@framers/agentos` and `@framers/sql-storage-adapter`). It operates as a **client application** that makes HTTP requests to a **backend server** for all AI functionality.

### Current Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3 App)                     │
│  - Uses localForage (IndexedDB) for agent-specific data    │
│  - Makes HTTP/SSE requests to backend API                  │
│  - No direct AgentOS orchestration                         │
│  - No SQL storage adapter usage                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/SSE
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  - AgentOS orchestration (embedded in backend/agentos/)    │
│  - SQLite for conversation persistence                     │
│  - LLM provider integrations                               │
│  - Handles all AI processing server-side                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Investigation Findings

### 1. **Package Dependencies**

#### Frontend (`frontend/package.json`)
```json
{
  "dependencies": {
    "localforage": "^1.10.0",  // ✅ Used for agent data
    // ❌ NO @framers/agentos
    // ❌ NO @framers/sql-storage-adapter
    "axios": "^1.6.2",         // Used for backend API calls
    "vue": "^3.3.8",
    "pinia": "^2.1.7"
  }
}
```

**Finding:** Frontend has ZERO dependencies on the public packages.

---

### 2. **Storage Architecture**

#### Current Implementation: `frontend/src/services/localStorage.service.ts`

```typescript
class LocalStorageService implements IStorageService {
  private store: LocalForage;  // Uses localForage (IndexedDB wrapper)
  
  // Methods:
  // - getItem<T>(namespace, key)
  // - setItem(namespace, key, value)
  // - removeItem(namespace, key)
  // - getAllItemsInNamespace<T>(namespace)
  // - clearNamespace(namespace)
}
```

**Usage Pattern:**
- **Diary Agent:** Stores entries in `diary` namespace
- **Coding Agent:** Stores projects/files in `coding` namespace
- **Interview Agent:** Stores sessions in `coding-interviewer` namespace
- **Business Meeting Agent:** Stores meeting data in `meetings` namespace

**Storage Technology:**
- ✅ **IndexedDB** (via localForage)
- ❌ **NOT** using SQL Storage Adapter
- ❌ **NOT** using @framers/agentos storage interfaces

---

### 3. **LLM/Orchestration Architecture**

#### Current Pattern: Backend Proxy

All agents follow this pattern (example from `useCodingAgent.ts`):

```typescript
async function handleCodingQuery(text: string): Promise<void> {
  // 1. Build payload
  const basePayload: ChatMessagePayloadFE = {
    messages: messagesForLlm,
    mode: agentConfigRef.value.systemPromptKey,
    // ...
  };

  // 2. Call BACKEND API (not local orchestrator)
  const response = await chatAPI.sendMessage(payload);
  
  // 3. Process response
  const responseData = response.data;
  // ...
}
```

**Finding:** Frontend uses `chatAPI.sendMessage()` which is an **HTTP request to the backend**.

#### API Configuration (`frontend/src/utils/api.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// AgentOS integration flags
const AGENTOS_FRONTEND_ENABLED = env.VITE_AGENTOS_ENABLED ?? 'false';
const AGENTOS_CLIENT_MODE = env.VITE_AGENTOS_CLIENT_MODE ?? 'proxy';

// Routes
const AGENTOS_CHAT_PATH = '/agentos/chat';
const AGENTOS_STREAM_PATH = '/agentos/stream';
```

**Feature Flags Found:**
- `VITE_AGENTOS_ENABLED` - Currently defaults to `false`
- `VITE_AGENTOS_CLIENT_MODE` - Can be `'proxy'` or `'direct'`
  - **proxy mode:** All requests go through backend (current)
  - **direct mode:** Would theoretically call AgentOS directly (NOT IMPLEMENTED)

---

### 4. **Backend Integration**

The backend has an embedded copy of AgentOS:
- Location: `backend/agentos/`
- Contains: API, orchestrator, config, server
- **Problem:** This is a SEPARATE codebase from `packages/agentos`

**Architecture Smell:** Two AgentOS implementations exist:
1. `packages/agentos/` - Public, npm-ready package ✅
2. `backend/agentos/` - Private, embedded copy ❌

---

### 5. **Data Flow Analysis**

#### Example: User sends a chat message

```
User Input
   │
   ▼
Frontend (Vue Component)
   │
   ├─> Chat Store (Pinia)
   │      │
   │      ├─> Prepare message history
   │      └─> Build API payload
   │
   ▼
HTTP POST to /api/chat
   │
   ▼
Backend Server
   │
   ├─> Route Handler (chat.routes.ts)
   │      │
   │      ├─> Load system prompt
   │      ├─> Prepare context
   │      └─> Call LLM provider (OpenAI/Anthropic)
   │
   ├─> Store in SQLite (SqliteMemoryAdapter)
   │
   └─> Return response
   │
   ▼
Frontend receives response
   │
   ├─> Update Chat Store
   ├─> Display in UI
   └─> Save agent-specific data to localForage
```

**Finding:** Complete client-server architecture. No local orchestration.

---

## Problem Statement

### What's Missing

1. **No @framers/agentos Integration**
   - Frontend doesn't use AgentOS orchestrator
   - No local GMI (Generative Model Interface) instances
   - No tool orchestration on client side
   - All AI processing happens server-side

2. **No @framers/sql-storage-adapter Integration**
   - Uses localForage (IndexedDB) instead
   - No SQL-based persistence
   - No cross-platform storage abstraction
   - Limited query capabilities vs SQL

3. **Architectural Fragmentation**
   - Two separate AgentOS codebases
   - Duplicate orchestration logic
   - Inconsistent storage patterns
   - No shared interfaces between frontend and backend

---

## Proposed Restructuring Architecture

### Option A: Client-Side AgentOS (Full Local-First)

**Vision:** Move ALL orchestration to the frontend, make backend optional for cloud sync only.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3 App)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/agentos (Local Orchestrator)                │    │
│  │  - GMI Manager                                      │    │
│  │  - Tool Orchestrator                                │    │
│  │  - Conversation Manager                             │    │
│  │  - Streaming Manager                                │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/sql-storage-adapter                      │    │
│  │  - SQL.js (WebAssembly SQLite in browser)          │    │
│  │  - Capacitor SQL (mobile)                          │    │
│  │  - Better-sqlite3 (Electron/Tauri)                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  Storage: Local SQL database (all agent data)              │
│  API Keys: User-provided or optional backend proxy        │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Optional sync
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                BACKEND (Optional Cloud Sync)                │
│  - User auth & API key encryption                          │
│  - Cross-device sync                                        │
│  - Rate limiting                                            │
│  - Analytics                                                │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ True local-first architecture
- ✅ Works offline
- ✅ User controls their own API keys
- ✅ No server costs for AI processing
- ✅ Fully leverages public packages
- ✅ Privacy-first (data never leaves device)

**Cons:**
- ❌ Requires users to provide own API keys
- ❌ CORS challenges with LLM providers
- ❌ Limited to browser capabilities
- ❌ Complex migration for existing users
- ❌ No server-side rate limiting

---

### Option B: Hybrid Architecture (Backend AgentOS + Frontend SQL)

**Vision:** Keep orchestration on backend, but use SQL storage adapter on frontend for rich local storage.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3 App)                     │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/sql-storage-adapter                      │    │
│  │  - SQL.js for conversation cache                   │    │
│  │  - Agent-specific data tables                      │    │
│  │  - Full-text search on messages                    │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  HTTP/SSE to backend for AI processing                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/agentos (from packages/)                    │    │
│  │  - Full orchestration                               │    │
│  │  - LLM integrations                                 │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/sql-storage-adapter                      │    │
│  │  - PostgreSQL for multi-user data                  │    │
│  │  - Better-sqlite3 for single-user mode             │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Keeps existing backend architecture
- ✅ Adds SQL capabilities to frontend
- ✅ Better offline experience
- ✅ Unified storage interface
- ✅ Easier migration path

**Cons:**
- ❌ Still requires backend for AI
- ❌ Doesn't fully leverage @framers/agentos on frontend
- ❌ Data duplication (frontend cache + backend source of truth)

---

### Option C: Pure Backend AgentOS (Current + Consolidation)

**Vision:** Keep frontend as thin client, but consolidate backend to use `packages/agentos`.

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Vue 3 App)                     │
│  - Presentation layer only                                  │
│  - HTTP client for backend API                             │
│  - localForage for UI state                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js)                        │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/agentos (from packages/)                    │    │
│  │  NOT backend/agentos/ copy                         │    │
│  └────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────┐    │
│  │  @framers/sql-storage-adapter                      │    │
│  │  - PostgreSQL or SQLite                            │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

**Pros:**
- ✅ Minimal changes to frontend
- ✅ Consolidates AgentOS to single source
- ✅ Uses public packages
- ✅ Maintains server-side control

**Cons:**
- ❌ Frontend remains dependent on backend
- ❌ No offline capability
- ❌ Doesn't achieve "local-first" vision

---

## Migration Challenges

### 1. **Data Migration**

**Current Storage:**
```
IndexedDB (localForage)
├── diary:entry-{id}
├── coding:project-{id}
├── coding-interviewer:session-{id}
└── meetings:meeting-{id}
```

**Target Storage (SQL):**
```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  user_id TEXT,
  created_at INTEGER,
  last_activity INTEGER
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT,
  role TEXT,
  content TEXT,
  timestamp INTEGER,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE agent_data (
  id TEXT PRIMARY KEY,
  agent_id TEXT,
  namespace TEXT,
  data JSON,
  created_at INTEGER,
  updated_at INTEGER
);
```

**Migration Script Needed:** Convert IndexedDB → SQL schema

---

### 2. **API Layer Changes**

**Current:**
```typescript
// Frontend calls backend API
const response = await chatAPI.sendMessage(payload);
```

**Option A (Local-first):**
```typescript
// Frontend uses local orchestrator
import { AgentOS } from '@framers/agentos';

const agentOS = new AgentOS(config);
const response = await agentOS.processRequest(input);
```

**Option B (Hybrid):**
```typescript
// Frontend uses SQL for reads, backend for writes
const cachedMessages = await sqlStorage.query(
  'SELECT * FROM messages WHERE conversation_id = ?',
  [conversationId]
);

// Still call backend for new messages
const response = await chatAPI.sendMessage(payload);

// Cache response locally
await sqlStorage.insert('messages', response.message);
```

---

### 3. **Environment Configuration**

**New Environment Variables Needed:**

```bash
# Frontend .env
VITE_AGENTOS_MODE=local|hybrid|remote
VITE_SQL_STORAGE_MODE=sql.js|indexeddb|capacitor
VITE_OPENAI_API_KEY_USER_PROVIDED=true

# Backend .env (Option C)
USE_WORKSPACE_AGENTOS=true  # Use packages/agentos instead of backend/agentos
```

---

### 4. **Breaking Changes**

#### Agent Composables
Current agents would need refactoring:

**Before:**
```typescript
async function callLLM(text: string) {
  const response = await chatAPI.sendMessage(payload);
  return response.data;
}
```

**After (Local-first):**
```typescript
async function callLLM(text: string) {
  const orchestrator = await getOrCreateOrchestrator();
  
  const stream = orchestrator.processRequest({
    userId: 'local-user',
    textInput: text,
    selectedPersonaId: agentId,
  });
  
  for await (const chunk of stream) {
    handleChunk(chunk);
  }
}
```

---

## Implementation Roadmap

### Phase 1: Backend Consolidation (Option C) - **2 weeks**

**Goal:** Eliminate duplicate AgentOS code, use `packages/agentos` in backend.

**Tasks:**
1. ✅ Create workspace dependency: `backend/package.json` → add `"@framers/agentos": "workspace:*"`
2. ✅ Refactor `backend/src/` to import from `@framers/agentos`
3. ❌ Remove `backend/agentos/` directory
4. ✅ Update all backend routes to use package version
5. ✅ Add integration tests
6. ✅ Deploy and validate

**Files to Change:**
- `backend/package.json`
- `backend/src/features/chat/chat.routes.ts`
- `backend/server.ts`
- All imports from `../../agentos/` → `@framers/agentos`

---

### Phase 2: Frontend SQL Adapter (Option B) - **3 weeks**

**Goal:** Replace localForage with SQL storage adapter for richer querying.

**Tasks:**
1. ✅ Add `@framers/sql-storage-adapter` to `frontend/package.json`
2. ✅ Create abstraction layer: `frontend/src/services/storage.service.ts`
3. ✅ Implement SQL.js backend for browser
4. ✅ Create migration script: IndexedDB → SQL
5. ✅ Refactor agent composables to use SQL service
6. ✅ Add full-text search for conversations
7. ✅ Update UI to leverage SQL queries

**New Files:**
- `frontend/src/services/storage.service.ts` - Unified interface
- `frontend/src/services/storage-migration.service.ts` - Data migration
- `frontend/src/db/schema.sql` - Database schema

---

### Phase 3: Client-Side AgentOS (Option A) - **6 weeks**

**Goal:** Enable full local-first mode with optional backend.

**Tasks:**
1. ✅ Add `@framers/agentos` to `frontend/package.json`
2. ✅ Create orchestrator initialization service
3. ✅ Implement API key management UI
4. ✅ Add CORS proxy for LLM providers (optional)
5. ✅ Create "Local Mode" toggle in settings
6. ✅ Implement sync service for cloud backup
7. ✅ Add export/import for conversations
8. ✅ Performance optimization for browser

**New Files:**
- `frontend/src/services/agentos.service.ts` - Local orchestrator
- `frontend/src/services/api-key-manager.service.ts` - User API keys
- `frontend/src/services/sync.service.ts` - Optional cloud sync
- `frontend/src/components/settings/LocalModeSettings.vue`

---

## Recommended Approach

### 🎯 **Start with Option C → Migrate to Option B → Optionally add Option A**

**Reasoning:**
1. **Phase 1 (Option C):** Low risk, high value
   - Consolidates codebase
   - Makes backend use published packages
   - Tests packages in production context

2. **Phase 2 (Option B):** Medium complexity, high UX improvement
   - Better frontend performance
   - Richer querying for agents
   - Offline read capabilities
   - Maintains backend dependency (safe)

3. **Phase 3 (Option A):** High complexity, differentiating feature
   - Optional for users who want it
   - Privacy-focused use case
   - Reduces server costs
   - Makes app truly portable

---

## Success Metrics

### Phase 1 (Backend Consolidation)
- ✅ Zero duplicate AgentOS code
- ✅ Backend uses `@framers/agentos` exclusively
- ✅ All existing tests pass
- ✅ No performance regression

### Phase 2 (Frontend SQL)
- ✅ 100% feature parity with localForage
- ✅ Full-text search works for all agents
- ✅ <100ms query time for 1000+ messages
- ✅ Zero data loss during migration

### Phase 3 (Client-Side AgentOS)
- ✅ Works completely offline
- ✅ User can provide own API keys
- ✅ Optional sync to backend
- ✅ <2s initialization time

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Data loss during migration | Medium | High | Comprehensive backup system, gradual rollout |
| Performance degradation | Low | Medium | Extensive benchmarking, lazy loading |
| Browser compatibility | Medium | Medium | Feature detection, graceful degradation |
| CORS issues with LLM APIs | High | High | Proxy service, clear user guidance |
| Breaking changes for users | Medium | High | Versioned releases, migration guides |

---

## Questions to Answer

1. **Product Vision:** Do we want to be local-first or cloud-first?
2. **Monetization:** How does local-first impact revenue model?
3. **User Personas:** Who benefits most from local orchestration?
4. **API Keys:** Are users willing to manage their own?
5. **Backend Role:** What should backend do in local-first world?
6. **Mobile:** How does this work in Capacitor/mobile apps?

---

## Next Steps

1. **Decision:** Choose architecture path (C → B → A recommended)
2. **Spike:** Build proof-of-concept for Phase 1
3. **Design:** Create detailed technical specs for each phase
4. **Estimate:** Refine timeline with team
5. **Execute:** Begin Phase 1 implementation

---

## Appendix: File Inventory

### Files Currently Using localForage
- `frontend/src/services/localStorage.service.ts` - ⚠️ Replace
- `frontend/src/services/diary.service.ts` - ⚠️ Refactor
- `frontend/src/components/agents/catalog/CodingAgent/useCodingAgent.ts` - ⚠️ Refactor
- `frontend/src/components/agents/catalog/CodingInterviewerAgent/useCodingInterviewerAgent.ts` - ⚠️ Refactor
- `frontend/src/components/agents/catalog/BusinessMeetingAgent/useBusinessMeeting.ts` - ⚠️ Refactor

### Files Making Backend API Calls
- `frontend/src/utils/api.ts` - Core API client
- `frontend/src/store/chat.store.ts` - Message handling
- All agent composables (`use*Agent.ts`) - ⚠️ Major refactor needed for local-first

### Backend Files Using Embedded AgentOS
- `backend/agentos/**/*` - ❌ Remove in Phase 1
- `backend/src/features/chat/chat.routes.ts` - ⚠️ Refactor to use `@framers/agentos`
- `backend/src/core/memory/SqliteMemoryAdapter.ts` - ✅ Already uses storage pattern

---

**End of Analysis**

