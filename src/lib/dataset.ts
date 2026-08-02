export type Row = Record<string, string | number | null>;

export type ColumnType = "numeric" | "categorical";

export interface ColumnProfile {
  name: string;
  type: ColumnType;
  missing: number;
  missingPct: number;
  unique: number;
  uniquePct: number;
  mean?: number;
  median?: number;
  mode?: string | number;
  std?: number;
  variance?: number;
  min?: number;
  max?: number;
  range?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  p5?: number;
  p95?: number;
  skewness?: number;
  kurtosis?: number;
  outliers?: number;
  outlierPct?: number;
  constant: boolean;
  highCardinality: boolean;
  idLike: boolean;
  top?: string;
  topCount?: number;
}


export interface Dataset {
  name: string;
  columns: string[];
  rows: Row[];
}

/* ------------------------------- CSV parsing ------------------------------ */

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", "?"]);

export function parseCsv(text: string, name: string): Dataset {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { name, columns: [], rows: [] };
  const columns = splitCsvLine(lines[0]).map((c, i) => c || `column_${i + 1}`);
  const rows: Row[] = lines.slice(1).map((line) => {
    const parts = splitCsvLine(line);
    const row: Row = {};
    columns.forEach((col, i) => {
      const raw = parts[i] ?? "";
      if (MISSING.has(raw.toLowerCase())) row[col] = null;
      else {
        const num = Number(raw);
        row[col] = raw !== "" && !Number.isNaN(num) ? num : raw;
      }
    });
    return row;
  });
  return { name, columns, rows };
}

export function toCsv(ds: Dataset): string {
  const esc = (v: string | number | null) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    ds.columns.join(","),
    ...ds.rows.map((r) => ds.columns.map((c) => esc(r[c])).join(",")),
  ].join("\n");
}

/* -------------------------------- profiling ------------------------------- */

const quantile = (sorted: number[], q: number) => {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
};

export function profileColumn(ds: Dataset, col: string): ColumnProfile {
  const values = ds.rows.map((r) => r[col]);
  const present = values.filter((v) => v !== null && v !== undefined && v !== "");
  const missing = values.length - present.length;
  const nums = present.filter((v) => typeof v === "number") as number[];
  const isNumeric = present.length > 0 && nums.length / present.length > 0.8;
  const unique = new Set(present.map(String)).size;
  const n = values.length || 1;

  const counts = new Map<string, number>();
  present.forEach((v) => counts.set(String(v), (counts.get(String(v)) ?? 0) + 1));
  const topEntry = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

  const base: ColumnProfile = {
    name: col,
    type: isNumeric ? "numeric" : "categorical",
    missing,
    missingPct: values.length ? (missing / values.length) * 100 : 0,
    unique,
    uniquePct: (unique / n) * 100,
    constant: unique <= 1,
    highCardinality: !isNumeric && unique > 50 && unique / n > 0.5,
    idLike: unique === values.length && values.length > 1,
    top: topEntry?.[0],
    topCount: topEntry?.[1],
  };

  if (isNumeric && nums.length) {
    const sorted = [...nums].sort((a, b) => a - b);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
    const std = Math.sqrt(variance);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lo = q1 - 1.5 * iqr;
    const hi = q3 + 1.5 * iqr;
    const outliers = nums.filter((v) => v < lo || v > hi).length;
    const m3 = nums.reduce((a, b) => a + (b - mean) ** 3, 0) / nums.length;
    const m4 = nums.reduce((a, b) => a + (b - mean) ** 4, 0) / nums.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return {
      ...base,
      mean,
      std,
      variance,
      min,
      max,
      range: max - min,
      median: quantile(sorted, 0.5),
      mode: topEntry ? Number(topEntry[0]) : undefined,
      q1,
      q3,
      iqr,
      p5: quantile(sorted, 0.05),
      p95: quantile(sorted, 0.95),
      skewness: std ? m3 / std ** 3 : 0,
      kurtosis: std ? m4 / std ** 4 - 3 : 0,
      outliers,
      outlierPct: (outliers / nums.length) * 100,
    };
  }

  return { ...base, mode: topEntry?.[0] };
}


export function profileDataset(ds: Dataset): ColumnProfile[] {
  return ds.columns.map((c) => profileColumn(ds, c));
}

export function duplicateCount(ds: Dataset): number {
  const seen = new Set<string>();
  let dups = 0;
  ds.rows.forEach((r) => {
    const key = ds.columns.map((c) => String(r[c])).join("\u0001");
    if (seen.has(key)) dups++;
    else seen.add(key);
  });
  return dups;
}

export function qualityScore(ds: Dataset) {
  if (!ds.rows.length) return { score: 0, completeness: 0, uniqueness: 0, consistency: 0 };
  const profiles = profileDataset(ds);
  const cells = ds.rows.length * Math.max(ds.columns.length, 1);
  const missing = profiles.reduce((a, p) => a + p.missing, 0);
  const completeness = 100 - (missing / cells) * 100;
  const uniqueness = 100 - (duplicateCount(ds) / ds.rows.length) * 100;
  const constant = profiles.filter((p) => p.unique <= 1).length;
  const consistency = 100 - (constant / Math.max(profiles.length, 1)) * 100;
  return {
    score: Math.round(completeness * 0.5 + uniqueness * 0.3 + consistency * 0.2),
    completeness: Math.round(completeness),
    uniqueness: Math.round(uniqueness),
    consistency: Math.round(consistency),
  };
}

export function correlationMatrix(ds: Dataset, cols: string[]) {
  const series = cols.map((c) => ds.rows.map((r) => (typeof r[c] === "number" ? (r[c] as number) : NaN)));
  const corr = (a: number[], b: number[]) => {
    const pairs = a.map((v, i) => [v, b[i]]).filter(([x, y]) => !Number.isNaN(x) && !Number.isNaN(y));
    const n = pairs.length;
    if (n < 2) return 0;
    const ma = pairs.reduce((s, p) => s + p[0], 0) / n;
    const mb = pairs.reduce((s, p) => s + p[1], 0) / n;
    let num = 0,
      da = 0,
      db = 0;
    pairs.forEach(([x, y]) => {
      num += (x - ma) * (y - mb);
      da += (x - ma) ** 2;
      db += (y - mb) ** 2;
    });
    return da && db ? num / Math.sqrt(da * db) : 0;
  };
  return cols.map((_, i) => cols.map((__, j) => corr(series[i], series[j])));
}

export function histogram(ds: Dataset, col: string, bins = 12) {
  const nums = ds.rows.map((r) => r[col]).filter((v): v is number => typeof v === "number");
  if (!nums.length) return [];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const width = (max - min) / bins || 1;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    label: (min + i * width).toFixed(1),
    count: 0,
  }));
  nums.forEach((v) => {
    const idx = Math.min(bins - 1, Math.floor((v - min) / width));
    buckets[idx].count++;
  });
  return buckets;
}

export function categoryCounts(ds: Dataset, col: string, limit = 8) {
  const counts = new Map<string, number>();
  ds.rows.forEach((r) => {
    const v = r[col];
    if (v === null || v === "") return;
    counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, value]) => ({ name, value }));
}

export function boxStats(ds: Dataset, col: string) {
  const p = profileColumn(ds, col);
  return p;
}

/* -------------------------------- pipeline -------------------------------- */

export type OperationId =
  | "missing"
  | "encoding"
  | "scaling"
  | "outliers"
  | "duplicates"
  | "feature-selection"
  | "datatype"
  | "text"
  | "rounding"
  | "rename";

export interface Step {
  id: string;
  op: OperationId;
  column: string;
  method: string;
  /** Free-text parameter for methods that need one (custom fill, rename, replace). */
  value?: string;
}


export const OPERATIONS: {
  id: OperationId;
  label: string;
  icon: string;
  description: string;
  methods: { value: string; label: string }[];
  columnScope: "all" | "numeric" | "categorical" | "none";
}[] = [
  {
    id: "missing",
    label: "Missing Values",
    icon: "🧹",
    description: "Impute or drop rows containing empty cells.",
    methods: [
      { value: "mean", label: "Mean" },
      { value: "median", label: "Median" },
      { value: "mode", label: "Mode" },
      { value: "zero", label: "Constant zero" },
      { value: "custom", label: "Custom value" },
      { value: "drop", label: "Drop rows" },

    ],
    columnScope: "all",
  },
  {
    id: "encoding",
    label: "Encoding",
    icon: "🔤",
    description: "Convert categorical text into model-ready numbers.",
    methods: [
      { value: "onehot", label: "One Hot" },
      { value: "label", label: "Label" },
      { value: "ordinal", label: "Ordinal" },
    ],
    columnScope: "categorical",
  },
  {
    id: "scaling",
    label: "Scaling",
    icon: "📏",
    description: "Put numeric features on a comparable scale.",
    methods: [
      { value: "standard", label: "Standard (z-score)" },
      { value: "minmax", label: "Min-Max" },
      { value: "robust", label: "Robust" },
    ],
    columnScope: "numeric",
  },
  {
    id: "outliers",
    label: "Outliers",
    icon: "🎯",
    description: "Detect and treat extreme numeric values.",
    methods: [
      { value: "iqr-remove", label: "IQR — remove rows" },
      { value: "iqr-clip", label: "IQR — clip to bounds" },
      { value: "zscore-remove", label: "Z-score > 3 — remove" },
    ],
    columnScope: "numeric",
  },
  {
    id: "duplicates",
    label: "Duplicates",
    icon: "🧬",
    description: "Remove repeated records from the dataset.",
    methods: [
      { value: "all", label: "Full row match" },
      { value: "column", label: "Match on column" },
    ],
    columnScope: "all",
  },
  {
    id: "feature-selection",
    label: "Feature Selection",
    icon: "🧭",
    description: "Keep only the columns that matter.",
    methods: [
      { value: "drop", label: "Drop column" },
      { value: "keep", label: "Keep only column" },
    ],
    columnScope: "all",
  },
  {
    id: "datatype",
    label: "Data Type",
    icon: "🔧",
    description: "Cast a column to another storage type.",
    methods: [
      { value: "numeric", label: "To numeric" },
      { value: "text", label: "To text" },
      { value: "integer", label: "To integer" },
    ],
    columnScope: "all",
  },
  {
    id: "text",
    label: "Text Cleaning",
    icon: "🔡",
    description: "Normalise text values: trim, case, or find & replace.",
    methods: [
      { value: "trim", label: "Trim whitespace" },
      { value: "lower", label: "Lowercase" },
      { value: "upper", label: "Uppercase" },
      { value: "replace", label: "Replace text" },
    ],
    columnScope: "all",
  },
  {
    id: "rounding",
    label: "Round & Clip",
    icon: "🔢",
    description: "Round numeric precision or clip values to percentile bounds.",
    methods: [
      { value: "round0", label: "Round to integer" },
      { value: "round2", label: "Round to 2 decimals" },
      { value: "clip-p5p95", label: "Clip to P5–P95" },
      { value: "clip-custom", label: "Clip to max value" },
    ],
    columnScope: "numeric",
  },
  {
    id: "rename",
    label: "Rename Column",
    icon: "🏷️",
    description: "Give a column a clearer, model-friendly name.",
    methods: [{ value: "rename", label: "Rename to" }],
    columnScope: "all",
  },
];

/** Methods that require the free-text `value` parameter. */
export const METHODS_WITH_VALUE = new Set([
  "custom",
  "replace",
  "rename",
  "clip-custom",
]);


export const opMeta = (id: OperationId) => OPERATIONS.find((o) => o.id === id)!;
export const methodLabel = (op: OperationId, method: string) =>
  opMeta(op).methods.find((m) => m.value === method)?.label ?? method;

function applyStep(ds: Dataset, step: Step): Dataset {
  const rows = ds.rows.map((r) => ({ ...r }));
  let columns = [...ds.columns];
  const col = step.column;
  const profile = ds.columns.includes(col) ? profileColumn(ds, col) : null;

  switch (step.op) {
    case "missing": {
      if (step.method === "drop")
        return { ...ds, rows: rows.filter((r) => r[col] !== null && r[col] !== "") };
      let fill: string | number = 0;
      if (step.method === "mean") fill = Number((profile?.mean ?? 0).toFixed(4));
      else if (step.method === "median") fill = Number((profile?.median ?? 0).toFixed(4));
      else if (step.method === "mode") fill = profile?.top ?? 0;
      else if (step.method === "custom") {
        const raw = step.value ?? "";
        const n = Number(raw);
        fill = raw !== "" && !Number.isNaN(n) ? n : raw;
      }

      rows.forEach((r) => {
        if (r[col] === null || r[col] === "") r[col] = fill;
      });
      return { ...ds, rows };
    }
    case "encoding": {
      const values = [...new Set(rows.map((r) => String(r[col] ?? "missing")))].sort();
      if (step.method === "onehot") {
        const newCols = values.map((v) => `${col}_${v}`);
        rows.forEach((r) => {
          values.forEach((v) => (r[`${col}_${v}`] = String(r[col] ?? "missing") === v ? 1 : 0));
          delete r[col];
        });
        columns = columns.flatMap((c) => (c === col ? newCols : [c]));
      } else {
        const map = new Map(values.map((v, i) => [v, i]));
        rows.forEach((r) => (r[col] = map.get(String(r[col] ?? "missing")) ?? 0));
      }
      return { ...ds, columns, rows };
    }
    case "scaling": {
      const { mean = 0, std = 1, min = 0, max = 1, median = 0, q1 = 0, q3 = 1 } = profile ?? {};
      rows.forEach((r) => {
        const v = r[col];
        if (typeof v !== "number") return;
        if (step.method === "standard") r[col] = Number(((v - mean) / (std || 1)).toFixed(4));
        else if (step.method === "minmax")
          r[col] = Number(((v - min) / ((max - min) || 1)).toFixed(4));
        else r[col] = Number(((v - median) / ((q3 - q1) || 1)).toFixed(4));
      });
      return { ...ds, rows };
    }
    case "outliers": {
      const { q1 = 0, q3 = 0, mean = 0, std = 1 } = profile ?? {};
      const iqr = q3 - q1;
      const lo = q1 - 1.5 * iqr;
      const hi = q3 + 1.5 * iqr;
      if (step.method === "iqr-clip") {
        rows.forEach((r) => {
          const v = r[col];
          if (typeof v === "number") r[col] = Math.min(hi, Math.max(lo, v));
        });
        return { ...ds, rows };
      }
      const keep = rows.filter((r) => {
        const v = r[col];
        if (typeof v !== "number") return true;
        return step.method === "iqr-remove"
          ? v >= lo && v <= hi
          : Math.abs((v - mean) / (std || 1)) <= 3;
      });
      return { ...ds, rows: keep };
    }
    case "duplicates": {
      const seen = new Set<string>();
      const keep = rows.filter((r) => {
        const key =
          step.method === "all" ? columns.map((c) => String(r[c])).join("\u0001") : String(r[col]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return { ...ds, rows: keep };
    }
    case "feature-selection": {
      if (step.method === "drop") {
        columns = columns.filter((c) => c !== col);
        rows.forEach((r) => delete r[col]);
      } else {
        columns = columns.filter((c) => c === col);
        rows.forEach((r) =>
          Object.keys(r).forEach((k) => {
            if (k !== col) delete r[k];
          }),
        );
      }
      return { ...ds, columns, rows };
    }
    case "datatype": {
      rows.forEach((r) => {
        const v = r[col];
        if (v === null) return;
        if (step.method === "text") r[col] = String(v);
        else {
          const n = Number(v);
          r[col] = Number.isNaN(n) ? null : step.method === "integer" ? Math.round(n) : n;
        }
      });
      return { ...ds, rows };
    }
    case "text": {
      const [find, repl] = (step.value ?? "").split("=>").map((s) => s.trim());
      rows.forEach((r) => {
        const v = r[col];
        if (v === null || v === undefined) return;
        let s = String(v);
        if (step.method === "trim") s = s.trim();
        else if (step.method === "lower") s = s.toLowerCase();
        else if (step.method === "upper") s = s.toUpperCase();
        else if (step.method === "replace" && find) s = s.split(find).join(repl ?? "");
        r[col] = s;
      });
      return { ...ds, rows };
    }
    case "rounding": {
      const { p5 = 0, p95 = 0 } = profile ?? {};
      const cap = Number(step.value);
      rows.forEach((r) => {
        const v = r[col];
        if (typeof v !== "number") return;
        if (step.method === "round0") r[col] = Math.round(v);
        else if (step.method === "round2") r[col] = Number(v.toFixed(2));
        else if (step.method === "clip-p5p95") r[col] = Math.min(p95, Math.max(p5, v));
        else if (!Number.isNaN(cap)) r[col] = Math.min(cap, v);
      });
      return { ...ds, rows };
    }
    case "rename": {
      const next = (step.value ?? "").trim();
      if (!next || next === col || columns.includes(next)) return ds;
      columns = columns.map((c) => (c === col ? next : c));
      rows.forEach((r) => {
        r[next] = r[col] ?? null;
        delete r[col];
      });
      return { ...ds, columns, rows };
    }
    default:
      return ds;

  }
}

export function runPipeline(ds: Dataset, steps: Step[]): Dataset {
  return steps.reduce((acc, s) => applyStep(acc, s), ds);
}

/* ------------------------------ ML readiness ------------------------------ */

export function mlReadiness(ds: Dataset) {
  const profiles = profileDataset(ds);
  const numeric = profiles.filter((p) => p.type === "numeric").length;
  const categorical = profiles.length - numeric;
  const missingCols = profiles.filter((p) => p.missing > 0).length;
  const checks = [
    {
      label: "No missing values",
      passed: missingCols === 0,
      detail: missingCols === 0 ? "All cells populated" : `${missingCols} column(s) contain gaps`,
    },
    {
      label: "All features numeric",
      passed: categorical === 0,
      detail: categorical === 0 ? "Fully model-ready" : `${categorical} categorical column(s) need encoding`,
    },
    {
      label: "No duplicate records",
      passed: duplicateCount(ds) === 0,
      detail: `${duplicateCount(ds)} duplicate row(s)`,
    },
    {
      label: "No constant columns",
      passed: profiles.every((p) => p.unique > 1),
      detail: `${profiles.filter((p) => p.unique <= 1).length} zero-variance column(s)`,
    },
    {
      label: "Sufficient sample size",
      passed: ds.rows.length >= 50,
      detail: `${ds.rows.length} rows available`,
    },
    {
      label: "Features on comparable scale",
      passed: profiles
        .filter((p) => p.type === "numeric")
        .every((p) => Math.abs(p.max ?? 0) <= 10 && Math.abs(p.min ?? 0) <= 10),
      detail: "Checks numeric ranges within ±10",
    },
  ];
  const score = Math.round((checks.filter((c) => c.passed).length / checks.length) * 100);
  return { checks, score, numeric, categorical };
}

export function aiInsights(ds: Dataset): string[] {
  const profiles = profileDataset(ds);
  const out: string[] = [];
  const worst = [...profiles].sort((a, b) => b.missingPct - a.missingPct)[0];
  if (worst && worst.missingPct > 0)
    out.push(
      `"${worst.name}" has the highest gap rate at ${worst.missingPct.toFixed(1)}% — median imputation keeps its distribution intact.`,
    );
  const cats = profiles.filter((p) => p.type === "categorical");
  if (cats.length)
    out.push(
      `${cats.length} categorical column(s) detected (${cats
        .slice(0, 3)
        .map((c) => c.name)
        .join(", ")}). One-hot encoding is recommended where cardinality stays under 10.`,
    );
  const skewed = profiles.find(
    (p) => p.type === "numeric" && p.std && p.mean && Math.abs(p.mean - (p.median ?? 0)) > p.std * 0.5,
  );
  if (skewed)
    out.push(`"${skewed.name}" is skewed — a robust scaler will reduce the influence of its tail.`);
  const dups = duplicateCount(ds);
  if (dups) out.push(`${dups} duplicate record(s) found; deduplicating avoids leakage during training.`);
  const wide = profiles.filter((p) => p.unique === ds.rows.length && p.type !== "numeric");
  if (wide.length) out.push(`"${wide[0].name}" looks like an identifier and should be dropped before modelling.`);
  if (!out.length) out.push("Dataset looks clean — no structural issues detected across the current columns.");
  return out;
}
