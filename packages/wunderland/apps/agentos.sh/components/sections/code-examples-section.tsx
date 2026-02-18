'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, Code2, Cpu, Database, GitBranch, Sparkles, Play, Book } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { SectionLabel } from '../ui/section-label'

interface CodeExample {
  id: string
  title: string
  description: string
  language: string
  code: string
  category: 'basic' | 'advanced' | 'integration' | 'deployment'
}

export function CodeExamplesSection() {
  const t = useTranslations('codeExamples')
  const tFooter = useTranslations('footer')

  const codeExamples: CodeExample[] = useMemo(() => ([
  {
    id: 'basic-agent',
    title: t('examples.basicAgent.title'),
    description: t('examples.basicAgent.description'),
    language: 'typescript',
    category: 'basic',
    code: `import { Agent, Memory, Tool } from '@framers/agentos'

// Define a simple calculator tool
const calculatorTool = new Tool({
  name: 'calculator',
  description: 'Performs basic math operations',
  execute: async ({ operation, a, b }) => {
    switch(operation) {
      case 'add': return a + b
      case 'multiply': return a * b
      case 'divide': return b !== 0 ? a / b : 'Error: Division by zero'
      default: return 'Unknown operation'
    }
  }
})

// Create an agent with memory and tools
const agent = new Agent({
  name: 'MathAssistant',
  model: 'gpt-4',
  memory: new Memory({ type: 'persistent' }),
  tools: [calculatorTool],
  systemPrompt: 'You are a helpful math assistant. Use the calculator tool for computations.'
})

// Run the agent
const response = await agent.run({
  message: 'What is 42 multiplied by 17?'
})

console.log(response)
// Output: "42 multiplied by 17 equals 714."`
  },
  {
    id: 'gmi-roles',
    title: t('examples.gmiRoles.title'),
    description: t('examples.gmiRoles.description'),
    language: 'typescript',
    category: 'advanced',
    code: `import { GMI, Agency, Role } from '@framers/agentos'

// Define specialized roles
const researcherRole = new Role({
  name: 'Researcher',
  capabilities: ['web_search', 'document_analysis', 'summarization'],
  constraints: {
    maxTokens: 4000,
    allowedDomains: ['*.edu', '*.org', 'scholar.google.com']
  }
})

const writerRole = new Role({
  name: 'Writer',
  capabilities: ['content_generation', 'style_adaptation', 'editing'],
  preferences: {
    style: 'academic',
    tone: 'formal',
    citations: true
  }
})

// Create an Agency with multiple GMI instances
const researchAgency = new Agency({
  name: 'ResearchTeam',
  roles: [researcherRole, writerRole],
  workflow: {
    type: 'sequential',
    steps: [
      { role: 'Researcher', action: 'gather_information' },
      { role: 'Writer', action: 'draft_article' },
      { role: 'Researcher', action: 'fact_check' },
      { role: 'Writer', action: 'finalize' }
    ]
  }
})

// Execute complex task with the agency
const article = await researchAgency.execute({
  task: 'Write a comprehensive article about quantum computing applications',
  requirements: {
    length: 2000,
    includeReferences: true,
    targetAudience: 'technical professionals'
  }
})

console.log(article.content)
console.log('References:', article.references)`
  },
  {
    id: 'memory-system',
    title: t('examples.memorySystem.title'),
    description: t('examples.memorySystem.description'),
    language: 'typescript',
    category: 'advanced',
    code: `import { Agent, VectorMemory, EpisodicMemory, WorkingMemory } from '@framers/agentos'

// Configure multi-tier memory system
const memorySystem = {
  working: new WorkingMemory({
    capacity: 10, // Keep last 10 interactions
    ttl: 3600 // 1 hour time-to-live
  }),

  episodic: new EpisodicMemory({
    storage: 'postgresql',
    connectionString: process.env.DATABASE_URL,
    compressionThreshold: 100 // Compress after 100 messages
  }),

  vector: new VectorMemory({
    provider: 'pinecone',
    apiKey: process.env.PINECONE_API_KEY,
    index: 'agent-knowledge',
    dimensions: 1536
  })
}

// Create agent with advanced memory
const agent = new Agent({
  name: 'PersistentAssistant',
  memory: memorySystem,

  // Memory-aware processing
  beforeProcess: async (input) => {
    // Search relevant past interactions
    const context = await memorySystem.vector.search(input, { limit: 5 })

    // Load recent working memory
    const recent = await memorySystem.working.getRecent()

    return {
      input,
      context: [...context, ...recent]
    }
  },

  afterProcess: async (input, output) => {
    // Store in appropriate memory tier
    await memorySystem.working.add({ input, output })

    // Index important information
    if (output.importance > 0.7) {
      await memorySystem.vector.index({
        content: output.text,
        metadata: { timestamp: Date.now(), importance: output.importance }
      })
    }
  }
})

// Agent remembers across sessions
const response = await agent.run({
  message: 'What did we discuss about project timeline last week?'
})`
  },
  {
    id: 'tool-integration',
    title: t('examples.toolIntegration.title'),
    description: t('examples.toolIntegration.description'),
    language: 'typescript',
    category: 'integration',
    code: `import { Agent, Tool, ToolRegistry } from '@framers/agentos'
import { WebBrowser, CodeInterpreter, DatabaseQuery } from '@framers/agentos-tools'

// Create custom API tool
const weatherTool = new Tool({
  name: 'weather',
  description: 'Get current weather for any location',
  parameters: {
    location: { type: 'string', required: true },
    units: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' }
  },
  execute: async ({ location, units }) => {
    const response = await fetch(
      \`https://api.weather.com/v1/current?q=\${location}&units=\${units}\`
    )
    return response.json()
  }
})

// Register multiple tools
const toolRegistry = new ToolRegistry()
toolRegistry.register(weatherTool)
toolRegistry.register(new WebBrowser({ headless: true }))
toolRegistry.register(new CodeInterpreter({ sandbox: true }))
toolRegistry.register(new DatabaseQuery({
  connection: process.env.DB_URL,
  readOnly: true
}))

// Create multi-tool agent
const agent = new Agent({
  name: 'SwissArmyAgent',
  tools: toolRegistry,

  // Tool selection strategy
  toolSelector: async (task, availableTools) => {
    // AI-driven tool selection based on task
    const analysis = await analyzeTask(task)
    return availableTools.filter(tool =>
      analysis.requiredCapabilities.includes(tool.type)
    )
  },

  // Parallel tool execution
  executionMode: 'parallel',
  maxConcurrentTools: 3
})

// Complex task using multiple tools
const result = await agent.run({
  message: 'Check the weather in Tokyo, find recent news about it, and create a travel summary'
})`
  },
  {
    id: 'skills-integration',
    title: t('examples.skillsIntegration.title'),
    description: t('examples.skillsIntegration.description'),
    language: 'typescript',
    category: 'integration',
    code: `import { searchSkills, getSkillsByCategory } from '@framers/agentos-skills-registry/catalog'
import { createCuratedManifest } from '@framers/agentos-extensions-registry'

// Browse the catalog (zero deps, works anywhere)
const devTools = getSkillsByCategory('developer-tools')
// => [{ name: 'github', ... }, { name: 'coding-agent', ... }, { name: 'git', ... }]

const matches = searchSkills('slack')
// => [{ name: 'slack-helper', category: 'communication', ... }]

// Register extensions + channels in one call
const manifest = await createCuratedManifest({
  channels: ['telegram', 'discord', 'slack'],
  tools: 'all',
})`
  },
  {
    id: 'streaming',
    title: t('examples.realtimeStream.title'),
    description: t('examples.realtimeStream.description'),
    language: 'typescript',
    category: 'advanced',
    code: `import { StreamingAgent, StreamProcessor } from '@framers/agentos/streaming'

// Configure streaming agent
const streamingAgent = new StreamingAgent({
  name: 'RealtimeAssistant',
  model: 'gpt-4',
  streaming: {
    enabled: true,
    chunkSize: 'word', // or 'sentence', 'paragraph'
    bufferSize: 100
  }
})

// Set up stream processors
const processors = [
  new StreamProcessor.TokenCounter(),
  new StreamProcessor.SentimentAnalyzer(),
  new StreamProcessor.SafetyFilter({
    blockPII: true,
    moderationLevel: 'medium'
  })
]

// Handle streaming response
streamingAgent.stream({
  message: 'Explain quantum computing in simple terms',
  onChunk: (chunk) => {
    // Process each chunk through pipeline
    const processed = processors.reduce(
      (data, processor) => processor.process(data),
      chunk
    )

    // Update UI in real-time
    updateChatInterface(processed)
  },
  onComplete: (fullResponse) => {
    console.log('Complete response:', fullResponse)
    console.log('Token count:', fullResponse.metadata.tokens)
  },
  onError: (error) => {
    console.error('Streaming error:', error)
    fallbackToNonStreaming()
  }
})`
  },
  {
    id: 'deployment',
    title: t('examples.deployment.title'),
    description: t('examples.deployment.description'),
    language: 'yaml',
    category: 'deployment',
    code: `# docker-compose.yml
version: '3.8'

services:
  agentos:
    image: framersai/agentos:latest
    environment:
      - NODE_ENV=production
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - DATABASE_URL=postgresql://postgres@db:5432/agentos
      - REDIS_URL=redis://cache:6379
      - VECTOR_DB_URL=http://vectordb:8000
    ports:
      - "3000:3000"
    depends_on:
      - db
      - cache
      - vectordb
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=agentos
      - POSTGRES_PASSWORD=<PASSWORD>
    volumes:
      - postgres_data:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  vectordb:
    image: qdrant/qdrant
    volumes:
      - qdrant_data:/qdrant/storage

  monitoring:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  postgres_data:
  redis_data:
  qdrant_data:`
  }
]), [t])
  const [activeExample, setActiveExample] = useState(codeExamples[0])
  const [activeCategory, setActiveCategory] = useState<'all' | 'basic' | 'advanced' | 'integration' | 'deployment'>('all')
  const [copied, setCopied] = useState<string | null>(null)
  const [SyntaxHighlighter, setSyntaxHighlighter] = useState<null | (typeof import('react-syntax-highlighter').Prism)>(null)
  const [syntaxTheme, setSyntaxTheme] = useState<Record<string, React.CSSProperties> | null>(null)
  const [codeViewerReady, setCodeViewerReady] = useState(false)
  
  // Auto-select first example when category changes
  useEffect(() => {
    const filtered = activeCategory === 'all' ? codeExamples : codeExamples.filter((ex) => ex.category === activeCategory)
    if (filtered.length > 0) {
      setActiveExample(filtered[0])
    }
  }, [activeCategory, codeExamples])

  // Defer loading the heavy code highlighter until after mount/idle
  useEffect(() => {
    const loadHighlighter = () => {
      Promise.all([
        import('react-syntax-highlighter').then(m => m.Prism),
        import('react-syntax-highlighter/dist/esm/styles/prism').then(m => m.vscDarkPlus)
      ]).then(([PrismComp, theme]) => {
        setSyntaxHighlighter(() => PrismComp)
        setSyntaxTheme(theme)
        setCodeViewerReady(true)
      }).catch(() => {
        // no-op fallback; keep viewer minimal if load fails
      })
    }
    if ('requestIdleCallback' in window) {
      const w = window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void }
      w.requestIdleCallback(loadHighlighter, { timeout: 1500 })
    } else {
      setTimeout(loadHighlighter, 600)
    }
  }, [])

  const categories = [
    { value: 'all' as const, label: t('categories.all'), icon: Code2, color: 'from-purple-500 to-pink-500' },
    { value: 'basic' as const, label: t('categories.basic'), icon: Code2, color: 'from-blue-500 to-cyan-500' },
    { value: 'advanced' as const, label: t('categories.advanced'), icon: Cpu, color: 'from-green-500 to-emerald-500' },
    { value: 'integration' as const, label: t('categories.integration'), icon: GitBranch, color: 'from-orange-500 to-red-500' },
    { value: 'deployment' as const, label: t('categories.deployment'), icon: Database, color: 'from-indigo-500 to-purple-500' }
  ]

  const filteredExamples = activeCategory === 'all'
    ? codeExamples
    : codeExamples.filter((ex) => ex.category === activeCategory)

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const categoryIcons = {
    basic: Code2,
    advanced: Cpu,
    integration: GitBranch,
    deployment: Database
  }

  return (
    <section id="code" className="py-8 sm:py-12 lg:py-14 px-2 sm:px-6 lg:px-8 relative overflow-hidden transition-theme" aria-labelledby="code-examples-heading">
      {/* Subtle organic gradient background */}
      <div className="absolute inset-0 organic-gradient opacity-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <SectionLabel
            icon={<Code2 className="w-4 h-4" />}
            className="mx-auto mb-6 text-sm"
          >
            {t('badge')}
          </SectionLabel>

          <h2 id="code-examples-heading" className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="gradient-text">{t('title')}</span>
          </h2>
          <p className="text-lg text-text-secondary max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Category Filter - Mobile Responsive */}
        <div className="flex justify-center mb-10 overflow-x-auto">
          <div className="inline-flex gap-2 p-1 glass-morphism rounded-2xl min-w-min">
            {categories.map((cat) => {
              const Icon = cat.icon
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-3 rounded-xl font-medium transition-all text-xs sm:text-sm whitespace-nowrap ${
                    activeCategory === cat.value
                      ? 'bg-gradient-to-r ' + cat.color + ' text-white shadow-modern'
                      : 'text-text-secondary hover:text-text-primary hover:bg-background-primary/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.split(' ')[0]}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Example List - Enhanced Blocks */}
          <div className="lg:col-span-1 space-y-4">
            <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4 px-2">
              {t('selectExample')}
            </h3>
            <div className="space-y-3">
              {filteredExamples.map((example) => {
                const Icon = categoryIcons[example.category]
                return (
                  <motion.button
                    key={example.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveExample(example)}
                    className={`w-full text-left p-4 rounded-xl transition-all relative overflow-hidden group ${
                      activeExample.id === example.id
                        ? 'bg-gradient-to-br from-[var(--color-background-elevated)] to-[var(--color-background-glass)] shadow-lg border border-[var(--color-accent-primary)]'
                        : 'bg-[var(--color-background-glass)] border border-transparent hover:border-[var(--color-border-interactive)]'
                    }`}
                  >
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-colors ${
                        activeExample.id === example.id ? 'bg-accent-primary' : 'bg-transparent group-hover:bg-accent-primary/50'
                    }`} />
                    
                    <div className="flex items-center gap-3 pl-2">
                      <div className={`p-2 rounded-lg shrink-0 ${
                        activeExample.id === example.id
                          ? 'bg-accent-primary text-white shadow-md'
                          : 'bg-accent-primary/10 text-accent-primary'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm mb-0.5 truncate ${
                            activeExample.id === example.id ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
                        }`}>
                          {example.title}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                          {example.category}
                        </p>
                      </div>
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Code Display - Much better styling */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeExample.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <div className="glass-morphism rounded-3xl overflow-hidden shadow-modern-lg h-full flex flex-col">
                {/* Header - Enhanced */}
                <div className="p-6 border-b border-border-subtle">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-2xl font-bold text-text-primary mb-2">
                        {activeExample.title}
                      </h3>
                      <p className="text-text-secondary">
                        {activeExample.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-primary/10 to-accent-secondary/10 text-xs font-bold text-accent-primary">
                        {activeExample.language}
                      </span>
                      <button
                        onClick={() => copyCode(activeExample.code, activeExample.id)}
                        className="p-2.5 rounded-lg hover:bg-accent-primary/10 transition-all group"
                        aria-label={t('copyButton')}
                      >
                        {copied === activeExample.id ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5 text-text-secondary group-hover:text-accent-primary transition-colors" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

        {/* Tabs: Synchronous vs Streaming (if applicable) */}
        <div className="px-6 pt-4 border-b border-border-subtle">
          <div className="inline-flex gap-2 rounded-2xl p-1 glass-morphism">
            <button
              onClick={() => {
                if (activeExample.id === 'streaming') {
                  // no-op, already streaming
                } else {
                  setActiveExample(codeExamples.find((e) => e.id === 'basic-agent') || activeExample)
                }
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeExample.id !== 'streaming'
                  ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-on-accent)] shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-[var(--color-background-elevated)]'
              }`}
            >
              {t('tabs.synchronous')}
            </button>
            <button
              onClick={() => {
                setActiveExample(codeExamples.find((e) => e.id === 'streaming') || activeExample)
              }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
                activeExample.id === 'streaming'
                  ? 'bg-[var(--color-accent-primary)] text-[var(--color-text-on-accent)] shadow-md'
                  : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-[var(--color-background-elevated)]'
              }`}
            >
              {t('tabs.streaming')}
            </button>
          </div>
        </div>

        {/* Code Block with Syntax Highlighting */}
        <div className="flex-1 overflow-auto bg-[#1e1e1e] max-h-[300px] sm:max-h-[400px] lg:max-h-none">
                  {codeViewerReady && SyntaxHighlighter && syntaxTheme ? (
                    <SyntaxHighlighter
                      language={activeExample.language}
                      style={syntaxTheme}
                      showLineNumbers={true}
                      customStyle={{
                        margin: 0,
                        padding: '1.5rem',
                        background: 'transparent',
                        fontSize: '0.875rem',
                      }}
                      lineNumberStyle={{
                        minWidth: '2.5rem',
                        paddingRight: '1rem',
                        color: '#6b7280',
                        userSelect: 'none',
                      }}
                    >
                      {activeExample.code}
                    </SyntaxHighlighter>
                  ) : (
                    <pre
                      aria-busy="true"
                      className="m-0 p-6 text-sm text-gray-200"
                      style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                    >
{activeExample.code}
                    </pre>
                  )}
                </div>

                {/* Footer - Interactive */}
                <div className="p-3 sm:p-4 border-t border-border-subtle bg-gradient-to-r from-accent-primary/5 to-accent-secondary/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <a
                        href={`https://playground.agentos.sh?example=${activeExample.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-accent-primary text-white text-xs sm:text-sm font-semibold hover:bg-accent-hover transition-all group"
                      >
                        <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" />
                        {t('runButton')}
                      </a>
                      <a
                        href={`https://docs.agentos.sh/examples/${activeExample.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-accent-primary text-accent-primary text-xs sm:text-sm font-semibold hover:bg-accent-primary/10 transition-all"
                      >
                        <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{t('docsButton')}</span>
                        <span className="sm:hidden">Docs</span>
                      </a>
                      <a
                        href="https://docs.agentos.sh/api"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-accent-primary text-accent-primary text-xs sm:text-sm font-semibold hover:bg-accent-primary/10 transition-all"
                      >
                        <Book className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden sm:inline">{tFooter('apiReferenceTSDoc')}</span>
                        <span className="sm:hidden">API</span>
                      </a>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent-primary animate-pulse" />
                      <span className="text-xs font-semibold text-text-muted">
                        {t(`categories.${activeExample.category}`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Quick Start CTA - Enhanced */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="relative overflow-hidden rounded-3xl glass-morphism p-12">
            <div className="absolute inset-0 bg-gradient-to-r from-accent-primary/10 via-accent-secondary/10 to-accent-tertiary/10" />

            <div className="relative z-10 text-center">
              <h3 className="text-3xl font-bold mb-4 gradient-text">
                {t('cta.title')}
              </h3>
              <p className="text-lg text-text-secondary mb-8 max-w-2xl mx-auto">
                {t('cta.description')}
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <div className="px-8 py-4 bg-[var(--color-background-elevated)] rounded-xl font-mono text-sm border-2 border-[var(--color-border-interactive)] shadow-lg">
                  <span className="text-[var(--color-text-muted)]">$</span> npm install @framers/agentos
                  <button
                    onClick={() => {
                        navigator.clipboard.writeText('npm install @framers/agentos');
                        // Use a simple alert or reuse toast if available in this context.
                        // For now, visual feedback on the button is good.
                    }}
                    className="ml-3 p-1.5 rounded-md hover:bg-[var(--color-background-secondary)] transition-colors text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    aria-label="Copy install command"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>

                <a
                  href="https://docs.agentos.sh/quickstart"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-[var(--color-text-on-accent)] shadow-lg shadow-[var(--color-accent-primary)]/20 hover:shadow-xl hover:brightness-110 transition-all duration-[var(--duration-fast)]"
                >
                  <Sparkles className="w-5 h-5" />
                  {t('cta.button')}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">{t('cta.time')}</span>
                </a>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}