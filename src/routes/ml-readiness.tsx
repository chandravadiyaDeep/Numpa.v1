import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Cpu, Download, XCircle } from "lucide-react";
import { PageShell } from "@/components/uda/PageShell";
import { useActiveDataset, useStudio } from "@/lib/studio-store";
import { mlReadiness, profileDataset, toCsv } from "@/lib/dataset";

export const Route = createFileRoute("/ml-readiness")({
  head: () => ({
    meta: [
      { title: "ML Readiness — UDA" },
      {
        name: "description",
        content:
          "Check whether your prepared CSV is model-ready: missing values, encoding, duplicates, variance, scale and sample size.",
      },
      { property: "og:title", content: "ML Readiness — UDA" },
      {
        property: "og:description",
        content: "A pre-training gate for your dataset, with a readiness score and export.",
      },
    ],
  }),
  component: MlReadinessPage,
});

function MlReadinessPage() {
  const ds = useActiveDataset();
  const { processed } = useStudio();

  if (!ds)
    return (
      <PageShell title="ML Readiness" subtitle="Pre-training checks on the working dataset.">
        <div />
      </PageShell>
    );

  const { checks, score, numeric, categorical } = mlReadiness(ds);
  const profiles = profileDataset(ds);

  const download = () => {
    const blob = new Blob([toCsv(ds)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clean_${ds.name.replace(/\.csv$/i, "")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      title="ML Readiness"
      subtitle={
        processed
          ? "Scoring the processed output of your pipeline."
          : "Scoring the raw upload — run a pipeline to improve it."
      }
      actions={
        <button
          onClick={download}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border bg-secondary/60 px-5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <Download className="h-4 w-4 text-cyan" />
          Download Clean CSV
        </button>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
        <section className="panel flex flex-col items-center p-8 text-center">
          <div className="relative grid h-44 w-44 place-items-center">
            <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--secondary)" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="var(--chart-2)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(score / 100) * 2 * Math.PI * 52} 999`}
              />
            </svg>
            <div>
              <p className="font-display text-4xl font-bold">{score}%</p>
              <p className="mt-1 text-xs text-muted-foreground">Readiness</p>
            </div>
          </div>
          <p className="mt-6 max-w-xs text-sm text-muted-foreground">
            {score === 100
              ? "This dataset passes every structural check and can go straight into training."
              : "Resolve the failing checks in the Preprocessing Studio to raise this score."}
          </p>
          <Link
            to="/preprocessing"
            className="mt-6 inline-flex h-11 items-center rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Open Preprocessing Studio
          </Link>
        </section>

        <div className="space-y-6">
          <section className="panel p-6">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-cyan" />
              <h2 className="text-base font-semibold">Readiness checks</h2>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {checks.map((c) => (
                <div key={c.label} className="rounded-xl border bg-secondary/40 p-4">
                  <div className="flex items-center gap-2">
                    {c.passed ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <p className="min-w-0 truncate text-sm font-medium">{c.label}</p>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{c.detail}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-6">
            <h2 className="text-base font-semibold">Feature inventory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {numeric} numeric · {categorical} categorical · {ds.rows.length.toLocaleString()} rows
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {profiles.map((p) => (
                <span
                  key={p.name}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    p.type === "numeric" ? "text-primary" : "text-cyan"
                  }`}
                >
                  {p.name}
                  <span className="ml-2 text-muted-foreground">{p.type}</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
