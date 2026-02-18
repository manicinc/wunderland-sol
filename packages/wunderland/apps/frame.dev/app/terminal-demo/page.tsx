/**
 * Terminal Theme Demo Page
 * Showcases all the retro terminal components
 */

'use client'

import { useState } from 'react'
import TerminalButton, { TerminalButtonGroup } from '@/components/terminal/TerminalButton'
import VUMeter from '@/components/terminal/VUMeter'
import TerminalLoader from '@/components/terminal/TerminalLoader'
import ASCIIArt from '@/components/terminal/ASCIIArt'
import { TerminalBootSequence } from '@/components/terminal/CRTEffect'

export default function TerminalDemoPage() {
  const [bootComplete, setBootComplete] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [switches, setSwitches] = useState({
    power: true,
    turbo: false,
    network: true,
  })

  // Simulate audio levels
  useState(() => {
    const interval = setInterval(() => {
      setAudioLevel(Math.random() * 100)
    }, 100)
    return () => clearInterval(interval)
  })

  // Simulate loading progress
  useState(() => {
    const interval = setInterval(() => {
      setLoadingProgress(prev => prev >= 100 ? 0 : prev + 2)
    }, 200)
    return () => clearInterval(interval)
  })

  if (!bootComplete) {
    return <TerminalBootSequence onComplete={() => setBootComplete(true)} />
  }

  return (
    <div className="min-h-screen p-8 space-y-8">
      {/* ASCII Header */}
      <ASCIIArt type="logo" variant="accent" animated />
      
      <ASCIIArt type="separator" variant="dim" />

      {/* Terminal Buttons */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="TERMINAL BUTTONS" />
        
        <div className="flex flex-wrap gap-4">
          <TerminalButton>Default Button</TerminalButton>
          <TerminalButton variant="primary" led ledColor="green" ledOn>
            Primary Action
          </TerminalButton>
          <TerminalButton variant="danger" led ledColor="red">
            Danger Zone
          </TerminalButton>
          <TerminalButton variant="success" ascii>
            Success
          </TerminalButton>
          <TerminalButton loading>
            Processing
          </TerminalButton>
        </div>

        <TerminalButtonGroup>
          <TerminalButton size="sm">File</TerminalButton>
          <TerminalButton size="sm">Edit</TerminalButton>
          <TerminalButton size="sm">View</TerminalButton>
          <TerminalButton size="sm">Help</TerminalButton>
        </TerminalButtonGroup>
      </section>

      <ASCIIArt type="separator" variant="dim" animated />

      {/* VU Meters */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="AUDIO LEVELS" />
        
        <div className="space-y-4">
          <VUMeter 
            value={audioLevel} 
            label="Master Volume" 
            style="bar"
          />
          
          <div className="flex gap-8">
            <VUMeter 
              value={audioLevel * 0.8} 
              label="Left Channel"
              channel="left"
              style="led"
              size="sm"
            />
            <VUMeter 
              value={audioLevel * 1.2} 
              label="Right Channel"
              channel="right"
              style="led"
              size="sm"
            />
          </div>
          
          <VUMeter 
            value={audioLevel} 
            label="Input Level"
            style="needle"
            size="lg"
          />
        </div>
      </section>

      <ASCIIArt type="separator" variant="dim" />

      {/* Loading Animations */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="LOADING STATES" />
        
        <div className="space-y-4">
          <TerminalLoader text="Initializing system" />
          <TerminalLoader text="Loading knowledge graph" style="progress" progress={loadingProgress} />
          <TerminalLoader text="Quantum entangling" style="matrix" />
          <TerminalLoader text="Booting Frame OS" style="typewriter" />
          <TerminalLoader text="SYSTEM ERROR" style="glitch" />
          <TerminalLoader text="Processing" style="blocks" />
        </div>
      </section>

      <ASCIIArt type="separator" variant="dim" />

      {/* Terminal Controls */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="SYSTEM CONTROLS" />
        
        <div className="grid grid-cols-3 gap-8 max-w-2xl">
          {/* Power Switch */}
          <div className="flex items-center gap-4">
            <label className="terminal-text text-sm">MAIN POWER</label>
            <button
              onClick={() => setSwitches(prev => ({ ...prev, power: !prev.power }))}
              className={`terminal-switch ${switches.power ? 'on' : ''}`}
            >
              <span className="terminal-switch-handle" />
            </button>
            <span className={`led ${switches.power ? 'green on' : 'red'}`} />
          </div>

          {/* Turbo Mode */}
          <div className="flex items-center gap-4">
            <label className="terminal-text text-sm">TURBO MODE</label>
            <button
              onClick={() => setSwitches(prev => ({ ...prev, turbo: !prev.turbo }))}
              className={`terminal-switch ${switches.turbo ? 'on' : ''}`}
            >
              <span className="terminal-switch-handle" />
            </button>
            <span className={`led ${switches.turbo ? 'amber on' : 'amber'}`} />
          </div>

          {/* Network */}
          <div className="flex items-center gap-4">
            <label className="terminal-text text-sm">NETWORK</label>
            <button
              onClick={() => setSwitches(prev => ({ ...prev, network: !prev.network }))}
              className={`terminal-switch ${switches.network ? 'on' : ''}`}
            >
              <span className="terminal-switch-handle" />
            </button>
            <span className={`led ${switches.network ? 'blue on' : 'blue'}`} />
          </div>
        </div>
      </section>

      <ASCIIArt type="separator" variant="dim" />

      {/* ASCII Art Patterns */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="ASCII DECORATIONS" />
        
        <ASCIIArt type="banner" text="FRAME" variant="rainbow" />
        
        <ASCIIArt type="frame" variant="accent">
          <div className="p-4 terminal-text">
            <p>This content is wrapped in an ASCII frame.</p>
            <p>Perfect for highlighting important information.</p>
            <p className="mt-4 text-terminal-accent">Status: OPERATIONAL</p>
          </div>
        </ASCIIArt>
        
        <ASCIIArt type="pattern" animated variant="dim" />
      </section>

      <ASCIIArt type="separator" variant="dim" />

      {/* Terminal Input */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="TERMINAL INPUT" />
        
        <div className="max-w-2xl space-y-4">
          <div className="terminal-prompt">
            <input 
              type="text"
              className="terminal-input"
              placeholder="Enter command..."
            />
          </div>
          
          <div className="terminal-loading">
            <div 
              className="terminal-loading-bar"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      </section>

      <ASCIIArt type="separator" variant="dim" animated />

      {/* System Status */}
      <section className="space-y-4">
        <ASCIIArt type="header" text="SYSTEM STATUS" />
        
        <div className="grid grid-cols-2 gap-8 max-w-4xl terminal-text font-mono text-sm">
          <div>
            <div className="flex justify-between">
              <span className="opacity-70">CPU Usage:</span>
              <span className="text-terminal-accent">42.1%</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Memory:</span>
              <span className="text-terminal-accent">16.4 GB / 32 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Disk:</span>
              <span className="text-terminal-accent">284 GB / 512 GB</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Network:</span>
              <span className="text-terminal-success">Connected</span>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between">
              <span className="opacity-70">Knowledge Nodes:</span>
              <span className="text-terminal-accent">1,337,420</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Active Strands:</span>
              <span className="text-terminal-accent">42,069</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Graph Depth:</span>
              <span className="text-terminal-accent">∞</span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Frame OS:</span>
              <span className="text-terminal-success">v4.1.0</span>
            </div>
          </div>
        </div>
      </section>

      <ASCIIArt type="separator" variant="dim" />

      <footer className="text-center terminal-text opacity-50 text-sm">
        <p>Quarry Codex Terminal Interface v4.1.0</p>
        <p>© 2024 Framers AI - The Future of Knowledge</p>
      </footer>
    </div>
  )
}
