import {
  correlationMatrix,
  duplicateCount,
  profileDataset,
  qualityScore,
  type ColumnProfile,
  type Dataset,
} from "./dataset";

export interface HealthSummary {
  rows: number;
  columns: number;
  cells: number;
  missing: number;
  missingPct: number;
  duplicates: number;
  duplicatePct: number;
  numeric: number;
  categorical: number;
  constant: string[];
  highCardinality: string[];
  idLike: string[];
  outlierColumns: number;
  health: number;
  profiles: ColumnProfile[];
}

export function healthSummary(ds: Dataset): HealthSummary {
  const profiles = profileDataset(ds);
  const rows = ds.rows.length;
  const columns = ds.columns.length;
  const cells = rows * Math.max(columns, 1);
  const missing = profiles.reduce((a, p) => a + p.missing, 0);
  const duplicates = duplicateCount(ds);
  return {
    rows,
    columns,
    cells,
    missing,
    missingPct: cells ? (missing / cells) * 100 : 0,
    duplicates,
    duplicatePct: rows ? (duplicates / rows) * 100 : 0,
    numeric: profiles.filter((p) => p.type === "numeric").length,
    categorical: profiles.filter((p) => p.type === "categorical").length,
    constant: profiles.filter((p) => p.constant).map((p) => p.name),
    highCardinality: profiles.filter((p) => p.highCardinality).map((p) => p.name),
    idLike: profiles.filter((p) => p.idLike).map((p) => p.name),
    outlierColumns: profiles.filter((p) => (p.outliers ?? 0) > 0).length,
    health: qualityScore(ds).score,
    profiles,
  };
}

/** Top absolute Pearson correlations between numeric columns. */
export function strongestRelationships(ds: Dataset, limit = 6) {
  const cols = profileDataset(ds)
    .filter((p) => p.type === "numeric" && !p.constant)
    .map((p) => p.name)
    .slice(0, 15);
  if (cols.length < 2) return [];
  const m = correlationMatrix(ds, cols);
  const out: { a: string; b: string; r: number }[] = [];
  for (let i = 0; i < cols.length; i++)
    for (let j = i + 1; j < cols.length; j++) out.push({ a: cols[i], b: cols[j], r: m[i][j] });
  return out.sort((x, y) => Math.abs(y.r) - Math.abs(x.r)).slice(0, limit);
}

export function covariance(ds: Dataset, a: string, b: string) {
  const pairs = ds.rows
    .map((r) => [r[a], r[b]])
    .filter(([x, y]) => typeof x === "number" && typeof y === "number") as [number, number][];
  if (pairs.length < 2) return 0;
  const ma = pairs.reduce((s, p) => s + p[0], 0) / pairs.length;
  const mb = pairs.reduce((s, p) => s + p[1], 0) / pairs.length;
  return pairs.reduce((s, p) => s + (p[0] - ma) * (p[1] - mb), 0) / pairs.length;
}

/* --------------------------- ML readiness report -------------------------- */

export type Status = "pass" | "warn" | "fail";

export interface ReadinessCheck {
  category: string;
  label: string;
  status: Status;
  detail: string;
  action?: string;
}

export interface ReadinessReport {
  score: number;
  categories: { name: string; score: number }[];
  checks: ReadinessCheck[];
  actions: string[];
  numeric: number;
  categorical: number;
}

const weight = (s: Status) => (s === "pass" ? 1 : s === "warn" ? 0.5 : 0);

export function readinessReport(ds: Dataset, target?: string): ReadinessReport {
  const h = healthSummary(ds);
  const p = h.profiles;
  const checks: ReadinessCheck[] = [];

  /* Completeness */
  checks.push({
    category: "Completeness",
    label: "Missing values",
    status: h.missingPct === 0 ? "pass" : h.missingPct < 5 ? "warn" : "fail",
    detail: `${h.missing.toLocaleString()} missing cells (${h.missingPct.toFixed(1)}%)`,
    action: h.missing ? "Impute or drop missing values in Preprocessing." : undefined,
  });
  checks.push({
    category: "Completeness",
    label: "Fully populated columns",
    status: p.every((c) => c.missing === 0)
      ? "pass"
      : p.filter((c) => c.missingPct > 40).length
        ? "fail"
        : "warn",
    detail: `${p.filter((c) => c.missing > 0).length} of ${p.length} columns have gaps`,
    action: p.some((c) => c.missingPct > 40)
      ? "Consider dropping columns with more than 40% missing data."
      : undefined,
  });

  /* Data Quality */
  checks.push({
    category: "Data Quality",
    label: "Duplicate rows",
    status: h.duplicates === 0 ? "pass" : h.duplicatePct < 2 ? "warn" : "fail",
    detail: `${h.duplicates} duplicate row(s) (${h.duplicatePct.toFixed(1)}%)`,
    action: h.duplicates ? "Run the Duplicates operation to deduplicate." : undefined,
  });
  checks.push({
    category: "Data Quality",
    label: "Outliers",
    status: h.outlierColumns === 0 ? "pass" : h.outlierColumns <= 2 ? "warn" : "fail",
    detail: `${h.outlierColumns} numeric column(s) contain IQR outliers`,
    action: h.outlierColumns ? "Clip or remove outliers before training." : undefined,
  });
  checks.push({
    category: "Data Quality",
    label: "Dataset size",
    status: h.rows >= 500 ? "pass" : h.rows >= 50 ? "warn" : "fail",
    detail: `${h.rows.toLocaleString()} rows available`,
    action: h.rows < 50 ? "Collect more samples — models need volume to generalise." : undefined,
  });

  /* Feature Quality */
  checks.push({
    category: "Feature Quality",
    label: "Constant columns",
    status: h.constant.length === 0 ? "pass" : "fail",
    detail: h.constant.length ? h.constant.join(", ") : "No zero-variance columns",
    action: h.constant.length ? "Drop zero-variance columns — they carry no signal." : undefined,
  });
  checks.push({
    category: "Feature Quality",
    label: "High-cardinality columns",
    status: h.highCardinality.length === 0 ? "pass" : "warn",
    detail: h.highCardinality.length
      ? h.highCardinality.join(", ")
      : "No high-cardinality categoricals",
    action: h.highCardinality.length ? "Group rare levels or use target encoding." : undefined,
  });
  checks.push({
    category: "Feature Quality",
    label: "Identifier columns",
    status: h.idLike.length === 0 ? "pass" : "warn",
    detail: h.idLike.length ? `${h.idLike.join(", ")} look like IDs` : "No ID-like columns",
    action: h.idLike.length ? "Drop identifier columns to avoid leakage." : undefined,
  });
  checks.push({
    category: "Feature Quality",
    label: "Feature count",
    status: h.columns >= 3 ? "pass" : h.columns >= 2 ? "warn" : "fail",
    detail: `${h.columns} columns (${h.numeric} numeric · ${h.categorical} categorical)`,
  });

  /* Preprocessing Requirements */
  checks.push({
    category: "Preprocessing",
    label: "Categorical encoding",
    status: h.categorical === 0 ? "pass" : h.categorical <= 3 ? "warn" : "fail",
    detail: h.categorical
      ? `${h.categorical} column(s) still need encoding`
      : "All features are numeric",
    action: h.categorical ? "Apply label or one-hot encoding." : undefined,
  });
  const unscaled = p.filter(
    (c) => c.type === "numeric" && (Math.abs(c.max ?? 0) > 10 || Math.abs(c.min ?? 0) > 10),
  );
  checks.push({
    category: "Preprocessing",
    label: "Feature scaling",
    status: unscaled.length === 0 ? "pass" : unscaled.length <= 2 ? "warn" : "fail",
    detail: unscaled.length
      ? `${unscaled.length} column(s) outside ±10 range`
      : "Numeric ranges are comparable",
    action: unscaled.length ? "Standardise or min-max scale numeric features." : undefined,
  });
  const skewed = p.filter((c) => Math.abs(c.skewness ?? 0) > 1);
  checks.push({
    category: "Preprocessing",
    label: "Distribution skew",
    status: skewed.length === 0 ? "pass" : "warn",
    detail: skewed.length ? `${skewed.length} strongly skewed column(s)` : "Distributions look balanced",
    action: skewed.length ? "A robust scaler reduces the influence of long tails." : undefined,
  });

  /* Target Quality */
  if (target) {
    const t = p.find((c) => c.name === target);
    const counts = new Map<string, number>();
    ds.rows.forEach((r) => {
      const v = r[target];
      if (v === null || v === undefined || v === "") return;
      counts.set(String(v), (counts.get(String(v)) ?? 0) + 1);
    });
    const freq = [...counts.values()].sort((a, b) => b - a);
    const imbalance = freq.length > 1 ? freq[0] / freq[freq.length - 1] : 1;
    const isClassification = (t?.unique ?? 0) <= 20;
    checks.push({
      category: "Target Quality",
      label: "Target completeness",
      status: (t?.missing ?? 0) === 0 ? "pass" : "fail",
      detail: `${t?.missing ?? 0} missing target value(s)`,
      action: t?.missing ? "Rows without a target value cannot be trained on." : undefined,
    });
    checks.push({
      category: "Target Quality",
      label: "Target suitability",
      status: (t?.unique ?? 0) > 1 ? "pass" : "fail",
      detail: isClassification
        ? `Classification target with ${t?.unique} class(es)`
        : `Regression target · range ${t?.min?.toFixed(2)} – ${t?.max?.toFixed(2)}`,
      action: (t?.unique ?? 0) <= 1 ? "A constant target cannot be modelled." : undefined,
    });
    if (isClassification)
      checks.push({
        category: "Target Quality",
        label: "Class balance",
        status: imbalance <= 1.5 ? "pass" : imbalance <= 4 ? "warn" : "fail",
        detail: `Majority:minority ratio ${imbalance.toFixed(1)}:1`,
        action: imbalance > 1.5 ? "Resample or use class weights to correct imbalance." : undefined,
      });
    const leak = p.find(
      (c) => c.name !== target && c.type === "numeric" && t?.type === "numeric" && c.idLike,
    );
    checks.push({
      category: "Target Quality",
      label: "Leakage signals",
      status: leak ? "warn" : "pass",
      detail: leak ? `"${leak.name}" is row-unique and may leak` : "No deterministic leakage detected",
      action: leak ? `Review "${leak.name}" before training.` : undefined,
    });
  } else {
    checks.push({
      category: "Target Quality",
      label: "Target column",
      status: "warn",
      detail: "No target selected",
      action: "Select a target column to evaluate balance and leakage.",
    });
  }

  const categories = [...new Set(checks.map((c) => c.category))].map((name) => {
    const group = checks.filter((c) => c.category === name);
    return {
      name,
      score: Math.round((group.reduce((a, c) => a + weight(c.status), 0) / group.length) * 100),
    };
  });

  return {
    score: Math.round((checks.reduce((a, c) => a + weight(c.status), 0) / checks.length) * 100),
    categories,
    checks,
    actions: [...new Set(checks.map((c) => c.action).filter(Boolean) as string[])],
    numeric: h.numeric,
    categorical: h.categorical,
  };
}
