import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, Lightbulb } from "lucide-react";
import { PageShell } from "@/components/uda/PageShell";
import { ExportMenu } from "@/components/uda/ExportMenu";
import {
  DATA_FORMATS,
  baseName,
  exportDataset,
  exportElementImage,
  exportElementPdf,
} from "@/lib/export";

import { useActiveDataset } from "@/lib/studio-store";
import {
  categoryCounts,
  correlationMatrix,
  histogram,
  profileColumn,
  profileDataset,
} from "@/lib/dataset";

export const Route = createFileRoute("/_authenticated/visualization")({
  head: () => ({
    meta: [
      { title: "Visualization — Numpa" },
      {
        name: "description",
        content:
          "Interactive CSV charts: histogram, scatter, line, pie, box plot, correlation heatmap and distribution plot.",
      },
      { property: "og:title", content: "Visualization — Numpa" },
      {
        property: "og:description",
        content: "Explore distributions, relationships and correlations across your dataset.",
      },
    ],
  }),
  component: VisualizationPage,
});

const CHARTS = [
  "Histogram",
  "Bar Chart",
  "Scatter Plot",
  "Line Chart",
  "Pie Chart",
  "Donut Chart",
  "Box Plot",
  "Correlation Heatmap",
  "Distribution Plot",
] as const;
type ChartKind = (typeof CHARTS)[number];

interface Recommendation {
  kind: ChartKind;
  x: string;
  y?: string;
  reason: string;
}

/** Suggest charts that suit the shape of the current dataset. */
function recommendCharts(profiles: ReturnType<typeof profileDataset>): Recommendation[] {
  const nums = profiles.filter((p) => p.type === "numeric" && !p.constant);
  const cats = profiles.filter((p) => p.type === "categorical" && !p.highCardinality && !p.idLike);
  const out: Recommendation[] = [];

  const skewed = nums.filter((p) => Math.abs(p.skewness ?? 0) > 1)[0];
  if (skewed)
    out.push({
      kind: "Histogram",
      x: skewed.name,
      reason: `"${skewed.name}" is skewed (${(skewed.skewness ?? 0).toFixed(2)}) — inspect its shape.`,
    });
  if (nums.length >= 2)
    out.push({
      kind: "Scatter Plot",
      x: nums[0].name,
      y: nums[1].name,
      reason: `Compare "${nums[0].name}" against "${nums[1].name}" for a relationship.`,
    });
  if (nums.length >= 3)
    out.push({
      kind: "Correlation Heatmap",
      x: nums[0].name,
      reason: `${nums.length} numeric features — check for redundant correlations.`,
    });
  const lowCard = cats.filter((p) => p.unique <= 10)[0];
  if (lowCard)
    out.push({
      kind: "Donut Chart",
      x: lowCard.name,
      reason: `"${lowCard.name}" has ${lowCard.unique} levels — good for a share breakdown.`,
    });
  const outlierCol = nums.filter((p) => (p.outlierPct ?? 0) > 2)[0];
  if (outlierCol)
    out.push({
      kind: "Box Plot",
      x: outlierCol.name,
      reason: `"${outlierCol.name}" holds ${(outlierCol.outlierPct ?? 0).toFixed(1)}% outliers.`,
    });
  if (!out.length && nums[0])
    out.push({ kind: "Distribution Plot", x: nums[0].name, reason: "Start with a distribution overview." });
  return out.slice(0, 4);
}


const axisProps = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
    color: "var(--popover-foreground)",
  },
};

function VisualizationPage() {
  const ds = useActiveDataset();
  const [kind, setKind] = useState<ChartKind>("Histogram");
  const captureRef = useRef<HTMLDivElement>(null);
  const [x, setX] = useState("");
  const [y, setY] = useState("");

  const profiles = useMemo(() => (ds ? profileDataset(ds) : []), [ds]);
  const recommendations = useMemo(() => recommendCharts(profiles), [profiles]);
  const numeric = profiles.filter((p) => p.type === "numeric").map((p) => p.name);
  const categorical = profiles.filter((p) => p.type === "categorical").map((p) => p.name);
  const all = profiles.map((p) => p.name);

  if (!ds)
    return (
      <PageShell title="Visualization" subtitle="Interactive charts over the working dataset.">
        <div />
      </PageShell>
    );

  const needsCategorical = kind === "Pie Chart" || kind === "Donut Chart" || kind === "Bar Chart";
  const xOptions = needsCategorical ? (categorical.length ? categorical : all) : numeric.length ? numeric : all;
  const xCol = x && xOptions.includes(x) ? x : (xOptions[0] ?? "");
  const yOptions = numeric.filter((c) => c !== xCol);
  const yCol = y && yOptions.includes(y) ? y : (yOptions[0] ?? "");
  const showY = kind === "Scatter Plot" || kind === "Line Chart";

  const chartName = `${kind.toLowerCase().replace(/\s+/g, "-")}_${baseName(ds)}`;
  const chartSubtitle = `${ds.name} — ${xCol}${showY && yCol ? ` vs ${yCol}` : ""} · ${ds.rows.length.toLocaleString()} rows`;

  const applyRecommendation = (r: Recommendation) => {
    setKind(r.kind);
    setX(r.x);
    if (r.y) setY(r.y);
  };


  return (
    <PageShell
      title="Visualization"
      subtitle={`Exploring ${ds.name} — ${ds.rows.length.toLocaleString()} rows`}
      actions={
        <ExportMenu
          label="Export"
          icon={<Download className="h-4 w-4 text-cyan" />}
          groups={[
            {
              label: "Current chart",
              options: [
                {
                  id: "png",
                  label: "Chart image",
                  hint: "PNG",
                  onSelect: () =>
                    captureRef.current
                      ? exportElementImage(captureRef.current, chartName, "png")
                      : undefined,
                },
                {
                  id: "jpeg",
                  label: "Chart image",
                  hint: "JPEG",
                  onSelect: () =>
                    captureRef.current
                      ? exportElementImage(captureRef.current, chartName, "jpeg")
                      : undefined,
                },
                {
                  id: "chart-pdf",
                  label: "Chart document",
                  hint: "PDF",
                  onSelect: () =>
                    captureRef.current
                      ? exportElementPdf(captureRef.current, chartName, kind, chartSubtitle)
                      : undefined,
                },
              ],
            },
            {
              label: "Visualization dataset",
              options: DATA_FORMATS.map((f) => ({
                id: f.id,
                label: f.label,
                hint: f.hint,
                onSelect: () => exportDataset(ds, f.id, "visualized"),
              })),
            },
          ]}
        />
      }
    >
      <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="panel h-fit p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chart type
          </h2>
          <div className="mt-4 space-y-1.5">
            {CHARTS.map((c) => (
              <button
                key={c}
                onClick={() => setKind(c)}
                className={`w-full rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
                  kind === c
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {recommendations.length > 0 && (
            <div className="mt-7 border-t pt-5">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-cyan" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested
                </h2>
              </div>
              <div className="mt-3 space-y-2">
                {recommendations.map((r) => (
                  <button
                    key={`${r.kind}-${r.x}`}
                    onClick={() => applyRecommendation(r)}
                    className="w-full rounded-xl border bg-secondary/40 p-3 text-left transition-colors hover:border-primary/50 hover:bg-secondary"
                  >
                    <p className="text-xs font-semibold">{r.kind}</p>
                    <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{r.reason}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>


        <section className="panel p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">
                {kind === "Correlation Heatmap" ? "Reference column" : "X axis"}
              </span>
              <select
                value={xCol}
                onChange={(e) => setX(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none focus:border-primary"
              >
                {xOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            {showY && (
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Y axis</span>
                <select
                  value={yCol}
                  onChange={(e) => setY(e.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none focus:border-primary"
                >
                  {yOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div ref={captureRef} className="mt-8 h-[440px] w-full bg-background p-2">
            <ChartCanvas kind={kind} xCol={xCol} yCol={yCol} numeric={numeric} />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

function ChartCanvas({
  kind,
  xCol,
  yCol,
  numeric,
}: {
  kind: ChartKind;
  xCol: string;
  yCol: string;
  numeric: string[];
}) {
  const ds = useActiveDataset();
  if (!ds || !xCol) return <Empty />;

  const palette = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  if (kind === "Histogram" || kind === "Distribution Plot") {
    const data = histogram(ds, xCol, 14);
    if (!data.length) return <Empty />;
    return (
      <ResponsiveContainer width="100%" height="100%">
        {kind === "Histogram" ? (
          <BarChart data={data}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip cursor={{ fill: "var(--secondary)" }} {...tooltipStyle} />
            <Bar dataKey="count" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        ) : (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="dist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} />
            <Tooltip {...tooltipStyle} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--chart-2)"
              strokeWidth={2}
              fill="url(#dist)"
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    );
  }

  if (kind === "Scatter Plot") {
    if (!yCol) return <Empty message="Needs two numeric columns." />;
    const data = ds.rows
      .filter((r) => typeof r[xCol] === "number" && typeof r[yCol] === "number")
      .map((r) => ({ x: r[xCol] as number, y: r[yCol] as number }));
    return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart>
          <CartesianGrid stroke="var(--border)" />
          <XAxis type="number" dataKey="x" name={xCol} {...axisProps} />
          <YAxis type="number" dataKey="y" name={yCol} {...axisProps} />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} {...tooltipStyle} />
          <Scatter data={data} fill="var(--chart-2)" fillOpacity={0.75} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "Line Chart") {
    if (!yCol) return <Empty message="Needs two numeric columns." />;
    const data = ds.rows
      .map((r, i) => ({ i, x: r[xCol], y: r[yCol] }))
      .filter((d) => typeof d.y === "number")
      .slice(0, 300);
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="x" {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip {...tooltipStyle} />
          <Line type="monotone" dataKey="y" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "Bar Chart") {
    const data = categoryCounts(ds, xCol, 12);
    if (!data.length) return <Empty />;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 24 }}>
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" {...axisProps} />
          <YAxis type="category" dataKey="name" width={110} {...axisProps} />
          <Tooltip cursor={{ fill: "var(--secondary)" }} {...tooltipStyle} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "Pie Chart" || kind === "Donut Chart") {
    const data = categoryCounts(ds, xCol);
    if (!data.length) return <Empty />;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip {...tooltipStyle} />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={kind === "Donut Chart" ? 80 : 0}
            outerRadius={140}
            paddingAngle={kind === "Donut Chart" ? 3 : 1}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} stroke="var(--background)" strokeWidth={2} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }


  if (kind === "Box Plot") {
    const cols = numeric.slice(0, 6);
    if (!cols.length) return <Empty message="No numeric columns available." />;
    const stats = cols.map((c) => profileColumn(ds, c));
    const globalMin = Math.min(...stats.map((s) => s.min ?? 0));
    const globalMax = Math.max(...stats.map((s) => s.max ?? 1));
    const span = globalMax - globalMin || 1;
    const pct = (v: number) => ((v - globalMin) / span) * 100;

    return (
      <div className="flex h-full flex-col justify-center gap-7">
        {stats.map((s) => (
          <div key={s.name}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium">{s.name}</span>
              <span className="font-mono text-muted-foreground">
                min {s.min?.toFixed(1)} · Q1 {s.q1?.toFixed(1)} · med {s.median?.toFixed(1)} · Q3{" "}
                {s.q3?.toFixed(1)} · max {s.max?.toFixed(1)}
              </span>
            </div>
            <div className="relative mt-3 h-8 rounded-lg bg-secondary/50">
              <div
                className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-border"
                style={{ left: `${pct(s.min ?? 0)}%`, width: `${pct(s.max ?? 0) - pct(s.min ?? 0)}%` }}
              />
              <div
                className="absolute top-1 bottom-1 rounded-md brand-gradient opacity-80"
                style={{ left: `${pct(s.q1 ?? 0)}%`, width: `${Math.max(pct(s.q3 ?? 0) - pct(s.q1 ?? 0), 1)}%` }}
              />
              <div
                className="absolute top-0.5 bottom-0.5 w-0.5 bg-foreground"
                style={{ left: `${pct(s.median ?? 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Correlation heatmap
  const cols = numeric.slice(0, 8);
  if (cols.length < 2) return <Empty message="Needs at least two numeric columns." />;
  const matrix = correlationMatrix(ds, cols);
  return (
    <div className="h-full overflow-auto scroll-slim">
      <table className="border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th />
            {cols.map((c) => (
              <th key={c} className="px-2 pb-2 text-left font-medium text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, i) => (
            <tr key={cols[i]}>
              <td className="pr-3 text-right font-medium text-muted-foreground">{cols[i]}</td>
              {row.map((v, j) => (
                <td
                  key={j}
                  className="h-12 min-w-[68px] rounded-lg text-center font-mono"
                  style={{
                    background:
                      v >= 0
                        ? `color-mix(in oklab, var(--chart-1) ${Math.abs(v) * 85}%, transparent)`
                        : `color-mix(in oklab, var(--chart-5) ${Math.abs(v) * 85}%, transparent)`,
                  }}
                >
                  {v.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ message = "Not enough data for this chart." }: { message?: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
