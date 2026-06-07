import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { getRepositories } from "@/lib/data";

const KIND_LABEL: Record<string, string> = {
  contact: "Contact",
  interaction: "Comm",
};

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const { knowledge } = getRepositories();
  const hits = query ? await knowledge.search(query) : [];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Knowledge"
        description="Search the lifetime history and the contact dossiers (the gold layer)."
      />

      <form method="get" className="flex items-center gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search comms, summaries, and contact intel…"
          className="w-full max-w-md rounded-md border border-border bg-panel-2 px-3 py-2 text-sm text-text placeholder:text-dim focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          Search
        </button>
      </form>

      {!query ? (
        <p className="text-sm text-dim">
          Enter a term to search across communications and enriched contact profiles.
          Semantic (vector) search over embeddings is the next step (ADR-0011, §4).
        </p>
      ) : hits.length === 0 ? (
        <p className="text-sm text-dim">No results for “{query}”.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {hits.map((h) => {
            const body = (
              <div className="rounded-lg border border-border bg-panel px-4 py-3 hover:bg-panel-2">
                <div className="flex items-center gap-2 text-xs text-dim">
                  <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase">
                    {KIND_LABEL[h.kind] ?? h.kind}
                  </span>
                  <span className="font-medium text-text">{h.title}</span>
                  {h.when && <span className="ml-auto">{h.when}</span>}
                </div>
                {h.snippet && <p className="mt-1 text-sm text-dim">{h.snippet}</p>}
              </div>
            );
            return (
              <li key={`${h.kind}-${h.id}`}>
                {h.href ? <Link href={h.href}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
