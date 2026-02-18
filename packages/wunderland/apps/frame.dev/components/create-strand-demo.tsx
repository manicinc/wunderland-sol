'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const MOCK_DEFINITIONS: Record<string, string> = {
  "artificial intelligence": "The simulation of human intelligence processes by machines, especially computer systems.",
  "neural network": "A computer system modeled on the human brain and nervous system.",
  "entropy": "A thermodynamic quantity representing the unavailability of a system's thermal energy for conversion into mechanical work.",
  "default": "A fundamental concept in the structure of knowledge, waiting to be woven into the fabric."
}

export default function CreateStrandDemo() {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'processing' | 'complete'>('idle')
  const [result, setResult] = useState<any>(null)

  const handleCreate = async () => {
    if (!input.trim()) return

    setStatus('analyzing')
    
    // Simulate Analysis
    setTimeout(() => {
      setStatus('processing')
      // Simulate Backend Job
      setTimeout(() => {
        setResult({
          term: input,
          definition: MOCK_DEFINITIONS[input.toLowerCase()] || MOCK_DEFINITIONS['default'],
          id: Math.random().toString(36).substring(7),
          tags: ['concept', 'generated', 'v1'],
          confidence: 0.98
        })
        setStatus('complete')
      }, 1500)
    }, 1000)
  }

  const reset = () => {
    setStatus('idle')
    setResult(null)
    setInput('')
  }

  return (
    <div className="w-full max-w-2xl mx-auto p-6 rounded-2xl bg-obsidian-900/50 backdrop-blur-xl border border-obsidian-700 shadow-glass">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display font-bold text-white">Create New Strand</h3>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${status === 'idle' ? 'bg-gray-500' : 'bg-frame-green animate-pulse'}`} />
            <span className="text-xs text-obsidian-400 uppercase tracking-wider">
              {status === 'idle' ? 'Ready' : status === 'complete' ? 'Strand Woven' : 'Processing via Codex...'}
            </span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {status === 'idle' ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter a concept seed (e.g., 'Entropy')"
                className="flex-1 bg-obsidian-950/80 border border-obsidian-700 rounded-lg px-4 py-3 text-white placeholder-obsidian-500 focus:outline-none focus:border-frame-green transition-colors"
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={!input.trim()}
                className="px-6 py-3 bg-frame-green text-obsidian-950 font-bold rounded-lg hover:bg-frame-green-light disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                Weave Strand
              </button>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {status !== 'complete' && (
                 <div className="space-y-2">
                    <div className="flex justify-between text-xs text-frame-green">
                      <span>{status === 'analyzing' ? 'Semantic Analysis...' : 'Weaving into Fabric...'}</span>
                      <span>{status === 'analyzing' ? '45%' : '82%'}</span>
                    </div>
                    <div className="h-1 bg-obsidian-800 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-frame-green"
                        initial={{ width: "0%" }}
                        animate={{ width: status === 'analyzing' ? "45%" : "100%" }}
                        transition={{ duration: 1.5 }}
                      />
                    </div>
                 </div>
              )}

              {status === 'complete' && result && (
                <div className="p-4 rounded-lg bg-obsidian-950/50 border border-frame-green/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold text-white capitalize">{result.term}</h4>
                    <span className="text-xs px-2 py-1 rounded bg-frame-green/20 text-frame-green border border-frame-green/20">
                      ID: {result.id}
                    </span>
                  </div>
                  <p className="text-obsidian-300 text-sm mb-4 leading-relaxed">
                    {result.definition}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {result.tags.map((tag: string) => (
                      <span key={tag} className="text-xs px-2 py-1 rounded-full bg-obsidian-800 text-obsidian-400 border border-obsidian-700">
                        #{tag}
                      </span>
                    ))}
                  </div>
                  <button 
                    onClick={reset}
                    className="mt-4 text-xs text-frame-green hover:underline"
                  >
                    Create Another Strand
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}


