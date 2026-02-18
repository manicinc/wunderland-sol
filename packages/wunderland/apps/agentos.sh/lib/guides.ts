import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Path to the guides directory in packages/agentos/docs
const GUIDES_DIR = path.join(process.cwd(), 'content/guides');

export interface Guide {
  slug: string;
  title: string;
  description: string;
  category: string;
  content: string;
  lastModified?: string;
}

// Map filenames to metadata
const GUIDE_METADATA: Record<string, { title: string; description: string; category: string }> = {
  'ARCHITECTURE': {
    title: 'Architecture Overview',
    description: 'Complete system architecture for AgentOS including module map, request lifecycle, and extension points.',
    category: 'Core'
  },
  'AGENTOS_ARCHITECTURE_DEEP_DIVE': {
    title: 'Architecture Deep Dive',
    description: 'In-depth technical details of the AgentOS architecture and implementation.',
    category: 'Core'
  },
  'PLANNING_ENGINE': {
    title: 'Planning Engine',
    description: 'Multi-step task planning and execution with the AgentOS planning system.',
    category: 'Features'
  },
  'HUMAN_IN_THE_LOOP': {
    title: 'Human-in-the-Loop',
    description: 'Approval workflows and human oversight patterns for AI agent systems.',
    category: 'Features'
  },
  'AGENT_COMMUNICATION': {
    title: 'Agent Communication',
    description: 'Inter-agent messaging and coordination protocols for multi-agent systems.',
    category: 'Features'
  },
  'STRUCTURED_OUTPUT': {
    title: 'Structured Output',
    description: 'JSON schema validation and structured response handling.',
    category: 'Features'
  },
  'RAG_MEMORY_CONFIGURATION': {
    title: 'RAG & Memory Configuration',
    description: 'Vector storage setup and retrieval-augmented generation configuration.',
    category: 'Integration'
  },
  'PROVENANCE_IMMUTABILITY': {
    title: 'Provenance & Immutability',
    description: 'Sealed storage policy, signed event ledger, and optional external anchoring (WORM, Rekor, OpenTimestamps, blockchains).',
    category: 'Operations'
  },
  'IMMUTABLE_AGENTS': {
    title: 'Immutable Agents (Sealed Mode)',
    description: 'How sealing works end-to-end: toolset pinning, secret rotation, append-only memory, and tamper evidence.',
    category: 'Operations'
  },
  'SQL_STORAGE_QUICKSTART': {
    title: 'SQL Storage Quickstart',
    description: 'Database integration guide for persistent agent storage.',
    category: 'Integration'
  },
  'CLIENT_SIDE_STORAGE': {
    title: 'Client-Side Storage',
    description: 'Browser persistence and IndexedDB integration for web applications.',
    category: 'Integration'
  },
  'MIGRATION_TO_STORAGE_ADAPTER': {
    title: 'Storage Adapter Migration',
    description: 'Upgrade guide for migrating to the new storage adapter system.',
    category: 'Integration'
  },
  'COST_OPTIMIZATION': {
    title: 'Cost Optimization',
    description: 'Token usage management and cost reduction strategies.',
    category: 'Operations'
  },
  'EVALUATION_FRAMEWORK': {
    title: 'Evaluation Framework',
    description: 'Testing and quality assurance for AI agent systems.',
    category: 'Operations'
  },
  'RECURSIVE_SELF_BUILDING_AGENTS': {
    title: 'Recursive Self-Building Agents',
    description: 'Advanced patterns for agents that can create and modify other agents.',
    category: 'Advanced'
  },
  'RFC_EXTENSION_STANDARDS': {
    title: 'Extension Standards (RFC)',
    description: 'Standards and guidelines for building AgentOS extensions.',
    category: 'Advanced'
  },
  'ECOSYSTEM': {
    title: 'Ecosystem',
    description: 'Related packages, tools, and resources in the AgentOS ecosystem.',
    category: 'Reference'
  },
  'PLATFORM_SUPPORT': {
    title: 'Platform Support',
    description: 'Supported environments and platform compatibility information.',
    category: 'Reference'
  },
  'RELEASING': {
    title: 'Releasing',
    description: 'Release automation and versioning guidelines.',
    category: 'Reference'
  },
  'README': {
    title: 'Documentation Index',
    description: 'Quick links and overview of available documentation.',
    category: 'Reference'
  }
};

export function getAllGuides(): Guide[] {
  try {
    if (!fs.existsSync(GUIDES_DIR)) {
      console.warn('Guides directory not found:', GUIDES_DIR);
      return [];
    }

    const files = fs.readdirSync(GUIDES_DIR).filter(file =>
      file.endsWith('.md') && file !== 'README.md'
    );

    const guides = files.map(file => {
      const slug = file.replace('.md', '');
      const filePath = path.join(GUIDES_DIR, file);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const { content } = matter(fileContent);
      const stats = fs.statSync(filePath);

      const metadata = GUIDE_METADATA[slug] || {
        title: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        description: 'AgentOS documentation guide.',
        category: 'Other'
      };

      return {
        slug: slug.toLowerCase(),
        title: metadata.title,
        description: metadata.description,
        category: metadata.category,
        content,
        lastModified: stats.mtime.toISOString()
      };
    });

    // Sort by category, then by title
    const categoryOrder = ['Core', 'Features', 'Integration', 'Operations', 'Advanced', 'Reference', 'Other'];
    return guides.sort((a, b) => {
      const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
      if (catDiff !== 0) return catDiff;
      return a.title.localeCompare(b.title);
    });
  } catch (error) {
    console.error('Error loading guides:', error);
    return [];
  }
}

export function getGuideBySlug(slug: string): Guide | null {
  try {
    // Convert slug back to filename format
    const filename = slug.toUpperCase() + '.md';
    const filePath = path.join(GUIDES_DIR, filename);

    if (!fs.existsSync(filePath)) {
      // Try with different case variations
      const files = fs.readdirSync(GUIDES_DIR);
      const matchingFile = files.find(f =>
        f.toLowerCase() === slug.toLowerCase() + '.md'
      );
      if (!matchingFile) return null;
      return getGuideBySlug(matchingFile.replace('.md', ''));
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { content } = matter(fileContent);
    const stats = fs.statSync(filePath);
    const slugKey = slug.toUpperCase();

    const metadata = GUIDE_METADATA[slugKey] || {
      title: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: 'AgentOS documentation guide.',
      category: 'Other'
    };

    return {
      slug: slug.toLowerCase(),
      title: metadata.title,
      description: metadata.description,
      category: metadata.category,
      content,
      lastModified: stats.mtime.toISOString()
    };
  } catch (error) {
    console.error('Error loading guide:', slug, error);
    return null;
  }
}

export function getGuideCategories(): string[] {
  const guides = getAllGuides();
  const categories = [...new Set(guides.map(g => g.category))];
  const categoryOrder = ['Core', 'Features', 'Integration', 'Operations', 'Advanced', 'Reference', 'Other'];
  return categories.sort((a, b) => categoryOrder.indexOf(a) - categoryOrder.indexOf(b));
}
