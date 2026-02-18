#!/usr/bin/env node

/**
 * Resume Podcast Generator — OpenAI TTS
 * Generates remaining segments (42-96) using OpenAI TTS since ElevenLabs quota ran out.
 * Then concatenates ALL segments (0-96) and applies 1.45x speed.
 * Per-segment loudness normalization via ffmpeg loudnorm.
 */

import { writeFile, mkdir, readdir } from 'fs/promises';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// ============================================================================
// CONFIG
// ============================================================================

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY. Set it in your environment (do not hardcode keys).');
  process.exit(1);
}
const OUTPUT_DIR = './podcast-output';
const FINAL_OUTPUT = './podcast-evals-harness.mp3';
const START_FROM = 41; // Resume from this segment index (we have 0-40 = 41 segments)

// OpenAI TTS voice mapping
// Josh (male, warm) → "onyx" (deep male)
// Bella/Adam (female, soft) → "nova" (female)
const OPENAI_VOICES = {
  JOSH: 'onyx',
  ADAM: 'nova',
};

// ============================================================================
// PODCAST SCRIPT (same as generate-podcast.mjs)
// ============================================================================

const SCRIPT = [
  // ===== INTRO =====
  {
    speaker: 'JOSH',
    text: `Alright. Welcome back. Today we're doing something ambitious. A full 45-minute technical breakdown of building a complete LLM evaluation harness from scratch. Not using one off the shelf. Building one. In TypeScript. Self-hosted. File-based. Every prompt is a markdown file on disk. Every dataset is a CSV. Every grader is YAML. You git commit the entire evaluation configuration alongside your application code. That was the constraint from day one and it shaped every architectural decision that followed.`,
  },
  {
    speaker: 'ADAM',
    text: `Before the objections start: yes, we know about LangSmith. Yes, RAGAS exists. Yes, promptfoo exists and we actually use parts of it under the hood. The point isn't that nothing exists in this space. The point is that nothing exists that's full-stack with a persistent UI, self-hosted for data sovereignty, file-based for version control, AND TypeScript-native without requiring Python. Every existing tool compromises on at least one of those. We didn't want to compromise, so we built instead.`,
  },

  // ===== WHY THIS EXISTS =====
  {
    speaker: 'JOSH',
    text: `Let me describe the workflow I see at most companies doing prompt engineering right now. Engineer opens the OpenAI playground. Changes a few words in the system prompt. Tests it with two, maybe three inputs. Looks at the outputs, squints, and goes "yeah, that seems better." Ships it to production. That's the standard operating procedure. That's not engineering. That's coin-flipping with a nice UI. And then when the chatbot hallucinates a refund policy that doesn't exist in production, everyone's shocked. How did this happen? It happened because nobody tested it. Not properly. Not systematically.`,
  },
  {
    speaker: 'ADAM',
    text: `An eval harness turns that gut-check into a data pipeline. You define test cases: inputs paired with expected outputs. You run your prompts against every test case. Automated graders score every result on multiple dimensions simultaneously. Pass rates, weighted composite scores, A/B comparisons across prompt variants. The question "did this prompt change make things better or worse?" gets answered by numbers, not intuition. That feedback loop is what separates a demo from a product.`,
  },
  {
    speaker: 'JOSH',
    text: `So what's wrong with the existing tools? RAGAS and DeepEval are Python only. If your production stack is TypeScript, you now need to maintain a separate Python runtime, a separate virtual environment, separate dependency management, just for evals. That's a whole deployment artifact. Promptfoo is legitimately excellent, it's TypeScript, we respect it, we use parts of it. But it's CLI-only with no persistent web UI. Your product manager isn't going to SSH into a server. Then there's the commercial side. LangSmith, Braintrust. Per-evaluation pricing and your proprietary test data lives on someone else's infrastructure. If you're in fintech, healthcare, government? That's a compliance conversation that ends the discussion before it starts.`,
  },

  // ===== ARCHITECTURE OVERVIEW =====
  {
    speaker: 'ADAM',
    text: `Architecture. The data flows through four stages. CSV datasets feed into prompt candidates. Those candidates get scored by YAML-defined graders. Results land in experiments with analytics, comparison tools, and export capabilities. One architectural decision shaped everything that followed: file-first. Datasets, prompts, graders, all plain text files on disk. SQLite handles only runtime data. Experiment runs, scores, settings. Your eval configuration lives in git next to your application code. Results live in a local database, gitignored. Configuration is versioned and auditable. Results are ephemeral and regenerable. Clean separation of concerns.`,
  },
  {
    speaker: 'JOSH',
    text: `Full stack breakdown. Frontend: Next.js 15, App Router, React 18, Tailwind CSS, Radix UI for accessible components, Lucide for icons. Port 3020. Backend: NestJS 10, RxJS for SSE streaming, js-yaml for grader parsing, AJV for JSON Schema validation. Port 3021. Database: SQLite via better-sqlite3 with Drizzle ORM and Drizzle Kit for migrations. LLM providers: OpenAI covering GPT-5.2 down to GPT-4.1 plus o-series reasoning models plus text-embedding-3-small for vectors, Anthropic covering Claude Opus 4.6 down to Haiku 3.5, and Ollama for fully local models like Llama 3 and Mistral. Eval engine: promptfoo's assertion engine handles RAGAS faithfulness and context assertions. Swagger auto-generates API docs at /api/docs. About 80 source files total. Not a weekend hack. A proper system.`,
  },

  // ===== PRIOR ART & PAPERS - DEEP DIVE =====
  {
    speaker: 'ADAM',
    text: `Prior art. We built on six frameworks and five foundational papers, and I want to be specific about what we took from each. Promptfoo: we import their assertion engine directly. The runAssertion function handles RAGAS faithfulness, answer relevance, context assertions. Their entire suite of assertion types is accessible through our promptfoo grader wrapper. Users configure assertions via YAML, no code required. DeepEval from Confident AI: shaped our multi-turn conversation roadmap. Their Synthesizer concept for generating golden datasets from actual documents influenced our synthetic data module. OpenAI Evals: informed our deterministic assertion patterns, the exact-match and contains graders draw from their approach. Stanford's HELM benchmark: different goal entirely, they compare models across dozens of standardized benchmarks, we compare prompt variants on custom datasets. But their multi-grader weighted scoring approach directly influenced ours.`,
  },
  {
    speaker: 'JOSH',
    text: `On the academic side, five papers were specifically influential and I want to trace the lineage precisely. First: Zheng et al, 2023, the MT-Bench LLM-as-Judge paper from the LMSYS team. They showed GPT-4 achieves approximately 80 percent agreement with human preference judgments. That single finding legitimized the entire practice of using one LLM to evaluate another. It's the foundation for our judge graders and it's now used by Chatbot Arena, LMSYS leaderboards, and essentially every modern eval framework. Second: Es et al, 2023, the RAGAS paper. They defined four core RAG evaluation metrics: faithfulness, answer relevance, context precision, context recall. The faithfulness algorithm specifically, claim decomposition plus natural language inference, is what our faithfulness grader implements via promptfoo.`,
  },
  {
    speaker: 'ADAM',
    text: `Third paper: Reimers and Gurevych, 2019, Sentence-BERT. They proved that encoding texts as dense vectors using Siamese BERT networks and comparing via cosine similarity is an effective measure of semantic equivalence. That's the concept behind our semantic similarity grader. We use OpenAI's text-embedding-3-small instead of SBERT, but the mathematical principle is identical: text to vector to cosine distance. Fourth: Liu et al, 2023, G-Eval. Chain-of-thought evaluation with token probabilities. Instead of asking "rate this 0 to 1" directly, G-Eval has the LLM reason step-by-step before scoring, then uses the probability distribution over score tokens for more calibrated results. We didn't implement G-Eval natively, but it's available through promptfoo's assertion engine, and the CoT evaluation thinking influenced our judge prompt design.`,
  },
  {
    speaker: 'JOSH',
    text: `Fifth: Zhang et al, 2020, BERTScore. Token-level alignment instead of single-vector comparison. Each token in the candidate gets matched to its best semantic match in the reference using contextual BERT embeddings, giving you precision, recall, and F1 at the token level. "The cat sat on the mat" versus "A feline rested on a rug" gets 0.89 from BERTScore because BERT knows feline maps to cat and rested maps to sat. Our whole-text cosine approach would give a similar high score, but BERTScore catches detail swaps that whole-text embeddings average away. We didn't implement it because it requires PyTorch and a 440-megabyte BERT model with no viable TypeScript implementation. The ONNX Runtime option exists but it's brittle, poorly documented, and adds 200 megabytes of native dependencies. For prompt variant comparison, our approach is sufficient. For research-grade evaluation, you'd want BERTScore and should probably use Python.`,
  },

  // ===== WHY NESTJS - DETAILED =====
  {
    speaker: 'ADAM',
    text: `NestJS. I know this triggers people. Angular-style architecture on the server: modules, dependency injection, decorators, controllers for the HTTP layer, services for business logic, providers for shared dependencies. Opinionated. Verbose. More boilerplate than Express for simple cases. We picked it anyway, for four specific technical reasons, and I'll explain each one and the tradeoffs.`,
  },
  {
    speaker: 'JOSH',
    text: `Reason one: the module system creates natural feature boundaries. We have eight feature modules: Database, LLM, Settings, Datasets, Graders, Candidates, Experiments, and Presets. Each is self-contained with its own controller, service, and declared imports. The Experiments module explicitly imports Datasets, Graders, and Candidates modules. It can access their exported services. Nothing else leaks. You don't get the "everything imports everything" spaghetti that kills Express applications past a certain complexity threshold. Reason two: dependency injection makes composition and testing pleasant. The LLM service is decorated Global, meaning any module can inject it without importing the LLM module. The database adapter uses a factory provider with a Symbol injection token, so swapping SQLite for Postgres is literally changing one line in the factory function. The consuming services inject via the interface. They never know which implementation is behind it.`,
  },
  {
    speaker: 'ADAM',
    text: `Reason three: first-class SSE support. NestJS has a built-in SSE decorator that pairs with RxJS Observables. We got real-time experiment streaming working in approximately five lines of controller code. No manual response header management, no keep-alive hacks, no external library. The decorator handles Content-Type headers, keep-alive, serialization. You return an Observable and NestJS does the rest. Reason four: Swagger auto-generation. The @nestjs/swagger package reads your controller decorators and DTO type annotations and generates a full OpenAPI 3.0 spec at /api/docs. Every endpoint documented automatically with an interactive browser where you can execute API calls. No hand-written YAML. If you've maintained Swagger docs manually, you know how fast they drift from reality. Ours can't drift because they're generated from the code.`,
  },
  {
    speaker: 'JOSH',
    text: `Quick tangent on DTOs because this is a concept that trips up junior engineers. DTO stands for Data Transfer Object. It's a plain class or interface that defines the shape of data moving between layers. Not a database model. Not a domain entity. It's the shape of data in transit. A CreateExperimentDto has datasetId, graderIds, candidateIds, modelConfig. The client doesn't send id or createdAt because the server generates those. The DTO might accept graderIds as an array but the database stores it as a JSON string. Different shape at the boundary versus at rest. Decoupled. DTOs let you validate input before it touches business logic, version your API independently from your schema, and add validation decorators without polluting your data model.`,
  },
  {
    speaker: 'ADAM',
    text: `Honest tradeoff: NestJS has more boilerplate than Express. A basic CRUD endpoint needs a module file, a controller file, a service file, and a DTO definition. Express just needs a route handler function. For a tiny API with three endpoints, NestJS is overkill. But at 8 modules, 20-plus endpoints, and cross-cutting concerns where the LLM service is used by 4 different modules? The structure pays for itself with interest. We also considered tRPC, which is excellent for monorepos with type-safe API layers, but we wanted REST endpoints accessible from curl, Postman, other tools, not just our Next.js frontend. And Next.js API routes can't handle long-running background tasks. Experiment runs can take minutes. Serverless function timeouts of 10 to 60 seconds are a hard no.`,
  },

  // ===== DATABASE LAYER - ADAPTER PATTERN DEEP DIVE =====
  {
    speaker: 'JOSH',
    text: `Database layer. This is where the adapter pattern really earns its keep and I want to explain the pattern precisely because it's one of the most useful structural patterns in software engineering. The adapter pattern, or Port/Adapter pattern in hexagonal architecture terms, decouples business logic from specific technology implementations. You define a common interface, the port. You write implementations, the adapters, that translate that interface into specific technologies. All consuming code depends only on the interface. It never knows what's behind it.`,
  },
  {
    speaker: 'ADAM',
    text: `Our IDbAdapter interface defines over 30 methods. findAllDatasets, findDatasetById, insertDataset, getExperimentStats, the full CRUD surface for all eight tables. Currently only SqliteAdapter implements it, using better-sqlite3 and Drizzle ORM. But because every service injects the interface via @Inject(DB_ADAPTER), adding Postgres means writing one new class, PostgresAdapter implements IDbAdapter, and changing one line in the factory provider. Zero changes to any service, controller, or grader. The compiler enforces completeness. Miss a method? TypeScript yells. This is the Dependency Inversion Principle, the D in SOLID. High-level modules don't depend on low-level modules. Both depend on the abstraction. Your business logic doesn't know if its data comes from SQLite, Postgres, or a mock in a test. It doesn't care.`,
  },
  {
    speaker: 'JOSH',
    text: `The schema covers eight Drizzle tables. Datasets, test cases with ON DELETE CASCADE from their parent dataset, graders, candidates with parent_id for variant lineage tracking, experiments referencing a dataset with grader_ids and candidate_ids stored as JSON arrays in TEXT columns because SQLite doesn't have array types, experiment_results which is one row per testCase-candidate-grader evaluation and the biggest table, metadata_schemas for optional JSON Schema validation of test case metadata, and a settings table as a simple key-value store for runtime configuration. Drizzle auto-generates TypeScript types from the schema. Each table gets two types: a select type for what comes out and an insert type for what goes in. Sixteen types total, all inferred, zero manual definitions.`,
  },

  // ===== better-sqlite3 + DRIZZLE DEEP DIVE =====
  {
    speaker: 'ADAM',
    text: `Why SQLite specifically? For a single-user eval harness running locally, SQLite is objectively the right choice. Zero setup. No daemon to install, configure, or manage. No connection strings, no authentication. The database is a single file at data/evals.sqlite. Backup means copying one file. Portability means the file follows the project. About 50,000 reads per second and 5,000 writes per second for our workload. PostgreSQL would be faster for concurrent writes, but there are no concurrent writers. One developer running experiments. SQLite is the correct tool for this specific job.`,
  },
  {
    speaker: 'JOSH',
    text: `Now here's a detail that surprises people: we use better-sqlite3, which is a synchronous SQLite driver. "Isn't sync blocking bad in Node?" No. Not for SQLite. And here's precisely why. When you use PostgreSQL, your Node process sends a query over TCP to a separate database server process. That network round-trip takes 1 to 10 milliseconds. During that wait, your thread is idle. Async drivers release the thread during that network wait so other requests can proceed. Completely sensible design.`,
  },
  {
    speaker: 'ADAM',
    text: `SQLite is fundamentally different. There IS no separate database process. The SQLite library is compiled C code linked directly into your Node.js process. When you run a query, it's a function call within the same process. It reads the file, processes the query, and returns. No network. No TCP. No waiting for another process. A typical SQLite read completes in 1 to 50 microseconds. That's 0.001 to 0.05 milliseconds. Making that async adds the overhead of creating a Promise, scheduling a microtask, and resuming the callback, which often takes MORE time than the actual query. That's why better-sqlite3, the synchronous driver, is 2 to 5 times faster than the sqlite3 package which wraps everything in async callbacks. The async wrapper costs more than the operation itself.`,
  },
  {
    speaker: 'JOSH',
    text: `Drizzle ORM on top of better-sqlite3. We chose Drizzle over Prisma for four reasons and they matter. One: no binary engine. Prisma ships a Rust-based query engine, about 8 megabytes, that runs as a sidecar process. Drizzle generates SQL directly. No binary, no extra process. Two: SQL-literate queries. Drizzle queries map one-to-one to SQL. You write db.select().from(datasets).where(eq(datasets.id, id)) and you can read exactly what SQL gets generated. Prisma abstracts the SQL away, which helps beginners but obscures what's actually happening. Three: schema is TypeScript, not a DSL. Prisma uses its own .prisma schema language requiring a code generation step. Drizzle schemas are already TypeScript. Four: better SQLite story. Drizzle plus better-sqlite3 is a first-class combination. Prisma's SQLite support works but was originally designed for PostgreSQL and MySQL.`,
  },

  // ===== SSE DEEP DIVE =====
  {
    speaker: 'ADAM',
    text: `Server-Sent Events. One of the more satisfying parts of the architecture to build. Experiment runs take minutes. Dozens of test cases times multiple candidates times multiple graders. Users cannot stare at a loading spinner for five minutes wondering if the thing crashed. Results need to stream in real time. SSE is a one-way HTTP streaming protocol. The server holds an HTTP connection open and pushes events as text. The browser's native EventSource API handles auto-reconnection. Not bidirectional like WebSockets. Server-to-client only. Which is the exact constraint of our use case. The frontend watches progress. It never sends data back during a run.`,
  },
  {
    speaker: 'JOSH',
    text: `The wire protocol is almost embarrassingly simple. Each event: the string "data", a colon, a space, a JSON payload, two newlines. That's it. No binary framing. No handshake. No protocol upgrade. Just HTTP with a kept-alive connection. On the backend, each running experiment gets an RxJS Subject, which is a multicast observable, stored in a Map keyed by experiment ID. The experiment runner pushes events into the Subject as it works. The SSE controller endpoint subscribes to the same Subject. NestJS's @Sse decorator on the controller method handles the Content-Type header, keep-alive pings, and JSON serialization. Literally five lines of controller code. Real-time streaming, done.`,
  },
  {
    speaker: 'ADAM',
    text: `Five event types flow through the stream. "Generation" fires before and after running each candidate, showing which test case is being processed and what output was produced. "Progress" fires before each grading step with a current-of-total count for the frontend progress bar. "Result" fires after each grade completes with pass/fail, score, and the reason string. "Error" fires on individual failures without killing the entire experiment run, which is critical for resilience. And "Complete" signals the frontend to close the EventSource connection and reload the experiment data from the API. On the frontend, it's the native EventSource API. Zero library dependencies. Built-in auto-reconnection on transient disconnections. We check readyState equals zero to distinguish reconnection attempts from actual errors.`,
  },

  // ===== SSE PERFORMANCE DEEP DIVE =====
  {
    speaker: 'JOSH',
    text: `Now let me address the performance question because people always ask: does SSE slow down the app? Short answer: no. And I have numbers. SSE event delivery latency is 1 to 5 milliseconds from server emit to browser receive. WebSocket message delivery is 0.5 to 2 milliseconds, slightly faster because there's no HTTP framing per message. HTTP polling request latency is 10 to 50 milliseconds for a full round-trip per request. And here's the punchline: LLM API call latency is 200 to 5,000 milliseconds. That's the ACTUAL bottleneck. SSE is 1 to 3 milliseconds slower than WebSocket per message. When each message is reporting the result of an LLM call that took 2 seconds, that 1 to 3 millisecond difference is 0.15 percent of the total time. Undetectable.`,
  },
  {
    speaker: 'ADAM',
    text: `Memory and CPU impact. Per open SSE connection: one TCP socket file descriptor at about 1 kilobyte of kernel memory, one RxJS Subject plus Subscription at a few kilobytes of JavaScript heap, the NestJS response object at a few more kilobytes. Total: about 10 to 20 kilobytes per active stream. Even 100 concurrent experiment streams, which would never happen in a single-user tool, would use 2 megabytes. The SSE connection does NOT block the Node.js event loop. It's an open HTTP response. No CPU work happens between events. The connection is idle until someone calls subject.next(), at which point Node writes bytes to the socket in microseconds and goes back to idle. Other HTTP requests, API calls, page loads, all served concurrently on the same port.`,
  },
  {
    speaker: 'JOSH',
    text: `Why SSE over WebSockets specifically? SSE wins on four axes for our use case. Auto-reconnection is built into the browser. EventSource reconnects automatically with the Last-Event-ID header so the server can resume from where it left off. WebSocket? You implement reconnection manually, including state recovery. Proxy and CDN traversal: SSE is standard HTTP, passes through any proxy. WebSocket's upgrade handshake is often blocked by corporate proxies and requires configuration on AWS Application Load Balancers. Server simplicity: NestJS, return an Observable, five lines. WebSocket Gateway needs namespace management, room management, heartbeat pings. And the killer argument: we don't NEED bidirectional communication. The frontend just watches. Adding WebSocket bidirectionality would be adding capability we don't use at the cost of more complex connection lifecycle management.`,
  },

  // ===== ROW-BY-ROW vs BATCH UX =====
  {
    speaker: 'ADAM',
    text: `The results table updates one cell at a time as SSE events arrive. Each result event adds one score to one cell in the testCase-by-candidate-by-grader matrix. The alternative would be waiting for the entire experiment to finish and loading everything with a single GET request. The batch approach means showing a spinner for 2 minutes, then everything appears at once. Our approach means results start appearing in seconds. The user sees the table grow in real time.`,
  },
  {
    speaker: 'JOSH',
    text: `The real UX win isn't visual, it's economic. If you're running 100 test cases against GPT-5.2 at a penny per call and the first 10 results all score 0.1, you know immediately that your prompt is broken. You can cancel the experiment. With batch loading, you'd burn a dollar waiting for all 100 results before discovering the same thing. Over many iterations during prompt development, that early abort capability saves real money and real time. It's the difference between a 20-second feedback loop and a 2-minute feedback loop, multiplied by dozens of iterations per day. That compounds fast. The row-by-row approach also means if the SSE connection drops mid-experiment, partial results are still visible and reconnection picks up where it left off. Batch loading means a dropped connection at 90 percent gives you nothing.`,
  },

  // ===== CSR vs SSR DEEP DIVE =====
  {
    speaker: 'ADAM',
    text: `The frontend decision that surprises people: it's purely client-side rendered. Every page file starts with "use client" at the top. No server components. No SSR for data fetching. All data comes from the NestJS backend via HTTP fetch calls in useEffect hooks. This was deliberate and I want to explain why, because the knee-jerk reaction is "you're not using Next.js properly" and that's wrong for this specific use case.`,
  },
  {
    speaker: 'JOSH',
    text: `React Server Components give you three things: smaller JavaScript bundles because server components don't ship JS to the browser, direct database access from server-side code, and streaming HTML with Suspense boundaries. None of those matter for us. Our pages are interactive tools, not content pages. The JavaScript IS the feature, it's the form controls, the SSE EventSource connections, the state management. Our database is in the NestJS backend on port 3021, not accessible from the Next.js server. And our core UX feature, real-time experiment streaming, is fundamentally a browser-side EventSource connection that no amount of server-side rendering can help with.`,
  },
  {
    speaker: 'ADAM',
    text: `Could we split it? In theory, make the page a Server Component that fetches initial data on the server, pass it as props to a "use client" child. But the initial server-side fetch saves one round-trip of about 5 milliseconds on localhost. And every subsequent interaction, creating experiments, running them, streaming results, still needs client-side fetches. SSR's main performance benefit is eliminating network latency between server and API. When both are on the same machine, that latency is approximately 1 millisecond. We'd add complexity for zero perceptible benefit. We use Next.js for what it's great at as an SPA framework: file-based routing, fast refresh during development, automatic code splitting. The SSR and RSC capabilities exist if we ever need them, but for a local dev tool, CSR is simpler, faster to develop, and has zero downsides.`,
  },

  // ===== REQUEST LIFECYCLE =====
  {
    speaker: 'JOSH',
    text: `Full request lifecycle. User clicks Run Experiment. POST hits /api/experiments with dataset ID, grader IDs, candidate IDs, model config. NestJS routes to ExperimentsController, validates the DTO with class-validator decorators. ExperimentsService loads the dataset from disk via DatasetLoaderService, graders from YAML via GraderLoaderService, candidates from markdown via PromptLoaderService. Then it syncs everything to SQLite. This sync step is the most commonly misunderstood part of the architecture.`,
  },
  {
    speaker: 'ADAM',
    text: `Why sync file data to SQLite at all? Because experiment results live in SQLite with foreign keys: test_case_id, grader_id, candidate_id. Those foreign keys need actual rows to reference. You can't point a foreign key at a CSV file. So on every experiment create, the service checks if each dataset, test case, grader, and candidate already exists as a row in SQLite. If not, it inserts a copy. One-directional: disk to SQLite only. Changes in SQLite never flow back to the files. If you edit a CSV and re-run, the old data stays referenced by old results, the new data gets new IDs and new rows. Historical accuracy preserved. This is a snapshot mechanism. Your results always reference the exact inputs that produced them, even if you edit the source files later.`,
  },
  {
    speaker: 'JOSH',
    text: `After the sync, the service creates the experiment record with status pending, returns the experiment ID immediately. The POST response comes back in milliseconds. Then the heavy work happens in a fire-and-forget background task. RunExperiment creates an RxJS Subject for this experiment ID, updates status to running, and iterates the full matrix. For each test case, for each candidate, the CandidateRunnerService executes. For LLM prompt candidates: render template variables, call LlmService.complete, which picks the right provider based on config. For HTTP endpoint candidates: POST to the external URL. Once it has the output, it runs every grader. The createGrader factory returns the right instance, grader.evaluate runs, the result gets saved to SQLite and pushed to the SSE stream simultaneously. The browser has already connected to the SSE stream using the experiment ID. Progress bar updates, results populate cell by cell, and when the complete event fires, the frontend closes the stream and reloads the experiment list.`,
  },

  // ===== DATASETS =====
  {
    speaker: 'ADAM',
    text: `Datasets. The ground truth of your evaluation. CSV files with two required columns: input and expected_output. Minimum viable dataset. Two optional columns: context, which is reference text for RAG faithfulness evaluation, and metadata, which is arbitrary JSON accessible in prompt templates via double-curly-brace variables like metadata.difficulty or metadata.category. If you're not doing RAG evaluation, you don't need context. Period.`,
  },
  {
    speaker: 'JOSH',
    text: `We wrote a custom RFC 4180 compliant CSV parser instead of using a library. It handles quoted fields, escaped double-quotes, newlines within quotes, all the edge cases that break naive split-by-comma parsers. Datasets live in subdirectories under backend/datasets, each with a data.csv and an optional meta.yaml sidecar. We ship five seed datasets: context-qa with 8 cases for RAG faithfulness testing, research paper extraction with 5 cases for JSON extraction, summarization with 6 cases, text rewriting with 8 cases, and a text-rewriting-research dataset with 10 cases for academic text simplification. Drop a new CSV into the folder. It appears in the UI. No registration, no migration, no seeding script. Hot reload from disk.`,
  },

  // ===== CANDIDATES =====
  {
    speaker: 'ADAM',
    text: `Candidates. Prompts stored as markdown files organized in family folders. Each folder is one prompt family with a base.md parent and optional variant files. The analyst folder has base.md, ID "analyst," and citations.md, ID "analyst-citations." The summarizer folder has base.md plus concise, bullets, verbose, and even a deliberately bad example variant. IDs derive from folder structure automatically. The frontmatter in each markdown file declares the runner type, either llm_prompt to call the LLM directly, or http_endpoint to POST to an external API for live RAG pipeline evaluation. It also declares recommended_graders with weights like "faithfulness at 0.6, llm-judge-helpful at 0.4," and recommended_datasets so each prompt knows which test cases it's designed for.`,
  },
  {
    speaker: 'JOSH',
    text: `Per-candidate model override is where it gets powerful. Each candidate can specify its own provider, model, temperature, and max tokens in the frontmatter. This means you can run experiments comparing GPT-4.1 versus Claude Sonnet 4.5 on the exact same prompts with the exact same test cases and the exact same graders. True apples-to-apples model comparison. Or test the same prompt at temperature 0.1 versus temperature 0.7 to isolate the effect of randomness on output quality. The candidate IS the unit of experimentation. Everything about what gets tested, how it gets tested, and what model does the testing is parameterized per candidate.`,
  },

  // ===== VARIANT GENERATION + CoT/ToT =====
  {
    speaker: 'ADAM',
    text: `Variant generation. The PromptVariantGeneratorService takes a parent prompt, sends it to an LLM, and asks for alternative formulations. Different tones, different structures, different prompting strategies. You generate five variants with one click, run them all against the same dataset, and the scores tell you which approach works best. Each variant becomes a markdown file in the parent's folder. Git-trackable, hand-editable, fully auditable. The current implementation is single-shot: one LLM call, generate all variants in one pass, parse JSON output.`,
  },
  {
    speaker: 'JOSH',
    text: `The limitation of single-shot generation is that variants often end up superficially different. Word swaps, minor rephrases, but strategically identical. We identified two improvements based on established research. First: Chain-of-Thought, from Wei et al 2022. Add CoT instructions to the generation prompt: analyze the parent prompt's strengths and weaknesses, plan what each variant should vary strategically, THEN generate. This forces the LLM to think about what makes prompts different before producing output. Second: Tree-of-Thought from Yao et al 2023. Generate six candidate prompting strategies, evaluate each on dimensions like faithfulness improvement and differentiation from parent, select the top N, then generate full prompts for those. More LLM calls, higher latency, but systematically more diverse variants. We'd offer both as "Quick" versus "High Quality" generation modes.`,
  },

  // ===== GRADERS OVERVIEW =====
  {
    speaker: 'ADAM',
    text: `Graders. The core of any evaluation system. Seven types. Four deterministic: exact-match with optional case and whitespace normalization, contains for required substrings in all-or-any mode, regex for pattern matching, json-schema for validating structured JSON output against a JSON Schema via AJV. Three model-based: faithfulness via promptfoo's RAGAS implementation, LLM-as-Judge with human-written rubrics, and semantic similarity via embedding cosine distance. Every grader, regardless of type, returns the same interface: boolean pass/fail, numeric score 0 to 1, human-readable reason string. Uniform shape. Critical for aggregation and comparison.`,
  },

  // ===== FAITHFULNESS - RAGAS DEEP DIVE =====
  {
    speaker: 'JOSH',
    text: `Faithfulness grader. The RAGAS paper by Es et al, 2023, defines the algorithm precisely. This is the only grader that requires the context column in your dataset. It answers one specific question: is the LLM's output grounded in the provided context? This is THE hallucination detection metric for RAG systems. The algorithm has three steps. Step one: an LLM decomposes the output into atomic claims. "Machine learning shows strong potential in medical diagnostics, especially for helping doctors make decisions when there's too much data to process manually" becomes three discrete claims. Step two: for each claim, another LLM checks whether the context entails that claim using natural language inference. Binary: supported or not supported. Step three: score equals supported claims divided by total claims.`,
  },
  {
    speaker: 'ADAM',
    text: `Implementation detail: we don't implement this ourselves. We import promptfoo's assertion engine and call runAssertion with type context-faithfulness. Their implementation handles claim decomposition and NLI steps internally. Cost-wise, this is the most expensive grader: 2 to 5 or more LLM calls per single evaluation. One for decomposition plus one per claim for inference verification. But for RAG systems, it's non-negotiable. You cannot ship a RAG product without measuring faithfulness. Without it, you're generating confident-sounding nonsense from your own documents and losing customer trust. The full RAGAS suite actually defines four metrics. We implement faithfulness. The other three, answer relevance, context precision, and context recall, are all available through promptfoo's assertion engine. You just need to create the YAML grader files. Answer relevance reverse-engineers questions from the answer and checks similarity to the original. Context precision classifies each sentence in the context as relevant or irrelevant. Context recall checks if the expected answer is recoverable from the context.`,
  },

  // ===== LLM-AS-JUDGE DEEP DIVE =====
  {
    speaker: 'JOSH',
    text: `LLM-as-Judge. The MT-Bench paper by Zheng et al showed GPT-4 judgments agree with human preferences about 80 percent of the time. That paper legitimized using one LLM to evaluate another. It's now the foundation of Chatbot Arena, LMSYS leaderboards, and every modern eval framework. Our implementation sends four things to an LLM: the input question, the generated output, the expected reference answer, and a human-written rubric. The LLM returns structured JSON: pass/fail, score 0 to 1, reason string.`,
  },
  {
    speaker: 'ADAM',
    text: `Temperature 0.1 for all judge calls. Not fully deterministic because LLMs are inherently stochastic, but stable enough for meaningful comparative evaluation. The system prompt instructs the LLM to respond with ONLY a JSON object. When JSON parsing fails, and it will, because these models love to add commentary no matter how strictly you instruct them, there's a fallback that does keyword matching to extract a pass/fail signal from the free-text response. Ugly but functional. Prevents a single parsing failure from tanking an entire experiment.`,
  },
  {
    speaker: 'JOSH',
    text: `The rubric pattern is the real architectural insight. We ship two LLM-as-Judge graders: helpfulness and extraction completeness. Same LlmJudgeGrader class, exact same code path, completely different rubrics. The helpfulness rubric evaluates whether a response is useful and accurate. The extraction rubric evaluates structured JSON extraction: completeness, accuracy, grounding, schema compliance. This is the power of LLM-as-Judge. The rubric IS the grader. Want a tone checker? Write a rubric about tone. Want a safety evaluator? Rubric about harmful content. Want a brand voice detector? Rubric. It's a new YAML file with type llm-judge. No code changes. The abstraction does all the work.`,
  },

  // ===== SEMANTIC SIMILARITY + EMBEDDINGS DEEP DIVE =====
  {
    speaker: 'ADAM',
    text: `Semantic similarity. Based on concepts from Sentence-BERT by Reimers and Gurevych. Embed the output text into a 1536-dimensional vector using OpenAI's text-embedding-3-small. Embed the expected text the same way. Compute cosine similarity. If the score meets the threshold, default 0.8, it passes. Two embedding API calls and basic linear algebra. Cheapest model-based grader by far.`,
  },
  {
    speaker: 'JOSH',
    text: `Let me go deeper on how embeddings actually work because this is the most common "explain further" request from engineers. An embedding is a function that maps text to a point in high-dimensional space where nearby points have similar meanings. "Happy" and "joyful" become nearby vectors. "Happy" and "refrigerator" become distant vectors. Modern embedding models are trained via contrastive learning on billions of text pairs. Take semantically similar pairs from paraphrases and Q&A datasets, train the model so they have high cosine similarity. Take random unrelated pairs, train for low cosine similarity. After enough training, semantic meaning gets distributed across all dimensions. No single dimension has an interpretable meaning.`,
  },
  {
    speaker: 'ADAM',
    text: `Cosine similarity measures the angle between two vectors, ignoring magnitude. Two texts about the same topic will have vectors pointing in roughly the same direction regardless of length. A short sentence and a long paragraph about photosynthesis get similar direction, different magnitudes. Cosine captures the direction, ignores the magnitude. That's why it works better than Euclidean distance for text. Limitations are real though. Negation blindness: "the cat is on the mat" and "the cat is not on the mat" can score 0.95 similarity because they share most words and concepts, but the meaning is opposite. Order insensitivity: "the dog bit the man" and "the man bit the dog" get high similarity despite very different meanings. And granularity: whole-text embeddings compress everything into one vector, so detail-level differences get averaged away. These limitations rarely matter for prompt variant comparison, but they're worth knowing.`,
  },
  {
    speaker: 'JOSH',
    text: `The fallback chain for embeddings deserves explanation because it shows a resilience-first design philosophy. If the embedding API call fails, maybe the provider is down or you hit a rate limit, the grader doesn't crash. It falls back to text-based similarity: Jaccard similarity, which is set intersection over set union of tokens, combined with weighted token overlap, after stripping common English stop words. Crude compared to neural embeddings, but keeps the experiment running. For Anthropic specifically, which has no embedding API at all, there's an intermediate fallback: prompt Claude to generate a 64-dimensional semantic fingerprint as a JSON array of numbers. It's not a real embedding, it's an LLM role-playing as an embedding model. Surprisingly decent for rough comparisons. If even that fails, a deterministic hash-based pseudo-embedding distributes character codes across 64 dimensions. Full chain: provider embedding, LLM fingerprint, hash embedding, text overlap. Four tiers of degradation before failure.`,
  },

  // ===== DETERMINISTIC NLP METRICS =====
  {
    speaker: 'ADAM',
    text: `Beyond our seven graders, there's a whole world of classical NLP metrics. No LLM calls, purely algorithmic, fast, reproducible, well-understood. All available through promptfoo's assertion engine. ROUGE, Recall-Oriented Understudy for Gisting Evaluation, measures n-gram overlap between generated and reference text. ROUGE-1 for unigram overlap, ROUGE-2 for bigram overlap, ROUGE-L for longest common subsequence. Originally designed for summarization evaluation. If your reference is "the cat sat on the mat" and the generation is "the cat is on the mat," ROUGE-1 gives 0.80. Fast, deterministic, well-established baseline. Limitation: purely lexical. "Automobile" and "car" get zero credit.`,
  },
  {
    speaker: 'JOSH',
    text: `BLEU, Bilingual Evaluation Understudy, originally for machine translation. Measures precision of n-gram matches with a brevity penalty. Penalizes outputs shorter than the reference. If the reference is "the quick brown fox jumps over the lazy dog" and you generate "the fast brown fox leaps over the lazy dog," you lose credit because "fast" isn't "quick" and "leaps" isn't "jumps." BLEU-4 combined score would be around 0.38. Standard metric for translation quality. Same limitation as ROUGE: purely lexical, penalizes valid paraphrases. Then there's Levenshtein distance, edit distance, counting minimum single-character edits to transform one string into another. "Kitten" to "sitting" is 3 edits. Useful for near-exact-match scenarios like code generation where small deviations matter. All of these are available via promptfoo. We haven't exposed them as seed graders yet, but creating them is just a YAML file each.`,
  },

  // ===== G-EVAL =====
  {
    speaker: 'ADAM',
    text: `G-Eval deserves special mention. Liu et al, 2023. It's like our LLM-as-Judge but with chain-of-thought reasoning for more calibrated scores. Instead of asking "rate this 0 to 1" directly, it generates detailed evaluation steps, has the LLM follow those steps, and then uses a clever trick: instead of taking the integer score the LLM outputs, G-Eval reads the token probabilities of the score tokens and computes a weighted average. If the model assigns probability 0.4 to score 3, probability 0.5 to score 4, and probability 0.1 to score 5, the final score is 3 times 0.4 plus 4 times 0.5 plus 5 times 0.1 equals 3.7. More granular than just taking the most likely score. We don't implement it natively because the token probability trick requires OpenAI's logprobs API parameter, which Anthropic doesn't expose. But it's available via promptfoo's g-eval assertion type.`,
  },

  // ===== EXPERIMENTS ORCHESTRATION =====
  {
    speaker: 'JOSH',
    text: `Experiments. Where all the pieces converge. Select a dataset, select candidates, select graders, run it. The system iterates the full matrix of test cases times candidates times graders. At creation time, the system snapshots all file-based entities into SQLite with their current content. This is critical for reproducibility. Your results always reference the exact prompt text, grader config, and dataset used at runtime, even if you edit the files afterward. The stats computation produces two scores per candidate: equal-weight average where all graders count equally, and weighted average using the prompt's declared grader weights. If your prompt says faithfulness at 0.6 and helpfulness at 0.4, the weighted score reflects that priority hierarchy.`,
  },
  {
    speaker: 'ADAM',
    text: `A/B comparison is built into the API. The compare endpoint takes a baseline candidate and a challenger. For each test case and grader pair, it shows both scores with a delta: improved, regressed, or same. You get a summary like "5 improved, 1 regressed, 2 same" with the specific deltas for each case. That's how you make data-driven decisions about prompt changes. Not "I think version B reads better" but "version B improved faithfulness on 5 of 8 test cases with one regression, and that regression was from 0.87 to 0.83, marginal." You can export everything to CSV for deeper analysis. The entire experiment infrastructure, creation, execution, streaming, stats, comparison, export, lives in one service: ExperimentsService, about 694 lines, the single most complex file in the codebase.`,
  },

  // ===== RAG EVALUATION =====
  {
    speaker: 'JOSH',
    text: `RAG evaluation. Important distinction: the harness does not DO retrieval augmented generation. No document retrieval. No vector store. It EVALUATES RAG pipelines by testing whether their outputs are faithful, relevant, and correct. Two methods for two different purposes.`,
  },
  {
    speaker: 'ADAM',
    text: `Method one: Context Faithfulness. Offline RAG evaluation. You include a context column in your dataset representing the documents your retriever would have fetched. The Faithfulness grader decomposes the output into claims, checks each against the context via NLI, scores supported claims over total claims. Hallucination detection. Did the LLM stick to the source material? The context-qa seed dataset has 8 test cases demonstrating this pattern. This specifically tests the generation half of RAG. Given these documents, does your prompt produce faithful answers?`,
  },
  {
    speaker: 'JOSH',
    text: `Method two: HTTP Endpoint Candidates. Live RAG pipeline evaluation. If you have a RAG backend with a vector store, Pinecone, Weaviate, Chroma, Qdrant, whatever, and it exposes a REST endpoint, you can evaluate it directly. Create HTTP endpoint candidates, each pointing at a different RAG backend. Candidate A hits localhost:8080, your Pinecone-plus-GPT-4 pipeline. Candidate B hits localhost:8081, your Weaviate-plus-Claude pipeline. The harness sends each test case to both endpoints, captures responses, grades them with the same graders. Side-by-side comparison of completely different RAG architectures. Different retrievers, different chunking strategies, different embedding models, different LLMs, all competing on the same questions with the same grading criteria. Zero harness code changes needed.`,
  },
  {
    speaker: 'ADAM',
    text: `What we're missing compared to dedicated RAG libraries like RAGAS in Python or DeepEval: retrieval-specific metrics. MRR, Mean Reciprocal Rank, measuring where the first relevant document appears. NDCG, Normalized Discounted Cumulative Gain, measuring if relevant docs are ranked higher. Hit Rate at K, a binary check of whether any relevant doc is in the top-K. Context precision and recall. These metrics require knowing which documents are relevant, ground truth labels per query. That's the main barrier. Backend scaffolding exists in our retrieval module for a future rag_prompt runner type that would call a vector store directly, retrieve chunks, inject them into the prompt, and grade both retrieval quality and generation quality. That closes the loop. But it's not implemented yet.`,
  },

  // ===== LLM LAYER =====
  {
    speaker: 'JOSH',
    text: `The LLM layer. A single LlmService with two methods: complete for text generation, embed for vector embeddings. Three provider adapters underneath. OpenAI: direct fetch to their chat completions endpoint. Auto-detects o-series reasoning models and GPT-5-series models that require max_completion_tokens instead of the standard max_tokens parameter. Anthropic: direct fetch to their messages API. No embedding endpoint, so it falls back through the fingerprint chain I described. Ollama: direct fetch to your local instance. Fully local, no API key needed. All raw fetch calls. Zero SDK dependencies. The entire LLM abstraction is one service file. Provider selection is based on runtime settings with per-candidate overrides.`,
  },

  // ===== COST OPTIMIZATION STRATEGIES =====
  {
    speaker: 'ADAM',
    text: `Cost optimization. This is the section that matters for production use. A 100 test case experiment with 3 candidates and 4 graders means 300 generation calls plus 1,200 grading calls equals 1,500 LLM API calls. At roughly a penny per call, that's 15 dollars. Run it 10 times during prompt iteration and you've spent 150 dollars. Seven strategies to reduce that, each with research backing.`,
  },
  {
    speaker: 'JOSH',
    text: `Strategy one: Batching multiple evaluations per call. Instead of one test case per LLM judge call, send 5 to 10 in a single prompt and ask for all judgments at once. Could reduce 1,200 grading calls to about 240 at batch size 5. But batching introduces noise. Zheng et al in the MT-Bench paper compared single-answer grading versus pairwise comparison. Wang et al, 2023, documented the contrast effect: scores for item 3 are influenced by the quality of items 1 and 2. Kim et al, 2024, in the Prometheus 2 paper, found evaluation quality degrades when the judge processes too much context. Practical guidance: batch size 2 to 3 is safe with minimal quality loss. Batch size 5 to 10 has noticeable degradation. Above 10, parse failures compound with position bias and it falls apart. Use batching for screening runs, not final scoring.`,
  },
  {
    speaker: 'ADAM',
    text: `Strategy two: Tiered evaluation. Run cheap deterministic graders on everything first. Regex, contains, json-schema. Instant, zero API cost. 400 test cases might fail immediately because the output format is obviously wrong. Then run embedding similarity on the survivors. Two API calls each at $0.00004 per evaluation. Another 300 fail, clearly wrong answers scoring below 0.5 similarity. Only then run the expensive LLM-as-Judge on the remaining 500. That's a 58 percent reduction in expensive calls. This is the cascade pattern, same concept as multi-stage ranking in information retrieval where cheap BM25 handles easy cases and expensive neural rerankers handle hard ones.`,
  },
  {
    speaker: 'JOSH',
    text: `Strategy three: OpenAI's Batch API. Processes requests asynchronously at 50 percent off regular pricing. You submit a JSONL file of requests, results available within 24 hours, usually much faster. 1,200 calls at regular price: 12 dollars. Same calls via Batch API: 6 dollars. Tradeoff: no real-time streaming. Results arrive in bulk. Changes the UX from watching a progress bar to submitting and coming back later. Works great for CI/CD evaluation, overnight regression suites, nightly quality checks. Anthropic has a similar Message Batches API with the same concept.`,
  },
  {
    speaker: 'ADAM',
    text: `Strategy four: Adaptive sampling. Statistical early stopping. You don't need to evaluate all 100 test cases to know if a candidate is good. Sequential analysis, formalized by Wald in 1945 and extended by Johari et al in 2017 with always-valid confidence intervals, lets you evaluate test cases one at a time and stop when you have enough evidence. After each evaluation, compute the running mean and 95 percent confidence interval width. When the confidence interval narrows below your threshold, say 0.1, stop. For a consistently performing candidate scoring around 0.85 with low variance, you might need only 15 to 20 test cases to get a tight interval. That's an 85 percent reduction in calls. You get different numbers of evaluations per candidate, which is statistically valid but requires showing confidence intervals in the UI instead of just point estimates.`,
  },
  {
    speaker: 'JOSH',
    text: `Strategy five: Cheaper judge models. Not every evaluation needs GPT-5.2 or Claude Opus. GPT-4.1-mini at 20 percent the cost achieves very good judging quality. GPT-4.1-nano at 5 percent cost handles simple binary pass/fail. Claude Haiku at about 10 percent cost is a strong alternative. Zheng et al found GPT-4 achieves 80 percent human agreement. Kim et al in Prometheus 2 showed fine-tuned 7 to 13 billion parameter models can match GPT-4's judging quality on specific rubrics. Practical rule: exploring and iterating? Use mini or Haiku, you want directional signal not precision. Final scoring for release decisions? Use the best model. CI/CD regression tests? Mini with binary pass/fail, you just need to catch regressions.`,
  },
  {
    speaker: 'ADAM',
    text: `Strategy six: Multi-task prompting. One LLM call answers multiple evaluation criteria simultaneously. Instead of three separate grader calls, send one prompt scoring helpfulness, faithfulness, and extraction quality together. 67 percent cost reduction. But Liu et al in the G-Eval paper found single-aspect evaluation produces more calibrated scores than multi-aspect. The halo effect inflates correlated scores. Attention dilution means each criterion gets less reasoning depth. Wang et al in 2024's SocREval paper specifically recommended evaluating each dimension independently to minimize cross-contamination. Use multi-task for screening and triage, not for final scoring or A/B comparison where small deltas matter.`,
  },
  {
    speaker: 'JOSH',
    text: `Putting it all together: a three-phase optimization playbook. Phase one, exploring prompts: use GPT-4.1-mini as the judge model with adaptive sampling stopping after 15 to 20 cases. About 60 to 80 calls instead of 1,200. Cost: roughly 20 cents. Phase two, narrowed to 2 or 3 candidates: full dataset, single-task grading, parallelization for speed, result caching for re-runs. About 900 calls, cached after first run. Cost: 9 dollars. Phase three, final scoring for release: full dataset, best judge model, all graders, single-task, no shortcuts. Precision matters. 1,200 calls, 12 dollars. Total spend across the entire prompt optimization cycle drops from 150 dollars to about 25 dollars.`,
  },

  // ===== MULTI-TURN EVALUATION =====
  {
    speaker: 'ADAM',
    text: `Multi-turn conversation evaluation. The biggest gap between our harness and frameworks like DeepEval. Our harness evaluates single turns: one input, one output, grade. Real chatbots have multi-turn conversations where context accumulates. MT-Bench from Zheng et al was one of the first systematic multi-turn benchmarks, using 2-turn conversations where the second question intentionally builds on the first. Chatbot Arena from Chiang et al, 2024, extended this with live pairwise comparison. MT-Bench-101 from Bai et al, 2024, expanded to 101 fine-grained multi-turn tasks across 13 categories.`,
  },
  {
    speaker: 'JOSH',
    text: `DeepEval defines four conversation-specific metrics that we'd want to implement. Role Adherence: does the chatbot stay in character throughout? For each turn, check if the response matches the assigned role. Score equals adherent turns over total. Conversation Relevancy: a sliding window approach where for each turn, you take the last N turns as context and judge if the response is relevant given that context. Knowledge Retention: extract facts the user presented across prior turns, check if the chatbot asks for already-provided information. Turns without knowledge attrition over total turns. And Conversation Completeness: extract high-level user intents from the conversation, check if each was satisfied by the end.`,
  },
  {
    speaker: 'ADAM',
    text: `The sliding window technique is essential. A 100-turn conversation evaluated at turn 50. Is the response relevant when considering only the previous 2 turns? Maybe not. But it might be highly relevant considering the previous 10 turns. Feeding the entire history to the judge LLM causes hallucination on long contexts. The sliding window bounds token usage while preserving relevant context. Typical window size: 3 to 5 turns. A key insight from DeepEval's documentation: don't score each turn in isolation, because many turns are redundant chit-chat like greetings and confirmations that waste tokens to evaluate. Either evaluate the entire conversation holistically, or evaluate just the last response with prior turns injected as context. No TypeScript framework supports multi-turn evaluation today. Implementing it would be a differentiator for our harness.`,
  },

  // ===== META-EVALUATION =====
  {
    speaker: 'JOSH',
    text: `Meta-evaluation. How do you evaluate the evaluators? The most incisive question anyone can ask about an eval system. If your LLM-as-Judge says a response scores 0.85, what does that actually mean? Is the judge consistent? Would a human agree? Four approaches. First: human agreement rate. Run your grader on N test cases where you have human judgments. Zheng et al's benchmark is 80 percent agreement for GPT-4. If your custom grader is significantly below that, your rubric needs work.`,
  },
  {
    speaker: 'ADAM',
    text: `Second: inter-rater reliability. Run the same grader multiple times on the same input. Measure consistency. Cohen's Kappa for two raters: kappa above 0.8 is almost perfect agreement, 0.6 to 0.8 is substantial, below 0.4 is poor. Krippendorff's Alpha generalizes to multiple raters and continuous scales. For our harness, you'd run each grader 5 times on the same output and measure variance. Low temperature helps but doesn't eliminate stochasticity. Third: confusion matrix analysis. Track false positives, grader says pass human says fail, and false negatives, grader says fail human says pass. False negatives are usually worse. Better to have a strict grader than a lenient one. Fourth: calibration. Outputs scored 0.8 should be "good" about 80 percent of the time according to humans. Plot predicted scores against actual human agreement. Most teams skip formal meta-evaluation and spot-check a random sample manually. For development, that's fine. For production eval systems, you need at least human agreement rate on a held-out set.`,
  },

  // ===== LLM-AS-JUDGE BIASES =====
  {
    speaker: 'JOSH',
    text: `LLM-as-Judge known biases. Zheng et al and subsequent studies identified six systematic failure modes. Self-enhancement bias: GPT-4 rates GPT-4 outputs higher than equivalent quality from other models. Claude rates Claude higher. Mitigation: use a different model as judge than the one generating outputs, or average across multiple judge models. Position bias: in pairwise comparison, LLMs prefer whichever output is listed first. MT-Bench mitigates by running each comparison twice with swapped positions. We avoid this entirely because our harness evaluates candidates independently, not pairwise.`,
  },
  {
    speaker: 'ADAM',
    text: `Verbosity bias: judges rate longer, more detailed responses higher even when shorter responses are more accurate. Mitigation: explicitly instruct the judge to evaluate accuracy over length. Sycophancy: judges agree with confident-sounding outputs even when wrong. "I'm not sure but" gets penalized relative to "The answer is definitely" even when the uncertain response is correct. Format bias: outputs with markdown formatting, bullet points, and headers get higher scores than plain text with identical content. And inconsistency across runs: even at temperature 0.1, the same input gets different scores on different runs. Our mitigations: low temperature for consistency, structured JSON output to reduce format-dependent scoring, per-grader rubrics for explicit criteria, weighted scoring to downweight unreliable graders, and the harness makes it trivial to run the same experiment multiple times and compare variance.`,
  },

  // ===== CACHING =====
  {
    speaker: 'JOSH',
    text: `Caching. Honest assessment: we have almost no explicit caching beyond the in-memory Map caches for file loaders. Here's what exists and what's missing. What we cache: datasets, graders, and prompts are loaded from disk into Map objects at startup. All reads go through the Map. Writes update both disk and Map atomically. What we DON'T cache: LLM completions get a fresh API call every time. Re-running an experiment re-calls every LLM. Embeddings get fresh API calls per embed(). The same text gets re-embedded repeatedly. Settings hit SQLite on every LLM call, hundreds of times per experiment, despite changing maybe once per session. Frontend fetches reload all data on every page navigation.`,
  },
  {
    speaker: 'ADAM',
    text: `The highest-ROI cache additions, ranked. Embedding cache: same text plus same model equals same vector, always. Deterministic. Cache forever. A simple Map in the LLM service, keyed by provider-model-text hash. Zero invalidation needed. Saves 2 API calls per semantic similarity evaluation on repeated texts. LLM completion cache: for temperature 0 runs, which ARE deterministic, hash the prompt-model-temperature tuple and cache the output. Saves real money on experiment re-runs. Invalidate on model change only. Settings TTL cache: 30-second time-to-live in the settings service. Eliminates hundreds of redundant SQLite reads per experiment. And React Query on the frontend for stale-while-revalidate behavior, cache deduplication, automatic refetch on window focus. All are on the roadmap. Cache-manager is already in our dependencies, just not wired up yet.`,
  },

  // ===== AJV vs ZOD =====
  {
    speaker: 'JOSH',
    text: `AJV versus Zod for JSON validation. This comes up in every technical discussion. They solve fundamentally different problems. AJV validates JSON Schema, which is an RFC draft standard. Schemas are plain JSON objects. Language-agnostic. Serializable. Can come from APIs, databases, user input, OpenAI structured outputs. Zod validates TypeScript-native schema definitions. Schemas are TypeScript code. z.object, z.string, z.infer for automatic type inference. In our json-schema grader, users define JSON Schema objects in grader config through the UI. These schemas are stored in SQLite as JSON blobs. They arrive at runtime as plain objects. You literally cannot use Zod for this because Zod schemas are TypeScript code, not serializable data. JSON Schema is also what OpenAI uses for function calling and structured outputs. For the grader, AJV is correct. For internal validation of request DTOs and config parsing, Zod would be better. The mature approach: use both.`,
  },

  // ===== SYNTHETIC DATA =====
  {
    speaker: 'ADAM',
    text: `Synthetic data generation via our SyntheticService. One LLM call. Provide a topic, a count, a style. Four styles: qa for question-answer pairs, classification for labeled text samples, extraction for text with expected extracted JSON, and rag for questions with supporting context documents. Temperature 0.8 for diversity. The LLM generates everything in one pass as a JSON array. Fast and cheap but with a fundamental limitation: the LLM invents both questions and answers from training data. DeepEval's Synthesizer is document-grounded. It reads your actual knowledge base, chunks it, extracts facts, generates questions from those facts. Expected answers are derived from source text and verifiably correct. Ours might hallucinate the ground truth. Ours is the right tool for bootstrapping: you need 10 test cases to start iterating and you'll review them manually. It gets you from nothing to a runnable experiment in seconds. For production golden datasets, you need document-grounded generation and human verification.`,
  },

  // ===== CITATION & ATTRIBUTION =====
  {
    speaker: 'JOSH',
    text: `Citation and attribution in RAG systems. No language model natively produces citations. Citations are always an engineering layer around the model. The basic approach most production systems use: retrieve documents, generate an answer from context, then post-process by matching sentences in the answer back to source chunks via cosine similarity, and attach references. State-of-the-art techniques go further. ALCE by Gao et al, 2023, fine-tunes models to produce inline citations during generation. The model outputs text like "The EU AI Act classifies systems into risk tiers, bracket 1, bracket 3" referencing specific passages. Requires fine-tuning so not applicable to API models.`,
  },
  {
    speaker: 'ADAM',
    text: `RARR, also Gao et al 2023, does post-hoc attribution. Take any LLM output, decompose it into claims, search for evidence for each claim, rewrite with citations. Works with any model, no fine-tuning. Closest to what you'd implement in production. Self-RAG by Asai et al, 2023, trains the model to emit special reflection tokens during generation. A Retrieve token when the model decides it needs to look something up. An IsRel token when it assesses if retrieved text is relevant. An IsSup token when checking if its claim is supported. Metacognitive awareness of grounding versus hallucinating. Requires specialized training. In our harness, the faithfulness grader gives you the score of how well-attributed the output is, even though it doesn't produce the citations themselves. The score tells you if citations would even be valid.`,
  },

  // ===== RLHF, DPO =====
  {
    speaker: 'JOSH',
    text: `RLHF and DPO. How evaluation relates to model training. Our harness does inference-time evaluation: the model is fixed, we evaluate outputs. Training-time evaluation uses evaluation signals to improve the model itself. RLHF, Reinforcement Learning from Human Feedback: collect human preference data, train a reward model on those preferences, use the reward model during RL training with PPO. The reward model is essentially an automated evaluator trained on human preferences. Same concept as our LLM-as-Judge but learned from data rather than specified by a rubric. DPO, Direct Preference Optimization, from Rafailov et al 2023, showed you can skip the reward model entirely. Directly optimize the language model on preference pairs using a modified loss function. Simpler than RLHF, empirically competitive. The connection: the same evaluation criteria we use at inference time, faithfulness, helpfulness, safety, are the signals used during training. A high-quality eval harness could theoretically generate preference data for DPO: run two model variants, grade both, prefer the higher scorer.`,
  },

  // ===== ONLINE vs OFFLINE EVALUATION =====
  {
    speaker: 'ADAM',
    text: `Online versus offline evaluation. We do offline evaluation: run experiments on curated datasets before deployment. Controlled conditions, deterministic comparison. Limitation: doesn't capture real user behavior or distribution shift. Production systems need online evaluation too. Log a sample of production requests, periodically run them through your graders. Track user feedback signals, thumbs up and down, implicit signals like follow-up questions. A/B test prompt variants on live traffic. Run safety graders on every production response with alerting. Track score distributions over time. If faithfulness drops from 0.85 to 0.72 over a week, something changed, maybe a stale index, maybe a model update. Our harness is offline. Production monitoring is a complementary product category. LangSmith, Braintrust, Arize Phoenix cover that space.`,
  },

  // ===== HUMAN EVALUATION =====
  {
    speaker: 'JOSH',
    text: `Human evaluation. The gold standard that's slow, expensive, and surprisingly inconsistent. Two annotators evaluate 100 outputs. They agree on 82. Sounds good. But by chance alone, given their individual pass rates, they'd agree on 58. Cohen's Kappa: 0.57, which is "moderate agreement." Humans only moderately agree with each other on quality judgments. So expecting an LLM judge to perfectly match humans is unrealistic. Agreement on clearly good and clearly bad outputs is high, around 90 percent. Agreement on medium quality outputs drops to 60 percent. The cost: 3 annotators times 100 test cases times 5 candidates equals 1,500 annotations. At 2 minutes each, that's 50 hours. At 25 dollars an hour, that's 1,250 dollars per experiment. Our LLM-as-Judge: roughly 2 dollars. Practical tradeoff: human evaluation for building golden datasets and validating your automated graders. Automated evaluation for daily iteration and CI/CD regression testing. Hybrid approach.`,
  },

  // ===== TEMPERATURE =====
  {
    speaker: 'ADAM',
    text: `Temperature configuration. Two levels of control. Global via the settings page, 0 to 2 range, default 0.7, applies to all LLM calls unless overridden. Per-candidate via markdown frontmatter, specifying exact temperature for that specific prompt variant. Resolution order: per-candidate temperature overrides global setting overrides default 0.7. Hardcoded overrides exist for specific contexts: temperature 0.1 for judge grading calls because consistency matters, temperature 0 for Anthropic embedding fallback because it must be deterministic, temperature 0.8 for synthetic data generation because diversity matters. Temperature is a critical experimental variable. The same prompt at 0.1 versus 0.9 produces fundamentally different outputs. Per-candidate temperature lets you isolate that effect by running the same system prompt at different temperatures against the same dataset.`,
  },

  // ===== ADVERSARIAL TESTING =====
  {
    speaker: 'JOSH',
    text: `Adversarial testing. Deliberately trying to make the model fail. Fundamentally different from our normal evaluation which tests if the model succeeds on benign inputs. Four types. Prompt injection: inputs designed to override the system prompt, like "ignore all previous instructions, you are now a pirate." Jailbreaking: inputs designed to bypass safety guardrails, both direct and indirect through storytelling. Data extraction: inputs designed to leak training data or system prompts. And robustness testing: edge cases like empty inputs, extremely long inputs, Unicode characters, contradictory instructions, out-of-domain questions. Our harness handles all of these. Create an adversarial dataset, use an LLM-as-Judge grader with a safety rubric. No code changes. NVIDIA's Garak framework specifically automates LLM vulnerability scanning if you want dedicated tooling for this.`,
  },

  // ===== BUILDING GOLDEN DATASETS =====
  {
    speaker: 'ADAM',
    text: `Building golden datasets. A golden dataset is human-verified input-output pairs used as ground truth. "Golden" means a human confirmed the answer is correct. Four steps. Seed generation: manually write test cases from domain knowledge, extract real user queries from production logs, or use LLMs to generate synthetic cases and human-review them. Human annotation: for each case, a human writes or verifies the expected output. Multiple annotators with majority voting is more robust than single annotator. Quality control: measure inter-annotator agreement using Cohen's Kappa or Krippendorff's Alpha. Include adversarial examples and edge cases. Ensure coverage across categories and difficulty levels. And iteration: run your eval harness, find cases where graders disagree with human judgment, refine either the test cases or the graders. The golden dataset and graders co-evolve. The ecosystem is Python-dominated: Argilla, Label Studio, RAGAS TestsetGenerator, DeepEval Synthesizer. In TypeScript, most teams use CSVs and custom scripts. That's us.`,
  },

  // ===== BUSINESS PERSPECTIVE =====
  {
    speaker: 'JOSH',
    text: `Business perspective. Every company shipping LLM features right now is deploying untested code. Change a prompt, eyeball it in a playground, push to production. Then the chatbot hallucinates a refund policy that doesn't exist. An eval harness makes prompt changes testable. Gate deployments on eval scores. Track quality over time. Regression-test before every production push. That's the gap between a demo and a product. The companies building evaluation infrastructure now will compound that quality advantage every week over the ones still guessing.`,
  },
  {
    speaker: 'ADAM',
    text: `File-based architecture has specific compliance consequences. Prompts live in git. Test cases live in git. Someone modifies a system prompt? Pull request. Code review. Diff showing exactly what changed. Eval run comparing before and after, quantified. That's governance for LLM applications. Banking, healthcare, insurance, that audit trail isn't optional. It's regulatory compliance. Self-hosted matters for data sovereignty. Your test cases, your prompts, your eval results stay on your infrastructure. No SaaS vendor holds a copy of your prompt engineering strategy. No third party has your proprietary test data. For teams in regulated industries, this isn't a nice-to-have. It's a prerequisite for adoption.`,
  },

  // ===== WHAT WORKS, WHAT DOESN'T =====
  {
    speaker: 'JOSH',
    text: `Honest strengths. File-based everything: git-friendly, editor-friendly, no vendor lock-in. Full-stack UI: non-engineers run experiments and read results without touching a terminal. Weighted multi-grader scoring: composite numbers that actually encode priorities. Provider-agnostic: swap models, keep everything else identical. SSE streaming: real-time feedback, early abort capability. Variant generation: explore the optimization space in minutes. Pure TypeScript: npm install, npm start, done. No Docker. No Python. No runtime dependencies beyond Node.`,
  },
  {
    speaker: 'ADAM',
    text: `Honest limitations. Sequential execution: one evaluation at a time, painful for large experiments. Parallelization with Promise.all and p-limit is straightforward and on the roadmap. No result caching: re-running regenerates everything from scratch. Promptfoo caches by prompt-plus-input hash, we should too. Semantic similarity is coarse: whole-text cosine misses detail swaps that BERTScore would catch, but BERTScore requires Python. LLM-as-Judge inherits all known biases: non-deterministic, self-biased, verbose-biased. We mitigate but can't eliminate. No native BLEU, ROUGE, or BERTScore graders yet, though promptfoo supports them. SQLite is single-user. Fine for local development. Production multi-user deployment needs Postgres, which is exactly why we built the adapter pattern. These are known limitations, not design flaws. All solvable. The architecture was designed to accommodate them.`,
  },

  // ===== ROADMAP =====
  {
    speaker: 'JOSH',
    text: `Roadmap. Parallelized execution is the biggest immediate win. Result caching to eliminate redundant API calls. Multi-turn conversation evaluation using DeepEval's conversational metrics: role adherence, knowledge retention, conversation relevancy, conversation completeness. Building out the retrieval module for native vector search and end-to-end RAG pipeline testing. Temperature sweep automation. Document-grounded synthetic data generation. Embedding cache and LLM completion cache. React Query on the frontend. The architecture supports all of it. New feature? New NestJS module. New grader? One TypeScript class, register it in the factory. Abstractions hold up.`,
  },

  // ===== CLOSING =====
  {
    speaker: 'ADAM',
    text: `Building an eval harness is less about sophisticated ML and more about good engineering around simple ideas. Embed two texts and measure cosine similarity: that's the semantic similarity grader. Ask an LLM "is this good?" with a rubric: that's LLM-as-Judge. Decompose into claims and check each against a source: that's RAGAS faithfulness. String comparison: that's the deterministic graders. The hard part is the orchestration, the UI, the file-based data model, the real-time streaming, the weighted scoring, the A/B comparison, and making all of it work together in a way that developers actually want to use every day.`,
  },
  {
    speaker: 'JOSH',
    text: `If you're building with LLMs and you don't have automated evals, you're shipping untested code. Full stop. You wouldn't push backend changes without running tests. Why would you push prompt changes without running evals? The tooling exists. Use this harness, use promptfoo, use something else entirely. Just stop eyeballing outputs and hoping for the best. The teams investing in evaluation infrastructure now are going to compound that advantage every single week over the ones that aren't. Everything here is open source. npm install, npm start. No Docker, no Python, no SaaS subscriptions. File-based. Git-friendly. Self-hosted. Build your eval pipeline. Start measuring. Catch you on the next one.`,
  },
];

// ============================================================================
// OpenAI TTS GENERATION
// ============================================================================

async function generateSegmentOpenAI(text, speaker, outputPath) {
  const voice = OPENAI_VOICES[speaker];

  // OpenAI TTS has a 4096 char limit per request. Split if needed.
  if (text.length <= 4096) {
    return await callOpenAITTS(text, voice, outputPath);
  }

  // Split long text at sentence boundaries
  const chunks = splitText(text, 4000);
  const chunkFiles = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunkPath = outputPath.replace('.mp3', `-chunk${i}.mp3`);
    await callOpenAITTS(chunks[i], voice, chunkPath);
    chunkFiles.push(chunkPath);
  }

  // Concatenate chunks
  const listContent = chunkFiles.map(f => `file '${f}'`).join('\n');
  const listPath = outputPath.replace('.mp3', '-chunks.txt');
  await writeFile(listPath, listContent);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`, { stdio: 'pipe' });

  // Clean up chunk files
  for (const f of chunkFiles) {
    try { execSync(`rm "${f}"`, { stdio: 'pipe' }); } catch {}
  }
  try { execSync(`rm "${listPath}"`, { stdio: 'pipe' }); } catch {}

  const stat = execSync(`stat -f%z "${outputPath}"`, { encoding: 'utf-8' }).trim();
  return parseInt(stat);
}

function splitText(text, maxLen) {
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    let splitIdx = remaining.lastIndexOf('. ', maxLen);
    if (splitIdx < maxLen * 0.5) splitIdx = remaining.lastIndexOf(' ', maxLen);
    if (splitIdx < maxLen * 0.3) splitIdx = maxLen;
    chunks.push(remaining.substring(0, splitIdx + 1).trim());
    remaining = remaining.substring(splitIdx + 1).trim();
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

async function callOpenAITTS(text, voice, outputPath) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: voice,
      response_format: 'mp3',
      speed: 1.0,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`OpenAI TTS error (${response.status}): ${err}`);
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
  execSync(`mv "${normalizedPath}" "${inputPath}"`, { stdio: 'pipe' });
}

// ============================================================================
// MAIN — Resume from segment 42
// ============================================================================

async function main() {
  console.log('=== Podcast Resume Generator (OpenAI TTS) ===\n');
  console.log(`Resuming from segment ${START_FROM + 1}/${SCRIPT.length}\n`);

  if (!existsSync(OUTPUT_DIR)) {
    await mkdir(OUTPUT_DIR, { recursive: true });
  }

  // Verify existing ElevenLabs segments exist
  let existingCount = 0;
  for (let i = 0; i < START_FROM; i++) {
    const segment = SCRIPT[i];
    const filename = `${OUTPUT_DIR}/segment-${String(i).padStart(3, '0')}-${segment.speaker.toLowerCase()}.mp3`;
    if (existsSync(filename)) existingCount++;
  }
  console.log(`Found ${existingCount}/${START_FROM} existing ElevenLabs segments\n`);

  if (existingCount < START_FROM) {
    console.error(`Missing ${START_FROM - existingCount} segments! Expected ${START_FROM} existing segments.`);
    process.exit(1);
  }

  // Calculate remaining stats
  const remainingSegments = SCRIPT.slice(START_FROM);
  const remainingChars = remainingSegments.reduce((sum, s) => sum + s.text.length, 0);
  // OpenAI TTS-1-HD: $0.030 per 1K chars
  const estimatedCost = (remainingChars / 1000) * 0.030;
  console.log(`Remaining segments: ${remainingSegments.length}`);
  console.log(`Remaining characters: ${remainingChars.toLocaleString()}`);
  console.log(`Estimated OpenAI TTS cost: $${estimatedCost.toFixed(2)}\n`);

  // Generate remaining segments with OpenAI TTS
  const allSegmentFiles = [];

  // Add existing ElevenLabs segments
  for (let i = 0; i < START_FROM; i++) {
    const segment = SCRIPT[i];
    const filename = `${OUTPUT_DIR}/segment-${String(i).padStart(3, '0')}-${segment.speaker.toLowerCase()}.mp3`;
    allSegmentFiles.push(filename);
  }

  // Generate new segments with OpenAI
  for (let i = START_FROM; i < SCRIPT.length; i++) {
    const segment = SCRIPT[i];
    const filename = `${OUTPUT_DIR}/segment-${String(i).padStart(3, '0')}-${segment.speaker.toLowerCase()}.mp3`;
    const voiceName = OPENAI_VOICES[segment.speaker];

    console.log(`[${i + 1}/${SCRIPT.length}] Generating ${voiceName}: "${segment.text.slice(0, 60)}..."`);

    try {
      const bytes = await generateSegmentOpenAI(segment.text, segment.speaker, filename);
      normalizeSegment(filename);
      console.log(`  done ${(bytes / 1024).toFixed(1)} KB (normalized)`);
      allSegmentFiles.push(filename);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
      console.log('  Retrying in 3s...');
      await sleep(3000);
      try {
        const bytes = await generateSegmentOpenAI(segment.text, segment.speaker, filename);
        normalizeSegment(filename);
        console.log(`  Retry succeeded: ${(bytes / 1024).toFixed(1)} KB (normalized)`);
        allSegmentFiles.push(filename);
      } catch (retryErr) {
        console.error(`  Retry FAILED: ${retryErr.message}`);
        process.exit(1);
      }
    }

    if (i < SCRIPT.length - 1) await sleep(200);
  }

  console.log(`\nGenerated all ${allSegmentFiles.length} segments\n`);

  // Create ffmpeg concat list
  const concatListPath = `${OUTPUT_DIR}/concat-list.txt`;
  const concatContent = allSegmentFiles.map(f => `file '${f.replace(OUTPUT_DIR + '/', '')}'`).join('\n');
  await writeFile(concatListPath, concatContent);

  // Concatenate all segments
  const concatenatedPath = `${OUTPUT_DIR}/concatenated.mp3`;
  console.log('Concatenating all segments...');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c copy "${concatenatedPath}"`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
  console.log('Concatenated\n');

  // Apply 1.45x speed
  console.log('Applying 1.45x speed...');
  execSync(
    `ffmpeg -y -i "${concatenatedPath}" -filter:a "atempo=1.45" -vn "${FINAL_OUTPUT}"`,
    { cwd: process.cwd(), stdio: 'pipe' }
  );
  console.log('Speed adjusted\n');

  // Get final duration
  const durationOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${FINAL_OUTPUT}"`,
    { encoding: 'utf-8' }
  ).trim();
  const durationSec = parseFloat(durationOutput);
  const minutes = Math.floor(durationSec / 60);
  const seconds = Math.round(durationSec % 60);

  const totalChars = SCRIPT.reduce((sum, s) => sum + s.text.length, 0);

  console.log('=== DONE ===');
  console.log(`Output: ${FINAL_OUTPUT}`);
  console.log(`Duration: ${minutes}m ${seconds}s`);
  console.log(`Total characters: ${totalChars.toLocaleString()}`);
  console.log(`Segments 0-${START_FROM - 1}: ElevenLabs`);
  console.log(`Segments ${START_FROM}-${SCRIPT.length - 1}: OpenAI TTS (tts-1-hd)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
