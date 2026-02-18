/**
 * NLP Utilities for Quarry Codex
 * @module lib/nlp
 * 
 * Uses Compromise.js for SOTA client-side NLP:
 * - Named Entity Recognition (NER) for people, places, organizations
 * - Part-of-speech tagging for noun phrase extraction
 * - Technical entity recognition (languages, frameworks, etc.)
 * - Automatic tag suggestion
 * - Content classification
 * - Keyword extraction with TF-IDF
 * - Reading level analysis
 * 
 * @see https://compromise.cool - Compromise.js documentation
 */

// Lazy-load compromise to avoid SSR issues
let nlp: typeof import('compromise').default | null = null

async function loadCompromise() {
  if (nlp) return nlp
  try {
    const module = await import('compromise')
    nlp = module.default
    return nlp
  } catch {
    console.warn('[NLP] Compromise.js not available, using regex fallback')
    return null
  }
}

// Synchronous fallback for when compromise isn't loaded
function getCompromiseSync() {
  return nlp
}

// ==================== Entity Recognition ====================

/**
 * Known entity patterns for tech content (fallback/supplement to Compromise)
 */
const TECH_ENTITIES: Record<string, RegExp> = {
  // Programming languages
  languages: /\b(JavaScript|TypeScript|Python|Rust|Go|Golang|Java|C\+\+|C#|F#|Ruby|PHP|Swift|Kotlin|Scala|Haskell|Elixir|Clojure|R|Julia|Dart|Lua|Perl|COBOL|Fortran|Assembly|WebAssembly|WASM|SQL|Bash|Shell|PowerShell|Zig|Nim|Crystal|OCaml|Erlang|Prolog|Lisp|Scheme|Racket|V|Mojo)\b/gi,
  
  // Frameworks/Libraries
  frameworks: /\b(React|Vue|Angular|Svelte|Next\.?js|Nuxt|Remix|Astro|SvelteKit|Solid\.?js|Qwik|Express|Fastify|Koa|Hono|FastAPI|Django|Rails|Spring|Flask|Laravel|NestJS|Deno|Bun|Node\.?js|Electron|Tauri|Qt|GTK|SwiftUI|UIKit|Jetpack Compose|Flutter|React Native|Expo|Ionic|Capacitor|TensorFlow|PyTorch|JAX|Keras|scikit-learn|Pandas|NumPy|Hugging Face|LangChain|LlamaIndex|Tailwind|Bootstrap|Material UI|Chakra|Radix|shadcn|Framer Motion|Three\.?js|D3\.?js|Chart\.?js|Playwright|Cypress|Jest|Vitest|Mocha|pytest)\b/gi,
  
  // Databases & Data stores
  databases: /\b(PostgreSQL|Postgres|MySQL|MariaDB|MongoDB|Redis|SQLite|Cassandra|DynamoDB|Firebase|Firestore|Supabase|PlanetScale|Prisma|Drizzle|TypeORM|Sequelize|Elasticsearch|OpenSearch|Neo4j|ArangoDB|CouchDB|InfluxDB|TimescaleDB|ClickHouse|Snowflake|BigQuery|Redshift|Databricks|Apache Spark|Kafka|RabbitMQ|NATS|Pinecone|Weaviate|Milvus|Qdrant|Chroma|LanceDB)\b/gi,
  
  // Cloud/Infra
  cloud: /\b(AWS|Amazon Web Services|Azure|GCP|Google Cloud|Vercel|Netlify|Cloudflare|DigitalOcean|Linode|Vultr|Hetzner|OVH|Docker|Kubernetes|K8s|Terraform|Pulumi|Ansible|Chef|Puppet|GitHub Actions|GitLab CI|CircleCI|Jenkins|ArgoCD|Helm|Istio|Envoy|Nginx|Apache|Caddy|Traefik|HAProxy)\b/gi,
  
  // AI/ML
  ai: /\b(OpenAI|GPT-\d|GPT|ChatGPT|Claude|Anthropic|Gemini|Bard|LLM|LLMs|RAG|embeddings?|vectors?|transformer|transformers|BERT|RoBERTa|T5|BLOOM|Llama|Mistral|Mixtral|Falcon|diffusion|Stable Diffusion|DALL-E|Midjourney|neural networks?|machine learning|ML|deep learning|DL|NLP|natural language processing|computer vision|CV|reinforcement learning|RL|fine-tuning|RLHF|PEFT|LoRA|QLoRA|quantization|inference|training|prompt engineering|agents?|multi-modal|multimodal|vision-language|VLM|speech recognition|ASR|TTS|text-to-speech|OCR)\b/gi,
  
  // Protocols/Standards
  protocols: /\b(REST|RESTful|GraphQL|gRPC|tRPC|WebSocket|WebSockets|HTTP\/[123]|HTTP|HTTPS|OAuth|OAuth2|JWT|SAML|OpenID|OIDC|WebRTC|MQTT|AMQP|WebHooks?|SSE|Server-Sent Events|JSON-RPC|XML-RPC|SOAP|OpenAPI|Swagger|AsyncAPI|Protobuf|Protocol Buffers|MessagePack|Avro|Thrift|Cap'n Proto)\b/gi,
  
  // Concepts
  concepts: /\b(microservices?|monolith|serverless|edge computing|edge functions|distributed systems?|event-driven|event sourcing|CQRS|DDD|domain-driven design|TDD|test-driven development|BDD|behavior-driven|CI\/CD|continuous integration|continuous deployment|DevOps|GitOps|MLOps|DataOps|AIOps|observability|monitoring|logging|tracing|APM|SRE|site reliability|chaos engineering|feature flags?|A\/B testing|blue-green|canary|rolling updates?|immutable infrastructure|infrastructure as code|IaC|containerization|orchestration|service mesh|API gateway|load balancing|caching|CDN|content delivery|sharding|replication|consensus|Raft|Paxos|CAP theorem|ACID|BASE|eventual consistency|idempotency|rate limiting|circuit breaker|bulkhead|saga pattern|outbox pattern|SOLID|DRY|KISS|YAGNI|clean architecture|hexagonal|onion architecture|ports and adapters|dependency injection|inversion of control|pub\/sub|message queue|event bus)\b/gi,
}

/**
 * Extract tech entities using regex patterns
 */
export function extractTechEntities(content: string): Record<string, string[]> {
  const entities: Record<string, Set<string>> = {}
  
  for (const [category, pattern] of Object.entries(TECH_ENTITIES)) {
    entities[category] = new Set()
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      // Normalize to title case for consistency
      const normalized = match[0].charAt(0).toUpperCase() + match[0].slice(1)
      entities[category].add(normalized)
    }
  }
  
  return Object.fromEntries(
    Object.entries(entities)
      .map(([k, v]) => [k, Array.from(v)])
      .filter(([_, v]) => (v as string[]).length > 0)
  )
}

/**
 * Generic entity extraction result
 */
export interface ExtractedEntities {
  technologies: string[]
  concepts: string[]
  people: string[]
  organizations: string[]
  locations: string[]
  dates: string[]
  values: string[]
  topics: string[]
  acronyms: string[]
  [key: string]: string[]
}

/**
 * Extract all entity types using Compromise.js NER + custom tech patterns
 * This is the MAIN entity extraction function - uses SOTA NLP when available
 */
export async function extractEntitiesAsync(content: string): Promise<ExtractedEntities> {
  const compromise = await loadCompromise()
  
  // Start with tech entities (always use regex for these - more reliable)
  const techEntities = extractTechEntities(content)
  
  // Combine technologies from all tech categories
  const technologies = new Set<string>([
    ...(techEntities.languages || []),
    ...(techEntities.frameworks || []),
    ...(techEntities.databases || []),
    ...(techEntities.cloud || []),
    ...(techEntities.ai || []),
    ...(techEntities.protocols || []),
  ])
  
  // Concepts from tech patterns
  const concepts = new Set<string>(techEntities.concepts || [])
  
  // Initialize other entity sets
  const people = new Set<string>()
  const organizations = new Set<string>()
  const locations = new Set<string>()
  const dates = new Set<string>()
  const values = new Set<string>()
  const topics = new Set<string>()
  const acronyms = new Set<string>()
  
  if (compromise) {
    // Use Compromise.js for NER
    const doc = compromise(content)
    
    // People - names of people
    doc.people().forEach((p: { text: () => string }) => {
      const name = p.text().trim()
      if (name.length > 2 && !technologies.has(name)) {
        people.add(name)
      }
    })
    
    // Places - locations, cities, countries
    doc.places().forEach((p: { text: () => string }) => {
      const place = p.text().trim()
      if (place.length > 1) {
        locations.add(place)
      }
    })
    
    // Organizations - companies, institutions
    doc.organizations().forEach((o: { text: () => string }) => {
      const org = o.text().trim()
      if (org.length > 1 && !technologies.has(org)) {
        organizations.add(org)
      }
    })
    
    // Dates - temporal expressions (use regex since compromise-dates plugin not available)
    const datePatterns = [
      /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g, // MM/DD/YYYY, DD-MM-YY
      /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g, // YYYY-MM-DD
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi,
      /\b\d{1,2}(?:st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December),?\s*\d{0,4}/gi,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s*\d{0,4}/gi,
    ]
    for (const pattern of datePatterns) {
      const dateMatches = content.matchAll(pattern)
      for (const match of dateMatches) {
        dates.add(match[0].trim())
      }
    }
    
    // Values - numbers, money, percentages (use regex since method may not exist)
    const valuePatterns = [
      /\$[\d,]+(?:\.\d{2})?/g, // Money
      /\d+(?:\.\d+)?%/g, // Percentages
      /\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\b/g, // Large numbers with commas
    ]
    for (const pattern of valuePatterns) {
      const valueMatches = content.matchAll(pattern)
      for (const match of valueMatches) {
        values.add(match[0].trim())
      }
    }
    
    // Topics - noun phrases as topics
    doc.nouns().forEach((n: { text: () => string }) => {
      const noun = n.text().trim().toLowerCase()
      if (noun.length > 3 && !noun.match(/^(the|this|that|these|those|which|what|who|whom)$/)) {
        topics.add(noun)
      }
    })
    
    // Acronyms - all-caps words (use match instead of acronyms() which may not exist)
    const acronymMatches = content.matchAll(/\b([A-Z]{2,10})\b/g)
    for (const match of acronymMatches) {
      const acr = match[1]
      if (acr.length >= 2 && acr.length <= 10 && !STOP_WORDS.has(acr.toLowerCase())) {
        acronyms.add(acr)
      }
    }
  } else {
    // Fallback to regex for non-tech entities
    // People (proper names - 2+ capitalized words)
    const peopleMatches = content.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)
    for (const match of peopleMatches) {
      const name = match[1]
      if (name.length > 5 && !name.match(/^(The |A |An |This |That |These |Those |What |How |Why |When |Where )/)) {
        const nameLower = name.toLowerCase()
        const isTech = [...technologies].some(t => nameLower.includes(t.toLowerCase()))
        if (!isTech) {
          people.add(name)
        }
      }
    }
    
    // Organizations
    const knownOrgs = /\b(Google|Microsoft|Apple|Amazon|Meta|Facebook|Twitter|X Corp|OpenAI|Anthropic|GitHub|GitLab|Atlassian|JetBrains|Mozilla|Linux Foundation|Apache|Netflix|Uber|Airbnb|Stripe|Shopify|Salesforce|Adobe|Oracle|IBM|Intel|NVIDIA|AMD|Hugging Face|Vercel|Netlify|Cloudflare|DigitalOcean|Heroku|MongoDB Inc|Elastic|Redis Labs|Confluent|Databricks|Snowflake|Y Combinator|Andreessen Horowitz|Sequoia|Accel|Benchmark|Greylock)\b/gi
    const knownOrgMatches = content.matchAll(knownOrgs)
    for (const match of knownOrgMatches) {
      organizations.add(match[1])
    }
    
    // Locations
    const locationMatches = content.matchAll(/\b(San Francisco|New York|Los Angeles|Seattle|Austin|Boston|Chicago|London|Paris|Berlin|Tokyo|Beijing|Shanghai|Singapore|Sydney|Toronto|Vancouver|Amsterdam|Stockholm|Tel Aviv|Bangalore|Bengaluru|Mumbai|Dubai|Seoul|Hong Kong|Taipei|Bangkok|Jakarta|Manila|Kuala Lumpur|Ho Chi Minh|Hanoi|USA|UK|EU|Europe|Asia|Africa|Australia|Canada|India|China|Japan|Germany|France|Brazil|Mexico|Russia|South Korea|Indonesia|Vietnam|Thailand|Malaysia|Philippines|Taiwan|Israel|UAE|Saudi Arabia|Silicon Valley|Bay Area)\b/gi)
    for (const match of locationMatches) {
      locations.add(match[1])
    }
    
    // Acronyms
    const acronymMatches = content.matchAll(/\b([A-Z]{2,10})\b/g)
    for (const match of acronymMatches) {
      const acr = match[1]
      // Filter out common false positives
      if (!['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'CAN', 'ALL', 'NEW', 'ONE', 'TWO'].includes(acr)) {
        acronyms.add(acr)
      }
    }
  }
  
  return {
    technologies: Array.from(technologies),
    concepts: Array.from(concepts),
    people: Array.from(people),
    organizations: Array.from(organizations),
    locations: Array.from(locations),
    dates: Array.from(dates),
    values: Array.from(values),
    topics: Array.from(topics).slice(0, 50), // Limit topics
    acronyms: Array.from(acronyms),
  }
}

/**
 * Synchronous entity extraction (uses cached Compromise or regex fallback)
 * For backwards compatibility and sync contexts
 */
export function extractEntities(content: string): ExtractedEntities {
  const compromise = getCompromiseSync()
  
  // Start with tech entities
  const techEntities = extractTechEntities(content)
  
  // Combine technologies from all tech categories
  const technologies = new Set<string>([
    ...(techEntities.languages || []),
    ...(techEntities.frameworks || []),
    ...(techEntities.databases || []),
    ...(techEntities.cloud || []),
    ...(techEntities.ai || []),
    ...(techEntities.protocols || []),
  ])
  
  const concepts = new Set<string>(techEntities.concepts || [])
  const people = new Set<string>()
  const organizations = new Set<string>()
  const locations = new Set<string>()
  const dates = new Set<string>()
  const values = new Set<string>()
  const topics = new Set<string>()
  const acronyms = new Set<string>()
  
  if (compromise) {
    const doc = compromise(content)
    doc.people().forEach((p: { text: () => string }) => {
      const name = p.text().trim()
      if (name.length > 2 && !technologies.has(name)) people.add(name)
    })
    doc.places().forEach((p: { text: () => string }) => {
      const place = p.text().trim()
      if (place.length > 1) locations.add(place)
    })
    doc.organizations().forEach((o: { text: () => string }) => {
      const org = o.text().trim()
      if (org.length > 1 && !technologies.has(org)) organizations.add(org)
    })
    // Dates - use regex since compromise-dates plugin not available
    const datePatterns2 = [
      /\b(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\b/g,
      /\b(\d{4}[-/]\d{1,2}[-/]\d{1,2})\b/g,
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:st|nd|rd|th)?,?\s*\d{0,4}/gi,
    ]
    for (const pattern of datePatterns2) {
      for (const match of content.matchAll(pattern)) dates.add(match[0].trim())
    }
    // Values - use regex
    for (const match of content.matchAll(/\$[\d,]+(?:\.\d{2})?|\d+(?:\.\d+)?%/g)) {
      values.add(match[0].trim())
    }
    doc.nouns().forEach((n: { text: () => string }) => {
      const noun = n.text().trim().toLowerCase()
      if (noun.length > 3 && !noun.match(/^(the|this|that|these|those|which|what|who|whom)$/)) {
        topics.add(noun)
      }
    })
    // Acronyms - use regex
    for (const match of content.matchAll(/\b([A-Z]{2,10})\b/g)) {
      const acr = match[1]
      if (acr.length >= 2 && acr.length <= 10) acronyms.add(acr)
    }
  } else {
    // Regex fallback
    const peopleMatches = content.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g)
    for (const match of peopleMatches) {
      const name = match[1]
      if (name.length > 5 && !name.match(/^(The |A |An |This |That |These |Those |What |How |Why |When |Where )/)) {
        const nameLower = name.toLowerCase()
        const isTech = [...technologies].some(t => nameLower.includes(t.toLowerCase()))
        if (!isTech) people.add(name)
      }
    }
    
    const knownOrgs = /\b(Google|Microsoft|Apple|Amazon|Meta|Facebook|Twitter|X Corp|OpenAI|Anthropic|GitHub|GitLab|Atlassian|JetBrains|Mozilla|Linux Foundation|Apache|Netflix|Uber|Airbnb|Stripe|Shopify|Salesforce|Adobe|Oracle|IBM|Intel|NVIDIA|AMD|Hugging Face|Vercel|Netlify|Cloudflare|DigitalOcean|Heroku|Y Combinator)\b/gi
    for (const match of content.matchAll(knownOrgs)) organizations.add(match[1])
    
    const locationMatches = content.matchAll(/\b(San Francisco|New York|Los Angeles|Seattle|Austin|Boston|Chicago|London|Paris|Berlin|Tokyo|Beijing|Shanghai|Singapore|Sydney|Toronto|Vancouver|Amsterdam|Stockholm|Tel Aviv|Bangalore|Mumbai|Dubai|USA|UK|EU|Europe|Asia|Africa|Australia|Canada|India|China|Japan|Germany|France|Brazil|Mexico|Silicon Valley|Bay Area)\b/gi)
    for (const match of locationMatches) locations.add(match[1])
    
    const acronymMatches = content.matchAll(/\b([A-Z]{2,10})\b/g)
    for (const match of acronymMatches) {
      const acr = match[1]
      if (!['THE', 'AND', 'FOR', 'NOT', 'BUT', 'ARE', 'WAS', 'HAS', 'HAD', 'CAN', 'ALL', 'NEW', 'ONE', 'TWO'].includes(acr)) {
        acronyms.add(acr)
      }
    }
  }
  
  return {
    technologies: Array.from(technologies),
    concepts: Array.from(concepts),
    people: Array.from(people),
    organizations: Array.from(organizations),
    locations: Array.from(locations),
    dates: Array.from(dates),
    values: Array.from(values),
    topics: Array.from(topics).slice(0, 50),
    acronyms: Array.from(acronyms),
  }
}

/**
 * Initialize Compromise.js for faster subsequent calls
 * Call this early in your app lifecycle
 */
export async function initializeNLP(): Promise<boolean> {
  const compromise = await loadCompromise()
  return compromise !== null
}

/**
 * Generate a summary from content (extractive)
 */
export function generateSummary(content: string, maxLength = 200): string {
  return generateExtractiveSummary(content, maxLength)
}

/**
 * Advanced summary extraction using Compromise.js sentence analysis
 * Falls back to extractive summary if Compromise unavailable
 */
export async function generateSummaryAsync(content: string, maxLength = 200): Promise<string> {
  const compromise = await loadCompromise()
  
  if (compromise) {
    const doc = compromise(content)
    const sentences = doc.sentences().out('array') as string[]
    
    if (sentences.length === 0) {
      return generateExtractiveSummary(content, maxLength)
    }
    
    // Score sentences by:
    // 1. Position (first sentences more important)
    // 2. Named entities (more entities = more informative)
    // 3. Length (not too short, not too long)
    const scoredSentences = sentences.map((sentence, index) => {
      const sentenceDoc = compromise(sentence)
      const entityCount = 
        sentenceDoc.people().length + 
        sentenceDoc.places().length + 
        sentenceDoc.organizations().length
      
      // Position score (exponential decay)
      const positionScore = Math.exp(-index * 0.3)
      
      // Entity density score
      const entityScore = entityCount * 0.3
      
      // Length score (prefer 10-30 word sentences)
      const wordCount = sentence.split(/\s+/).length
      const lengthScore = wordCount >= 10 && wordCount <= 30 ? 0.2 : 0
      
      return {
        sentence: sentence.trim(),
        score: positionScore + entityScore + lengthScore,
      }
    })
    
    // Sort by score and take top sentences until maxLength
    scoredSentences.sort((a, b) => b.score - a.score)
    
    let summary = ''
    for (const { sentence } of scoredSentences) {
      if ((summary + ' ' + sentence).length <= maxLength) {
        summary = summary ? summary + ' ' + sentence : sentence
      } else if (summary.length === 0) {
        // First sentence too long, truncate it
        summary = sentence.slice(0, maxLength - 3) + '...'
        break
      }
    }
    
    return summary || generateExtractiveSummary(content, maxLength)
  }
  
  return generateExtractiveSummary(content, maxLength)
}

/**
 * Extract key phrases (noun phrases + verb phrases) using Compromise.js
 * Better than simple keywords for understanding content
 */
export async function extractKeyPhrasesAsync(content: string, limit = 15): Promise<string[]> {
  const compromise = await loadCompromise()
  
  if (!compromise) {
    // Fallback to basic N-gram extraction
    return extractNgrams(content, 2).slice(0, limit)
  }
  
  const doc = compromise(content)
  const phrases = new Set<string>()
  
  // Noun phrases
  doc.nouns().forEach((n: { text: () => string }) => {
    const phrase = n.text().trim()
    if (phrase.length > 3 && phrase.split(/\s+/).length <= 5) {
      phrases.add(phrase.toLowerCase())
    }
  })
  
  // Verb phrases (actions)
  doc.verbs().forEach((v: { text: () => string }) => {
    const phrase = v.text().trim()
    if (phrase.length > 3 && phrase.split(/\s+/).length <= 4) {
      phrases.add(phrase.toLowerCase())
    }
  })
  
  // Noun + verb combinations (subjects + actions)
  doc.clauses().forEach((c: { text: () => string }) => {
    const phrase = c.text().trim()
    const wordCount = phrase.split(/\s+/).length
    if (wordCount >= 2 && wordCount <= 6) {
      phrases.add(phrase.toLowerCase())
    }
  })
  
  return Array.from(phrases).slice(0, limit)
}

// ==================== Keyword Extraction ====================

/**
 * Stop words to filter out from keyword extraction
 */
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that',
  'these', 'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who',
  'whom', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few',
  'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
  'so', 'than', 'too', 'very', 'just', 'also', 'now', 'here', 'there', 'then',
])

/**
 * Dynamically detect if a word looks like a code artifact
 * Uses pattern-based detection instead of hardcoded lists
 */
export function isCodeArtifact(word: string): boolean {
  const w = word.toLowerCase().trim()

  // 1. Too short - single letters are variables, not tags
  if (w.length < 2) return true

  // 2. Single letter followed by number (x1, y2, etc)
  if (/^[a-z]\d+$/.test(w)) return true

  // 3. Common code patterns: camelCase internals, snake_case parts
  if (/^[a-z]{1,2}$/.test(w)) return true  // Single/double letter vars

  // 4. Looks like a code token: all lowercase, 2-6 chars, no vowels or too few vowels
  if (w.length <= 6 && w.length >= 2) {
    const vowelCount = (w.match(/[aeiou]/g) || []).length
    const consonantRatio = (w.length - vowelCount) / w.length
    // Words with >80% consonants are likely abbreviations/code
    if (consonantRatio > 0.8 && w.length <= 4) return true
  }

  // 5. Matches common code keyword patterns dynamically
  // Reserved words typically: short, all lowercase, no hyphens
  const codePatterns = [
    /^(self|this|super|null|nil|none|void|true|false|undefined)$/,  // Universal literals
    /^(def|fn|func|let|var|const|mut|pub|priv|static)$/,            // Declaration keywords
    /^(if|else|elif|for|while|do|try|catch|throw|return|yield|break|continue|pass)$/, // Control flow
    /^(import|export|from|as|class|struct|enum|trait|impl|extends|implements)$/,       // Module/type keywords
    /^(async|await|new|delete|typeof|instanceof|sizeof)$/,          // Operators
  ]

  for (const pattern of codePatterns) {
    if (pattern.test(w)) return true
  }

  return false
}

/**
 * Extract keywords using TF-IDF-like scoring
 * Enhanced: Uses Compromise.js noun phrases when available for better multi-word keywords
 */
export function extractKeywords(content: string, limit = 10): Array<{ word: string; score: number }> {
  const compromise = getCompromiseSync()
  const freq: Record<string, number> = {}
  
  if (compromise) {
    // Use Compromise.js for noun phrase extraction (better multi-word keywords)
    const doc = compromise(content)

    // Get noun chunks (multi-word noun phrases)
    doc.nouns().forEach((n: { text: () => string }) => {
      const noun = n.text().trim().toLowerCase()
      if (noun.length > 2 && !STOP_WORDS.has(noun) && !isCodeArtifact(noun)) {
        freq[noun] = (freq[noun] || 0) + 1
      }
    })

    // Also get verbs (actions can be important keywords)
    doc.verbs().toInfinitive().forEach((v: { text: () => string }) => {
      const verb = v.text().trim().toLowerCase()
      if (verb.length > 3 && !STOP_WORDS.has(verb) && !isCodeArtifact(verb)) {
        freq[verb] = (freq[verb] || 0) + 0.5 // Lower weight for verbs
      }
    })
  } else {
    // Fallback: Tokenize and clean
    const words = content
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOP_WORDS.has(w) && !isCodeArtifact(w))

    for (const word of words) {
      freq[word] = (freq[word] || 0) + 1
    }
  }
  
  // Add N-gram extraction for multi-word phrases (even without Compromise)
  const bigrams = extractNgrams(content, 2).filter(ng => 
    !ng.split(' ').every(w => STOP_WORDS.has(w.toLowerCase()))
  )
  for (const bigram of bigrams.slice(0, 20)) {
    const bg = bigram.toLowerCase()
    freq[bg] = (freq[bg] || 0) + 1.5 // Boost multi-word
  }
  
  // Score by frequency * word length (longer words/phrases often more meaningful)
  const scored = Object.entries(freq)
    .map(([word, count]) => ({
      word,
      score: count * Math.log(word.length + 1) * (word.includes(' ') ? 1.3 : 1), // Boost phrases
    }))
    .sort((a, b) => b.score - a.score)
  
  // Deduplicate (remove single words if they're part of a higher-scored phrase)
  const result: Array<{ word: string; score: number }> = []
  const seen = new Set<string>()
  
  for (const item of scored) {
    if (seen.has(item.word)) continue
    
    // If it's a phrase, mark component words as seen
    if (item.word.includes(' ')) {
      for (const part of item.word.split(' ')) {
        seen.add(part)
      }
    }
    
    result.push(item)
    seen.add(item.word)
    
    if (result.length >= limit) break
  }
  
  return result
}

/**
 * Extract N-grams (sequences of N words)
 */
export function extractNgrams(content: string, n: number): string[] {
  const words = content
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0)
  
  const ngrams: string[] = []
  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(' ')
    // Filter out ngrams that start/end with stopwords
    const first = words[i].toLowerCase()
    const last = words[i + n - 1].toLowerCase()
    if (!STOP_WORDS.has(first) && !STOP_WORDS.has(last)) {
      ngrams.push(ngram)
    }
  }
  
  // Return unique ngrams sorted by frequency
  const freq: Record<string, number> = {}
  for (const ng of ngrams) {
    const key = ng.toLowerCase()
    freq[key] = (freq[key] || 0) + 1
  }
  
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([ng]) => ng)
}

// ==================== Auto-Tag Suggestion ====================

/**
 * Suggest tags based on content analysis
 */
export function suggestTags(content: string, existingTags: string[] = []): string[] {
  const suggestions = new Set<string>()
  const existingSet = new Set(existingTags.map(t => t.toLowerCase()))
  
  // Extract tech entities
  const entities = extractTechEntities(content)
  for (const category of Object.values(entities)) {
    for (const entity of category) {
      const tag = entity.toLowerCase().replace(/\s+/g, '-')
      if (!existingSet.has(tag)) {
        suggestions.add(tag)
      }
    }
  }
  
  // Extract top keywords
  const keywords = extractKeywords(content, 15)
  for (const { word, score } of keywords) {
    if (score > 2 && !existingSet.has(word)) {
      suggestions.add(word)
    }
  }
  
  return Array.from(suggestions).slice(0, 10)
}

// ==================== Content Classification ====================

/**
 * Content type indicators
 */
const CONTENT_PATTERNS = {
  tutorial: /\b(step \d|how to|tutorial|guide|walkthrough|let's|first,|then,|finally,)\b/gi,
  reference: /\b(API|reference|documentation|specification|schema|interface|method|function|parameter)\b/gi,
  conceptual: /\b(concept|overview|introduction|what is|understanding|fundamentals|basics|theory)\b/gi,
  troubleshooting: /\b(error|fix|solve|debug|issue|problem|troubleshoot|solution|workaround)\b/gi,
  architecture: /\b(architecture|design|pattern|structure|diagram|flow|system|component)\b/gi,
}

/**
 * Classify content type
 */
export function classifyContentType(content: string): {
  primary: string
  confidence: number
  scores: Record<string, number>
} {
  const scores: Record<string, number> = {}
  
  for (const [type, pattern] of Object.entries(CONTENT_PATTERNS)) {
    const matches = content.match(pattern) || []
    scores[type] = matches.length
  }
  
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1
  const sorted = Object.entries(scores).sort(([, a], [, b]) => b - a)
  const [primary, primaryScore] = sorted[0] || ['general', 0]
  
  return {
    primary: primary || 'general',
    confidence: primaryScore / total,
    scores,
  }
}

// ==================== Reading Level Analysis ====================

/**
 * Estimate reading difficulty (Flesch-Kincaid inspired)
 */
export function analyzeReadingLevel(content: string): {
  level: 'beginner' | 'intermediate' | 'advanced'
  metrics: {
    avgSentenceLength: number
    avgWordLength: number
    technicalDensity: number
    codeBlockRatio: number
  }
} {
  // Strip code blocks for text analysis
  const textOnly = content.replace(/```[\s\S]*?```/g, ' ')
  
  // Count sentences (rough)
  const sentences = textOnly.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const words = textOnly.split(/\s+/).filter(w => w.length > 0)
  
  // Calculate metrics
  const avgSentenceLength = words.length / (sentences.length || 1)
  const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / (words.length || 1)
  
  // Count technical terms
  const techTerms = content.match(/\b[A-Z][a-zA-Z]*[A-Z][a-zA-Z]*\b/g) || [] // CamelCase
  const acronyms = content.match(/\b[A-Z]{2,}\b/g) || []
  const technicalDensity = (techTerms.length + acronyms.length) / (words.length || 1)
  
  // Code block ratio
  const codeBlocks = content.match(/```[\s\S]*?```/g) || []
  const codeLength = codeBlocks.join('').length
  const codeBlockRatio = codeLength / (content.length || 1)
  
  // Calculate difficulty score
  let score = 0
  score += Math.min(avgSentenceLength / 10, 3) // 0-3 points
  score += Math.min(avgWordLength / 2, 3) // 0-3 points
  score += technicalDensity * 10 // 0-3+ points
  score += codeBlockRatio * 5 // 0-3+ points
  
  const level = score < 3 ? 'beginner' : score < 6 ? 'intermediate' : 'advanced'
  
  return {
    level,
    metrics: {
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      avgWordLength: Math.round(avgWordLength * 10) / 10,
      technicalDensity: Math.round(technicalDensity * 1000) / 1000,
      codeBlockRatio: Math.round(codeBlockRatio * 100) / 100,
    },
  }
}

// ==================== Link/Reference Extraction ====================

/**
 * Extract internal wiki-style links
 */
export function extractInternalLinks(content: string): string[] {
  const links = new Set<string>()
  
  // Markdown links: [text](path)
  const mdLinks = content.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)
  for (const match of mdLinks) {
    const href = match[2]
    if (!href.startsWith('http') && !href.startsWith('#')) {
      links.add(href.replace(/^\.\//, '').replace(/\.md$/, ''))
    }
  }
  
  // Wiki links: [[path]] or [[path|text]]
  const wikiLinks = content.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g)
  for (const match of wikiLinks) {
    links.add(match[1])
  }
  
  return Array.from(links)
}

/**
 * Extract external references (URLs)
 */
export function extractExternalLinks(content: string): Array<{ url: string; domain: string }> {
  const links: Array<{ url: string; domain: string }> = []
  const urlPattern = /https?:\/\/[^\s)>\]]+/g
  
  const matches = content.matchAll(urlPattern)
  for (const match of matches) {
    const url = match[0].replace(/[.,;:!?]+$/, '') // Strip trailing punctuation
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '')
      links.push({ url, domain })
    } catch {
      // Invalid URL
    }
  }
  
  return links
}

// ==================== Summary Generation ====================

/**
 * Block types for markdown content
 */
export type MarkdownBlockType = 'paragraph' | 'heading' | 'code' | 'list' | 'blockquote' | 'table' | 'html'

/**
 * Parsed markdown block with metadata
 */
export interface ParsedBlock {
  /** Block identifier */
  id: string
  /** Block type */
  type: MarkdownBlockType
  /** Raw content of the block */
  content: string
  /** Start line in source (1-indexed) */
  startLine: number
  /** End line in source (1-indexed) */
  endLine: number
  /** Heading level (1-6) if type is 'heading' */
  headingLevel?: number
  /** Language if type is 'code' */
  codeLanguage?: string
}

/**
 * Block-level summary result
 */
export interface BlockSummaryResult {
  /** Block identifier */
  blockId: string
  /** Block type */
  blockType: MarkdownBlockType
  /** Start line */
  startLine: number
  /** End line */
  endLine: number
  /** Extractive summary for this block */
  extractive: string
}

/**
 * Parse markdown content into blocks
 */
export function parseMarkdownBlocks(content: string): ParsedBlock[] {
  if (!content) return []
  const lines = content.split('\n')
  const blocks: ParsedBlock[] = []
  let currentBlock: Partial<ParsedBlock> | null = null
  let blockContent: string[] = []
  let inCodeBlock = false
  let codeLanguage = ''
  let inFrontmatter = false
  let blockIndex = 0

  const flushBlock = (endLine: number) => {
    if (currentBlock && blockContent.length > 0) {
      blocks.push({
        id: `block-${blockIndex}`,
        type: currentBlock.type as MarkdownBlockType,
        content: blockContent.join('\n').trim(),
        startLine: currentBlock.startLine!,
        endLine,
        ...(currentBlock.headingLevel && { headingLevel: currentBlock.headingLevel }),
        ...(currentBlock.codeLanguage && { codeLanguage: currentBlock.codeLanguage }),
      })
      blockIndex++
    }
    currentBlock = null
    blockContent = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lineNum = i + 1

    // Handle frontmatter
    if (lineNum === 1 && line === '---') {
      inFrontmatter = true
      continue
    }
    if (inFrontmatter) {
      if (line === '---') {
        inFrontmatter = false
      }
      continue
    }

    // Handle code blocks
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        flushBlock(lineNum - 1)
        inCodeBlock = true
        codeLanguage = line.slice(3).trim()
        currentBlock = { type: 'code', startLine: lineNum, codeLanguage }
        blockContent = []
      } else {
        blockContent.push(line)
        flushBlock(lineNum)
        inCodeBlock = false
        codeLanguage = ''
      }
      continue
    }

    if (inCodeBlock) {
      blockContent.push(line)
      continue
    }

    // Handle headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushBlock(lineNum - 1)
      currentBlock = { 
        type: 'heading', 
        startLine: lineNum, 
        headingLevel: headingMatch[1].length 
      }
      blockContent = [headingMatch[2]]
      flushBlock(lineNum)
      continue
    }

    // Handle blockquotes
    if (line.startsWith('>')) {
      if (currentBlock?.type !== 'blockquote') {
        flushBlock(lineNum - 1)
        currentBlock = { type: 'blockquote', startLine: lineNum }
        blockContent = []
      }
      blockContent.push(line.replace(/^>\s?/, ''))
      continue
    }

    // Handle lists
    if (/^[\s]*[-*+]\s/.test(line) || /^[\s]*\d+\.\s/.test(line)) {
      if (currentBlock?.type !== 'list') {
        flushBlock(lineNum - 1)
        currentBlock = { type: 'list', startLine: lineNum }
        blockContent = []
      }
      blockContent.push(line)
      continue
    }

    // Handle tables
    if (line.includes('|') && (line.match(/\|/g) || []).length >= 2) {
      if (currentBlock?.type !== 'table') {
        flushBlock(lineNum - 1)
        currentBlock = { type: 'table', startLine: lineNum }
        blockContent = []
      }
      blockContent.push(line)
      continue
    }

    // Handle paragraphs
    if (line.trim()) {
      if (currentBlock?.type !== 'paragraph') {
        flushBlock(lineNum - 1)
        currentBlock = { type: 'paragraph', startLine: lineNum }
        blockContent = []
      }
      blockContent.push(line)
    } else {
      // Empty line - flush current block
      if (currentBlock) {
        flushBlock(lineNum - 1)
      }
    }
  }

  // Flush remaining block
  flushBlock(lines.length)

  return blocks
}

/**
 * Generate extractive summary for a single block
 */
export function generateBlockExtractiveSummary(block: ParsedBlock, maxLength = 150): string {
  const content = block.content

  // Handle undefined or null content
  if (!content) return ''

  switch (block.type) {
    case 'heading':
      return content // Headings are already concise

    case 'code':
      // For code, return the language and a hint about what it does
      const lang = block.codeLanguage || 'code'
      const firstLine = content.split('\n')[0]?.slice(0, 50) || ''
      return `[${lang}] ${firstLine}${content.length > 50 ? '...' : ''}`

    case 'list':
      // Extract first few list items
      const items = content.split('\n').slice(0, 3)
      const listSummary = items.map(i => i.replace(/^[\s]*[-*+\d.]+\s*/, '').trim()).join('; ')
      return listSummary.slice(0, maxLength) + (content.split('\n').length > 3 ? '...' : '')

    case 'blockquote':
    case 'paragraph':
      // Extract key sentences
      const sentences = content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 10)

      let summary = ''
      for (const sentence of sentences) {
        if (summary.length + sentence.length > maxLength) break
        summary += sentence + '. '
      }
      return summary.trim() || content.slice(0, maxLength) + '...'

    case 'table':
      // Return table header row as summary
      const headerRow = content.split('\n')[0] || ''
      const cells = headerRow.split('|').filter(c => c.trim()).map(c => c.trim())
      return `Table: ${cells.join(', ').slice(0, maxLength)}`

    default:
      return content.slice(0, maxLength)
  }
}

/**
 * Generate block-level summaries for all blocks in content
 * Supports both paragraph-by-paragraph AND block-by-block (heading, code, list) summaries
 *
 * By default, excludes:
 * - Headings (not useful to summarize, they're already concise)
 * - Blocks with less than 50 chars of content (too short to be meaningful)
 * - Blocks that produce empty or placeholder summaries
 */
export function generateBlockSummaries(
  content: string,
  maxLengthPerBlock = 150,
  options: {
    includeHeadings?: boolean,
    minContentLength?: number,
  } = {}
): BlockSummaryResult[] {
  const { includeHeadings = false, minContentLength = 50 } = options
  const blocks = parseMarkdownBlocks(content)

  return blocks
    .filter(block => {
      // Skip empty blocks
      if (!block.content || block.content.trim().length === 0) return false

      // Skip headings unless explicitly included
      if (block.type === 'heading' && !includeHeadings) return false

      // Skip very short blocks (< minContentLength chars)
      // Exception: lists can be shorter since each item is summarized
      if (block.type !== 'list' && block.content.trim().length < minContentLength) return false

      return true
    })
    .map(block => {
      const extractive = generateBlockExtractiveSummary(block, maxLengthPerBlock)
      return {
        blockId: block.id,
        blockType: block.type,
        startLine: block.startLine,
        endLine: block.endLine,
        extractive,
      }
    })
    // Filter out blocks with empty/placeholder summaries
    .filter(summary => {
      const text = summary.extractive.trim()
      // Filter out empty, dashes-only, or ellipsis-only summaries
      if (!text || text === '...' || /^[-—–]+\.?\.?\.?$/.test(text)) return false
      // Filter out summaries that are too short to be useful
      if (text.length < 10) return false
      return true
    })
}

/**
 * Generate extractive summary (first meaningful sentences) - strand level
 */
export function generateExtractiveSummary(content: string, maxLength = 200): string {
  // Strip frontmatter
  const withoutFrontmatter = content.replace(/^---[\s\S]*?---\s*/, '')
  
  // Strip code blocks
  const withoutCode = withoutFrontmatter.replace(/```[\s\S]*?```/g, '')
  
  // Get sentences
  const sentences = withoutCode
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && !s.startsWith('#'))
  
  // Build summary
  let summary = ''
  for (const sentence of sentences) {
    if (summary.length + sentence.length > maxLength) break
    summary += sentence + '. '
  }
  
  return summary.trim() || sentences[0]?.slice(0, maxLength) + '...' || ''
}

/**
 * Generate paragraph-level summaries (alias for generateBlockSummaries filtered to paragraphs)
 */
export function generateParagraphSummaries(content: string, maxLength = 150): BlockSummaryResult[] {
  return generateBlockSummaries(content, maxLength).filter(b => b.blockType === 'paragraph')
}

// ==================== Content Health Score ====================

/**
 * Calculate content health/quality score
 */
export function calculateContentHealth(content: string, metadata: Record<string, any> = {}): {
  score: number
  issues: string[]
  suggestions: string[]
} {
  const issues: string[] = []
  const suggestions: string[] = []
  let score = 100
  
  // Check title
  if (!metadata.title) {
    issues.push('Missing title in frontmatter')
    score -= 15
  }
  
  // Check summary
  if (!metadata.summary && !metadata.aiSummary) {
    suggestions.push('Add a summary for better search visibility')
    score -= 5
  }
  
  // Check tags
  const tags = metadata.tags || []
  if (tags.length === 0) {
    suggestions.push('Add tags for better discoverability')
    score -= 5
  }
  
  // Check relationships
  const relationships = metadata.relationships || {}
  if (Object.keys(relationships).length === 0) {
    suggestions.push('Define relationships to other strands')
    score -= 5
  }
  
  // Check content length
  const wordCount = content.split(/\s+/).length
  if (wordCount < 100) {
    issues.push('Content is very short (< 100 words)')
    score -= 10
  }
  
  // Check for headings
  const headings = content.match(/^#{1,3}\s+.+$/gm) || []
  if (headings.length === 0 && wordCount > 200) {
    suggestions.push('Add headings to structure the content')
    score -= 5
  }
  
  // Check for broken links (basic check)
  const brokenLinkPattern = /\[([^\]]*)\]\(\s*\)/g
  if (brokenLinkPattern.test(content)) {
    issues.push('Contains empty links')
    score -= 10
  }
  
  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  }
}

// ==================== Hierarchy-Aware NLP ====================

/**
 * OpenStrand hierarchy levels
 */
export type HierarchyLevel = 'fabric' | 'weave' | 'loom' | 'strand'

/**
 * Parsed hierarchy context from file path
 */
export interface HierarchyContext {
  level: HierarchyLevel
  fabric?: string
  weave?: string
  loom?: string
  strand?: string
  path: string
  parentPath?: string
  siblingPattern?: string
}

/**
 * Relationship suggestion with confidence
 */
export interface RelationshipSuggestion {
  path: string
  type: 'prerequisite' | 'reference' | 'seeAlso' | 'parent' | 'sibling' | 'child'
  confidence: number
  reason: string
}

/**
 * Document analysis result with hierarchy context
 */
export interface DocumentAnalysis {
  hierarchy: HierarchyContext
  suggestedTags: string[]
  suggestedPrerequisites: RelationshipSuggestion[]
  suggestedReferences: RelationshipSuggestion[]
  entities: Record<string, string[]>
  contentType: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  internalLinks: string[]
  externalLinks: Array<{ url: string; domain: string }>
}

/**
 * Parse hierarchy context from file path
 * Supports: weaves/WEAVE/looms/LOOM/strands/STRAND.md
 */
export function parseHierarchyFromPath(filePath: string): HierarchyContext {
  const normalized = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/')
  
  const context: HierarchyContext = {
    level: 'strand',
    path: normalized,
  }
  
  // Find weave
  const weaveIdx = parts.indexOf('weaves')
  if (weaveIdx !== -1 && parts[weaveIdx + 1]) {
    context.weave = parts[weaveIdx + 1]
    context.level = 'weave'
  }
  
  // Find loom
  const loomIdx = parts.indexOf('looms')
  if (loomIdx !== -1 && parts[loomIdx + 1]) {
    context.loom = parts[loomIdx + 1]
    context.level = 'loom'
  }
  
  // Find strand
  const strandIdx = parts.indexOf('strands')
  if (strandIdx !== -1 && parts[strandIdx + 1]) {
    context.strand = parts[strandIdx + 1].replace(/\.md$/, '')
    context.level = 'strand'
  } else if (normalized.endsWith('.md')) {
    context.strand = parts[parts.length - 1].replace(/\.md$/, '')
    context.level = 'strand'
  }
  
  // Determine parent path
  if (context.level === 'strand' && parts.length > 1) {
    context.parentPath = parts.slice(0, -1).join('/')
  } else if (context.level === 'loom') {
    context.parentPath = parts.slice(0, loomIdx + 2).join('/')
  }
  
  // Create sibling pattern for finding related documents
  if (context.parentPath) {
    context.siblingPattern = `${context.parentPath}/*.md`
  }
  
  return context
}

/**
 * Suggest prerequisites based on hierarchy and content analysis
 */
export function suggestPrerequisites(
  content: string,
  hierarchy: HierarchyContext,
  existingIndex: Array<{ path: string; metadata?: Record<string, any> }> = []
): RelationshipSuggestion[] {
  const suggestions: RelationshipSuggestion[] = []
  
  // 1. Extract internal links from content - these are explicit references
  const internalLinks = extractInternalLinks(content)
  for (const link of internalLinks) {
    // Find in index
    const match = existingIndex.find(e => 
      e.path.includes(link) || e.path.endsWith(`${link}.md`)
    )
    if (match) {
      suggestions.push({
        path: match.path,
        type: 'reference',
        confidence: 0.9,
        reason: 'Explicitly linked in content',
      })
    }
  }
  
  // 2. Find same-loom siblings (related strands in same loom)
  if (hierarchy.loom && hierarchy.parentPath) {
    const siblings = existingIndex.filter(e => 
      e.path.startsWith(hierarchy.parentPath!) &&
      e.path !== hierarchy.path &&
      e.path.endsWith('.md')
    )
    
    // Check for "intro", "overview", "getting-started" patterns
    for (const sibling of siblings) {
      const siblingName = sibling.path.split('/').pop()?.replace('.md', '') || ''
      
      if (['intro', 'introduction', 'overview', 'getting-started', 'basics', 'fundamentals'].some(
        pattern => siblingName.toLowerCase().includes(pattern)
      )) {
        suggestions.push({
          path: sibling.path,
          type: 'prerequisite',
          confidence: 0.8,
          reason: `Introduction/overview in same loom (${hierarchy.loom})`,
        })
      }
    }
  }
  
  // 3. Find parent loom/weave README or index
  if (hierarchy.weave) {
    const parentReadme = existingIndex.find(e => 
      e.path.includes(`weaves/${hierarchy.weave}`) &&
      (e.path.endsWith('README.md') || e.path.endsWith('index.md'))
    )
    if (parentReadme && parentReadme.path !== hierarchy.path) {
      suggestions.push({
        path: parentReadme.path,
        type: 'prerequisite',
        confidence: 0.7,
        reason: `Parent weave documentation`,
      })
    }
  }
  
  // 4. Content-based prerequisite detection
  const prereqPatterns = [
    /assumes (familiarity|knowledge|understanding) (of|with) ([^.]+)/gi,
    /you should (first )?(?:read|understand|know|be familiar with) ([^.]+)/gi,
    /prerequisite[s]?:?\s*([^.]+)/gi,
    /before (reading|starting|using) this[^.]*,\s*([^.]+)/gi,
    /requires ([^.]+)/gi,
  ]
  
  for (const pattern of prereqPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const prereqText = match[match.length - 1] || match[1]
      if (prereqText) {
        // Try to match against existing index
        const cleanText = prereqText.toLowerCase().trim()
        const matchedDoc = existingIndex.find(e => {
          const docName = e.path.split('/').pop()?.replace('.md', '').toLowerCase() || ''
          const docTitle = e.metadata?.title?.toLowerCase() || ''
          return cleanText.includes(docName) || cleanText.includes(docTitle)
        })
        
        if (matchedDoc) {
          suggestions.push({
            path: matchedDoc.path,
            type: 'prerequisite',
            confidence: 0.85,
            reason: `Mentioned as prerequisite: "${prereqText.slice(0, 50)}"`,
          })
        }
      }
    }
  }
  
  // 5. Difficulty-based suggestions (advanced content should reference intermediate)
  const reading = analyzeReadingLevel(content)
  if (reading.level === 'advanced') {
    // Find intermediate-level content in same weave
    const intermediateContent = existingIndex.filter(e => {
      if (!hierarchy.weave || !e.path.includes(hierarchy.weave)) return false
      const difficulty = e.metadata?.difficulty || e.metadata?.autoGenerated?.difficulty
      return difficulty === 'intermediate'
    })
    
    for (const doc of intermediateContent.slice(0, 3)) {
      suggestions.push({
        path: doc.path,
        type: 'prerequisite',
        confidence: 0.6,
        reason: 'Intermediate-level content in same weave',
      })
    }
  }
  
  // Deduplicate and sort by confidence
  const uniqueSuggestions = suggestions.reduce((acc, curr) => {
    const existing = acc.find(s => s.path === curr.path)
    if (existing) {
      if (curr.confidence > existing.confidence) {
        Object.assign(existing, curr)
      }
    } else {
      acc.push(curr)
    }
    return acc
  }, [] as RelationshipSuggestion[])
  
  return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Infer tags from hierarchy context
 */
export function inferTagsFromHierarchy(
  hierarchy: HierarchyContext,
  existingIndex: Array<{ path: string; metadata?: Record<string, any> }> = []
): string[] {
  const tags: Set<string> = new Set()
  
  // Add hierarchy names as tags
  if (hierarchy.weave) {
    tags.add(hierarchy.weave.toLowerCase())
  }
  if (hierarchy.loom) {
    tags.add(hierarchy.loom.toLowerCase())
  }
  
  // Find common tags from siblings in same loom
  if (hierarchy.parentPath) {
    const siblings = existingIndex.filter(e => 
      e.path.startsWith(hierarchy.parentPath!) &&
      e.path !== hierarchy.path
    )
    
    // Count tag frequency among siblings
    const tagCounts: Record<string, number> = {}
    for (const sibling of siblings) {
      const siblingTags = sibling.metadata?.tags || []
      for (const tag of siblingTags) {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      }
    }
    
    // Add tags that appear in >50% of siblings
    const threshold = siblings.length / 2
    for (const [tag, count] of Object.entries(tagCounts)) {
      if (count >= threshold) {
        tags.add(tag)
      }
    }
  }
  
  return Array.from(tags)
}

/**
 * Full document analysis with hierarchy awareness
 * Call this when importing, adding, or creating new documents
 */
export function analyzeDocumentWithHierarchy(
  content: string,
  filePath: string,
  existingIndex: Array<{ path: string; metadata?: Record<string, any> }> = []
): DocumentAnalysis {
  // Parse hierarchy
  const hierarchy = parseHierarchyFromPath(filePath)
  
  // Extract entities
  const entities = extractTechEntities(content)
  
  // Suggest tags (combine content-based and hierarchy-based)
  const contentTags = suggestTags(content)
  const hierarchyTags = inferTagsFromHierarchy(hierarchy, existingIndex)
  const suggestedTags = [...new Set([...hierarchyTags, ...contentTags])].slice(0, 15)
  
  // Analyze content type
  const { primary: contentType } = classifyContentType(content)
  
  // Analyze difficulty
  const { level: difficulty } = analyzeReadingLevel(content)
  
  // Extract links
  const internalLinks = extractInternalLinks(content)
  const externalLinks = extractExternalLinks(content)
  
  // Suggest prerequisites (hierarchy-aware)
  const suggestedPrerequisites = suggestPrerequisites(content, hierarchy, existingIndex)
    .filter(s => s.type === 'prerequisite')
  
  // Suggest references (from internal links and related content)
  const suggestedReferences = suggestPrerequisites(content, hierarchy, existingIndex)
    .filter(s => s.type === 'reference' || s.type === 'seeAlso')
  
  return {
    hierarchy,
    suggestedTags,
    suggestedPrerequisites,
    suggestedReferences,
    entities,
    contentType,
    difficulty,
    internalLinks,
    externalLinks,
  }
}

// ==================== Export All ====================

// Re-export auto-tagging module
export * from './autoTagging'

export const NLP = {
  // Entity extraction
  extractTechEntities,
  extractKeywords,
  suggestTags,
  extractEntities,
  extractEntitiesAsync,
  extractNgrams,
  
  // Content analysis
  classifyContentType,
  analyzeReadingLevel,
  calculateContentHealth,
  
  // Link extraction
  extractInternalLinks,
  extractExternalLinks,
  
  // Summary generation
  generateExtractiveSummary,
  generateSummary,
  generateSummaryAsync,
  parseMarkdownBlocks,
  generateBlockExtractiveSummary,
  generateBlockSummaries,
  generateParagraphSummaries,
  extractKeyPhrasesAsync,
  
  // Hierarchy-aware analysis
  parseHierarchyFromPath,
  suggestPrerequisites,
  inferTagsFromHierarchy,
  analyzeDocumentWithHierarchy,
  
  // Compromise.js initialization
  initializeNLP,
}

export default NLP

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS FROM SUBMODULES
// ═══════════════════════════════════════════════════════════════════════════

// Block worthiness calculation
export {
  calculateBlockWorthiness,
  calculateAllBlockWorthiness,
  filterWorthyBlocks,
  calculateTopicShift,
  calculateEntityDensity,
  calculateSemanticNovelty,
  DEFAULT_WORTHINESS_WEIGHTS,
  DEFAULT_WORTHINESS_THRESHOLD,
} from './blockWorthiness'

// Tag bubbling
export {
  aggregateBlockTags,
  applyBubbledTags,
  shouldTagBubble,
  getBubblingStats,
  processTagBubbling,
  formatBubblingResults,
  DEFAULT_BUBBLING_CONFIG,
  type BubbledTag,
  type TagBubblingConfig,
} from './tagBubbling'

// Auto-tagging
export {
  autoTagDocument,
  suggestTagsNLP,
  suggestBlockTagsNLP,
  getBlockIllustration,
  suggestCategory,
  buildDocumentTagPrompt,
  DEFAULT_AUTO_TAG_CONFIG,
  DOCUMENT_TAGGING_SYSTEM_PROMPT,
  type TagSuggestion,
  type AutoTagResult,
  type TagContext,
  type CategorySuggestion,
} from './autoTagging'

// Block processor pipeline
export {
  processStrandBlocks,
  processStrandBlocksBatch,
  reprocessStrandBlocks,
  aggregateProcessingStats,
  type BlockProcessingOptions,
  type ProcessedBlock,
  type BlockProcessingResult,
  type BlockProcessingStats,
} from './blockProcessor'

// ═══════════════════════════════════════════════════════════════════════════
// JOB PROCESSOR REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════

import { registerJobProcessor } from '@/lib/jobs/jobQueue'
import {
  blockTaggingProcessor,
  bulkBlockTaggingProcessor,
} from '@/lib/jobs/processors/blockTagging'

let blockTaggingProcessorsRegistered = false

/**
 * Initialize and register block tagging job processors.
 * Call this at app startup to enable block tagging background jobs.
 */
export function initializeBlockTagging(): void {
  if (blockTaggingProcessorsRegistered) return

  registerJobProcessor('block-tagging', blockTaggingProcessor)
  registerJobProcessor('bulk-block-tagging', bulkBlockTaggingProcessor)

  blockTaggingProcessorsRegistered = true
  console.log('[NLP] Block tagging processors registered')
}