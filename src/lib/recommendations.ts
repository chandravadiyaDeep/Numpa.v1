import {
  duplicateCount,
  methodLabel,
  opMeta,
  profileDataset,
  type ColumnProfile,
  type Dataset,
  type OperationId,
  type Step,
} from "./dataset";

export interface RecoOption {
  op: OperationId;
  method: string;
  value?: string;
  label: string;
}

export interface Recommendation {
  id: string;
  column: string;
  scope: "column" | "dataset";
  issue: string;
  why: string;
  action: RecoOption;
  alternatives: RecoOption[];
}

const opt = (op: OperationId, method: string, value?: string): RecoOption => ({
  op,
  method,
  value,
  label: `${opMeta(op).label} · ${methodLabel(op, method)}${value ? ` (${value})` : ""}`,
});

/** Every method of an operation except the recommended one, as alternatives. */
const othersOf = (op: OperationId, exclude: string) =>
  opMeta(op)
    .methods.filter((m) => m.value !== exclude && m.value !== "custom" && m.value !== "replace")
    .map((m) => opt(op, m.value));

function columnRecos(p: ColumnProfile, rowCount: number): Recommendation[] {
  const out: Recommendation[] = [];
  const push = (
    key: string,
    issue: string,
    why: string,
    action: RecoOption,
    alternatives: RecoOption[],
  ) => out.push({ id: `${p.name}::${key}`, column: p.name, scope: "column", issue, why, action, alternatives });

  // ID-like / constant columns → drop
  if (p.idLike || p.constant) {
    push(
      "drop",
      p.constant ? "Constant column (single repeated value)" : "ID-like column (all values unique)",
      p.constant
        ? "A column with one value carries no signal and only adds noise to models."
        : "Identifiers are unique per row, so a model memorises them instead of learning patterns.",
      opt("feature-selection", "drop"),
      [opt("rename", "rename", `${p.name}_id`), opt("datatype", "text")],
    );
    return out;
  }

  // Missing values
  if (p.missing > 0) {
    const heavy = p.missingPct > 50;
    const skewed = Math.abs(p.skewness ?? 0) > 1;
    const action = heavy
      ? opt("feature-selection", "drop")
      : p.type === "numeric"
        ? opt("missing", skewed ? "median" : "mean")
        : opt("missing", "mode");
    push(
      "missing",
      `${p.missing.toLocaleString()} missing values (${p.missingPct.toFixed(1)}%)`,
      heavy
        ? "More than half the column is empty, so imputing would invent most of the data."
        : p.type === "numeric"
          ? skewed
            ? `Distribution is skewed (skew ${(p.skewness ?? 0).toFixed(2)}), so the median is more robust than the mean.`
            : "The distribution is roughly symmetric, so the mean preserves the column's centre."
          : "Text columns have no average — the most frequent category is the safest fill.",
      action,
      [
        ...othersOf("missing", action.op === "missing" ? action.method : ""),
        opt("feature-selection", "drop"),
      ].filter((a) => a.label !== action.label),
    );
  }

  // Outliers
  if (p.type === "numeric" && (p.outlierPct ?? 0) > 2) {
    push(
      "outliers",
      `${p.outliers?.toLocaleString()} outliers (${(p.outlierPct ?? 0).toFixed(1)}% beyond 1.5×IQR)`,
      (p.outlierPct ?? 0) > 10
        ? "Extremes are common here, so clipping keeps the rows while limiting their influence."
        : "A few extreme values can dominate scaling and model fitting; clipping to IQR bounds tames them.",
      opt("outliers", "iqr-clip"),
      [...othersOf("outliers", "iqr-clip"), opt("rounding", "clip-p5p95")],
    );
  }

  // Datatype correction — numeric-looking text
  if (p.type === "categorical" && p.unique > 0) {
    const looksNumeric = p.top !== undefined && p.top !== "" && !Number.isNaN(Number(p.top));
    if (looksNumeric)
      push(
        "datatype",
        "Numbers stored as text",
        "Numeric values kept as text break statistics, scaling and most model inputs.",
        opt("datatype", "numeric"),
        [opt("datatype", "integer"), opt("text", "trim")],
      );
  }

  // Encoding for categorical
  if (p.type === "categorical" && !p.idLike && p.unique > 1) {
    const many = p.unique > 15 || p.highCardinality;
    const action = many ? opt("encoding", "label") : opt("encoding", "onehot");
    push(
      "encoding",
      `Categorical column with ${p.unique.toLocaleString()} distinct values`,
      many
        ? "Too many categories for one-hot encoding — label encoding avoids exploding the column count."
        : "A small set of categories one-hot encodes cleanly into model-ready numeric flags.",
      action,
      othersOf("encoding", action.method),
    );
    push(
      "text",
      "Unnormalised text values",
      "Stray whitespace and mixed casing split the same category into several distinct values.",
      opt("text", "trim"),
      [opt("text", "lower"), opt("text", "upper")],
    );
  }

  // Scaling for wide-range numerics
  if (p.type === "numeric" && (p.range ?? 0) > 0) {
    const wide = (p.range ?? 0) > 100 || (p.std ?? 0) > 10;
    if (wide) {
      const heavyTails = (p.outlierPct ?? 0) > 5;
      const action = heavyTails ? opt("scaling", "robust") : opt("scaling", "standard");
      push(
        "scaling",
        `Wide value range (${(p.min ?? 0).toLocaleString()} → ${(p.max ?? 0).toLocaleString()})`,
        heavyTails
          ? "Outliers distort mean/std, so robust scaling on median and IQR is safer."
          : "Distance-based models need comparable scales; z-score centres the column at 0 with unit spread.",
        action,
        othersOf("scaling", action.method),
      );
    }
  }

  // Precision noise
  if (p.type === "numeric" && rowCount > 0 && (p.std ?? 0) > 0 && (p.max ?? 0) < 1e6) {
    // only suggest rounding when values look like long decimals
    const sample = p.mean ?? 0;
    if (String(sample).split(".")[1]?.length > 4)
      push(
        "rounding",
        "Excessive decimal precision",
        "Long floating point tails add noise without adding information.",
        opt("rounding", "round2"),
        [opt("rounding", "round0")],
      );
  }

  return out;
}

export function buildRecommendations(ds: Dataset, steps: Step[]): Recommendation[] {
  if (!ds || ds.rows.length === 0) return [];
  const recos: Recommendation[] = [];

  const dups = duplicateCount(ds);
  if (dups > 0)
    recos.push({
      id: "__dataset::duplicates",
      column: "Entire dataset",
      scope: "dataset",
      issue: `${dups.toLocaleString()} duplicate rows (${((dups / ds.rows.length) * 100).toFixed(1)}%)`,
      why: "Repeated records bias statistics and let models over-weight the same observation.",
      action: opt("duplicates", "all"),
      alternatives: [opt("duplicates", "column")],
    });

  profileDataset(ds).forEach((p) => recos.push(...columnRecos(p, ds.rows.length)));

  // Hide recommendations whose operation is already queued for that column.
  const applied = new Set(steps.map((s) => `${s.column}::${s.op}`));
  return recos.filter(
    (r) => !applied.has(`${r.scope === "dataset" ? ds.columns[0] : r.column}::${r.action.op}`),
  );
}
