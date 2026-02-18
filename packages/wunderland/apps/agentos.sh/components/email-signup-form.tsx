"use client";

import { ArrowRight } from "lucide-react";
import { FormEvent } from "react";

export function EmailSignupForm() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    void email; // collected for submission
    // TODO: wire up signup endpoint
  };

  return (
    <form className="flex w-full max-w-xl flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
      <label htmlFor="email-signup" className="sr-only">
        Email address
      </label>
      <input
        id="email-signup"
        name="email"
        type="email"
        placeholder="you@team.dev"
        required
        aria-required="true"
        className="flex-1 rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground shadow-lg shadow-brand/40 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand/50"
      >
        Request access
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
