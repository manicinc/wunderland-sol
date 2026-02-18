import { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Self-Host Quarry — Deploy Your Own Knowledge System',
  description: 'Complete guide to deploying Quarry on your own infrastructure. Docker, Kubernetes, and bare-metal installation options.',
  openGraph: {
    title: 'Self-Host Quarry',
    description: 'Deploy Quarry on your own infrastructure',
    siteName: 'Quarry',
    url: 'https://frame.dev/quarry/self-host',
  },
  alternates: {
    canonical: '/quarry/self-host',
  },
}

export default function SelfHostPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Header */}
      <header className="border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/quarry" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            QUARRY
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/quarry" className="text-sm text-gray-400 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/quarry/about" className="text-sm text-gray-400 hover:text-white transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Self-Host <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">FABRIC</span>
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mb-8">
            Deploy FABRIC on your own infrastructure for complete data ownership,
            privacy, and customization. Works with Docker, Kubernetes, or bare metal.
          </p>
          <div className="flex gap-4">
            <a
              href="#docker"
              className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Docker Setup
            </a>
            <a
              href="#requirements"
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
            >
              Requirements
            </a>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section id="requirements" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">System Requirements</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Minimum</h3>
              <ul className="space-y-2 text-gray-400">
                <li>2 CPU cores</li>
                <li>4GB RAM</li>
                <li>20GB storage</li>
                <li>Node.js 20+</li>
              </ul>
            </div>

            <div className="p-6 bg-white/[0.02] border border-emerald-500/20 rounded-xl">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Recommended</h3>
              <ul className="space-y-2 text-gray-400">
                <li>4+ CPU cores</li>
                <li>8GB+ RAM</li>
                <li>100GB SSD</li>
                <li>PostgreSQL 15+</li>
              </ul>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl">
              <h3 className="text-lg font-semibold text-emerald-400 mb-3">Optional</h3>
              <ul className="space-y-2 text-gray-400">
                <li>Redis (rate limiting)</li>
                <li>GPU (ML acceleration)</li>
                <li>S3-compatible storage</li>
                <li>Reverse proxy (nginx)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Docker Setup */}
      <section id="docker" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Docker Deployment</h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">1. Quick Start</h3>
              <pre className="p-4 bg-black/50 border border-white/10 rounded-lg overflow-x-auto text-sm">
                <code className="text-gray-300">{`# Clone the repository
git clone https://github.com/framersai/fabric.git
cd fabric

# Copy environment template
cp .env.example .env

# Start with Docker Compose
docker compose up -d`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">2. Environment Configuration</h3>
              <pre className="p-4 bg-black/50 border border-white/10 rounded-lg overflow-x-auto text-sm">
                <code className="text-gray-300">{`# .env file

# Database (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:YOUR_PASSWORD@localhost:5432/fabric

# Optional: Redis for rate limiting (highly recommended)
REDIS_URL=redis://localhost:6379

# LLM Provider (at least one required)
OPENAI_API_KEY=sk-...
# or
ANTHROPIC_API_KEY=sk-ant-...
# or
GOOGLE_AI_API_KEY=...

# Server configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-domain.com

# Security
JWT_SECRET=your-secure-random-string

# Optional: File storage
ENABLE_SQLITE_MEMORY=true
# or for cloud storage:
# S3_BUCKET=your-bucket
# S3_REGION=us-east-1`}</code>
              </pre>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">3. Docker Compose (Production)</h3>
              <pre className="p-4 bg-black/50 border border-white/10 rounded-lg overflow-x-auto text-sm">
                <code className="text-gray-300">{`# docker-compose.yml
version: '3.8'

services:
  fabric:
    image: ghcr.io/framersai/fabric:latest
    ports:
      - "3001:3001"
    environment:
      - DATABASE_URL=postgresql://postgres:\${POSTGRES_PASSWORD}@db:5432/fabric
      - REDIS_URL=redis://redis:6379
      - NODE_ENV=production
    depends_on:
      - db
      - redis
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
      - POSTGRES_DB=fabric
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Kubernetes */}
      <section id="kubernetes" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Kubernetes Deployment</h2>

          <div className="space-y-6">
            <p className="text-gray-400">
              For production Kubernetes deployments, we provide Helm charts and example manifests.
            </p>

            <pre className="p-4 bg-black/50 border border-white/10 rounded-lg overflow-x-auto text-sm">
              <code className="text-gray-300">{`# Add Helm repository
helm repo add fabric https://charts.frame.dev
helm repo update

# Install FABRIC
helm install fabric fabric/fabric \\
  --namespace fabric \\
  --create-namespace \\
  --set postgresql.enabled=true \\
  --set redis.enabled=true \\
  --set ingress.enabled=true \\
  --set ingress.hostname=fabric.your-domain.com`}</code>
            </pre>

            <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
              <p className="text-cyan-300 text-sm">
                <strong>Tip:</strong> For high-availability setups, consider using an external PostgreSQL
                cluster (like AWS RDS, Google Cloud SQL, or a self-managed HA setup) rather than
                the bundled PostgreSQL.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* API Configuration */}
      <section id="api" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Backend API Endpoints</h2>

          <p className="text-gray-400 mb-6">
            When self-hosting, configure your mobile or desktop clients to connect to your backend:
          </p>

          <div className="space-y-4">
            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <code className="text-emerald-400">GET /health</code>
              <p className="text-gray-500 text-sm mt-1">Health check endpoint - returns server status and LLM availability</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <code className="text-emerald-400">POST /api/sync/push</code>
              <p className="text-gray-500 text-sm mt-1">Push local changes from mobile/desktop clients</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <code className="text-emerald-400">GET /api/sync/pull?since=timestamp</code>
              <p className="text-gray-500 text-sm mt-1">Pull remote changes since the given timestamp</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <code className="text-emerald-400">GET /api/agentos/personas</code>
              <p className="text-gray-500 text-sm mt-1">List available AI personas</p>
            </div>

            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-lg">
              <code className="text-emerald-400">GET /api/docs</code>
              <p className="text-gray-500 text-sm mt-1">OpenAPI/Swagger documentation</p>
            </div>
          </div>
        </div>
      </section>

      {/* Connecting Clients */}
      <section id="clients" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Connecting Desktop & Mobile Apps</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl">
              <h3 className="text-lg font-semibold text-emerald-400 mb-4">Desktop (Electron)</h3>
              <p className="text-gray-400 text-sm mb-4">
                The Electron app can run in two modes: standalone (embedded backend) or connected to a remote server.
              </p>
              <p className="text-gray-400 text-sm">
                To connect to your self-hosted backend, go to <strong>Settings → Backend</strong> and enter your server URL.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-xl">
              <h3 className="text-lg font-semibold text-cyan-400 mb-4">Mobile (iOS/Android)</h3>
              <p className="text-gray-400 text-sm mb-4">
                Mobile apps work offline-first with on-device ML. Optionally sync with your backend.
              </p>
              <p className="text-gray-400 text-sm">
                Go to <strong>Settings → Backend Sync</strong> and enter your server URL and API key.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-16 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">Security Considerations</h2>

          <div className="space-y-6 text-gray-400">
            <div className="flex gap-4">
              <span className="text-emerald-400 text-xl">🔒</span>
              <div>
                <h4 className="font-semibold text-white">Use HTTPS</h4>
                <p className="text-sm">Always deploy behind a reverse proxy with TLS certificates (Let&apos;s Encrypt recommended).</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-emerald-400 text-xl">🔑</span>
              <div>
                <h4 className="font-semibold text-white">Secure Secrets</h4>
                <p className="text-sm">Use environment variables or a secrets manager. Never commit API keys to version control.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-emerald-400 text-xl">🛡️</span>
              <div>
                <h4 className="font-semibold text-white">Rate Limiting</h4>
                <p className="text-sm">Configure Redis for production rate limiting. The default in-memory store doesn&apos;t persist across restarts.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <span className="text-emerald-400 text-xl">📊</span>
              <div>
                <h4 className="font-semibold text-white">Monitoring</h4>
                <p className="text-sm">Set up logging and monitoring. The /health endpoint is suitable for uptime monitoring.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-4">Need Help?</h2>
          <p className="text-gray-400 mb-8">
            Check out our detailed documentation or reach out to the community.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/framersai/fabric/wiki/Self-Hosting"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:bg-white/10 transition-colors"
            >
              Wiki Documentation
            </a>
            <a
              href="https://github.com/framersai/fabric/discussions"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            >
              Community Discussions
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center text-gray-500 text-sm">
        <p>FABRIC — AI-Native Personal Knowledge Management</p>
      </footer>
    </div>
  )
}
