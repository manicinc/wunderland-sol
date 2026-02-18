'use client'

import { useEffect, useRef } from 'react'
import { useScroll, useTransform, motion } from 'framer-motion'

export function VoidBackground() {
  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], [0, -100])
  const opacity = useTransform(scrollYProgress, [0, 0.5, 1], [0.4, 0.6, 0.2])
  
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      {/* Deep base */}
      <div className="absolute inset-0 bg-[hsl(220,25%,3%)]" />
      
      {/* Animated Gradient Orbs */}
      <motion.div 
        style={{ y }}
        className="absolute inset-0"
      >
        {/* Orb 1 - Emerald */}
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,hsla(160,80%,20%,0.15),transparent_70%)] blur-[100px] animate-pulse-glow" />
        
        {/* Orb 2 - Cyan */}
        <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(circle,hsla(180,80%,20%,0.1),transparent_70%)] blur-[120px] animate-pulse-glow animation-delay-500" />
        
        {/* Orb 3 - Violet Accent */}
        <div className="absolute top-[40%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(circle,hsla(270,60%,20%,0.05),transparent_70%)] blur-[80px]" />
      </motion.div>

      {/* Void Mesh - Topographic Lines */}
      <motion.div style={{ opacity }} className="absolute inset-0">
        <svg
          className="w-full h-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsla(160, 80%, 40%, 0.02)" />
              <stop offset="50%" stopColor="hsla(180, 70%, 50%, 0.05)" />
              <stop offset="100%" stopColor="hsla(160, 80%, 40%, 0.02)" />
            </linearGradient>
          </defs>
          <g stroke="url(#meshGradient)" fill="none" strokeWidth="0.5">
            {Array.from({ length: 40 }).map((_, i) => (
              <path
                key={i}
                d={`M-100 ${100 + i * 40} Q ${1920 / 2} ${100 + i * 40 - 100 * Math.sin(i)} 2000 ${100 + i * 40}`}
                style={{
                  animation: `topoBreath ${20 + i}s ease-in-out infinite alternate`
                }}
              />
            ))}
          </g>
        </svg>
      </motion.div>

      {/* Neural Constellation - Canvas */}
      <NeuralConstellation />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(transparent_0%,hsl(220,25%,3%)_100%)]" />
    </div>
  )
}

function NeuralConstellation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)
    
    const nodes: any[] = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      size: Math.random() * 2
    }))
    
    let animId: number
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'hsla(160, 100%, 70%, 0.3)'
      ctx.strokeStyle = 'hsla(160, 100%, 70%, 0.05)'
      
      // Update and draw nodes
      nodes.forEach(node => {
        node.x += node.vx
        node.y += node.vy
        
        if (node.x < 0 || node.x > canvas.width) node.vx *= -1
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1
        
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2)
        ctx.fill()
        
        // Draw connections
        nodes.forEach(other => {
          const dx = node.x - other.x
          const dy = node.y - other.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < 150) {
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(other.x, other.y)
            ctx.lineWidth = (1 - dist / 150) * 0.5
            ctx.stroke()
          }
        })
      })
      
      animId = requestAnimationFrame(animate)
    }
    
    animate()
    
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animId)
    }
  }, [])
  
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-50" />
}
