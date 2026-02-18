'use client'

import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { motion } from 'framer-motion'

interface Node extends d3.SimulationNodeDatum {
  id: string
  group: number
  val: number
  label?: string
}

interface Link extends d3.SimulationLinkDatum<Node> {
  source: string | Node
  target: string | Node
  value: number
}

interface KnowledgeGraphProps {
  data?: { nodes: Node[]; links: Link[] }
  width?: number
  height?: number
  className?: string
}

const DEFAULT_DATA = {
  nodes: [
    { id: 'OpenStrand', group: 1, val: 20, label: 'OpenStrand' },
    { id: 'Frame', group: 1, val: 15, label: 'Frame' },
    { id: 'Codex', group: 1, val: 15, label: 'Codex' },
    { id: 'Fabric', group: 2, val: 10, label: 'Fabric' },
    { id: 'Loom', group: 2, val: 8, label: 'Loom' },
    { id: 'Weave', group: 2, val: 8, label: 'Weave' },
    { id: 'AgentOS', group: 3, val: 12, label: 'AgentOS' },
    { id: 'Superintelligence', group: 4, val: 18, label: 'Superintelligence' },
    { id: 'Knowledge', group: 4, val: 10, label: 'Knowledge' },
    { id: 'Context', group: 4, val: 10, label: 'Context' },
  ],
  links: [
    { source: 'OpenStrand', target: 'Frame', value: 5 },
    { source: 'Codex', target: 'Frame', value: 5 },
    { source: 'Fabric', target: 'Codex', value: 3 },
    { source: 'Loom', target: 'Fabric', value: 2 },
    { source: 'Weave', target: 'Loom', value: 2 },
    { source: 'AgentOS', target: 'Frame', value: 4 },
    { source: 'Superintelligence', target: 'OpenStrand', value: 6 },
    { source: 'Knowledge', target: 'Codex', value: 3 },
    { source: 'Context', target: 'Knowledge', value: 2 },
    { source: 'OpenStrand', target: 'Codex', value: 4 },
  ]
}

export default function KnowledgeGraph({ data = DEFAULT_DATA, width = 800, height = 600, className = '' }: KnowledgeGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    svg.selectAll("*").remove() // Clear previous render

    const width = svgRef.current.clientWidth
    const height = svgRef.current.clientHeight

    // Colors
    const colorScale = d3.scaleOrdinal()
      .domain(['1', '2', '3', '4'])
      .range(['#00C896', '#3B82F6', '#8B5CF6', '#EC4899'])

    const simulation = d3.forceSimulation(data.nodes)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(30))

    // Links
    const link = svg.append("g")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.2)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", d => Math.sqrt(d.value))

    // Node Groups
    const node = svg.append("g")
      .selectAll<SVGGElement, Node>("g")
      .data(data.nodes)
      .join("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any)

    // Node Circles (Glow)
    node.append("circle")
      .attr("r", d => d.val * 1.5)
      .attr("fill", (d: any) => colorScale(d.group.toString()) as string)
      .attr("opacity", 0.2)
      .attr("filter", "blur(8px)")

    // Node Circles (Main)
    node.append("circle")
      .attr("r", d => d.val)
      .attr("fill", (d: any) => colorScale(d.group.toString()) as string)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseover", function() {
        d3.select(this).transition().duration(200).attr("r", (d: any) => d.val * 1.3)
      })
      .on("mouseout", function() {
        d3.select(this).transition().duration(200).attr("r", (d: any) => d.val)
      })

    // Labels
    node.append("text")
      .text(d => d.label || d.id)
      .attr("x", d => d.val + 5)
      .attr("y", 4)
      .attr("fill", "#e2e8f0")
      .attr("font-size", "12px")
      .attr("font-family", "Inter, sans-serif")
      .style("pointer-events", "none")
      .style("text-shadow", "0 1px 4px rgba(0,0,0,0.8)")

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!)

      node
        .attr("transform", d => `translate(${d.x},${d.y})`)
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
  }, [data])

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className={`relative w-full h-full min-h-[400px] ${className}`}
    >
      <svg ref={svgRef} className="w-full h-full absolute inset-0" />
    </motion.div>
  )
}


