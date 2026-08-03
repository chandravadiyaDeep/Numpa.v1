import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Cpu,
  Download,
  FileUp,
  Layers,
  LineChart,
  MessageSquare,
  Search,
  ShieldCheck,
  Sparkles,
  Table2,
  Wand2,
} from "lucide-react";
import { useSession } from "@/hooks/useSession";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Numpa — From Raw Data to Ready Insights" },
      {
        name: "description",
        content:
          "Numpa is a browser-based data preparation studio: upload CSV, Excel or JSON, profile it, clean it with a visual pipeline, visualize it and export model-ready data.",
      },
      { property: "og:title", content: "Numpa — From Raw Data to Ready Insights" },
      {
        property: "og:description",
        content:
          "Upload, explore, clean, transform, analyze and export your datasets in one continuous workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FLOW = [
  { icon: FileUp, label: "Upload", copy: "CSV, XLSX, XLS or JSON" },
  { icon: Search, label: "Explore", copy: "Profiles & statistics" },
  { icon: Wand2, label: "Clean", copy: "Missing values, duplicates" },
  { icon: Layers, label: "Transform", copy: "Encode, scale, rename" },
  { icon: BarChart3, label: "Analyze", copy: "Charts & readiness score" },
  { icon: Download, label: "Export", copy: "CSV, XLSX, JSON, PDF" },
];

const FEATURES = [
  {
    icon: Table2,
    title: "Deep dataset profiling",
    copy: "Per-column types, missing counts, cardinality, quartiles, skewness, kurtosis and outlier detection.",
  },
  {
    icon: Layers,
    title: "Visual preprocessing pipeline",
    copy: "Compose imputation, encoding, scaling, outlier handling, deduplication, text cleaning and renaming — with undo, redo and reset.",
  },
  {
    icon: LineChart,
    title: "Interactive visualization",
    copy: "Histogram, scatter, line, bar, pie, donut, box plot, distribution and correlation heatmap, with smart chart recommendations.",
  },
  {
    icon: Cpu,
    title: "ML readiness scoring",
    copy: "A measurable 0–100 gate across completeness, data quality, feature quality, preprocessing and target balance.",
  },
  {
    icon: Download,
    title: "Export anything",
    copy: "Download the cleaned dataset as CSV, TSV, JSON or XLSX, charts as PNG/JPEG/PDF and a branded readiness report as PDF.",
  },
  {
    icon: ShieldCheck,
    title: "Private by design",
    copy: "Parsing and processing run entirely in your browser — your files never leave the machine.",
  },
];

const DEMO_ROWS = [
  ["1", "22", "male", "7.25", "3"],
  ["2", "38", "female", "71.28", "1"],
  ["3", "26", "female", "7.92", "3"],
  ["4", "—", "female", "53.10", "1"],
  ["5", "35", "male", "8.05", "3"],
];

function Landing() {
  const { user, loading } = useSession();
  const authed = Boolean(user) && !loading;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % FLOW.length), 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-5 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-[0_8px_24px_-10px] shadow-primary">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">Numpa</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            <a href="#features" className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              How It Works
            </a>
            <Link
              to={authed ? "/feedback" : "/login"}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Feedback
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {authed ? (
              <Link
                to="/dashboard"
                className="inline-flex h-9 items-center gap-2 rounded-lg brand-gradient px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Open workspace
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="inline-flex h-9 items-center rounded-lg border bg-secondary/60 px-3.5 text-xs font-medium transition-colors hover:bg-secondary"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="inline-flex h-9 items-center rounded-lg brand-gradient px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="ambient">
          <div className="relative z-10 mx-auto grid max-w-[1400px] gap-10 px-5 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,520px)] lg:items-center lg:px-8 lg:py-24">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
                <Wand2 className="h-3.5 w-3.5 text-cyan" />
                Data preparation studio for CSV, Excel & JSON
              </span>
              <h1 className="mt-5 text-4xl font-bold leading-[1.05] lg:text-6xl">
                From Raw Data to <span className="text-gradient">Ready Insights.</span>
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                Numpa turns messy spreadsheets into model-ready datasets. Profile every column,
                build a reproducible cleaning pipeline, explore interactive charts and export the
                result — all inside one continuous workspace.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={authed ? "/dashboard" : "/signup"}
                  className="inline-flex h-12 items-center gap-2 rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Analyze Your Data
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex h-12 items-center rounded-xl border bg-secondary/60 px-6 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  See How It Works
                </a>
              </div>
            </div>

            {/* Animated sample dataset demo */}
            <div className="panel overflow-hidden p-5">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs text-muted-foreground">passengers_sample.csv</p>
                <span className="rounded-full border bg-secondary/60 px-2.5 py-1 text-[11px] font-medium text-cyan">
                  {FLOW[step].label}
                </span>
              </div>

              <div className="mt-4 overflow-hidden rounded-xl border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-muted-foreground">
                    <tr>
                      {["id", "age", "sex", "fare", "class"].map((h) => (
                        <th key={h} className="px-3 py-2 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {DEMO_ROWS.map((row, i) => (
                      <tr
                        key={row[0]}
                        className="border-t transition-colors"
                        style={{ animation: `fade-in 500ms ease-out ${i * 90}ms both` }}
                      >
                        {row.map((cell, j) => (
                          <td
                            key={j}
                            className={`px-3 py-2 ${cell === "—" ? "text-destructive" : "text-muted-foreground"}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { k: "Rows", v: "891" },
                  { k: "Quality", v: "86%" },
                  { k: "Readiness", v: "78%" },
                ].map((m) => (
                  <div key={m.k} className="rounded-xl border bg-secondary/40 p-3">
                    <p className="text-[11px] text-muted-foreground">{m.k}</p>
                    <p className="mt-1 font-mono text-lg font-semibold">{m.v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full brand-gradient transition-[width] duration-700"
                  style={{ width: `${((step + 1) / FLOW.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mx-auto max-w-[1400px] px-5 py-16 lg:px-8">
          <h2 className="text-2xl font-bold lg:text-3xl">How it works</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            One dataset, six stages, one continuous workspace.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {FLOW.map((s, i) => (
              <div
                key={s.label}
                className={`panel lift relative overflow-hidden p-5 transition-transform duration-300 ${
                  step === i ? "-translate-y-1" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <s.icon className={`h-5 w-5 transition-colors ${step === i ? "text-cyan" : "text-muted-foreground"}`} />
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </div>
                <p className="mt-6 text-sm font-semibold">{s.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.copy}</p>
                <span
                  className="absolute bottom-0 left-0 h-0.5 brand-gradient transition-[width] duration-700"
                  style={{ width: step >= i ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-[1400px] px-5 pb-16 lg:px-8">
          <h2 className="text-2xl font-bold lg:text-3xl">Everything in the workspace</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Each capability below ships in the Numpa app today.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {FEATURES.map((f) => (
              <article key={f.title} className="panel lift p-6 transition-transform duration-200 hover:-translate-y-1">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  <f.icon className="h-5 w-5 text-cyan" />
                </span>
                <h3 className="mt-5 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.copy}</p>
              </article>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1400px] px-5 pb-24 lg:px-8">
          <div className="panel flex flex-col items-center gap-5 px-6 py-14 text-center">
            <h2 className="max-w-xl text-2xl font-bold lg:text-3xl">
              Bring your next dataset to <span className="text-gradient">Numpa</span>
            </h2>
            <p className="max-w-md text-sm text-muted-foreground">
              Sign in and load a file — profiling, cleaning, charts, readiness scoring and exports
              are waiting.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to={authed ? "/dashboard" : "/signup"}
                className="inline-flex h-12 items-center gap-2 rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Analyze Your Data
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to={authed ? "/feedback" : "/login"}
                className="inline-flex h-12 items-center gap-2 rounded-xl border bg-secondary/60 px-6 text-sm font-medium transition-colors hover:bg-secondary"
              >
                <MessageSquare className="h-4 w-4" />
                Send feedback
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-5 py-8 text-xs text-muted-foreground lg:px-8">
          <p>© {new Date().getFullYear()} Numpa — data preparation studio.</p>
          <p>Processing runs locally in your browser.</p>
        </div>
      </footer>
    </div>
  );
}
