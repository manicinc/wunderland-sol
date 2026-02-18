import type { Metadata } from "next";

const updated = "November 6, 2025";

export const metadata: Metadata = {
  title: "AgentOS Privacy Guidance",
  description:
    "How the open-source AgentOS runtime approaches privacy and where self-hosted operators should focus."
};

const Sections = [
  {
    title: "Open-source, self-hosted runtime",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        AgentOS Core is released under the Apache License 2.0, with extensions and community agents under the MIT license.
        It ships as a TypeScript package you run on your own infrastructure. The core project does not phone home,
        collect analytics, or transmit end-user data to Frame.dev. Any information processed by AgentOS stays wherever you deploy it.
      </p>
    )
  },
  {
    title: "You control data collection",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        Because the runtime is self-hosted, privacy obligations sit with the operator. When you build a product
        on top of AgentOS you must define how conversation history, workflow telemetry, or marketplace records
        are stored, how long they are retained, and which third parties (if any) have access.
      </p>
    )
  },
  {
    title: "Recommended practices",
    body: (
      <ul className="list-disc space-y-2 pl-5 text-slate-700 dark:text-slate-200">
        <li>Document what you log (e.g., agency launches, persona submissions) and why.</li>
        <li>Implement opt-in analytics and give end users a way to delete or export their data.</li>
        <li>Review marketplace submissions before publishing to avoid unlicensed content or personal data.</li>
        <li>Mirror the guidance in the docs/MARKETPLACE.md file if you enable the optional marketplace module.</li>
      </ul>
    )
  },
  {
    title: "Using the hosted Voice Chat Assistant",
    body: (
      <p className="text-slate-700 dark:text-slate-200">
        If you are using the managed Voice Chat Assistant service operated by Frame.dev, the hosted product has
        its own privacy policy and terms. Refer to the latest documents published in-app or at
        <a href="https://vca.chat/legal/privacy" className="ml-1 font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">vca.chat/legal/privacy</a>.
      </p>
    )
  }
];

export default function PrivacyPage() {
  return (
    <article className="space-y-12">
      <header className="space-y-6 text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400">Open-source guidance</p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">Privacy notes for AgentOS</h1>
        <p className="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-300">
          AgentOS itself does not collect personal data. When you deploy the runtime, you become the controller
          responsible for meeting local privacy regulations.
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
          Need additional compliance language for your deployment? Fork this site, update the copy for your
          jurisdiction, or reach out at
          <a href="mailto:team@frame.dev" className="ml-1 font-semibold text-brand hover:underline">team@frame.dev</a>.
        </p>
      </footer>
    </article>
  );
}
