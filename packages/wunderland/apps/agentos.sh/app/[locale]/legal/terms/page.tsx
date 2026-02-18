import type { Metadata } from "next";

const updated = "November 6, 2025";

export const metadata: Metadata = {
  title: "AgentOS Terms Guidance",
  description:
    "Summary of licensing and expectations for using the open-source AgentOS runtime."
};

const Sections = [
  {
    title: "License",
    body: (
      <div className="space-y-3 text-slate-700 dark:text-slate-200">
        <p>
          <strong>AgentOS Core Runtime</strong> is distributed under the <strong>Apache License 2.0</strong>.
          You may use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software,
          subject to including the copyright notice and license text in your distributions.
        </p>
        <p>
          <strong>Extensions, Agents, and Guardrails</strong> built on top of AgentOS are distributed under the <strong>MIT License</strong>,
          allowing maximum flexibility for community contributions.
        </p>
        <p>
          As both licenses state, the software is provided &quot;as is&quot; without warranty of any kind.
        </p>
      </div>
    )
  },
  {
    title: "Self-hosted responsibility",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        When you deploy AgentOS you operate the stack at your own risk. You are responsible for complying with
        applicable laws, safeguarding user data, and setting your own terms or privacy policies for downstream
        users. The maintainers do not provide service-level agreements for self-hosted deployments.
      </p>
    )
  },
  {
    title: "Marketplace and bundles",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        Marketplace tooling referenced in this repository is optional. If you enable it, review submissions,
        ownership, and payout flows on your own infrastructure. The open-source project does not process
        payments or adjudicate disputes between marketplace participants.
      </p>
    )
  },
  {
    title: "Hosted Voice Chat Assistant",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        If you use the managed Voice Chat Assistant service operated by Frame.dev, that product is governed by
        its own Terms of Service. See
        <a href="https://vca.chat/legal/terms" className="ml-1 font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">vca.chat/legal/terms</a> for the hosted policy.
      </p>
    )
  }
];

export default function TermsPage() {
  return (
    <article className="space-y-12">
      <header className="space-y-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Open-source guidance</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">AgentOS usage notes</h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          This page summarises the practical implications of the Apache 2.0 and MIT licenses and expectations for running the
          AgentOS stack yourself.
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Last updated: {updated}</p>
      </header>

      {Sections.map((section) => (
        <section key={section.title} className="glass-panel space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">{section.title}</h2>
          {section.body}
        </section>
      ))}

      <footer className="space-y-4 text-sm text-slate-500 dark:text-slate-300">
        <p>
          Want to contribute back? Check the repository on
          <a href="https://github.com/wearetheframers/voice-chat-assistant" className="ml-1 font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">GitHub</a>.
        </p>
      </footer>
    </article>
  );
}
