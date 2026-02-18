import type { Metadata } from 'next'
import PageLayout from '@/components/page-layout'
import Link from 'next/link'
import Image from 'next/image'
import { Calendar, Clock, ArrowLeft, ExternalLink, Github } from 'lucide-react'
import { getBlogPost, getRelatedPosts } from '@/lib/blogPosts'

export const metadata: Metadata = {
  title: 'Weaves, Looms, Strands, and Fabric: A Recursive Knowledge Schema',
  description:
    'Explore the mathematical elegance of recursive knowledge structures and how they unlock powerful graph algorithms for navigation, recommendations, and semantic search.',
}

export default function RecursiveKnowledgeSchemaPage() {
  const post = getBlogPost('recursive-knowledge-schema')
  const relatedPosts = getRelatedPosts('recursive-knowledge-schema')

  if (!post) return null

  return (
    <PageLayout>
      <article className="container mx-auto px-4 max-w-3xl pt-20 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-ink-600 dark:text-paper-400 hover:text-frame-green mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 heading-display">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-600 dark:text-paper-400">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date(post.date).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {post.readTime}
            </span>
            <span>By {post.author}</span>
          </div>
        </header>

        <div className="prose prose-lg dark:prose-invert max-w-none">
          <p className="lead">
            The Quarry Codex schema (Weave → Loom → Strand) isn't just organizational sugar. 
            It's a carefully designed recursive structure that unlocks graph algorithms, enables efficient caching, 
            and maps naturally to how humans actually organize knowledge.
          </p>

          <h2>Recursion All the Way Down</h2>
          <p>
            At first glance, the hierarchy seems simple:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`Fabric
└── Weave (universe)
    └── Loom (collection)
        └── Strand (content)`}
          </pre>
          <figure className="my-8">
            <Image
              src="/diagrams/fabric-weave-loom-strand.svg"
              alt="Fabric → Weave → Loom → Strand hierarchy with cross-weave synthesis at Fabric scope"
              width={960}
              height={540}
              className="w-full h-auto rounded-xl border border-ink-200/40 dark:border-paper-800/60 bg-paper-50 dark:bg-ink-900"
              priority={false}
            />
            <figcaption className="mt-3 text-sm text-ink-600 dark:text-paper-400">
              Visualizing the Fabric hierarchy: a single Fabric composes many Weaves, each containing Looms and Strands.
              At Fabric scope, agents and superintelligence can traverse across weaves for holistic, cross-weave synthesis
              while preserving provenance.
            </figcaption>
          </figure>
          <p>
            But here's the key insight: <strong>strands can reference other strands</strong>. 
            A strand about "recursion" can link to a strand about "induction", which links to "mathematical proof", 
            which links back to "recursion". The graph is cyclic, not a tree.
          </p>
          <p>
            Looms and weaves are just <strong>metadata containers</strong> that group strands. They don't break the recursion—they 
            provide boundaries for scoped queries and caching.
          </p>

          <h2>Why Three Tiers?</h2>
          <p>
            Why not just files in folders? Why the explicit weave/loom/strand distinction?
          </p>

          <h3>1. Scoped Queries</h3>
          <p>
            When you search for "machine learning", you probably want results from the "technology" weave, 
            not the "cooking" weave. Weaves give us natural query boundaries:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Search within a weave (10-100x faster)
SELECT * FROM strands 
WHERE weave = 'technology' 
  AND content MATCH 'machine learning'

// vs global search (slow)
SELECT * FROM strands 
WHERE content MATCH 'machine learning'`}
          </pre>

          <h3>2. Hierarchical Caching</h3>
          <p>
            We cache aggregate statistics at the loom level:
          </p>
          <ul>
            <li>Total strands in loom</li>
            <li>Unique keywords (TF-IDF vectors)</li>
            <li>Average difficulty</li>
            <li>Common subjects/topics</li>
          </ul>
          <p>
            When a single strand changes, we only recompute <em>that loom's</em> stats, not the entire weave. 
            This is how we achieve 85-95% cache hit rates.
          </p>

          <h3>3. Natural Sharding</h3>
          <p>
            Each weave is independent. No cross-weave relationships. This means:
          </p>
          <ul>
            <li>Weaves can be deployed as separate microservices</li>
            <li>Horizontal scaling: add more weaves without coordination</li>
            <li>Namespace isolation: "intro.md" in weave A ≠ "intro.md" in weave B</li>
          </ul>

          <h2>Graph Algorithms Enabled</h2>
          <p>
            The recursive structure unlocks powerful graph operations:
          </p>

          <h3>Shortest Path (Concept Navigation)</h3>
          <p>
            "How do I get from 'variables' to 'closures' in the JavaScript loom?"
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Dijkstra on the strand graph
path = shortestPath(
  start: 'variables',
  end: 'closures',
  edgeWeight: (a, b) => {
    // Prefer same-loom edges
    if (a.loom === b.loom) return 1
    return 5
  }
)
// Result: variables → functions → scope → closures`}
          </pre>

          <h3>Personalized PageRank (Recommendations)</h3>
          <p>
            "Show me strands similar to what I've read, weighted by my interests."
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Bipartite graph: user ↔ strand
graph = {
  nodes: [...strands, ...users],
  edges: [
    { user: 'alice', strand: 's1', weight: 5 },  // rating
    { strand: 's1', strand: 's2', weight: 0.8 }, // similarity
  ]
}

recommendations = personalizedPageRank(
  graph,
  startNode: 'alice',
  dampingFactor: 0.85
)`}
          </pre>

          <h3>Community Detection (Auto-Loom Suggestions)</h3>
          <p>
            "Which strands should be grouped into a new loom?"
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Louvain algorithm on strand similarity graph
communities = detectCommunities(strandGraph)
// Suggests: "These 15 strands about 'React hooks' 
// should become a new loom"`}
          </pre>

          <h2>Fabric: The Materialized View</h2>
          <p>
            When you union all weaves together, you get the <strong>fabric</strong>—the complete knowledge graph. 
            This is what OpenStrand operates on when doing cross-domain queries:
          </p>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Find connections between cooking and chemistry
path = shortestPath(
  start: 'weaves/cooking/looms/techniques/strands/emulsification.md',
  end: 'weaves/science/looms/chemistry/strands/molecular-bonds.md',
  graph: fabric
)
// Discovers: emulsification → lipids → molecular-bonds`}
          </pre>
          <p>
            The fabric is expensive to materialize (O(n²) for relationship edges), so we only do it for specific queries. 
            Most operations stay within a single weave or loom.
          </p>

          <h2>Recommendations with Ratings</h2>
          <p>
            You asked about movie/book recommendations. Here's how it works with strands:
          </p>

          <h3>Data Model</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// User ratings (stored in OpenStrand, not Codex)
ratings = [
  { user: 'alice', strand: 'recursion-intro', score: 5 },
  { user: 'alice', strand: 'functional-programming', score: 4 },
  { user: 'bob', strand: 'recursion-intro', score: 5 },
]

// LLM-generated similarity (stored in Codex metadata)
similarities = [
  { strand_a: 'recursion-intro', strand_b: 'induction', score: 0.85 },
  { strand_a: 'recursion-intro', strand_b: 'loops', score: 0.60 },
]`}
          </pre>

          <h3>Collaborative Filtering</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Find users similar to Alice
similarUsers = users
  .filter(u => cosineSimilarity(u.ratings, alice.ratings) > 0.7)

// Recommend strands they liked that Alice hasn't seen
recommendations = similarUsers
  .flatMap(u => u.ratings)
  .filter(r => !alice.ratings.includes(r.strand))
  .sort((a, b) => b.score - a.score)`}
          </pre>

          <h3>Graph Walk</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg">
{`// Start from Alice's highest-rated strand
startStrand = 'recursion-intro'

// Walk the similarity graph
recommendations = breadthFirstSearch(
  start: startStrand,
  maxDepth: 2,
  edgeFilter: (edge) => edge.score > 0.7,
  nodeFilter: (node) => !alice.hasRead(node)
)`}
          </pre>

          <h2>Why This Matters</h2>
          <p>
            Most knowledge bases are flat. You search, you get results, done. 
            Quarry Codex is a <strong>graph</strong>. Every strand is a node, every reference is an edge. 
            This unlocks:
          </p>
          <ul>
            <li><strong>Concept navigation</strong>: "Explain X assuming I know Y"</li>
            <li><strong>Learning paths</strong>: Shortest path from beginner to expert</li>
            <li><strong>Knowledge gaps</strong>: Missing edges = content opportunities</li>
            <li><strong>Semantic clustering</strong>: Auto-discover related content</li>
          </ul>

          <p>
            And because it's all git-native, you can fork the entire fabric, experiment with new algorithms, 
            and PR your improvements back upstream.
          </p>

          <div className="mt-12 p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h3 className="text-xl font-bold mb-3">Explore the Code</h3>
            <div className="space-y-2">
              <a 
                href="https://github.com/framersai/quarry/blob/main/scripts/cache-db.js"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <Github className="w-4 h-4" />
                SQL Cache Implementation
                <ExternalLink className="w-3 h-3" />
              </a>
              <a 
                href="https://github.com/framersai/quarry/blob/main/scripts/auto-index.js"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                <Github className="w-4 h-4" />
                NLP Indexer
                <ExternalLink className="w-3 h-3" />
              </a>
              <Link 
                href="/quarry/architecture"
                className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
              >
                Interactive Architecture Diagram →
              </Link>
            </div>
          </div>
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-16 pt-8 border-t border-ink-200 dark:border-paper-800">
            <h3 className="text-2xl font-bold mb-6">Related Posts</h3>
            <div className="grid gap-6 md:grid-cols-2">
              {relatedPosts.map((relatedPost) => (
                <Link
                  key={relatedPost.slug}
                  href={`/blog/${relatedPost.slug}`}
                  className="paper-card p-6 hover:shadow-xl transition-shadow"
                >
                  <h4 className="font-bold text-lg mb-2 text-ink-900 dark:text-paper-100">
                    {relatedPost.title}
                  </h4>
                  <p className="text-sm text-ink-600 dark:text-paper-400 mb-3">
                    {relatedPost.excerpt}
                  </p>
                  <span className="text-xs text-frame-green font-semibold">
                    Read more →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </PageLayout>
  )
}

