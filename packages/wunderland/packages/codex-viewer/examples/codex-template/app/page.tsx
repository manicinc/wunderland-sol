import Link from 'next/link'
import { Github, BookMarked, Layers, Server } from 'lucide-react'
import EmbeddedCodex from '../components/EmbeddedCodex'

const checklist = [
  'Fork this repo or click "Use this template"',
  'Update .env.local with your GitHub org/repo/branch',
  'Edit weaves/*/*.md with your knowledge',
  'Push to GitHub → Codex viewer fetches everything live',
]

const resources = [
  {
    title: 'Docs & schemas',
    href: 'https://frame.dev/codex',
    description: 'Weave/Loom/Strand definitions, metadata contracts, analytics.'
  },
  {
    title: 'Codex Viewer npm package',
    href: 'https://www.npmjs.com/package/@framers/codex-viewer',
    description: 'Changelog, install instructions, API surface.'
  },
  {
    title: 'Starter repo issues',
    href: 'https://github.com/framersai/codex-template/issues',
    description: 'Bug reports or feature requests.'
  }
]

export default function Home() {
  return (
    <main className="space-y-12 pb-12">
      <section className="rounded-3xl border border-amber-300/60 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          <span className="rounded-full bg-white/80 px-3 py-1 text-emerald-700">frame.dev</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-sky-700">codex template</span>
          <span className="rounded-full bg-white/80 px-3 py-1 text-rose-700">analog OS</span>
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,340px]">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900 sm:text-5xl">
              Launch your own Codex in minutes.
            </h1>
            <p className="mt-4 text-lg text-gray-700">
              This template mirrors the Frame Codex stack—semantic search, bookmarks, analog theming, and privacy-first history controls. It ships with the actual OpenStrand schema docs (`weaves/openstrand/**`) so you can see how weaves, looms, and strands map to the analog OS.
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Drop your markdown into <code className="rounded bg-gray-900/5 px-2 py-1">weaves/</code>, push to GitHub, and the viewer auto-indexes like Wikipedia.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="https://github.com/framersai/codex-template/generate"
                className="inline-flex items-center gap-2 rounded-full border border-gray-900 bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-gray-800"
              >
                <BookMarked className="h-4 w-4" />
                Use this template
              </Link>
              <Link
                href="https://github.com/framersai/codex-template"
                className="inline-flex items-center gap-2 rounded-full border border-gray-900/20 bg-white px-5 py-2.5 text-sm font-semibold text-gray-900 shadow hover:-translate-y-0.5"
              >
                <Github className="h-4 w-4" />
                View source
              </Link>
              <Link
                href="/codex/openstrand/overview"
                className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/80 px-5 py-2.5 text-sm font-semibold text-amber-700 shadow hover:-translate-y-0.5"
              >
                <BookMarked className="h-4 w-4" />
                View static strand
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200/80 bg-white/80 p-5 shadow-lg backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
              Checklist
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              {checklist.map((step) => (
                <li key={step} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 rounded-xl border border-dashed border-emerald-400/70 bg-emerald-50/70 p-4 text-xs text-emerald-900">
              Need the full architecture playbook? <Link href="https://frame.dev/codex" className="font-semibold underline">frame.dev/codex</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[320px,1fr]">
        <aside className="space-y-6 self-start rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-lg">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Environment</h2>
            <p className="mt-2 text-sm text-gray-600">
              Copy <code>.env.example</code> to <code>.env.local</code>.
            </p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Layers className="mt-0.5 h-4 w-4 text-emerald-600" />
                <span><code>NEXT_PUBLIC_CODEX_REPO_OWNER</code> &mdash; GitHub org/user</span>
              </li>
              <li className="flex items-start gap-2">
                <Layers className="mt-0.5 h-4 w-4 text-sky-600" />
                <span><code>NEXT_PUBLIC_CODEX_REPO_NAME</code> &mdash; repo with <code>weaves/</code></span>
              </li>
              <li className="flex items-start gap-2">
                <Server className="mt-0.5 h-4 w-4 text-rose-600" />
                <span><code>NEXT_PUBLIC_CODEX_REPO_BRANCH</code> &mdash; defaults to <code>main</code></span>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900">Resources</h2>
            <ul className="mt-4 space-y-4">
              {resources.map((resource) => (
                <li key={resource.href}>
                  <Link href={resource.href} className="group block rounded-xl border border-gray-200/80 bg-white/70 p-4 hover:border-gray-900/40">
                    <p className="text-sm font-semibold text-gray-900 group-hover:text-gray-700">{resource.title}</p>
                    <p className="mt-1 text-xs text-gray-600">{resource.description}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-2xl">
          <EmbeddedCodex />
        </div>
      </section>
    </main>
  )
}

