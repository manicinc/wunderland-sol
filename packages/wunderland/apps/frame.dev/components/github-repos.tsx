'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { GitBranch, Star, GitFork, ExternalLink, Code2, Package, Globe, Bot, Shield, Database } from 'lucide-react'

const repoCategories = {
  'Core Infrastructure': [
    {
      name: 'codex',
      description: 'The codex of humanity — AI and human-curated knowledge for superintelligence.',
      icon: Code2,
      color: 'text-purple-600',
      bgColor: 'bg-purple-600/10',
      language: 'JavaScript',
      stars: 0,
      forks: 0,
      topics: ['knowledge-base', 'llm-ready', 'openstrand'],
      url: 'https://github.com/framersai/codex'
    }
  ],
  'OpenStrand Ecosystem': [
    {
      name: 'openstrand',
      description: 'Standardized open-source protocols and datasets.',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      language: 'Protocol',
      stars: 1,
      forks: 0,
      topics: ['standards', 'protocols'],
      url: 'https://github.com/framersai/openstrand'
    },
    {
      name: 'openstrand-app',
      description: 'Desktop and mobile app for community and teams editions.',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 2,
      topics: ['electron', 'react-native'],
      url: 'https://github.com/framersai/openstrand-app'
    },
    {
      name: 'openstrand-sdk',
      description: 'TypeScript SDK for working with OpenStrand documents.',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 0,
      topics: ['sdk', 'typescript'],
      url: 'https://github.com/framersai/openstrand-sdk'
    }
  ],
  'AgentOS Platform': [
    {
      name: 'agentos',
      description: 'TypeScript runtime for adaptive AI agent intelligence.',
      icon: Bot,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 0,
      topics: ['ai-agents', 'runtime'],
      url: 'https://github.com/framersai/agentos',
      license: 'Apache-2.0'
    },
    {
      name: 'agentos.sh',
      description: 'Marketing site + documentation hub for AgentOS.',
      icon: Globe,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 0,
      topics: ['documentation', 'marketing'],
      url: 'https://github.com/framersai/agentos.sh',
      license: 'Apache-2.0'
    },
    {
      name: 'agentos-extensions',
      description: 'Extensions registry for AgentOS.',
      icon: Bot,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 3,
      topics: ['extensions', 'plugins'],
      url: 'https://github.com/framersai/agentos-extensions',
      license: 'Apache-2.0'
    },
    {
      name: 'agentos-workbench',
      description: 'Local playground environment for AgentOS experiences.',
      icon: Bot,
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      language: 'TypeScript',
      stars: 0,
      forks: 0,
      topics: ['playground', 'development'],
      url: 'https://github.com/framersai/agentos-workbench',
      license: 'MIT'
    }
  ],
  'Utilities & Tools': [
    {
      name: 'sql-storage-adapter',
      description: 'Universal SQL storage manager for cross-platform builds.',
      icon: Database,
      color: 'text-orange-600',
      bgColor: 'bg-orange-600/10',
      language: 'TypeScript',
      stars: 1,
      forks: 0,
      topics: ['sql', 'database', 'cross-platform'],
      url: 'https://github.com/framersai/sql-storage-adapter'
    }
  ]
}

export default function GitHubRepos() {
  return (
    <div className="space-y-12">
      {Object.entries(repoCategories).map(([category, repos], categoryIndex) => (
        <motion.div
          key={category}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
        >
          <h3 className="text-sm font-semibold tracking-[0.2em] uppercase mb-4 text-gray-500 dark:text-gray-400">
            {category}
          </h3>
          <div className="relative pl-4 space-y-3">
            <div className="pointer-events-none absolute left-1 top-1 bottom-1 w-px bg-gradient-to-b from-gray-200 via-gray-300/70 to-gray-200 dark:from-gray-800 dark:via-gray-700/70 dark:to-gray-800" />
            {repos.map((repo, index) => {
              const Icon = repo.icon
              return (
                <motion.div
                  key={repo.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="relative group"
                >
                  <Link
                    href={repo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start justify-between gap-4 rounded-lg px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-900/60 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-gray-400 group-hover:bg-frame-green transition-colors" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${repo.color}`} />
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-frame-green">
                            {repo.name}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          {repo.description}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {repo.topics.slice(0, 3).map((topic) => (
                            <span
                              key={topic}
                              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-[10px] text-gray-500 dark:text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-yellow-400" />
                        {repo.language}
                      </span>
                      {'license' in repo && repo.license && (
                        repo.license === 'Apache-2.0' ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 font-medium">
                            Apache 2.0
                          </span>
                        ) : (
                          <span className="text-[8px] text-gray-400 dark:text-gray-600">
                            {repo.license}
                          </span>
                        )
                      )}
                      <div className="flex items-center gap-2">
                        {repo.stars > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {repo.stars}
                          </span>
                        )}
                        {repo.forks > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <GitFork className="w-3 h-3" />
                            {repo.forks}
                          </span>
                        )}
                        <ExternalLink className="w-3 h-3 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
