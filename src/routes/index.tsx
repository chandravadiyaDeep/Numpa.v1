import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  Braces,
  Cpu,
  Download,
  FileUp,
  Layers,
  Wand2,
} from "lucide-react";
import { TopNav } from "@/components/uda/TopNav";
import { parseCsv } from "@/lib/dataset";
import { store, useStudio } from "@/lib/studio-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UDA — AI Data Preparation Studio for CSV" },
      {
        name: "description",
        content:
          "Universal Data Analyzer: upload a CSV, profile it, build a preprocessing pipeline, visualize it and export a model-ready dataset.",
      },
      { property: "og:title", content: "UDA — AI Data Preparation Studio for CSV" },
      {
        property: "og:description",
        content:
          "Profile, clean and export CSV datasets with a visual preprocessing pipeline built for analysts.",
      },
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
  { icon: FileUp, label: "Upload CSV", copy: "Parsed in the browser" },
  { icon: Braces, label: "Analysis", copy: "Profiles & validation" },
  { icon: Layers, label: "Preprocessing", copy: "Composable pipeline" },
  { icon: BarChart3, label: "Visualization", copy: "Seven chart types" },
  { icon: Cpu, label: "ML Readiness", copy: "Gate before training" },
  { icon: Download, label: "Export", copy: "Clean CSV out" },
];

function Index() {
  const { dataset } = useStudio();
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (file: File) => {
    setError(null);
    const text = await file.text();
    const ds = parseCsv(text, file.name);
    if (!ds.columns.length || !ds.rows.length) {
      setError("That file didn't contain any parsable rows.");
      return;
    }
    store.setDataset(ds);
  };

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="ambient">
        <section className="mx-auto max-w-[1200px] px-5 py-16 lg:px-8 lg:py-24">
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border bg-secondary/60 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5 text-cyan" />
              AI-assisted data preparation
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.08] lg:text-6xl">
              The <span className="text-gradient">data preparation</span> studio for CSV
              workflows
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              Profile a dataset, compose a reproducible cleaning pipeline, inspect distributions
              and export a model-ready file — without writing a line of code.
            </p>
          </div>

          <div className="relative z-10 mx-auto mt-12 max-w-3xl">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void load(file);
              }}
              className={`panel flex flex-col items-center gap-5 px-6 py-14 text-center transition-colors ${
                drag ? "border-primary bg-secondary/50" : ""
              }`}
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl brand-gradient shadow-[0_16px_40px_-18px] shadow-primary">
                <FileUp className="h-7 w-7 text-primary-foreground" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">Drop your CSV here</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Everything runs locally in your browser. Nothing is uploaded.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex h-11 items-center rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Browse files
                </button>
                <button
                  onClick={() => store.setDataset(parseCsv(SAMPLE, "passengers_sample.csv"))}
                  className="inline-flex h-11 items-center rounded-xl border bg-secondary/60 px-6 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Use sample dataset
                </button>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void load(file);
                }}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            {dataset && (
              <div className="panel lift mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{dataset.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {dataset.rows.length.toLocaleString()} rows · {dataset.columns.length} columns
                    loaded
                  </p>
                </div>
                <Link
                  to="/analysis"
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Start analysis
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-5 pb-24 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {FLOW.map((step, i) => (
              <div key={step.label} className="panel lift p-5">
                <div className="flex items-center justify-between">
                  <step.icon className="h-5 w-5 text-cyan" />
                  <span className="font-mono text-xs text-muted-foreground">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-6 text-sm font-semibold">{step.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{step.copy}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
