import Link from "next/link";
import { BookOpen, Code2, FileCode, Github, Layers, Sparkles, ChevronRight } from "lucide-react";
import { getAllGuides } from "../../../lib/guides";

type Props = {
  params: {
    locale: string;
  };
};

export default function DocsPage({ params }: Props) {
  const guides = getAllGuides();
  const guideCount = guides.length;

  return (
    <div className="min-h-screen bg-[var(--color-background-primary)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-morphism mb-6">
            <BookOpen className="w-4 h-4 text-accent-primary" />
            <span className="text-sm font-semibold text-text-secondary">Documentation Hub</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold gradient-text mb-4">AgentOS Documentation</h1>
          <p className="text-lg text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            Complete API reference, {guideCount}+ guides, and examples for building with AgentOS
          </p>
        </div>

        {/* Featured: Guides */}
        <div className="mb-8">
          <Link href={`/${params.locale}/guides`} className="block holographic-card p-6 sm:p-8 group transition-all hover:scale-[1.01] hover:shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6">
              <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shrink-0 w-fit">
                <Layers className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                    Guides & Tutorials
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-accent-primary)] text-white">
                    {guideCount} guides
                  </span>
                </div>
                <p className="text-[var(--color-text-secondary)] text-sm sm:text-base">
                  Comprehensive guides covering architecture, planning engine, RAG memory, human-in-the-loop patterns,
                  multi-agent communication, and more.
                </p>
              </div>
              <ChevronRight className="w-6 h-6 text-[var(--color-accent-primary)] group-hover:translate-x-1 transition-transform shrink-0 hidden sm:block" />
            </div>
          </Link>
        </div>

        <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
          {/* API Reference */}
          <article className="holographic-card p-6 sm:p-8 group h-full transition-all">
            <div className="flex items-center gap-3 text-[var(--color-accent-primary)] mb-4">
              <Code2 className="h-6 w-6" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)]">API Reference</h2>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm sm:text-base">
              Complete TypeDoc-generated API documentation for @framers/agentos package. Explore all classes,
              interfaces, types, and methods.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://docs.agentos.sh"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-xl hover:brightness-110"
              >
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                View API Reference
              </a>
              <p className="text-xs text-[var(--color-text-muted)]">
                TypeDoc documentation for all exported modules and types
              </p>
            </div>
          </article>

          {/* Popular Guides */}
          <article className="holographic-card p-6 sm:p-8 group h-full transition-all">
            <div className="flex items-center gap-3 text-[var(--color-accent-primary)] mb-4">
              <FileCode className="h-6 w-6" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)]">Popular Guides</h2>
            </div>
            <ul className="space-y-2 sm:space-y-3 mb-6">
              <li>
                <Link href={`/${params.locale}/guides/architecture`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-primary)]" />
                  Architecture Overview
                </Link>
              </li>
              <li>
                <Link href={`/${params.locale}/guides/planning_engine`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-secondary)]" />
                  Planning Engine
                </Link>
              </li>
              <li>
                <Link href={`/${params.locale}/guides/human_in_the_loop`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-tertiary)]" />
                  Human-in-the-Loop
                </Link>
              </li>
              <li>
                <Link href={`/${params.locale}/guides/rag_memory_configuration`} className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] transition-colors flex items-center gap-2 text-sm sm:text-base">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  RAG & Memory Config
                </Link>
              </li>
            </ul>
            <Link
              href={`/${params.locale}/guides`}
              className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-border-primary)] bg-[var(--color-background-card)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
            >
              View All Guides
            </Link>
          </article>

          {/* GitHub Repository */}
          <article className="holographic-card p-6 sm:p-8 group h-full transition-all">
            <div className="flex items-center gap-3 text-[var(--color-accent-primary)] mb-4">
              <Github className="h-6 w-6" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)]">Source Code</h2>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-6 text-sm sm:text-base">
              Explore the full source code, examples, and contribute to AgentOS on GitHub. Apache 2.0 licensed.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="https://github.com/framersai/agentos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-border-primary)] bg-[var(--color-background-card)] px-6 py-3 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/10"
              >
                <Github className="h-4 w-4" aria-hidden="true" />
                View on GitHub
              </a>
            </div>
          </article>

          {/* Quick Start */}
          <article className="holographic-card p-6 sm:p-8 group h-full transition-all">
            <div className="flex items-center gap-3 text-[var(--color-accent-primary)] mb-4">
              <Sparkles className="h-6 w-6" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-semibold text-[var(--color-text-primary)]">Getting Started</h2>
            </div>
            <p className="text-[var(--color-text-secondary)] mb-4 text-sm sm:text-base">
              New to AgentOS? Start here with installation instructions and your first agent.
            </p>
            <div>
              <pre className="code-block overflow-x-auto text-xs sm:text-sm">
                <code>{`pnpm add @framers/agentos

import { AgentOS } from "@framers/agentos";

const agentos = new AgentOS();
await agentos.initialize(config);`}</code>
              </pre>
              <Link
                href={`/${params.locale}/guides/architecture`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-accent-primary)] hover:text-[var(--color-accent-secondary)] transition-colors"
              >
                Read the Architecture Guide →
              </Link>
            </div>
          </article>
        </div>

        {/* Note about local development */}
        <div className="mt-12 holographic-card p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3">
            Development Note
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Documentation is auto-generated from source code. To regenerate locally:
          </p>
          <pre className="code-block text-xs">
            <code>pnpm run docs        # Generate all docs{"\n"}pnpm run docs:serve  # Serve at localhost:8080</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
