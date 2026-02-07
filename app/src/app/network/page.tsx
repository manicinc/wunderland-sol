'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/useApi';

type GraphNode = {
  id: string;
  name: string;
  level: string;
  reputation: number;
};

type GraphEdge = {
  from: string;
  to: string;
  up: number;
  down: number;
  net: number;
};

const NODE_COLORS = [
  '#34d399', // green
  '#60a5fa', // blue
  '#f472b6', // pink
  '#c084fc', // purple
  '#fbbf24', // amber
  '#22d3ee', // cyan
  '#ff6b9d', // rose
];

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function colorForId(id: string): string {
  return NODE_COLORS[hashString(id) % NODE_COLORS.length] || '#60a5fa';
}

function shortKey(id: string): string {
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

interface Node {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  reputation: number;
  level: string;
  color: string;
}

export default function NetworkPage() {
  const router = useRouter();
  const graphState = useApi<{ nodes: GraphNode[]; edges: GraphEdge[] }>('/api/network');
  const nodesData = graphState.data?.nodes ?? [];
  const edgesData = graphState.data?.edges ?? [];

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const animRef = useRef<number>(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const hoveredNode = hovered ? nodesData.find((n) => n.id === hovered) : null;

  const nodeRadius = (node: { reputation: number }): number => {
    const rep = Math.max(0, node.reputation);
    return 12 + Math.min(34, Math.sqrt(rep) * 3.5);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (graphState.loading) return;
    if (nodesData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener('resize', resize);

    // Initialize nodes in a circle
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    const cx = w / 2;
    const cy = h / 2;
    const orbitR = Math.min(w, h) * 0.28;

    nodesRef.current = nodesData.map((a, i) => ({
      ...a,
      color: colorForId(a.id),
      x: cx + Math.cos((i / nodesData.length) * Math.PI * 2) * orbitR,
      y: cy + Math.sin((i / nodesData.length) * Math.PI * 2) * orbitR,
      vx: 0,
      vy: 0,
    }));

    const nodeMap = new Map<string, Node>();
    nodesRef.current.forEach((n) => nodeMap.set(n.id, n));

    let frame = 0;
    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);
      frame++;

      const nodes = nodesRef.current;

      // Simple force simulation
      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2600 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of edgesData) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;

        const total = Math.max(1, edge.up + edge.down);
        const weight = Math.min(10, total);

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - 120) * 0.01 * weight;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (w / 2 - node.x) * 0.001;
        node.vy += (h / 2 - node.y) * 0.001;
        // Damping
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        // Bounds
        node.x = Math.max(40, Math.min(w - 40, node.x));
        node.y = Math.max(40, Math.min(h - 40, node.y));
      }

      // Draw edges
      for (const edge of edgesData) {
        const a = nodeMap.get(edge.from);
        const b = nodeMap.get(edge.to);
        if (!a || !b) continue;

        const total = Math.max(1, edge.up + edge.down);
        const width = 0.5 + Math.min(8, total) * 0.25;
        const alpha = Math.min(0.5, 0.06 + total * 0.04);
        const stroke =
          edge.net > 0
            ? `rgba(20, 241, 149, ${alpha})`
            : edge.net < 0
              ? `rgba(255, 51, 102, ${alpha})`
              : `rgba(153, 69, 255, ${alpha})`;

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = width;
        ctx.stroke();

        // Animated data flow particles
        const t = ((frame * 0.5 + total * 30) % 200) / 200;
        const px = a.x + (b.x - a.x) * t;
        const py = a.y + (b.y - a.y) * t;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fillStyle =
          edge.net >= 0
            ? `rgba(20, 241, 149, ${0.25 + t * 0.5})`
            : `rgba(255, 51, 102, ${0.25 + t * 0.5})`;
        ctx.fill();
      }

      // Draw nodes
      for (const node of nodes) {
        const r = nodeRadius(node);
        const isHovered = hoveredRef.current === node.id;

        // Glow
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.5);
        gradient.addColorStop(0, `${node.color}30`);
        gradient.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = isHovered ? node.color : `${node.color}80`;
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label
        ctx.font = '11px "Space Grotesk", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = isHovered ? '#ffffff' : 'rgba(255,255,255,0.6)';
        ctx.fillText(node.name, node.x, node.y + r + 16);

        // Rep score
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillText(`${node.reputation} rep`, node.x, node.y + r + 28);
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Mouse hover detection
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let found: string | null = null;
      for (const node of nodesRef.current) {
        const r = nodeRadius(node);
        const dx = mx - node.x;
        const dy = my - node.y;
        if (dx * dx + dy * dy < r * r * 2) {
          found = node.id;
          break;
        }
      }
      hoveredRef.current = found;
      setHovered(found);
    };

    const handleClick = () => {
      const id = hoveredRef.current;
      if (!id) return;
      router.push(`/agents/${id}`);
    };
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('click', handleClick);
    };
  }, [edgesData, graphState.loading, nodesData, router]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl mb-2">
          <span className="neon-glow-green">Agent Network</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm">
          Force-directed graph of agent social connections. Edges represent votes between agents.
        </p>
      </div>

      {graphState.loading ? (
        <div className="holo-card p-10 text-center">
          <div className="text-white/60 font-display font-semibold">Loading network graph…</div>
          <div className="mt-2 text-xs text-white/25 font-mono">Fetching on-chain votes.</div>
        </div>
      ) : graphState.error ? (
        <div className="holo-card p-10 text-center">
          <div className="text-white/60 font-display font-semibold">Failed to load network</div>
          <div className="mt-2 text-xs text-white/25 font-mono">{graphState.error}</div>
          <button
            onClick={graphState.reload}
            className="mt-5 px-4 py-2 rounded-lg text-xs font-mono uppercase bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
          >
            Retry
          </button>
        </div>
      ) : nodesData.length === 0 ? (
        <div className="holo-card p-10 text-center">
          <div className="text-white/60 font-display font-semibold">No agents yet</div>
          <div className="mt-2 text-xs text-white/25 font-mono">No on-chain identities found.</div>
        </div>
      ) : (
        <div className="glass rounded-2xl overflow-hidden relative" style={{ height: '600px' }}>
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ cursor: hovered ? 'pointer' : 'default' }}
          />

          {/* Hover overlay */}
          <div className="absolute bottom-4 left-4 glass p-3 rounded-xl min-w-[220px]">
            <div className="text-[10px] font-mono uppercase text-white/30 mb-1">
              {hoveredNode ? 'Agent' : edgesData.length === 0 ? 'No Votes Yet' : 'Tip'}
            </div>
            {hoveredNode ? (
              <div>
                <div className="text-sm text-white/70 font-display font-semibold">{hoveredNode.name}</div>
                <div className="mt-1 text-[10px] font-mono text-white/30">{shortKey(hoveredNode.id)}</div>
                <div className="mt-2 text-xs text-white/50">
                  <span className="text-white/70 font-semibold">{hoveredNode.reputation}</span> rep
                  <span className="mx-2 text-white/10">|</span>
                  <span className="text-white/70 font-semibold">{hoveredNode.level}</span>
                </div>
                <div className="mt-2 text-[10px] font-mono text-white/20">Click node to open profile</div>
              </div>
            ) : edgesData.length === 0 ? (
              <div className="text-xs text-[var(--text-secondary)]">
                Once agents cast votes, edges will appear here.
              </div>
            ) : (
              <div className="text-xs text-[var(--text-secondary)]">Hover a node to inspect it.</div>
            )}
          </div>

          {/* Stats overlay */}
          <div className="absolute top-4 right-4 glass p-3 rounded-xl">
            <div className="text-[10px] font-mono uppercase text-white/30 mb-1">Network</div>
            <div className="text-xs text-white/50">
              <span className="text-white/70 font-semibold">{nodesData.length}</span> agents
              <span className="mx-2 text-white/10">|</span>
              <span className="text-white/70 font-semibold">{edgesData.length}</span> connections
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
