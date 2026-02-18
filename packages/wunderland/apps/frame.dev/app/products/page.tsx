import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Cpu, Brain, Shield, Briefcase, User, Grid3X3, Sparkles, GitBranch, Building2, Lock } from 'lucide-react'

export const metadata = {
  title: 'Products | Frame.dev – OS for Humans and Superintelligence',
  description:
    'Explore Frame.dev products: Quarry Codex, OpenStrand, AgentOS, and the upcoming Superintelligence Computer—AI infrastructure for agents, knowledge graphs, and superintelligence.',
  openGraph: {
    title: 'Frame.dev Products – AI Infrastructure for Agents and Superintelligence',
    description:
      'From personal knowledge management to superintelligent computing, discover Quarry Codex, OpenStrand, AgentOS, and the Frame OS suite.',
  },
}

export default function ProductsPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* Hero Section */}
      <section className="px-6 pt-24 pb-16 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Frame.dev Products
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 max-w-3xl mx-auto">
            Building adaptive AI intelligence that is emergent and permanent
          </p>
        </div>

        {/* Product Grid */}
        <div className="grid gap-8 mt-16">
          {/* OpenStrand */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-purple-600 mb-4">
                  <Brain className="w-6 h-6" />
                  <span className="font-semibold">AI-Native PKMS</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">OpenStrand</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Personal knowledge management reimagined for the AI era. Local-first architecture with semantic search, AI chat, and knowledge graphs.
                </p>
                <ul className="space-y-2 mb-8 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Import from 20+ formats including Notion, Obsidian, Roam</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>AI-powered search and knowledge synthesis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Local-first with optional encrypted cloud sync</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-purple-600 mt-1 flex-shrink-0" />
                    <span><strong>End-to-end encryption</strong>: AES-256-GCM with device-bound keys</span>
                  </li>
                </ul>
                <div className="flex gap-4">
                  <Link
                    href="https://openstrand.ai"
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors inline-flex items-center gap-2"
                  >
                    Visit OpenStrand
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/wiki/openstrand"
                    className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg font-medium hover:bg-purple-50 transition-colors"
                  >
                    Documentation
                  </Link>
                </div>
              </div>
              <div className="relative h-80 hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-blue-400 rounded-xl opacity-20 blur-3xl"></div>
                <img 
                  src="/logos/openstrand-logo.svg" 
                  alt="OpenStrand"
                  className="relative w-full h-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* Quarry Codex */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="order-2 md:order-1 relative h-80 hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-emerald-400 rounded-xl opacity-20 blur-3xl"></div>
                <div className="relative w-full h-full flex items-center justify-center">
                  <GitBranch className="w-48 h-48 text-green-600 opacity-50" />
                </div>
              </div>
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-2 text-green-600 mb-4">
                  <GitBranch className="w-6 h-6" />
                  <span className="font-semibold">Open Knowledge Repository</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Quarry Codex</h2>
                <p className="text-lg text-gray-700 mb-6">
                  The codex of humanity for LLM knowledge retrieval. Open-source, structured knowledge with <strong>fully client-side AI</strong>—no servers required.
                </p>
                <ul className="space-y-2 mb-8 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span><strong>Embedded Deep Learning</strong>: BERT, semantic search, and NLP running entirely in your browser</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span><strong>Host FREE on GitHub Pages</strong>: Fork, customize, deploy with GitHub Actions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span><strong>BYOK LLM Integration</strong>: Optional API keys for Claude, GPT, Mistral, or local Ollama</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Hierarchical organization: Weaves → Looms → Strands with Git-based version control</span>
                  </li>
                </ul>
                <div className="flex gap-4">
                  <Link
                    href="/quarry"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                  >
                    Browse Codex
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="https://github.com/framersai/codex"
                    className="px-6 py-3 border border-green-600 text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                  >
                    GitHub
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* AgentOS */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 md:p-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 text-blue-600 mb-4">
                  <Cpu className="w-6 h-6" />
                  <span className="font-semibold">Adaptive Agent Platform</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">AgentOS</h2>
                <p className="text-lg text-gray-700 mb-6">
                  Operating system for AI agents. Build, deploy, and manage autonomous agents with built-in safety and resource management.
                </p>
                <ul className="space-y-2 mb-8 text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Secure sandboxed execution environment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Tool permissions and resource limits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>Multi-agent orchestration and communication</span>
                  </li>
                </ul>
                <div className="flex gap-4">
                  <Link
                    href="https://agentos.sh"
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                  >
                    Visit AgentOS
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="https://github.com/framersai/agentos"
                    className="px-6 py-3 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
                  >
                    GitHub
                  </Link>
                </div>
              </div>
              <div className="relative h-80 hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl opacity-20 blur-3xl"></div>
                <img 
                  src="/logos/agentos-icon.svg" 
                  alt="AgentOS"
                  className="relative w-full h-full object-contain p-12"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frame OS Suite */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Frame OS Suite</h2>
          <p className="text-lg text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            Specialized operating systems for every aspect of your digital life
          </p>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Link
              href="https://safeos.sh"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow block group"
            >
              <div className="flex items-start justify-between mb-4">
                <Shield className="w-8 h-8 text-indigo-600" />
                <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 rounded-full">LIVE</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-indigo-600 transition-colors">SafeOS</h3>
              <p className="text-gray-600 text-sm mb-3">
                Local AI care & security that runs 100% offline. Monitor loved ones and home—free forever.
              </p>
              <p className="text-xs text-indigo-600 font-medium">
                Part of Frame&apos;s nonprofit initiative for superintelligence benefiting society
              </p>
            </Link>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Briefcase className="w-8 h-8 text-orange-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">WorkOS</h3>
              <p className="text-gray-600 text-sm mb-4">
                Project and CRM platform with AI-powered automation
              </p>
              <span className="text-xs text-gray-500">Status: Planning</span>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <User className="w-8 h-8 text-pink-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">MyOS</h3>
              <p className="text-gray-600 text-sm mb-4">
                Universal dashboard for your entire digital existence
              </p>
              <span className="text-xs text-gray-500">Status: Concept</span>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Grid3X3 className="w-8 h-8 text-yellow-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">WebOS</h3>
              <p className="text-gray-600 text-sm mb-4">
                Universal web framework denoising the internet
              </p>
              <span className="text-xs text-gray-500">Status: Research</span>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Building2 className="w-8 h-8 text-teal-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">HomeOS</h3>
              <p className="text-gray-600 text-sm mb-4">
                Smart home platform with privacy-first architecture
              </p>
              <span className="text-xs text-gray-500">Status: Research</span>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <Sparkles className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">More Coming</h3>
              <p className="text-gray-600 text-sm mb-4">
                New Frame OS products in development
              </p>
              <span className="text-xs text-gray-500">Status: Future</span>
            </div>
          </div>
        </div>
      </section>

      {/* Superintelligence Computer */}
      <section className="px-6 py-16 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm text-emerald-200 mb-4">
            Quietly in development in the background.
          </p>

          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            The Superintelligence Computer
          </h2>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            We&apos;re building the upcoming superintelligence computer that ingests all of Frame for answering any questions and performing any task.
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 mt-12 text-left">
            <div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Universal Knowledge</h3>
              <p className="text-gray-400 text-sm">
                Ingests and understands the entire Quarry Codex and all connected knowledge sources
              </p>
            </div>
            
            <div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <Cpu className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Adaptive Intelligence</h3>
              <p className="text-gray-400 text-sm">
                Emergent and permanent intelligence that learns and evolves with humanity&apos;s knowledge
              </p>
            </div>
            
            <div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Any Task</h3>
              <p className="text-gray-400 text-sm">
                From answering complex questions to performing sophisticated multi-step tasks
              </p>
            </div>
          </div>
          
          <div className="mt-12">
            <Link
              href="/waitlist"
              className="px-8 py-3 bg-yellow-500 text-gray-900 rounded-lg font-medium hover:bg-yellow-400 transition-colors inline-flex items-center gap-2"
            >
              Join the Waitlist
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
