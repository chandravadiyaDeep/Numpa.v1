import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, Cpu, Download, ListChecks, XCircle } from "lucide-react";
import { PageShell } from "@/components/uda/PageShell";
import { AnimatedNumber } from "@/components/uda/AnimatedNumber";
import { store, useActiveDataset, useStudio } from "@/lib/studio-store";
import { profileDataset } from "@/lib/dataset";
import { ExportMenu } from "@/components/uda/ExportMenu";
import { DATA_FORMATS, exportDataset, exportReadinessPdf } from "@/lib/export";
import { readinessReport, type Status } from "@/lib/insights";

export const Route = createFileRoute("/_authenticated/ml-readiness")({
  head: () => ({
    meta: [
      { title: "ML Readiness — UDA" },
      {
        name: "description",
        content:
          "Score your prepared dataset 0-100 across completeness, data quality, feature quality, preprocessing and target readiness before training.",
      },
      { property: "og:title", content: "ML Readiness — UDA" },
      {
        property: "og:description",
        content: "A measurable pre-training gate for your dataset, with a scored breakdown and export.",
      },
    ],
  }),
  component: MlReadinessPage,
});

const TONE: Record<Status, { icon: typeof CheckCircle2; className: string }> = {
  pass: { icon: CheckCircle2, className: "text-success" },
  warn: { icon: AlertTriangle, className: "text-warning" },
  fail: { icon: XCircle, className: "text-destructive" },
};

function MlReadinessPage() {
  const ds = useActiveDataset();
  const { processed, target } = useStudio();

  if (!ds)
    return (
      <PageShell title="ML Readiness" subtitle="Pre-training checks on the working dataset.">
        <div />
      </PageShell>
    );

  const report = readinessReport(ds, target ?? undefined);
  const profiles = profileDataset(ds);
  const ring =
    report.score >= 80 ? "var(--chart-2)" : report.score >= 55 ? "var(--warning)" : "var(--destructive)";

  const reportPdf = () =>
    exportReadinessPdf({
      datasetName: ds.name,
      rows: ds.rows.length,
      columns: ds.columns.length,
      processed: Boolean(processed),
      target: target ?? null,
      score: report.score,
      numeric: report.numeric,
      categorical: report.categorical,
      categories: report.categories.map((c) => ({ name: c.name, score: c.score })),
      checks: report.checks.map((c) => ({
        category: c.category,
        label: c.label,
        detail: c.detail,
        status: c.status,
      })),
      actions: report.actions,
    });

  return (
    <PageShell
      title="ML Readiness"
      subtitle={
        processed
          ? "Scoring the processed output of your pipeline."
          : "Scoring the raw upload — run a pipeline to improve it."
      }
      actions={
        <ExportMenu
          label="Export"
          icon={<Download className="h-4 w-4 text-cyan" />}
          groups={[
            {
              label: "Readiness report",
              options: [
                { id: "pdf", label: "Readiness report", hint: "PDF", onSelect: reportPdf },
              ],
            },
            {
              label: "Cleaned dataset",
              options: DATA_FORMATS.map((f) => ({
                id: f.id,
                label: f.label,
                hint: f.hint,
                onSelect: () => exportDataset(ds, f.id),
              })),
            },
          ]}
        />
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
                stroke={ring}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(report.score / 100) * 2 * Math.PI * 52} 999`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div>
              <AnimatedNumber
                value={report.score}
                suffix="%"
                className="font-display text-4xl font-bold"
              />
              <p className="mt-1 text-xs text-muted-foreground">Readiness</p>
            </div>
          </div>

          <label className="mt-6 w-full text-left">
            <span className="text-xs font-medium text-muted-foreground">Target column</span>
            <select
              value={target ?? ""}
              onChange={(e) => store.setTarget(e.target.value || null)}
              className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none transition-colors focus:border-primary"
            >
              <option value="">No target selected</option>
              {profiles.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-6 w-full space-y-4">
            {report.categories.map((c) => (
              <div key={c.name}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-mono font-medium">{c.score}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full brand-gradient transition-[width] duration-700 ease-out"
                    style={{ width: `${c.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <Link
            to="/preprocessing"
            className="mt-7 inline-flex h-11 items-center rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
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
            <div className="mt-5 space-y-6">
              {report.categories.map((cat) => (
                <div key={cat.name}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {cat.name}
                  </p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {report.checks
                      .filter((c) => c.category === cat.name)
                      .map((c) => {
                        const Icon = TONE[c.status].icon;
                        return (
                          <div
                            key={c.label}
                            className="rounded-xl border bg-secondary/40 p-4 transition-colors hover:bg-secondary/60"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 shrink-0 ${TONE[c.status].className}`} />
                              <p className="min-w-0 truncate text-sm font-medium">{c.label}</p>
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">{c.detail}</p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {report.actions.length > 0 && (
            <section className="panel p-6">
              <div className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-cyan" />
                <h2 className="text-base font-semibold">Recommended actions</h2>
              </div>
              <ol className="mt-4 space-y-2.5">
                {report.actions.map((a, i) => (
                  <li key={a} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="font-mono text-xs text-cyan">{String(i + 1).padStart(2, "0")}</span>
                    {a}
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="panel p-6">
            <h2 className="text-base font-semibold">Feature inventory</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {report.numeric} numeric · {report.categorical} categorical ·{" "}
              {ds.rows.length.toLocaleString()} rows
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {profiles.map((p) => (
                <span
                  key={p.name}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    p.name === target
                      ? "border-primary text-primary"
                      : p.type === "numeric"
                        ? "text-primary"
                        : "text-cyan"
                  }`}
                >
                  {p.name}
                  <span className="ml-2 text-muted-foreground">
                    {p.name === target ? "target" : p.type}
                  </span>
                </span>
              ))}
            </div>
          </section>
        </div>
      </div>
    </PageShell>
  );
}
