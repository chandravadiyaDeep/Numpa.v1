import { useMemo, useState } from "react";
import { Check, Lightbulb, Settings2 } from "lucide-react";
import { OpIcon } from "@/components/uda/OpIcon";
import { store, useStudio } from "@/lib/studio-store";
import { METHODS_WITH_VALUE } from "@/lib/dataset";
import { buildRecommendations, type RecoOption } from "@/lib/recommendations";

export function SmartRecommendations() {
  const { dataset, steps } = useStudio();
  const [open, setOpen] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const recos = useMemo(
    () => (dataset ? buildRecommendations(dataset, steps) : []),
    [dataset, steps],
  );

  if (!dataset) return null;

  const apply = (column: string, o: RecoOption) => {
    if (METHODS_WITH_VALUE.has(o.method) && !o.value) return;
    store.addStep({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      op: o.op,
      column,
      method: o.method,
      value: o.value,
    });
    setOpen(null);
  };

  const visible = showAll ? recos : recos.slice(0, 6);

  return (
    <section className="panel mt-6 p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
          <Lightbulb className="h-5 w-5 text-cyan" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Smart Cleaning Recommendations</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Column-level suggestions based on missing values, datatype, distribution, outliers,
            cardinality and duplicates.
          </p>
        </div>
        <span className="ml-auto rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
          {recos.length}
        </span>
      </div>

      {recos.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
          No outstanding issues detected — every recommendation is either resolved or already queued
          in the pipeline.
        </p>
      ) : (
        <>
          <ul className="mt-5 grid gap-3 lg:grid-cols-2">
            {visible.map((r) => {
              const target = r.scope === "dataset" ? dataset.columns[0] : r.column;
              return (
                <li key={r.id} className="rounded-xl border bg-secondary/40 p-4 lift">
                  <div className="flex items-center gap-2">
                    <OpIcon op={r.action.op} className="h-4 w-4 shrink-0 text-cyan" />
                    <span className="min-w-0 truncate text-sm font-semibold">{r.column}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{r.issue}</p>
                  <p className="mt-3 text-xs">
                    <span className="text-muted-foreground">Recommended: </span>
                    <span className="font-medium text-cyan">{r.action.label}</span>
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    <span className="font-medium text-foreground">Why? </span>
                    {r.why}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => apply(target, r.action)}
                      className="inline-flex h-9 items-center gap-2 rounded-xl brand-gradient px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98]"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Apply
                    </button>
                    {r.alternatives.length > 0 && (
                      <button
                        onClick={() => setOpen(open === r.id ? null : r.id)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border px-4 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Other Options
                      </button>
                    )}
                  </div>

                  {open === r.id && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-dashed p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                      {r.alternatives.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => apply(target, a)}
                          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          <OpIcon op={a.op} className="h-3.5 w-3.5 shrink-0 text-cyan" />
                          <span className="truncate">{a.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {recos.length > 6 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="mt-4 text-xs font-medium text-cyan transition-opacity hover:opacity-80"
            >
              {showAll ? "Show fewer" : `Show all ${recos.length} recommendations`}
            </button>
          )}
        </>
      )}
    </section>
  );
}
