'use client'

import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'
import { NeoCard } from './ui'

interface Node extends d3.SimulationNodeDatum {
  id: string
  group: 'fabric' | 'weave' | 'loom' | 'strand'
  val: number
  label: string
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
  type: 'requires' | 'extends' | 'follows'
}

export function InteractiveGraph() {
  const svgRef = useRef<SVGSVGElement>(null)
  const [activeNode, setActiveNode] = useState<Node | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    // Data
    const nodes: Node[] = [
      { id: 'root', group: 'fabric', val: 40, label: 'Fabric' },
      { id: 'tech', group: 'weave', val: 25, label: 'Technology' },
      { id: 'science', group: 'weave', val: 25, label: 'Science' },
      { id: 'frontend', group: 'loom', val: 15, label: 'Frontend' },
      { id: 'backend', group: 'loom', val: 15, label: 'Backend' },
      { id: 'react', group: 'strand', val: 8, label: 'React' },
      { id: 'nextjs', group: 'strand', val: 8, label: 'Next.js' },
      { id: 'node', group: 'strand', val: 8, label: 'Node.js' },
      { id: 'physics', group: 'loom', val: 15, label: 'Physics' },
      { id: 'quantum', group: 'strand', val: 8, label: 'Quantum' },
      { id: 'relativity', group: 'strand', val: 8, label: 'Relativity' },
    ]

    const links: Link[] = [
      { source: 'root', target: 'tech', type: 'requires' },
      { source: 'root', target: 'science', type: 'requires' },
      { source: 'tech', target: 'frontend', type: 'extends' },
      { source: 'tech', target: 'backend', type: 'extends' },
      { source: 'frontend', target: 'react', type: 'follows' },
      { source: 'frontend', target: 'nextjs', type: 'follows' },
      { source: 'backend', target: 'node', type: 'follows' },
      { source: 'science', target: 'physics', type: 'extends' },
      { source: 'physics', target: 'quantum', type: 'follows' },
      { source: 'physics', target: 'relativity', type: 'follows' },
      // Cross links
      { source: 'react', target: 'nextjs', type: 'requires' },
    ]

    // Color scale
    const color = (d: Node) => {
      switch (d.group) {
        case 'fabric': return 'hsl(160, 100%, 70%)' // Emerald glow
        case 'weave': return 'hsl(160, 90%, 55%)'  // Emerald bright
        case 'loom': return 'hsl(173, 80%, 40%)'   // Cyan core
        case 'strand': return 'hsl(180, 85%, 55%)' // Cyan bright
        default: return '#fff'
      }
    }

    // Simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(30))

    const svg = d3.select(svgRef.current)

    // Add glow filter
    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'glow')
    filter.append('feGaussianBlur').attr('stdDeviation', '2.5').attr('result', 'coloredBlur')
    const feMerge = filter.append('feMerge')
    feMerge.append('feMergeNode').attr('in', 'coloredBlur')
    feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Links
    const link = svg.append('g')
      .attr('stroke-opacity', 0.4)
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', (d) => d.type === 'requires' ? 'hsl(160, 80%, 40%)' : 'hsl(180, 70%, 40%)')
      .attr('stroke-width', (d) => Math.sqrt(d.type === 'requires' ? 2 : 1))
      .attr('stroke-dasharray', (d) => d.type === 'follows' ? '5,5' : 'none')

    // Nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => Math.sqrt(d.val) * 3)
      .attr('fill', color)
      .attr('fill-opacity', 0.2)
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .style('filter', 'url(#glow)')
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, Node>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended) as any)
      .on('mouseover', (event, d) => {
        d3.select(event.currentTarget).attr('fill-opacity', 0.6)
        setActiveNode(d)
      })
      .on('mouseout', (event, d) => {
        d3.select(event.currentTarget).attr('fill-opacity', 0.2)
        setActiveNode(null)
      })

    // Text labels
    const text = svg.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text((d) => d.label)
      .attr('fill', 'hsl(220, 15%, 80%)')
      .attr('font-size', '10px')
      .attr('font-family', 'var(--font-mono)')
      .attr('text-anchor', 'middle')
      .attr('dy', (d) => Math.sqrt(d.val) * 3 + 15)
      .style('pointer-events', 'none')
      .style('text-shadow', '0 2px 4px rgba(0,0,0,0.8)')

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y)
      
      text
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y)
    })

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      event.subject.fx = event.subject.x
      event.subject.fy = event.subject.y
    }

    function dragged(event: any) {
      event.subject.fx = event.x
      event.subject.fy = event.y
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0)
      event.subject.fx = null
      event.subject.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [])

  return (
    <div className="relative w-full h-[600px] rounded-3xl overflow-hidden bg-[hsla(220,25%,5%,0.5)] border border-[hsla(160,60%,40%,0.1)] backdrop-blur-sm">
      <svg ref={svgRef} className="w-full h-full" />
      
      {/* Overlay Legend */}
      <div className="absolute bottom-6 left-6 p-4 rounded-xl bg-[hsla(220,25%,3%,0.8)] border border-[hsla(160,60%,40%,0.2)] backdrop-blur-md">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(160,100%,70%)] shadow-[0_0_10px_hsl(160,100%,70%)]" />
            <span className="text-xs text-[hsl(220,15%,80%)] font-mono">Fabric (Root)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(160,90%,55%)]" />
            <span className="text-xs text-[hsl(220,15%,80%)] font-mono">Weave (Domain)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(173,80%,40%)]" />
            <span className="text-xs text-[hsl(220,15%,80%)] font-mono">Loom (Module)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[hsl(180,85%,55%)]" />
            <span className="text-xs text-[hsl(220,15%,80%)] font-mono">Strand (Atom)</span>
          </div>
        </div>
      </div>

      {/* Active Node Info */}
      {activeNode && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-6 right-6 max-w-xs"
        >
          <NeoCard className="p-4">
            <h4 className="text-lg font-bold text-[hsl(160,90%,55%)]">{activeNode.label}</h4>
            <p className="text-xs text-[hsl(220,15%,60%)] uppercase tracking-widest mb-2">{activeNode.group}</p>
            <p className="text-sm text-[hsl(220,15%,80%)]">
              {activeNode.group === 'fabric' && "The complete knowledge repository."}
              {activeNode.group === 'weave' && "A self-contained universe of knowledge."}
              {activeNode.group === 'loom' && "A curated collection of strands."}
              {activeNode.group === 'strand' && "An atomic unit of knowledge."}
            </p>
          </NeoCard>
        </motion.div>
      )}
    </div>
  )
}

