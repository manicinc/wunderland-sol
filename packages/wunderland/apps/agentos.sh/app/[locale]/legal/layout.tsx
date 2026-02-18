import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AgentOS Legal",
  description: "Terms, privacy, and compliance information for AgentOS and the Voice Chat Assistant platform."
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto w-full max-w-4xl px-6 py-20">
        {children}
      </div>
    </div>
  );
}

