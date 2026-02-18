'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, BookOpen } from 'lucide-react'

/**
 * Citation Demo Component
 * Interactive citation style switcher for landing page
 */

// Sample academic paper data
const samplePaper = {
  title: 'Attention Is All You Need',
  authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.', 'Uszkoreit, J.', 'Jones, L.', 'Gomez, A. N.', 'Kaiser, L.', 'Polosukhin, I.'],
  year: '2017',
  journal: 'Advances in Neural Information Processing Systems',
  volume: '30',
  doi: '10.48550/arXiv.1706.03762',
  url: 'https://arxiv.org/abs/1706.03762',
}

const citationStyles: Record<string, { label: string; formatted: string; inText: string }> = {
  apa: {
    label: 'APA',
    formatted: `Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., & Polosukhin, I. (2017). Attention is all you need. ${samplePaper.journal}, ${samplePaper.volume}. https://doi.org/${samplePaper.doi}`,
    inText: '(Vaswani et al., 2017)',
  },
  mla: {
    label: 'MLA',
    formatted: `Vaswani, Ashish, et al. "Attention Is All You Need." ${samplePaper.journal}, vol. ${samplePaper.volume}, 2017.`,
    inText: '(Vaswani et al.)',
  },
  chicago: {
    label: 'Chicago',
    formatted: `Vaswani, Ashish, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Lukasz Kaiser, and Illia Polosukhin. "Attention Is All You Need." In ${samplePaper.journal}, ${samplePaper.volume}. 2017.`,
    inText: '(Vaswani et al. 2017)',
  },
  harvard: {
    label: 'Harvard',
    formatted: `Vaswani, A. et al. (2017) 'Attention Is All You Need', ${samplePaper.journal}, ${samplePaper.volume}. Available at: ${samplePaper.url}`,
    inText: '(Vaswani et al., 2017)',
  },
  ieee: {
    label: 'IEEE',
    formatted: `A. Vaswani et al., "Attention is all you need," in ${samplePaper.journal}, vol. ${samplePaper.volume}, 2017.`,
    inText: '[1]',
  },
  bibtex: {
    label: 'BibTeX',
    formatted: `@inproceedings{vaswani2017attention,
  title     = {Attention is All You Need},
  author    = {Vaswani, Ashish and Shazeer, Noam and Parmar, Niki and Uszkoreit, Jakob and Jones, Llion and Gomez, Aidan N and Kaiser, Lukasz and Polosukhin, Illia},
  booktitle = {Advances in Neural Information Processing Systems},
  volume    = {30},
  year      = {2017}
}`,
    inText: '\\cite{vaswani2017attention}',
  },
}

export function CitationDemo() {
  const [activeStyle, setActiveStyle] = useState<string>('apa')
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)

  const handleCopy = async () => {
    const text = citationStyles[activeStyle].formatted
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 overflow-hidden shadow-lg">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-quarry-green-600 dark:text-quarry-green-400" />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">Citation Formatter</span>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">9 styles supported</span>
      </div>

      {/* Style Tabs */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/30">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(citationStyles).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveStyle(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                activeStyle === key
                  ? 'bg-quarry-green-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Paper Info */}
      <div className="px-5 py-3 bg-gradient-to-r from-quarry-green-50/50 to-transparent dark:from-quarry-green-900/10">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source</p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{samplePaper.title}</p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
          {samplePaper.authors.slice(0, 3).join(', ')} et al. • {samplePaper.year}
        </p>
      </div>

      {/* Formatted Citation */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Bibliography Entry
          </p>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-quarry-green-600 dark:text-gray-400 dark:hover:text-quarry-green-400 transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.pre
            key={activeStyle}
            ref={preRef}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
            className={`p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap ${
              activeStyle === 'bibtex'
                ? 'font-mono text-xs bg-gray-900 text-green-400'
                : 'bg-gray-50 dark:bg-gray-900/50 text-gray-800 dark:text-gray-200'
            }`}
          >
            {citationStyles[activeStyle].formatted}
          </motion.pre>
        </AnimatePresence>

        {/* In-text citation preview */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">In-text:</span>
            <code className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-sm font-mono text-quarry-green-700 dark:text-quarry-green-400">
              {citationStyles[activeStyle].inText}
            </code>
          </div>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>
    </div>
  )
}

export default CitationDemo
