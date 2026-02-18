"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type TypeDocNode = {
  name?: string;
  kindString?: string;
  url?: string;
  children?: TypeDocNode[];
  groups?: { children: number[] }[];
  comment?: {
    shortText?: string;
    text?: string;
    summary?: Array<{ text?: string }>;
  };
};

type DocSearchItem = {
  name: string;
  kind: string;
  url: string;
  description?: string;
};

interface DocSearchProps {
  triggerClassName?: string;
  triggerLabel?: string;
}

const MIN_QUERY_LENGTH = 2;
const DOCS_BASE_PATH = "/docs";

function extractSummary(node?: TypeDocNode): string | undefined {
  if (!node) return undefined;
  if (node.comment?.shortText) return node.comment.shortText.trim();
  if (node.comment?.text) return node.comment.text.trim();
  if (node.comment?.summary?.length) {
    return node.comment.summary.map((entry) => entry.text ?? "").join(" ").trim();
  }
  return undefined;
}

function flattenTypeDoc(node: TypeDocNode | undefined, items: DocSearchItem[], parentUrl = ""): void {
  if (!node) return;
  const url = node.url ? (node.url.startsWith("http") ? node.url : `${DOCS_BASE_PATH}/${node.url}`) : undefined;
  if (node.name && url) {
    items.push({
      name: node.name,
      kind: node.kindString ?? "Symbol",
      url,
      description: extractSummary(node),
    });
  }
  if (node.children?.length) {
    node.children.forEach((child) => flattenTypeDoc(child, items, url ?? parentUrl));
  }
}

export function DocSearch({ triggerClassName, triggerLabel = "Search docs" }: DocSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<DocSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureDocsLoaded = useCallback(async () => {
    if (items.length || loading) return;
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${DOCS_BASE_PATH}/docs.json`);
      if (!response.ok) {
        throw new Error(`Docs index missing (status ${response.status}). Generate via pnpm --filter @framers/agentos run docs.`);
      }
      const data: TypeDocNode = await response.json();
      const collected: DocSearchItem[] = [];
      flattenTypeDoc(data, collected);
      if (!collected.length) {
        throw new Error("Docs index is empty. Check TypeDoc configuration.");
      }
      setItems(collected);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load documentation index.";
      console.warn("[DocSearch] Failed to load docs index:", err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [items.length, loading]);

  useEffect(() => {
    if (!open) return;
    void ensureDocsLoaded();
  }, [open, ensureDocsLoaded]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      const isSlash = event.key === "/";
      const isKShortcut = (event.key === "k" || event.key === "K") && (event.metaKey || event.ctrlKey);
      if (isSlash || isKShortcut) {
        event.preventDefault();
        setOpen(true);
      } else if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return [];
    const lower = query.trim().toLowerCase();
    return items
      .filter((item) => {
        const haystack = `${item.name} ${item.kind} ${item.description ?? ""}`.toLowerCase();
        return haystack.includes(lower);
      })
      .slice(0, 20);
  }, [items, query]);

  const clearAndClose = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? "inline-flex items-center gap-2 rounded-full border border-slate-200/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand hover:text-brand dark:border-slate-700 dark:text-slate-200 dark:hover:border-brand"}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
        <span className="hidden text-xs text-slate-400 sm:inline-block dark:text-slate-500">/&nbsp;or&nbsp;Ctrl+K</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/70 px-4 py-16 backdrop-blur-md" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200/40 bg-white/95 shadow-2xl dark:border-slate-700/60 dark:bg-slate-950/95">
            <div className="flex items-center justify-between border-b border-slate-200/40 px-5 py-4 dark:border-slate-700/60">
              <h3 className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-300">Search documentation</h3>
              <button
                type="button"
                className="text-xs font-semibold text-slate-500 transition hover:text-brand dark:text-slate-400 dark:hover:text-brand"
                onClick={clearAndClose}
              >
                Esc
              </button>
            </div>
            <div className="px-5 py-4">
              <input
                autoFocus
                className="w-full rounded-2xl border border-slate-200/60 bg-white px-4 py-3 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                type="search"
                placeholder="Search TypeDoc (e.g. AgentOSConfig, processRequest)"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="mt-4 max-h-80 overflow-y-auto pr-1">
                {error ? (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
                    {error}
                  </p>
                ) : loading && items.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading documentation index…</p>
                ) : query.trim().length < MIN_QUERY_LENGTH ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Type at least {MIN_QUERY_LENGTH} characters to search the docs. Ensure <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-900">docs/docs.json</code> is generated via <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-900">pnpm --filter @framers/agentos run docs</code>.
                  </p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-slate-500 dark:text-slate-400">No matches. Try a different keyword.</p>
                ) : (
                  <ul className="space-y-2">
                    {filteredItems.map((item) => (
                      <li key={`${item.url}-${item.name}`}>
                        <a
                          href={item.url}
                          className="block rounded-xl border border-transparent px-4 py-3 transition hover:border-brand/40 hover:bg-brand/5 dark:hover:border-brand/30 dark:hover:bg-brand/10"
                          onClick={clearAndClose}
                        >
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.name}</p>
                          <p className="text-xs uppercase tracking-[0.35em] text-slate-400 dark:text-slate-500">
                            {item.kind}
                          </p>
                          {item.description ? (
                            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 overflow-hidden text-ellipsis">
                              {item.description}
                            </p>
                          ) : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DocSearch;
