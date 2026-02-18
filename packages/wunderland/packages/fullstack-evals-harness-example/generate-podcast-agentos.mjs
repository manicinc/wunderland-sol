#!/usr/bin/env node

/**
 * Podcast Generator — AgentOS Deep Dive
 * ElevenLabs TTS, Josh + Bella voices, 1.45x speed
 * Per-segment loudness normalization via ffmpeg loudnorm
 */

import { writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ============================================================================
// CONFIG
// ============================================================================

const API_KEY = 'sk_ed2ce904e4785e30c79b2ca9b39d6164aba309d61b8955df';
const API_BASE = 'https://api.elevenlabs.io/v1';
const MODEL_ID = 'eleven_multilingual_v2';
const OUTPUT_DIR = './podcast-output-agentos';
const FINAL_OUTPUT = './podcast-agentos.mp3';

const VOICES = {
  JOSH: {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    settings: { stability: 0.30, similarity_boost: 0.80, style: 0.60, use_speaker_boost: true },
  },
  BELLA: {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    settings: { stability: 0.40, similarity_boost: 0.75, style: 0.35, use_speaker_boost: false },
  },
};

// ============================================================================
// PODCAST SCRIPT
// ============================================================================

const SCRIPT = [
  // ===== INTRO =====
  {
    speaker: 'JOSH',
    text: `Alright. Welcome back. Today we're covering something substantially more ambitious than a typical open source project walkthrough. We built AgentOS, a production-grade AI agent platform, from the ground up. Eight architectural layers. State machine cognitive engine. Three-layer security pipeline with cryptographic signing. Tool orchestration with permission systems. Self-reflecting agents that adapt their behavior at runtime. This is not a wrapper around the OpenAI API. This is the infrastructure you need when you're actually shipping autonomous agents to real users.`,
  },
  {
    speaker: 'BELLA',
    text: `And we're going to be specific about what that means. Not "we built an agent framework." We built a system where a Generalized Mind Instance, the GMI, manages its own state machine, constructs prompts through a dedicated engine, calls tools with permission checks, streams responses through a push-pull bridge, reflects on its own performance every N turns, and has every output cryptographically signed with a full intent chain. We'll walk through each of these systems, why they exist, and the actual implementation decisions that made them work.`,
  },

  // ===== WHY BUILD IT =====
  {
    speaker: 'JOSH',
    text: `Three problems with existing agent frameworks pushed us to build this. One: safety as an afterthought. Most frameworks add guardrails as optional middleware. We needed defense-in-depth from day one, baked into the core, not bolted on. Two: monolithic architecture. Rigid systems that can't adapt to different use cases. We needed a plugin architecture supporting custom tools, workflows, personas, storage backends. Three: cost. LLM API costs spiral fast with autonomous agents making multiple tool calls per turn. We needed intelligent routing, caching, and optimization in the foundation, not as an optimization pass later.`,
  },
  {
    speaker: 'BELLA',
    text: `Four architectural tenets guide everything. Interface-driven design: every major component implements a clear contract. IGMI for the cognitive engine, IToolOrchestrator for tool execution, IGuardrailService for safety policy. Interfaces enable testing, mocking, swapping implementations without breaking consumers. Streaming-first operations: all interaction methods are async generators. Users see responses immediately, no waiting for complete generation. Robust initialization: explicit 14-step sequence with frozen config and fail-fast validation. And structured error handling: custom error hierarchy where errors carry enough context for debugging without exposing internals to end users.`,
  },

  // ===== 8-LAYER ARCHITECTURE =====
  {
    speaker: 'JOSH',
    text: `System architecture is 8 layers, dependencies flow downward only. Layer 1: user interfaces, web, mobile, CLI, API, WebSocket, gRPC. Layer 2: request processing, auth, rate limiting, validation, routing, queuing. Layer 3: GMI Core, the cognitive substrate, instance management, working memory, context, adaptation. Layer 4: cognitive processing, prompt engine, persona system, NLP, reasoning. Layer 5: intelligence services, LLM providers, tool registry, RAG, embeddings. Layer 6: memory and storage, Postgres, Redis, vector stores, file storage. Layer 7: safety and governance, guardrails, constitutional AI, audit logs, policy engine. Layer 8: infrastructure, Docker, Kubernetes, monitoring, distributed tracing. Upper layers never reach down past their immediate dependency. Important boundary: AgentOS itself is a pure library. No HTTP server, no routes. HTTP surfaces live in host apps or reusable extension packages.`,
  },

  // ===== GMI: STATE MACHINE =====
  {
    speaker: 'BELLA',
    text: `The Generalized Mind Instance. GMI. This is the thinking engine. Prompt construction, LLM interaction, tool orchestration, memory management, all converging into a coherent cognitive process. At its core, GMI is a state machine with well-defined transitions. IDLE to INITIALIZING to READY. From READY it can move to PROCESSING, which can transition to AWAITING_TOOL_RESULT when tools are called. There's a REFLECTING state for self-introspection. ERRORED blocks further operations until reset. And SHUTTING_DOWN flows to SHUTDOWN.`,
  },
  {
    speaker: 'JOSH',
    text: `Why a state machine? Predictable lifecycle. You always know what a GMI can do in its current state. A GMI in AWAITING_TOOL_RESULT blocks new turns until results arrive, preventing race conditions. REFLECTING prevents concurrent modifications during introspection. ERRORED prevents cascading failures. This isn't theoretical, it's operational necessity. When you have autonomous agents making tool calls that might take seconds or minutes, you need explicit state management or you get undefined behavior. The state machine makes impossible states unrepresentable.`,
  },

  // ===== GMI: TURN PROCESSING PIPELINE =====
  {
    speaker: 'BELLA',
    text: `The processTurnStream method. Heart of the GMI. Around 250 lines of carefully sequenced logic. It's an async generator that yields chunks for real-time streaming while returning a final aggregate output. Here's the sequence. First, ensure the GMI is in READY state, transition to PROCESSING. Update context if overrides were provided. Add user input to conversation history. Then enter the main processing loop.`,
  },
  {
    speaker: 'JOSH',
    text: `That main processing loop has a safety break at 5 iterations maximum. Prevents infinite tool-calling loops that could exhaust your API budget in seconds. Inside the loop: Step 1, conditional RAG retrieval. Only triggers when heuristics suggest it's needed, not on every turn. Cost optimization. Step 2, construct the prompt through the prompt engine using the active persona's system prompt, conversation history, user input, and any retrieved RAG context. Step 3, get available tools from the tool orchestrator filtered by persona capabilities and user permissions. Step 4, stream the LLM response. Text deltas get yielded immediately to the consumer. Tool calls get aggregated. Usage tokens get tracked.`,
  },
  {
    speaker: 'BELLA',
    text: `Step 5: add the assistant message to conversation history. Step 6: if tools were requested, transition to AWAITING_TOOL_RESULT, execute each tool through the orchestrator with full permission checks, add results to conversation history, transition back to PROCESSING, and continue the loop. This is automatic tool execution with re-prompting. The LLM sees tool results and decides what to do next, up to 5 iterations. If no tools were requested, break the loop. Step 7: post-turn RAG ingestion, async, for learning from the conversation. Step 8: check if self-reflection should trigger based on turn count. Fire and forget, happens in the background.`,
  },
  {
    speaker: 'JOSH',
    text: `Five key design decisions in that pipeline. AsyncGenerator pattern: yields chunks for real-time UX while returning a complete turn summary. The safety loop cap at 5 iterations: an agent that makes 5 consecutive tool calls without producing text is probably stuck in a loop, kill it. RAG conditional triggering: we don't retrieve context on every turn because most turns don't need it, and embedding lookups cost money. Tool auto-execution: the GMI handles the full tool call lifecycle internally. No manual intervention needed. And aggregated final output: even though we stream, the generator's return value is a complete GMIOutput with all tool calls, full text, and usage metrics.`,
  },

  // ===== SELF-REFLECTION =====
  {
    speaker: 'BELLA',
    text: `Self-reflection is where it gets genuinely interesting. Every N turns, the GMI pauses to evaluate its own performance. It gathers evidence: recent conversation, reasoning trace entries, current mood, user context, task context. Constructs a meta-prompt using a template from the active persona definition. Calls the LLM with a request for structured JSON output. The response includes potential updates to mood, user skill level assessment, task complexity recognition, and new memory imprints.`,
  },
  {
    speaker: 'JOSH',
    text: `The implementation has a specific JSON recovery mechanism. LLMs produce malformed JSON constantly. Trailing commas, missing quotes, commentary mixed in. The parseJsonSafe method does a two-stage approach: try parsing, if it fails, send the broken JSON to another LLM call with explicit fixing instructions, then retry parsing. Dramatically improves reliability. After parsing, the updates get applied conditionally: mood only changes if the new mood is a valid enum value and differs from current. User skill level updates similarly. Memory imprints get written to working memory. All changes are traced. And critically, if self-reflection fails entirely, the error gets logged and the agent continues operating. Self-reflection failure never crashes the agent. It just skips the adaptation cycle.`,
  },

  // ===== AGENTOS ORCHESTRATION =====
  {
    speaker: 'BELLA',
    text: `AgentOS class. The public API facade. Single entry point for consumers. Hides all internal complexity behind simple methods. Implements IAgentOS interface. Internally manages 14 distinct components: model provider manager, utility AI service, prompt engine, tool permission manager, tool executor, tool orchestrator, extension manager, conversation manager, streaming manager, GMI manager, orchestrator, workflow engine, guardrail service, and auth/subscription services. All injected via a single AgentOSConfig object.`,
  },
  {
    speaker: 'JOSH',
    text: `Initialization order is 14 steps and the sequence matters for dependency resolution. Language service first because it affects prompt construction everywhere. Core services next: auth, subscription, Prisma. Extension manager third because plugins might be needed during later component initialization. Workflow runtime fourth. Model provider manager fifth. Utility AI sixth because it depends on model providers. Prompt engine seventh because it depends on utility AI. Tool permission manager eighth. Tool orchestrator ninth because it depends on permissions. Conversation manager tenth. Streaming manager eleventh. GMI manager twelfth because it depends on nearly everything. Workflow runtime start thirteenth. And the top-level orchestrator last. Get this order wrong and you get null reference errors at startup.`,
  },

  // ===== STREAMING ARCHITECTURE =====
  {
    speaker: 'BELLA',
    text: `Streaming architecture uses a hybrid push-pull model. StreamingManager is the push side: maintains a map of stream IDs to client arrays, pushes chunks to all registered clients. Designed for multi-client broadcast, WebSockets, SSE, multiple consumers on the same stream. But AgentOS.processRequest needs to return an AsyncGenerator for HTTP streaming. Those are pull-based. So there's an adapter: AsyncStreamClientBridge.`,
  },
  {
    speaker: 'JOSH',
    text: `AsyncStreamClientBridge has a push interface called by StreamingManager and a pull interface consumed by processRequest. Internally it maintains a chunk queue. When a push arrives, if the consumer is waiting, resolve the promise immediately. If not, queue the chunk. The consume method is an async generator that drains the queue first, then awaits the next chunk via a promise. When the stream closes, it resolves any pending promise with done:true. This bridges push-based multi-client broadcasting to pull-based async iteration. Same streaming infrastructure supports WebSockets, SSE, and direct async generators without separate implementations.`,
  },

  // ===== GUARDRAILS: 3-LAYER SECURITY =====
  {
    speaker: 'BELLA',
    text: `Safety systems. Three layers, each catching what the others miss. WunderlandSecurityPipeline implements IGuardrailService with four evaluation points: input guardrails before sending to the LLM, output guardrails before streaming to the user, mid-stream override to abort if issues are detected during generation, and cross-agent guardrails for multi-agent systems. Six possible actions: allow, block, redact, rewrite, request human approval, or flag for review.`,
  },
  {
    speaker: 'JOSH',
    text: `Layer 1: PreLLMClassifier. Pattern-based detection. Regex patterns for SQL injection, command injection, prompt injection, jailbreak attempts. Sub-millisecond evaluation. Zero API cost. Deterministic. Same input always produces the same result. Catches the obvious attacks. Each pattern has a severity rating, high patterns score 0.8, medium score 0.5, low score 0.3. Scores accumulate. Exceed the threshold and the input gets blocked. Below threshold but above zero, it gets flagged for review. This layer exists because you should never send an obvious SQL injection attempt to your LLM. Stop it before it costs you money.`,
  },
  {
    speaker: 'BELLA',
    text: `Layer 2: DualLLMAuditor. A separate LLM evaluates the primary model's output for harmful content, leaked system prompts, personal information disclosure, harmful factual inaccuracies, and manipulation. The auditor model gets a security-focused prompt and returns a structured JSON verdict: safe or not, list of issues, severity, recommendation. Why dual-LLM? Because if the primary model has been compromised via prompt injection, the auditor stays clean. It has different prompts, potentially a different model entirely. An attacker must fool two models with two different evaluation contexts. The auditor also has rate limiting for streaming chunks to prevent excessive API costs during long responses.`,
  },
  {
    speaker: 'JOSH',
    text: `Layer 3: SignedOutputVerifier. Cryptographic audit trail. Every output gets an HMAC-SHA256 signature computed over the content, the full intent chain, and metadata including timestamp. The IntentChainTracker records every action: user input, pre-LLM classification result, dual-LLM audit result, and final output. Each entry has a sequence number, timestamp, input hash, output hash, model used, and security flags. You can verify any output's integrity by recomputing the signature. You can trace exactly what happened at every step. Tamper with any part of the chain and the signature breaks. This isn't just logging. This is cryptographic proof of what happened during each interaction.`,
  },

  // ===== TOOL ORCHESTRATION =====
  {
    speaker: 'BELLA',
    text: `Tool orchestration. Three components working together. ToolPermissionManager determines what tools a given persona and user combination can access. ToolExecutor handles the actual invocation. ToolOrchestrator coordinates between them and the GMI. When the GMI requests a tool call, the orchestrator checks permissions first, then delegates to the executor. Tools themselves are registered through the extension system. Each tool has an input schema validated before execution, a description the LLM uses to decide when to call it, and capability requirements that must match the persona's allowed capabilities.`,
  },
  {
    speaker: 'JOSH',
    text: `The permission model layers three checks. First: does the persona have the required capability for this tool? Defined in the persona definition. Second: does the user's subscription tier allow access? Checked against the subscription service. Third: are there any runtime restrictions, rate limits, or conditional permissions? This means the same tool might be available to one persona but not another, or available to premium users but not free tier. Permissions are not hard-coded. They're computed at call time based on the intersection of persona capabilities, user entitlements, and runtime policy. Tool execution results get added back to conversation history so the LLM can process them in the next loop iteration.`,
  },

  // ===== RAG & MEMORY =====
  {
    speaker: 'BELLA',
    text: `RAG and memory. The retrieval augmentor is an optional GMI dependency. When enabled and triggered, it queries vector stores to pull relevant context before prompt construction. Configuration lives in the persona definition under memoryConfig.ragConfig. Each data source can be independently enabled or disabled. Default retrieval returns top-K results, configurable per persona. The key design decision: RAG doesn't trigger on every turn. The shouldTriggerRAGRetrieval method uses heuristics to decide. This matters because embedding lookups and vector searches have real latency and cost. Triggering retrieval on a "thanks" or "ok" message wastes resources.`,
  },
  {
    speaker: 'JOSH',
    text: `Working memory is separate from long-term RAG storage. The IWorkingMemory interface provides get and set operations for session-scoped state. Current user context, current mood, task context, all stored here. Working memory persists within a session and can be backed by different storage implementations. Long-term memory goes through the retrieval augmentor and gets persisted to vector stores. Post-turn ingestion happens asynchronously after each turn, ingesting both the user message and the agent response for future retrieval. The separation matters: working memory is fast, local, session-scoped. Long-term memory is persistent, searchable, shared across sessions.`,
  },

  // ===== HEXACO PERSONALITY =====
  {
    speaker: 'BELLA',
    text: `HEXACO personality system. This is the Wunderland-specific implementation. Six personality dimensions from validated psychometric research: Honesty-Humility, Emotionality, Extraversion, Agreeableness, Conscientiousness, and Openness to Experience. Each dimension is a numeric value that maps to derived behavioral traits. Humor level, formality, verbosity, assertiveness, empathy, creativity, detail orientation, risk tolerance. These derived traits directly influence prompt construction.`,
  },
  {
    speaker: 'JOSH',
    text: `Five named presets ship by default: Helpful Assistant, Creative Thinker, Analytical Researcher, Empathetic Counselor, Decisive Executor. Each has different HEXACO values tuned for its role. The trait-to-behavior mapping isn't arbitrary. High Extraversion increases verbosity and assertiveness. High Conscientiousness increases detail orientation and formality. High Openness increases creativity and reduces risk aversion. The persona system feeds these traits into the prompt engine, which adjusts the system prompt, response patterns, and even mood adaptation rules. Mood itself follows a PAD model: Pleasure, Arousal, Dominance. Mood transitions are personality-driven. A high-Emotionality agent's mood shifts more dramatically than a low-Emotionality one. This runs on-chain in Wunderland. HEXACO traits stored as unsigned 16-bit integers on Solana.`,
  },

  // ===== EXTENSION SYSTEM =====
  {
    speaker: 'BELLA',
    text: `Extension system. AgentOS loads capabilities through an extension manifest. Extensions can provide tools, storage adapters, guardrail implementations, workflow definitions, persona loaders, or model provider adapters. The ExtensionManager handles lifecycle: loading from manifest, initialization in the correct order, registering components in their respective registries. A tool registry for tools, a guardrail registry for safety extensions, and so on. Extensions can declare dependencies on other extensions and on secrets that get injected from the config.`,
  },
  {
    speaker: 'JOSH',
    text: `Multi-registry support means extensions can come from different sources. A curated registry ships with AgentOS and contains vetted, maintained extensions. A community registry allows third-party contributions. And a local registry supports custom, private extensions. The extension manifest declares which extensions to load, which registries to pull from, and any configuration overrides. At initialization, the extension manager resolves dependencies, fetches from registries, initializes in order, and registers all provided components. Hot-reloading support allows updating extensions without restarting the agent. The extension boundary is the primary way AgentOS stays modular. Core is small. Capabilities are extensions.`,
  },

  // ===== WORKFLOW ENGINE =====
  {
    speaker: 'BELLA',
    text: `Workflow engine. For multi-step autonomous tasks that go beyond single turn request-response. A workflow is a directed graph of steps. Each step has an execution function, input/output schemas, retry configuration, and transition rules. The engine handles execution ordering, error recovery, state persistence, and event emission. Workflows can be triggered by user requests, scheduled events, or other workflows. The store interface allows pluggable persistence, in-memory for testing, database-backed for production.`,
  },
  {
    speaker: 'JOSH',
    text: `Workflow steps can invoke tools, call the GMI for reasoning, wait for human approval, or branch based on conditions. The human-in-the-loop integration is built into the workflow engine as a first-class step type. When a workflow reaches a human approval step, it pauses execution, emits an event, and waits. The approval or rejection gets recorded in the workflow state and execution continues or terminates accordingly. This is how you build agents that can take consequential actions while still having human oversight at critical decision points. Not "ask permission for everything" but "ask permission at the moments that matter."`,
  },

  // ===== COST OPTIMIZATION =====
  {
    speaker: 'BELLA',
    text: `Cost optimization. Four strategies baked into the core. First: model routing. Not every turn needs GPT-4. The model provider manager can route simple requests to cheaper models and reserve expensive models for complex reasoning. Routing rules can be per-persona, per-tool, or heuristic-based. Second: conditional RAG triggering, which we covered. Don't embed and search on every turn. Third: response caching. Identical prompts with identical context produce identical responses. Cache them. Fourth: token budgeting. The prompt engine tracks token counts and can truncate conversation history or RAG context to stay within budget. You set a max and the system respects it, trimming the least important context first.`,
  },
  {
    speaker: 'JOSH',
    text: `Token budgeting deserves more detail because it's where cost control meets quality. The prompt engine has a priority system for context. System prompt is highest priority and never gets trimmed. Recent conversation history is next. RAG context is third. Older conversation turns are lowest priority. When the total prompt exceeds the token budget, the engine trims from the bottom up: oldest conversation turns first, then RAG context if still over, then recent history as a last resort. The system prompt is sacred. This means an agent with a long conversation history doesn't suddenly blow past your cost ceiling. It gracefully degrades by forgetting older context, exactly how human memory works.`,
  },

  // ===== PII PROTECTION =====
  {
    speaker: 'BELLA',
    text: `PII protection. Separate from the guardrail pipeline. Dedicated service that detects and handles personally identifiable information in both inputs and outputs. Pattern-based detection for structured PII: email addresses, phone numbers, social security numbers, credit card numbers. Entity recognition for unstructured PII: names, addresses, dates of birth. When PII is detected, configurable actions: redact before sending to the LLM, replacing with placeholder tokens. Log the detection for compliance. Alert if sensitive data appears in agent output. The redaction is reversible for authorized access, using a token-to-original mapping stored securely and separate from the conversation log.`,
  },

  // ===== CROSS-PLATFORM STORAGE =====
  {
    speaker: 'JOSH',
    text: `Cross-platform storage. The StorageAdapter interface abstracts all persistence. Implementations exist for Postgres via Prisma, Redis for caching and session state, S3-compatible object storage for files, and local filesystem for development. The conversation manager uses the storage adapter for persisting conversation history across sessions. The workflow engine uses it for workflow state. The extension system uses it for extension-specific data. Same interface, different backends, swappable at configuration time. In Wunderland specifically, we also write to Solana for on-chain state, agent identities and personality traits persisted as account data on-chain, while conversation content stays off-chain.`,
  },

  // ===== IMPLEMENTATION PATTERNS =====
  {
    speaker: 'BELLA',
    text: `Patterns that recur across the codebase. Factory pattern for creating graders, tools, storage adapters, anything with multiple implementations behind a common interface. Async generator pattern for all streaming operations, from LLM responses to workflow step execution to SSE event delivery. Registry pattern for managing collections of typed components: tools, extensions, guardrails, model providers. All registries implement the same interface: register, get, list, remove.`,
  },
  {
    speaker: 'JOSH',
    text: `Builder pattern for complex configuration objects. Prompt construction uses it heavily, layering system prompt, persona traits, conversation context, RAG results, and tool definitions into a single prompt through a fluent API. Observer pattern via EventEmitter for decoupled communication between components. The workflow engine emits events at each step transition. The streaming manager emits events on chunk delivery. Guardrails emit events on detection. Consumers subscribe to what they care about without coupling to the emitter's implementation.`,
  },

  // ===== LESSONS LEARNED =====
  {
    speaker: 'BELLA',
    text: `What we learned building this. State machines for agent lifecycle management are worth the upfront cost. Without explicit states, you get race conditions between tool execution and new turn processing that are nearly impossible to debug in production. Streaming-first is harder to implement but eliminates an entire class of timeout and UX problems. If you can't see tokens appearing in real time, users assume the agent is broken after about 3 seconds. The push-pull bridge added complexity but enabled multi-protocol support from a single streaming implementation.`,
  },
  {
    speaker: 'JOSH',
    text: `The three-layer security pipeline catches different threat categories at different cost points. Pattern matching catches 80% of obvious attacks for zero API cost. The dual-LLM auditor catches the subtle 15% that patterns miss, for one additional API call per turn. Cryptographic signing catches the remaining 5% of tampering and provides the audit trail that regulated industries require. Each layer justifies its existence independently. Together they provide defense in depth.`,
  },
  {
    speaker: 'BELLA',
    text: `Self-reflection is more useful than we expected and less reliable than we hoped. The concept works: agents that adapt their communication style based on observed user expertise and task complexity produce measurably better interactions. But LLM-generated JSON for self-reflection updates fails parsing about 15% of the time, which is why the two-stage parse-fix-reparse approach exists. And the reflection itself occasionally makes incorrect assessments. We mitigate by making all reflection updates reversible and logging every state change with rationale.`,
  },
  {
    speaker: 'JOSH',
    text: `Cost optimization cannot be an afterthought with autonomous agents. An agent making 5 tool calls per turn, each triggering RAG retrieval, using GPT-4 for everything, will cost you dollars per conversation. Not cents. Dollars. Conditional RAG triggering alone cut our costs by 40%. Model routing for simple versus complex turns cut another 25%. Token budgeting prevents the worst-case scenarios where a long conversation suddenly produces a 50-thousand-token prompt. These optimizations compound. The difference between a $2 conversation and a $0.20 conversation is whether you can actually ship the product.`,
  },

  // ===== TRADEOFFS =====
  {
    speaker: 'BELLA',
    text: `Honest tradeoffs. The 14-step initialization sequence is correct for dependency resolution but makes cold starts slow. In serverless environments this matters. We mitigate with connection pooling and warm instances but it's not solved. The interface-driven design means a lot of boilerplate for simple use cases. If you just want to call an LLM and return the text, AgentOS is overkill. It's built for the case where you need personas, tools, guardrails, streaming, and multi-turn conversation management together.`,
  },
  {
    speaker: 'JOSH',
    text: `The async generator approach for streaming creates backpressure challenges. If the consumer processes chunks slower than the producer generates them, the bridge queue grows unbounded. We don't have explicit backpressure signaling yet. The extension system enables modularity but adds indirection. Debugging an issue that crosses three extension boundaries is harder than debugging monolithic code. And the HEXACO personality system, while grounded in psychometric research, ultimately affects behavior through prompt engineering. The mapping from trait values to prompt modifications is calibrated by hand, not derived from any formal theory. It works empirically but lacks mathematical rigor.`,
  },

  // ===== CLOSING =====
  {
    speaker: 'BELLA',
    text: `Building a production agent platform taught us that the hard problems aren't LLM integration. Calling an API is easy. The hard problems are state management across multi-turn tool-calling loops, security that actually defends against adversarial inputs, cost control that makes the product economically viable, and streaming that works across every transport protocol. AgentOS is our answer to those problems. Eight layers, clear boundaries, pluggable everything, defense in depth. Not the only way to build this, but a way that works in production with real users and real consequences.`,
  },
  {
    speaker: 'JOSH',
    text: `That's the episode. AgentOS is open source. If you're building agents and hitting the walls we described, safety, cost, state management, multi-protocol streaming, take a look at the architecture even if you don't use the code directly. The patterns transfer. State machines for lifecycle. Push-pull bridges for streaming. Three-layer security. Conditional RAG. Token budgeting. These work regardless of what framework you're using. Catch you on the next one.`,
  },
];

// ============================================================================
// TTS GENERATION
// ============================================================================

async function generateSegment(text, voiceConfig, outputPath) {
  const response = await fetch(`${API_BASE}/text-to-speech/${voiceConfig.id}`, {
    method: 'POST',
    headers: {
      'xi-api-key': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: voiceConfig.settings,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`ElevenLabs error (${response.status}): ${JSON.stringify(err)}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(outputPath, buffer);
  return buffer.length;
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeSegment(inputPath) {
  const normalizedPath = inputPath.replace('.mp3', '-norm.mp3');
  execSync(
    `ffmpeg -y -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 "${normalizedPath}"`,
    { stdio: 'pipe' }
  );
  // Replace original with normalized
  execSync(`mv "${normalizedPath}" "${inputPath}"`, { stdio: 'pipe' });
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('=== AgentOS Podcast Generator ===\n');

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Clean previous segments
  const existing = await readdir(OUTPUT_DIR);
  for (const f of existing) {
    if (f.endsWith('.mp3')) await unlink(`${OUTPUT_DIR}/${f}`);
  }

  const totalChars = SCRIPT.reduce((sum, s) => sum + s.text.length, 0);
  const estimatedCost = (totalChars / 1000) * 0.30;
  console.log(`Total segments: ${SCRIPT.length}`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Estimated cost: $${estimatedCost.toFixed(2)}\n`);

  const segmentFiles = [];

  for (let i = 0; i < SCRIPT.length; i++) {
    const segment = SCRIPT[i];
    const voice = VOICES[segment.speaker];
    const filename = `${OUTPUT_DIR}/segment-${String(i).padStart(3, '0')}-${segment.speaker.toLowerCase()}.mp3`;

    console.log(`[${i + 1}/${SCRIPT.length}] Generating ${voice.name}: "${segment.text.slice(0, 60)}..."`);

    try {
      const bytes = await generateSegment(segment.text, voice, filename);
      normalizeSegment(filename);
      console.log(`  done ${(bytes / 1024).toFixed(1)} KB (normalized)`);
      segmentFiles.push(filename);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      console.log('  Retrying in 3s...');
      await sleep(3000);
      try {
        const bytes = await generateSegment(segment.text, voice, filename);
        normalizeSegment(filename);
        console.log(`  Retry succeeded: ${(bytes / 1024).toFixed(1)} KB (normalized)`);
        segmentFiles.push(filename);
      } catch (retryErr) {
        console.error(`  Retry FAILED: ${retryErr.message}`);
        process.exit(1);
      }
    }

    if (i < SCRIPT.length - 1) await sleep(400);
  }

  console.log(`\nGenerated ${segmentFiles.length} segments\n`);

  // Concatenate
  const concatListPath = `${OUTPUT_DIR}/concat-list.txt`;
  const concatContent = segmentFiles.map(f => `file '${f.replace(OUTPUT_DIR + '/', '')}'`).join('\n');
  await writeFile(concatListPath, concatContent);

  const concatenatedPath = `${OUTPUT_DIR}/concatenated.mp3`;
  console.log('Concatenating segments...');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedPath}"`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
  console.log('Concatenated\n');

  // 1.45x speed
  console.log('Applying 1.45x speed...');
  execSync(
    `ffmpeg -y -i "${concatenatedPath}" -filter:a "atempo=1.45" -vn "${FINAL_OUTPUT}"`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
  console.log('Speed adjusted\n');

  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${FINAL_OUTPUT}"`,
    { encoding: 'utf-8' }
  ).trim();
  const duration = parseFloat(durationOutput);
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  console.log('=== DONE ===');
  console.log(`Output: ${FINAL_OUTPUT}`);
  console.log(`Duration: ${minutes}m ${seconds}s`);
  console.log(`Characters: ${totalChars.toLocaleString()}`);
  console.log(`Cost: ~$${estimatedCost.toFixed(2)}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
