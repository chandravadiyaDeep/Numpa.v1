import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  ArrowRight,
  BarChart3,
  Braces,
  Cpu,
  Download,
  FileUp,
  Layers,
  Sparkles,
  Wand2,
} from "lucide-react";
import { TopNav } from "@/components/uda/TopNav";
import { AnimatedNumber } from "@/components/uda/AnimatedNumber";
import { Uploader } from "@/components/uda/Uploader";
import { parseCsv, qualityScore } from "@/lib/dataset";
import { healthSummary, readinessReport } from "@/lib/insights";
import { store, useStudio } from "@/lib/studio-store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "UDA — AI Data Preparation Studio for CSV, Excel & JSON" },
      {
        name: "description",
        content:
          "Universal Data Analyzer: upload CSV, XLSX or JSON, profile it, build a preprocessing pipeline, visualize it and export a model-ready dataset.",
      },
      { property: "og:title", content: "UDA — AI Data Preparation Studio" },
      {
        property: "og:description",
        content:
          "Profile, clean, visualize and score any CSV, Excel or JSON dataset — entirely in your browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const SAMPLE = `passenger,age,sex,fare,class,survived
1,22,male,7.25,3,0
2,38,female,71.28,1,1
3,26,female,7.92,3,1
4,35,female,53.1,1,1
5,35,male,8.05,3,0
6,,male,8.46,3,0
7,54,male,51.86,1,0
8,2,male,21.07,3,0
9,27,female,11.13,3,1
10,14,female,30.07,2,1
11,4,female,16.7,3,1
12,58,female,26.55,1,1
13,20,male,8.05,3,0
14,39,male,31.27,3,0
15,14,female,7.85,3,0
16,55,female,16,2,1
17,2,male,29.12,3,0
18,,male,13,2,1
19,31,female,18,3,0
20,,female,7.22,3,1
21,35,male,26,2,0
22,34,male,13,2,1
23,15,female,8.03,3,1
24,28,male,35.5,1,1
25,8,female,21.07,3,0
26,38,female,31.39,3,1
27,,male,7.22,3,0
28,19,male,263,1,0
29,,female,7.88,3,1
30,,male,7.9,3,0
31,40,male,27.72,1,0
32,,female,146.52,1,1
33,,female,7.75,3,1
34,66,male,10.5,2,0
35,28,male,82.17,1,0
36,42,male,52,1,0
37,,male,7.23,3,1
38,21,male,8.05,3,0
39,18,female,18,3,0
40,14,female,11.24,3,1
41,40,female,9.48,3,0
42,27,female,21,2,0
43,,male,7.9,3,0
44,3,female,41.58,2,1
45,19,female,7.88,3,1
46,,male,8.05,3,0
47,,male,15.5,3,0
48,,female,7.75,3,1
49,,male,21.68,3,0
50,18,female,17.8,3,0`;

const FLOW = [
  { icon: FileUp, label: "Upload", copy: "CSV · XLSX · JSON" },
  { icon: Braces, label: "Analysis", copy: "Profiles & validation" },
  { icon: Layers, label: "Preprocessing", copy: "Composable pipeline" },
  { icon: BarChart3, label: "Visualization", copy: "Nine chart types" },
  { icon: Cpu, label: "ML Readiness", copy: "Scored gate" },
  { icon: Download, label: "Export", copy: "Clean file out" },
];

function Index() {
  const { dataset, steps, processed } = useStudio();
  const demo = useMemo(() => parseCsv(SAMPLE, "passengers_sample.csv"), []);
  const active = processed ?? dataset ?? demo;
  const summary = useMemo(() => healthSummary(active), [active]);
  const readiness = useMemo(() => readinessReport(active), [active]);
  const quality = useMemo(() => qualityScore(active), [active]);
  const live = Boolean(dataset);

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="ambient">
        <section className="mx-auto max-w-[1400px] px-5 py-10 lg:px-8 lg:py-14">
          {/* Intro + upload action */}
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5 text-cyan" />
                {live ? "Workspace active" : "Live preview — sample dataset"}
              </span>
              <h1 className="mt-5 text-3xl font-bold leading-[1.1] lg:text-5xl">
                Your <span className="text-gradient">data preparation</span> workspace
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                {live
                  ? `${active.name} is loaded. Profile it, compose a cleaning pipeline, explore charts and score it for training.`
                  : "Everything below is running on a live sample. Upload a CSV, Excel or JSON file to swap in your own data — nothing leaves your browser."}
              </p>
            </div>
            <Uploader label={live ? "Upload New Dataset" : "Upload Dataset"} />
          </div>

          {/* Animated pipeline */}
          <div className="relative z-10 mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {FLOW.map((step, i) => (
              <div
                key={step.label}
                className="panel lift group relative overflow-hidden p-5 transition-transform duration-200 hover:-translate-y-1"
                style={{ animation: `fade-in 480ms ease-out ${i * 70}ms both` }}
              >
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-cyan transition-transform duration-200 group-hover:scale-110" />
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-6 text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.copy}</p>
                <span
                  className="absolute bottom-0 left-0 h-0.5 brand-gradient transition-[width] duration-700"
                  style={{ width: `${((i + 1) / FLOW.length) * 100}%` }}
                />
              </div>
            ))}
          </div>

          {/* Live statistics */}
          <div className="relative z-10 mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Rows" value={summary.rows} hint={`${summary.columns} columns detected`} />
            <StatCard
              label="Data quality"
              value={quality.score}
              suffix="%"
              hint={`${summary.missing.toLocaleString()} missing cells`}
            />
            <StatCard
              label="ML readiness"
              value={readiness.score}
              suffix="%"
              hint={`${readiness.checks.filter((c) => c.status === "pass").length}/${readiness.checks.length} checks passing`}
            />
            <StatCard
              label="Pipeline steps"
              value={steps.length}
              hint={processed ? "Processed copy active" : steps.length ? "Pending run" : "Raw dataset"}
            />
          </div>

          {/* Insight cards + entry points */}
          <div className="relative z-10 mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="panel p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan" />
                <h2 className="text-base font-semibold">
                  {live ? "Recommended next actions" : "What UDA finds in this sample"}
                </h2>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {(readiness.actions.length
                  ? readiness.actions
                  : ["This dataset passes every structural check and can go straight into training."]
                )
                  .slice(0, 6)
                  .map((a) => (
                    <p
                      key={a}
                      className="rounded-xl border bg-secondary/40 p-4 text-sm leading-relaxed text-muted-foreground transition-colors hover:bg-secondary/60"
                    >
                      {a}
                    </p>
                  ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {readiness.categories.map((c) => (
                  <span
                    key={c.name}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {c.name}
                    <span className="ml-2 font-mono text-foreground">{c.score}%</span>
                  </span>
                ))}
              </div>
            </section>

            <aside className="panel flex flex-col gap-4 p-6">
              <h2 className="text-base font-semibold">
                {live ? "Continue working" : "Start in seconds"}
              </h2>
              {live ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {active.name} · {active.rows.length.toLocaleString()} rows ·{" "}
                    {active.columns.length} columns
                  </p>
                  <Link
                    to="/analysis"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl brand-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Open Analysis
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/preprocessing"
                    className="inline-flex h-11 items-center justify-center rounded-xl border bg-secondary/60 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    Preprocessing Studio
                  </Link>
                  <Link
                    to="/ml-readiness"
                    className="inline-flex h-11 items-center justify-center rounded-xl border bg-secondary/60 text-sm font-medium transition-colors hover:bg-secondary"
                  >
                    ML Readiness
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Load the sample workspace to explore every module, or upload your own file.
                  </p>
                  <button
                    onClick={() => store.setDataset(parseCsv(SAMPLE, "passengers_sample.csv"))}
                    className="inline-flex h-11 items-center justify-center rounded-xl brand-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Use sample dataset
                  </button>
                  <Uploader variant="dropzone" label="Browse files" />
                </>
              )}
            </aside>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  suffix = "",
}: {
  label: string;
  value: number;
  hint: string;
  suffix?: string;
}) {
  return (
    <div className="panel lift p-6 transition-transform duration-200 hover:-translate-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <AnimatedNumber
        value={value}
        suffix={suffix}
        className="mt-4 block font-display text-3xl font-bold"
      />
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
