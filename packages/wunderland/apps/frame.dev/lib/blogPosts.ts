export type BlogPostMeta = {
  slug: string
  title: string
  excerpt: string
  description: string
  date: string
  readTime: string
  author: string
  featured?: boolean
}

export const blogPosts: BlogPostMeta[] = [
  {
    slug: 'e2ee-encryption',
    title: 'Zero-Friction E2EE: How Frame Encrypts Your Data',
    excerpt:
      'Deep dive into Frame\'s end-to-end encryption architecture. Learn how we implemented AES-256-GCM with device-bound keys for true zero-knowledge security.',
    description:
      'Technical deep-dive into Frame\'s E2EE implementation. Why we chose AES-256-GCM, how device keys work, and our vision for secure cloud sync.',
    date: '2025-12-30',
    readTime: '6 min read',
    author: 'Security Team',
    featured: true,
  },
  {
    slug: 'quarry-planner-launch',
    title: 'Introducing the Quarry Planner: Time Blocking Meets Knowledge Management',
    excerpt:
      'A beautiful timeline-based planner built right into Quarry. Drag-drop scheduling, smart reminders, habit tracking, and Google Calendar sync—all offline-first.',
    description:
      'Announcing the Quarry Planner—a premium day planning experience integrated with your knowledge base. Features include drag-drop rescheduling, browser notifications, recurrence patterns, and full offline support.',
    date: '2025-12-26',
    readTime: '4 min read',
    author: 'Frame Team',
    featured: true,
  },
  {
    slug: 'introducing-frame',
    title: 'Introducing Frame: The OS for Your Life',
    excerpt:
      "Today we're thrilled to announce Frame—a revolutionary suite of operating systems designed to organize, simplify, and enhance every aspect of your digital existence.",
    description:
      'Discover how Frame unifies AgentOS, WebOS, HomeOS, SafeOS, WorkOS, and MyOS on the OpenStrand architecture to bring order to every aspect of your digital life.',
    date: '2025-01-09',
    readTime: '5 min read',
    author: 'Frame Team',
    featured: false,
  },
  {
    slug: 'agentos-launch',
    title: 'AgentOS is Now Live',
    excerpt:
      'Our production-ready runtime for AI agents is now available. Deploy, manage, and orchestrate AI agents at scale with TypeScript-native tooling.',
    description:
      'Learn how AgentOS helps teams ship production AI agents faster with TypeScript APIs, progressive rollout workflows, and real-time observability.',
    date: '2025-01-08',
    readTime: '3 min read',
    author: 'Engineering Team',
  },
  {
    slug: 'openstrand-architecture',
    title: 'Understanding OpenStrand Architecture',
    excerpt:
      'Deep dive into the distributed architecture powering all Frame operating systems and enabling seamless interoperability.',
    description:
      'OpenStrand is the event-driven, zero-trust substrate that keeps every Frame OS in sync. Explore the core concepts and how developers can extend it.',
    date: '2025-01-07',
    readTime: '8 min read',
    author: 'Technical Team',
  },
  {
    slug: 'codex-digital-garden',
    title: 'Quarry: A Public Digital Garden for AI',
    excerpt:
      'Why we built Quarry Codex as a structured knowledge repository instead of a traditional CMS, and how it serves as the perfect substrate for OpenStrand.',
    description:
      'Quarry Codex is a version-controlled digital garden designed for AI consumption. Learn how recursive hierarchies, SQL caching, and static NLP make it the ideal knowledge substrate.',
    date: '2024-11-15',
    readTime: '7 min read',
    author: 'Frame Team',
    featured: false,
  },
  {
    slug: 'recursive-knowledge-schema',
    title: 'Weaves, Looms, Strands, and Fabric: A Recursive Knowledge Schema',
    excerpt:
      'Deep dive into the recursive hierarchy that powers Quarry Codex. Why three tiers? How does recursion enable graph algorithms, recommendations, and path-finding?',
    description:
      'Explore the mathematical elegance of recursive knowledge structures and how they unlock powerful graph algorithms for navigation, recommendations, and semantic search.',
    date: '2024-11-17',
    readTime: '10 min read',
    author: 'Technical Team',
    featured: false,
  },
  {
    slug: 'sql-cache-nlp-indexing',
    title: 'SQL-Cached Static NLP: Indexing 10,000+ Docs in Seconds for $0',
    excerpt:
      'How we built an incremental indexing system using SHA-based diffing, better-sqlite3, and TF-IDF that runs in GitHub Actions with 85-95% cache hit rates.',
    description:
      'Technical deep-dive into Quarry Codex indexing architecture: SQL caching layer, static NLP pipeline, and GitHub Actions automation that scales to massive knowledge bases.',
    date: '2024-11-19',
    readTime: '12 min read',
    author: 'Engineering Team',
    featured: false,
  },
]

export function getBlogPost(slug: string): BlogPostMeta | undefined {
  return blogPosts.find((post) => post.slug === slug)
}

export function getRelatedPosts(slug: string, count = 2): BlogPostMeta[] {
  return blogPosts
    .filter((post) => post.slug !== slug)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, count)
}

