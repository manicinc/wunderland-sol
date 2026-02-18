import { Metadata } from 'next'
import QuarryPageLayout from '@/components/quarry/QuarryPageLayout'
import CodexArchitectureDiagram from '@/components/codex-architecture-diagram'
import ToolPageLeftSidebar from '@/components/quarry/ui/sidebar/ToolPageLeftSidebar'
import Link from 'next/link'
import Image from 'next/image'
import { Book, Layers, FileText, ArrowRight, Sparkles, Shield, Lock, Key } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Quarry Codex Architecture – Fabric, Weaves, Looms & Strands',
  description: 'Visual guide to the Fabric hierarchy: how Fabric composes Weaves, and Weaves contain Looms and Strands for holistic, cross-weave synthesis by superintelligence.',
}

export default function CodexArchitecturePage() {
  return (
    <QuarryPageLayout
      forceSidebarSmall={true}
      leftPanelContent={
        <ToolPageLeftSidebar
          isDark={true}
          title="Architecture"
          description="Learn about the Fabric, Weaves, Looms, and Strands hierarchy."
          tips={[
            'Fabric is the entire knowledge corpus',
            'Weaves are isolated knowledge universes',
            'Strands are the atomic knowledge units'
          ]}
          relatedLinks={[
            { href: '/quarry/api-playground', label: 'API Playground', icon: 'Code2' },
            { href: '/quarry/changelog', label: 'Changelog', icon: 'History' },
            { href: '/quarry', label: 'Browse Codex', icon: 'Book' },
          ]}
        />
      }
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Architecture Guide
          </div>
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-500 via-purple-600 to-cyan-500 bg-clip-text text-transparent">
            The Fabric of Knowledge
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Understanding how <strong>Fabric</strong>, <strong>Weaves</strong>, <strong>Looms</strong>, and <strong>Strands</strong> compose the Codex—so superintelligence can traverse across weaves and synthesize knowledge as a whole.
          </p>
        </div>

        {/* Interactive Visualization */}
        <CodexArchitectureDiagram />

        {/* Static Diagram (SVG) */}
        <div className="mt-10 flex justify-center">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-4">
            <Image
              src="/diagrams/fabric-weave-loom-strand.svg"
              alt="Fabric → Weave → Loom → Strand architecture diagram"
              width={960}
              height={540}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Detailed Explanation */}
        <div className="mt-16 grid gap-12 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <Book className="w-5 h-5 text-purple-600" />
                </div>
                The Hierarchy
              </h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                Quarry Codex uses a simple yet powerful <strong>four-tier</strong> hierarchy to organize all knowledge. 
                Each layer serves a specific purpose and enables different types of relationships and queries.
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800">
              <h3 className="font-bold text-lg mb-3 text-amber-900 dark:text-amber-100">Fabric: The Whole</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                A <strong>Fabric</strong> is a collection of weaves—an entire knowledge corpus viewed as one living whole. 
                The Quarry Codex itself is a fabric. Operating at fabric scope allows agents and superintelligence to move seamlessly
                <em> across weaves</em>, aggregating and synthesizing information holistically.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Example:</div>
                <pre className="text-xs text-gray-700 dark:text-gray-300">
{`fabric: Quarry Codex
├─ weave: frame        (Frame ecosystem)
├─ weave: wiki         (Meta-docs, governance)
└─ weave: technology   (Technical knowledge)`}
                </pre>
              </div>
              <div className="mt-4 p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  <strong>Superintelligence Mode:</strong> At fabric scope, retrieval and reasoning can traverse any weave boundary with provenance preserved.
                </p>
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-6 border border-purple-200 dark:border-purple-800">
              <h3 className="font-bold text-lg mb-3 text-purple-900 dark:text-purple-100">Weave: The Universe</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                A Weave is a complete, self-contained knowledge universe. Think of it as a separate dimension where 
                all knowledge is related, but nothing connects to other weaves.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Example Structure:</div>
                <pre className="text-xs text-gray-700 dark:text-gray-300">
{`weaves/
  frame/          ← Frame ecosystem weave
    weave.yaml
    looms/
      openstrand/
      agentos/
  science/        ← Separate science weave
    weave.yaml
    looms/
      physics/
      biology/`}
                </pre>
              </div>
              <div className="mt-4 p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <p className="text-xs text-purple-900 dark:text-purple-200">
                  <strong>Key Rule:</strong> No relationships exist between different weaves. 
                  This ensures clean boundaries and prevents knowledge pollution.
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <h3 className="font-bold text-lg mb-3 text-blue-900 dark:text-blue-100">Loom: The Collection</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                A Loom curates related strands into a cohesive topic or learning path. It defines how strands 
                connect and in what order they should be consumed.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Example loom.yaml:</div>
                <pre className="text-xs text-gray-700 dark:text-gray-300">
{`slug: getting-started
title: Getting Started
summary: Essential guides for new users
ordering:
  type: sequential
  items:
    - installation
    - hello-world
    - core-concepts`}
                </pre>
              </div>
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  <strong>Ordering Types:</strong> Sequential (linear path), Hierarchical (tree), or Network (graph)
                </p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-6 border border-green-200 dark:border-green-800">
              <h3 className="font-bold text-lg mb-3 text-green-900 dark:text-green-100">Strand: The Unit</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                A Strand is the atomic unit of knowledge. It can be a markdown document, image, dataset, 
                code snippet, or any content type. Each strand is immutable and versioned.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="text-xs text-gray-500 mb-2">Example frontmatter:</div>
                <pre className="text-xs text-gray-700 dark:text-gray-300">
{`---
id: 550e8400-e29b-41d4-a716-446655440000
slug: architecture-overview
title: Architecture Overview
summary: System design and patterns
version: 1.0.0
difficulty: intermediate
relationships:
  requires:
    - core-concepts
  references:
    - api-reference
---`}
                </pre>
              </div>
              <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <p className="text-xs text-green-900 dark:text-green-200">
                  <strong>Relationships:</strong> Strands can require prerequisites, reference related content, 
                  and link to external resources.
                </p>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-6 border border-orange-200 dark:border-orange-800">
              <h3 className="font-bold text-lg mb-3">Why This Matters</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">1</div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">For LLMs:</strong>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Structured metadata enables precise retrieval. LLMs can navigate prerequisites, 
                      understand context, and extract exactly what they need.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">2</div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">For Humans:</strong>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Clear organization makes browsing intuitive. Follow learning paths, discover connections, 
                      and explore topics systematically.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">3</div>
                  <div>
                    <strong className="text-gray-900 dark:text-white">For Scale:</strong>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      Weaves isolate domains, preventing complexity explosion. Each weave can grow infinitely 
                      without affecting others.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl p-6 border border-cyan-200 dark:border-cyan-800">
              <h3 className="font-bold text-lg mb-3 text-cyan-900 dark:text-cyan-100 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                End-to-End Encryption
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                All local data is encrypted with <strong>AES-256-GCM</strong> using device-bound keys.
                Your knowledge remains private—even if your storage is compromised.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                    <Key className="w-3.5 h-3.5" />
                    <span>Device key auto-generated on first use</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Encrypted at rest in IndexedDB/localStorage</span>
                  </div>
                  <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Zero-knowledge: keys never leave your device</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-cyan-200 dark:border-cyan-800">
                <Link
                  href="/encryption"
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center gap-2"
                >
                  Learn about Frame encryption
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
              <h3 className="font-bold text-lg mb-3">Real-World Example</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                The Frame ecosystem weave contains everything about Frame.dev products:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Book className="w-4 h-4" />
                  <span className="font-medium">Weave:</span>
                  <code className="bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded">frame</code>
                </div>
                <div className="ml-6 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Layers className="w-4 h-4" />
                  <span className="font-medium">Loom:</span>
                  <code className="bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">openstrand</code>
                </div>
                <div className="ml-12 flex items-center gap-2 text-green-600 dark:text-green-400">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">Strand:</span>
                  <code className="bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">architecture.md</code>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Link 
                  href="/quarry/weaves/frame/looms/openstrand/strands/architecture"
                  className="text-sm text-cyan-600 hover:text-cyan-700 font-medium inline-flex items-center gap-2"
                >
                  View this example in Codex
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-16 text-center bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl p-12 text-white space-y-6">
          <h2 className="text-3xl font-bold">Ready to Explore?</h2>
          <p className="text-lg text-purple-100 max-w-3xl mx-auto">
            Dive into the free community edition or reserve a Lifetime license with sovereign storage, private exports,
            and premium tooling.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link 
              href="/quarry"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
            >
              Browse Codex
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="https://github.com/framersai/codex"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Download Free Edition
            </Link>
            <Link 
              href="/quarry/waitlist"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Lifetime Edition Waitlist
            </Link>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-16 prose prose-lg dark:prose-invert max-w-none">
          <h2>Technical Implementation</h2>
          <p>
            The Weave/Loom/Strand architecture is implemented as a file-based system on GitHub, 
            making it transparent, versionable, and accessible to both humans and machines.
          </p>

          <h3>File Structure</h3>
          <p>
            Each primitive maps to a specific file structure:
          </p>
          <ul>
            <li><strong>Fabric</strong>: Entire repository (multiple weaves), represented by the repo itself</li>
            <li><strong>Weave</strong>: Directory with <code>weave.yaml</code> manifest</li>
            <li><strong>Loom</strong>: Subdirectory with <code>loom.yaml</code> manifest</li>
            <li><strong>Strand</strong>: Individual file with YAML frontmatter</li>
          </ul>

          <h3>Metadata & Search</h3>
          <p>
            Every commit triggers auto-indexing that:
          </p>
          <ul>
            <li>Extracts keywords using TF-IDF algorithm</li>
            <li>Categorizes content with NLP</li>
            <li>Validates schema compliance</li>
            <li>Builds searchable index</li>
            <li>Generates relationship graph</li>
          </ul>

          <h3>For Developers</h3>
          <p>
            Access the knowledge programmatically:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
{`// Fetch a specific strand
const response = await fetch(
  'https://raw.githubusercontent.com/framersai/quarry/main/' +
  'weaves/frame/looms/openstrand/strands/architecture.md'
);
const content = await response.text();

// Or use the Frame API
const data = await fetch(
  'https://api.frame.dev/v1/strands/openstrand-architecture'
);`}
          </pre>

          <h3>Learn More</h3>
          <div className="grid gap-4 md:grid-cols-2 not-prose">
            <Link 
              href="https://github.com/framersai/quarry/blob/main/docs/openstrand-architecture.md"
              className="block p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
            >
              <h4 className="font-semibold mb-2">OpenStrand Architecture</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deep dive into the technical architecture
              </p>
            </Link>
            <Link 
              href="https://github.com/framersai/quarry/blob/main/docs/schema-reference.md"
              className="block p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors"
            >
              <h4 className="font-semibold mb-2">Schema Reference</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete schema documentation with examples
              </p>
            </Link>
          </div>

          <h3>Deployment & Editions</h3>
          <p>
            The open-source edition is free forever—fork it and deploy to GitHub Pages or any static host. The optional
            Lifetime Edition adds sovereign storage (S3, Postgres, Snowflake, air-gapped file drops), scheduled exports,
            encrypted offline bundles, and premium governance tooling for teams that need to keep data off of GitHub.
            <Link href="/quarry/waitlist" className="ml-1 text-purple-600 font-semibold hover:underline">
              Join the waitlist
            </Link>{' '}
            to reserve one-time pricing, or
            <Link href="https://github.com/framersai/codex" className="ml-1 text-purple-600 font-semibold hover:underline">
              download the free edition
            </Link>{' '}
            today.
          </p>
        </div>
      </div>
    </QuarryPageLayout>
  )
}
