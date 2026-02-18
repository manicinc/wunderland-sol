'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Code2, Database, FileJson, ChevronRight, Info, Copy, Check, Layers } from 'lucide-react'

interface SchemaField {
  name: string
  type: string
  required?: boolean
  description?: string
  properties?: Record<string, SchemaField>
  items?: SchemaField
  enum?: string[]
  default?: any
}

interface SchemaDefinition {
  title: string
  description: string
  type: 'object' | 'array' | 'string' | 'number' | 'boolean'
  properties?: Record<string, SchemaField>
  required?: string[]
}

const schemas: Record<string, SchemaDefinition> = {
  weave: {
    title: 'Weave Schema',
    description: 'A complete universe of knowledge, self-contained with no external relationships',
    type: 'object',
    properties: {
      slug: {
        name: 'slug',
        type: 'string',
        required: true,
        description: 'Unique identifier for the weave (e.g., "frame", "science", "philosophy")',
      },
      title: {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Human-readable title of the weave',
      },
      description: {
        name: 'description',
        type: 'string',
        required: true,
        description: 'Comprehensive description of what this weave contains',
      },
      maintainedBy: {
        name: 'maintainedBy',
        type: 'object',
        properties: {
          name: { name: 'name', type: 'string', description: 'Name of maintainer' },
          url: { name: 'url', type: 'string', description: 'Contact URL' },
        },
      },
      license: {
        name: 'license',
        type: 'string',
        default: 'MIT',
        description: 'License for the content in this weave',
      },
      tags: {
        name: 'tags',
        type: 'array',
        items: { name: 'tag', type: 'string' },
        description: 'Categorization tags from controlled vocabulary',
      },
    },
    required: ['slug', 'title', 'description'],
  },
  loom: {
    title: 'Loom Schema',
    description: 'A curated collection of related strands within a weave',
    type: 'object',
    properties: {
      slug: {
        name: 'slug',
        type: 'string',
        required: true,
        description: 'Unique identifier within the weave',
      },
      title: {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Display title for the loom',
      },
      summary: {
        name: 'summary',
        type: 'string',
        required: true,
        description: 'Brief description of the loom\'s purpose',
      },
      tags: {
        name: 'tags',
        type: 'array',
        items: { name: 'tag', type: 'string' },
        description: 'Subject tags for categorization',
      },
      ordering: {
        name: 'ordering',
        type: 'object',
        properties: {
          type: {
            name: 'type',
            type: 'string',
            enum: ['sequential', 'hierarchical', 'network'],
            default: 'sequential',
          },
          items: {
            name: 'items',
            type: 'array',
            items: { name: 'strand', type: 'string' },
          },
        },
      },
    },
    required: ['slug', 'title', 'summary'],
  },
  strand: {
    title: 'Strand Schema',
    description: 'An atomic unit of knowledge - a document, image, or other content',
    type: 'object',
    properties: {
      id: {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Globally unique identifier (usually UUID)',
      },
      slug: {
        name: 'slug',
        type: 'string',
        required: true,
        description: 'URL-friendly identifier',
      },
      title: {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Display title',
      },
      summary: {
        name: 'summary',
        type: 'string',
        description: 'Brief abstract of the content',
      },
      version: {
        name: 'version',
        type: 'string',
        default: '1.0.0',
        description: 'Semantic version of the strand',
      },
      contentType: {
        name: 'contentType',
        type: 'string',
        enum: ['markdown', 'code', 'data', 'media'],
        default: 'markdown',
      },
      difficulty: {
        name: 'difficulty',
        type: 'string',
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      },
      relationships: {
        name: 'relationships',
        type: 'object',
        properties: {
          requires: {
            name: 'requires',
            type: 'array',
            items: { name: 'strandId', type: 'string' },
            description: 'Prerequisites',
          },
          references: {
            name: 'references',
            type: 'array',
            items: { name: 'strandId', type: 'string' },
            description: 'Related strands',
          },
          seeAlso: {
            name: 'seeAlso',
            type: 'array',
            items: { name: 'url', type: 'string' },
            description: 'External references',
          },
        },
      },
    },
    required: ['id', 'slug', 'title'],
  },
}

export default function CodexSchemaExplorer() {
  const [selectedSchema, setSelectedSchema] = useState<string>('weave')
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set())
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const toggleField = (fieldPath: string) => {
    const newExpanded = new Set(expandedFields)
    if (newExpanded.has(fieldPath)) {
      newExpanded.delete(fieldPath)
    } else {
      newExpanded.add(fieldPath)
    }
    setExpandedFields(newExpanded)
  }

  const copyExample = (schema: string) => {
    const examples: Record<string, string> = {
      weave: `slug: frame
title: Frame.dev Ecosystem
description: Comprehensive knowledge base for Frame.dev products and infrastructure
maintainedBy:
  name: Frame.dev Team
  url: https://frame.dev
license: MIT
tags:
  - technology
  - ai-infrastructure
  - superintelligence`,
      loom: `slug: getting-started
title: Getting Started with Frame
summary: Essential guides and tutorials for new Frame developers
tags:
  - tutorial
  - beginner
ordering:
  type: sequential
  items:
    - installation
    - hello-world
    - core-concepts`,
      strand: `id: 550e8400-e29b-41d4-a716-446655440000
slug: openstrand-architecture
title: OpenStrand Architecture Overview
summary: Comprehensive guide to OpenStrand's system architecture
version: 1.2.0
contentType: markdown
difficulty: intermediate
taxonomy:
  subject: technology
  topics:
    - software-architecture
    - knowledge-management
relationships:
  requires:
    - core-concepts
  references:
    - quarry-codex-intro`,
    }

    navigator.clipboard.writeText(examples[schema])
    setCopiedField(schema)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const renderField = (field: SchemaField, path: string, level = 0) => {
    const isExpanded = expandedFields.has(path)
    const hasChildren = field.properties && Object.keys(field.properties).length > 0
    const indent = level * 24

    return (
      <div key={path} className="border-l-2 border-gray-200 dark:border-gray-700">
        <div
          className={`flex items-start gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors`}
          style={{ paddingLeft: `${indent + 8}px` }}
          onClick={() => hasChildren && toggleField(path)}
        >
          {hasChildren && (
            <ChevronRight
              className={`w-4 h-4 mt-0.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            />
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-purple-600 dark:text-purple-400">
                {field.name}
              </span>
              <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                {field.type}
              </span>
              {field.required && (
                <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                  required
                </span>
              )}
              {field.default !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                  default: {JSON.stringify(field.default)}
                </span>
              )}
            </div>
            
            {field.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {field.description}
              </p>
            )}
            
            {field.enum && (
              <div className="flex flex-wrap gap-1 mt-2">
                {field.enum.map(value => (
                  <span key={value} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                    "{value}"
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && field.properties && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              {Object.entries(field.properties).map(([key, subField]) =>
                renderField(subField, `${path}.${key}`, level + 1)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  const schema = schemas[selectedSchema]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Schema Selector */}
      <div className="flex items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold">Schema Explorer</h2>
        <div className="flex gap-2">
          {Object.keys(schemas).map(key => (
            <button
              key={key}
              onClick={() => setSelectedSchema(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedSchema === key
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Schema Card */}
      <motion.div
        key={selectedSchema}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-600" />
                {schema.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {schema.description}
              </p>
            </div>
            <button
              onClick={() => copyExample(selectedSchema)}
              className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
              title="Copy example"
            >
              {copiedField === selectedSchema ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Copy className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Fields */}
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
            <Info className="w-4 h-4" />
            Click on fields with nested properties to expand
          </div>
          
          <div className="space-y-1">
            {schema.properties && Object.entries(schema.properties).map(([key, field]) =>
              renderField(field, key)
            )}
          </div>

          {/* Required Fields Summary */}
          {schema.required && schema.required.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h4 className="font-medium text-red-900 dark:text-red-200 mb-2">Required Fields</h4>
              <div className="flex flex-wrap gap-2">
                {schema.required.map(field => (
                  <span key={field} className="text-sm font-mono bg-white dark:bg-gray-800 px-2 py-1 rounded">
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Example */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileJson className="w-4 h-4" />
            Example YAML
          </h4>
          <div className="relative">
            <pre className="text-sm bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
              <code>{schemas[selectedSchema] && `# ${selectedSchema}.yaml
${selectedSchema === 'weave' ? `slug: frame
title: Frame.dev Ecosystem
description: Comprehensive knowledge base for Frame.dev products` : 
selectedSchema === 'loom' ? `slug: getting-started
title: Getting Started with Frame
summary: Essential guides for new developers` :
`id: 550e8400-e29b-41d4-a716-446655440000
slug: openstrand-architecture
title: OpenStrand Architecture Overview`}`}</code>
            </pre>
          </div>
        </div>
      </motion.div>

      {/* Visual Hierarchy */}
      <div className="mt-8 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Knowledge Hierarchy
        </h3>
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
              W
            </div>
            <p className="font-medium">Weave</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Universe</p>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl mb-2">
              L
            </div>
            <p className="font-medium">Loom</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Collection</p>
          </div>
          <div className="text-gray-400">→</div>
          <div className="text-center">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold mb-2">
              S
            </div>
            <p className="font-medium">Strand</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Unit</p>
          </div>
        </div>
      </div>
    </div>
  )
}
