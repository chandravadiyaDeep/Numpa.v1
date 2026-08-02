import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Fingerprint,
  Gauge,
  GitCompareArrows,
  Rows3,
  Sparkles,
  Table2,
} from "lucide-react";
import { PageShell } from "@/components/uda/PageShell";
import { AnimatedNumber } from "@/components/uda/AnimatedNumber";
import { useActiveDataset } from "@/lib/studio-store";
import {
  aiInsights,
  duplicateCount,
  mlReadiness,
  profileDataset,
  qualityScore,
} from "@/lib/dataset";
import { covariance, strongestRelationships } from "@/lib/insights";


export const Route = createFileRoute("/_authenticated/analysis")({
  head: () => ({
    meta: [
      { title: "Dataset Analysis — UDA" },
      {
        name: "description",
        content:
          "Automated CSV profiling: dataset summary, validation checks, column statistics, quality score and AI insights.",
      },
      { property: "og:title", content: "Dataset Analysis — UDA" },
      {
        property: "og:description",
        content: "Summary, validation, statistics, quality score and AI insights for your CSV.",
      },
    ],
  }),
  component: AnalysisPage,
});

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
  decimals = 0,
  suffix = "",
}: {
  icon: typeof Rows3;
  label: string;
  value: number;
  hint: string;
  decimals?: number;
  suffix?: string;
}) {
  return (
    <div className="panel lift p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-cyan" />
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <AnimatedNumber
        value={value}
        decimals={decimals}
        suffix={suffix}
        className="mt-5 block font-display text-3xl font-bold"
      />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const fmt = (v?: number, d = 2) => (typeof v === "number" && Number.isFinite(v) ? v.toFixed(d) : "—");


function AnalysisPage() {
  const ds = useActiveDataset();
  const [view, setView] = useState<"core" | "distribution" | "quality">("core");
  const relationships = useMemo(() => (ds ? strongestRelationships(ds) : []), [ds]);

  if (!ds)
    return (
      <PageShell title="Dataset Analysis" subtitle="Automated profiling of your working dataset.">
        <div />
      </PageShell>
    );

  const profiles = profileDataset(ds);
  const quality = qualityScore(ds);
  const readiness = mlReadiness(ds);
  const insights = aiInsights(ds);
  const missingTotal = profiles.reduce((a, p) => a + p.missing, 0);
  const numericProfiles = profiles.filter((p) => p.type === "numeric");
  const outlierTotal = profiles.reduce((a, p) => a + (p.outliers ?? 0), 0);
  const flagged = profiles.filter((p) => p.constant || p.highCardinality || p.idLike);

  const validations = [
    { label: "Header row detected", passed: ds.columns.length > 0 },
    { label: "No empty columns", passed: profiles.every((p) => p.unique > 0) },
    { label: "No duplicate rows", passed: duplicateCount(ds) === 0 },
    { label: "Complete cells", passed: missingTotal === 0 },
    { label: "No constant columns", passed: !profiles.some((p) => p.constant) },
    { label: "No outlier-heavy columns", passed: !profiles.some((p) => (p.outlierPct ?? 0) > 10) },
    { label: "Cardinality within range", passed: !profiles.some((p) => p.highCardinality) },
    { label: "At least one numeric feature", passed: numericProfiles.length > 0 },
  ];

  const COLUMNS: Record<typeof view, string[]> = {
    core: ["Column", "Type", "Missing", "Unique", "Mean", "Median", "Min", "Max"],
    distribution: ["Column", "Std", "Variance", "Skewness", "Kurtosis", "P5", "P95", "IQR"],
    quality: ["Column", "Unique %", "Mode", "Outliers", "Outlier %", "Range", "Flags"],
  };

  return (
    <PageShell
      title="Dataset Analysis"
      subtitle={`${ds.name} · ${ds.rows.length.toLocaleString()} rows · ${ds.columns.length} columns`}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi icon={Rows3} label="Rows" value={ds.rows.length} hint="Records in the working set" />
        <Kpi
          icon={Table2}
          label="Columns"
          value={ds.columns.length}
          hint={`${readiness.numeric} numeric · ${readiness.categorical} categorical`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Missing cells"
          value={missingTotal}
          hint={`${profiles.filter((p) => p.missing > 0).length} affected columns`}
        />
        <Kpi
          icon={Fingerprint}
          label="Outliers"
          value={outlierTotal}
          hint={`${profiles.filter((p) => (p.outliers ?? 0) > 0).length} numeric columns affected`}
        />
        <Kpi
          icon={Gauge}
          label="Quality score"
          value={quality.score}
          suffix="%"
          hint="Completeness · uniqueness · consistency"
        />
      </div>


      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="panel p-6 lg:col-span-2">
          <h2 className="text-base font-semibold">Column statistics</h2>
          <p className="mt-1 text-xs text-muted-foreground">Descriptive profile per feature.</p>
          <div className="mt-5 -mx-2 overflow-x-auto scroll-slim">
            <table className="w-full min-w-[720px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {["Column", "Type", "Missing", "Unique", "Mean", "Median", "Min", "Max"].map((h) => (
                    <th key={h} className="border-b px-2 pb-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.name} className="transition-colors hover:bg-secondary/50">
                    <td className="border-b px-2 py-3 font-medium">{p.name}</td>
                    <td className="border-b px-2 py-3">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                          p.type === "numeric"
                            ? "bg-primary/15 text-primary"
                            : "bg-cyan/15 text-cyan"
                        }`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="border-b px-2 py-3 font-mono text-xs text-muted-foreground">
                      {p.missing} ({p.missingPct.toFixed(1)}%)
                    </td>
                    <td className="border-b px-2 py-3 font-mono text-xs text-muted-foreground">{p.unique}</td>
                    {[p.mean, p.median, p.min, p.max].map((v, i) => (
                      <td key={i} className="border-b px-2 py-3 font-mono text-xs text-muted-foreground">
                        {typeof v === "number" ? v.toFixed(2) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel p-6">
            <h2 className="text-base font-semibold">Dataset validation</h2>
            <ul className="mt-4 space-y-3">
              {validations.map((v) => (
                <li key={v.label} className="flex items-center gap-3 text-sm">
                  {v.passed ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
                  )}
                  <span className={v.passed ? "" : "text-muted-foreground"}>{v.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-6">
            <h2 className="text-base font-semibold">Quality breakdown</h2>
            <div className="mt-5 space-y-4">
              {[
                { label: "Completeness", value: quality.completeness },
                { label: "Uniqueness", value: quality.uniqueness },
                { label: "Consistency", value: quality.consistency },
                { label: "ML readiness", value: readiness.score },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-mono font-medium">{m.value}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full brand-gradient" style={{ width: `${m.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="panel mt-6 p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan" />
          <h2 className="text-base font-semibold">AI insights</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {insights.map((text, i) => (
            <p
              key={i}
              className="rounded-xl border bg-secondary/40 p-4 text-sm leading-relaxed text-muted-foreground"
            >
              {text}
            </p>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
