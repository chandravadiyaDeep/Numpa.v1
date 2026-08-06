import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Download,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Trash2,
  Undo2,
} from "lucide-react";
import { PageShell } from "@/components/uda/PageShell";
import { ExportMenu } from "@/components/uda/ExportMenu";
import { DATA_FORMATS, exportDataset } from "@/lib/export";
import { OpIcon } from "@/components/uda/OpIcon";
import { SmartRecommendations } from "@/components/uda/SmartRecommendations";
import { store, useStudio } from "@/lib/studio-store";
import {
  METHODS_WITH_VALUE,
  OPERATIONS,
  methodLabel,
  opMeta,
  profileDataset,
  
  type OperationId,
} from "@/lib/dataset";


export const Route = createFileRoute("/_authenticated/preprocessing")({
  head: () => ({
    meta: [
      { title: "Data Preprocessing Studio — Numpa" },
      {
        name: "description",
        content:
          "Three-panel preprocessing workspace: pick an operation, configure it, stack steps into a pipeline and export a clean CSV.",
      },
      { property: "og:title", content: "Data Preprocessing Studio — Numpa" },
      {
        property: "og:description",
        content: "Build a reproducible CSV cleaning pipeline: impute, encode, scale, dedupe, export.",
      },
    ],
  }),
  component: PreprocessingPage,
});

const VALUE_HINT: Record<string, { label: string; placeholder: string }> = {
  custom: { label: "Fill value", placeholder: "e.g. unknown or 0" },
  replace: { label: "Find => replace", placeholder: "old => new" },
  rename: { label: "New column name", placeholder: "e.g. fare_amount" },
  "clip-custom": { label: "Maximum value", placeholder: "e.g. 100" },
};

function PreprocessingPage() {
  const { dataset, steps, processed, past, future } = useStudio();
  const [op, setOp] = useState<OperationId>("missing");
  const [column, setColumn] = useState("");
  const [method, setMethod] = useState("median");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const meta = opMeta(op);
  const profiles = useMemo(() => (dataset ? profileDataset(dataset) : []), [dataset]);
  const columns = useMemo(() => {
    if (meta.columnScope === "numeric") return profiles.filter((p) => p.type === "numeric").map((p) => p.name);
    if (meta.columnScope === "categorical")
      return profiles.filter((p) => p.type === "categorical").map((p) => p.name);
    return profiles.map((p) => p.name);
  }, [profiles, meta.columnScope]);

  const activeColumn = column && columns.includes(column) ? column : (columns[0] ?? "");
  const activeMethod = meta.methods.some((m) => m.value === method) ? method : meta.methods[0].value;
  const hint = VALUE_HINT[activeMethod];
  const needsValue = METHODS_WITH_VALUE.has(activeMethod);

  const selectOp = (id: OperationId) => {
    setOp(id);
    setColumn("");
    setMethod(opMeta(id).methods[0].value);
    setValue("");
    setEditingId(null);
  };

  const submit = () => {
    if (!activeColumn || (needsValue && !value.trim())) return;
    const patch = {
      op,
      column: activeColumn,
      method: activeMethod,
      value: needsValue ? value.trim() : undefined,
    };
    if (editingId) {
      store.updateStep(editingId, patch);
      setEditingId(null);
    } else {
      store.addStep({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, ...patch });
    }
    setValue("");
  };



  const preview = processed
    ? { columns: processed.columns.slice(0, 12), rows: processed.rows.slice(0, 10) }
    : null;

  return (
    <PageShell
      title="Data Preprocessing Studio"
      subtitle="Select an operation, configure it, and stack steps into a reproducible pipeline."
    >
      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        {/* LEFT — operations */}
        <aside className="panel h-fit p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operations
          </h2>
          <div className="mt-4 space-y-1.5">
            {OPERATIONS.map((o) => (
              <button
                key={o.id}
                onClick={() => selectOp(o.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors ${
                  op === o.id
                    ? "bg-primary/15 text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <OpIcon op={o.id} className="h-4 w-4 text-cyan" />
                {o.label}
              </button>
            ))}
          </div>
        </aside>

        {/* CENTER — configuration */}
        <section className="panel p-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuration
          </h2>
          <div className="mt-5 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-secondary">
              <OpIcon op={op} className="h-5 w-5 text-cyan" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.description}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Column</span>
              <select
                value={activeColumn}
                onChange={(e) => setColumn(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none transition-colors focus:border-primary"
              >
                {columns.length === 0 && <option value="">No eligible column</option>}
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Method</span>
              <select
                value={activeMethod}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none transition-colors focus:border-primary"
              >
                {meta.methods.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {needsValue && (
            <label className="mt-5 block animate-in fade-in slide-in-from-top-1 duration-200">
              <span className="text-xs font-medium text-muted-foreground">
                {hint?.label ?? "Value"}
              </span>
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={hint?.placeholder}
                className="mt-2 h-11 w-full rounded-xl border bg-secondary/50 px-3 text-sm outline-none transition-colors focus:border-primary"
              />
            </label>
          )}

          <button
            onClick={submit}
            disabled={!activeColumn || (needsValue && !value.trim())}
            className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            {editingId ? "Save Step" : "Add Step"}
          </button>


          {editingId && (
            <button
              onClick={() => setEditingId(null)}
              className="ml-3 mt-8 inline-flex h-11 items-center rounded-xl border px-5 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              Cancel
            </button>
          )}
        </section>

        {/* RIGHT — pipeline */}
        <aside className="panel h-fit p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pipeline
            </h2>
            <div className="flex items-center gap-1.5">
              {[
                { icon: Undo2, label: "Undo", onClick: () => store.undo(), disabled: !past.length },
                { icon: Redo2, label: "Redo", onClick: () => store.redo(), disabled: !future.length },
                {
                  icon: RotateCcw,
                  label: "Reset pipeline",
                  onClick: () => store.reset(),
                  disabled: !steps.length && !processed,
                },
              ].map((b) => (
                <button
                  key={b.label}
                  title={b.label}
                  aria-label={b.label}
                  onClick={b.onClick}
                  disabled={b.disabled}
                  className="grid h-8 w-8 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <b.icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <span className="ml-1 rounded-full bg-secondary px-2.5 py-1 font-mono text-xs text-muted-foreground">
                {steps.length}
              </span>
            </div>
          </div>


          {steps.length === 0 ? (
            <p className="mt-6 rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
              No steps yet. Configure an operation and add it to the pipeline.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {steps.map((s, i) => (
                <li
                  key={s.id}
                  className={`rounded-xl border bg-secondary/40 p-4 transition-colors ${
                    editingId === s.id ? "border-primary" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <OpIcon op={s.op} className="h-4 w-4 shrink-0 text-cyan" />
                    <span className="min-w-0 truncate text-sm font-semibold">
                      {opMeta(s.op).label}
                    </span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Column</dt>
                      <dd className="mt-0.5 truncate font-medium">{s.column}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Method</dt>
                      <dd className="mt-0.5 truncate font-medium">
                        {methodLabel(s.op, s.method)}
                        {s.value ? <span className="text-cyan"> · {s.value}</span> : null}
                      </dd>

                    </div>
                  </dl>
                  <div className="mt-4 flex items-center gap-1.5">
                    {[
                      {
                        icon: Pencil,
                        label: "Edit",
                        onClick: () => {
                          setOp(s.op);
                          setColumn(s.column);
                          setMethod(s.method);
                          setValue(s.value ?? "");
                          setEditingId(s.id);
                        },

                      },
                      { icon: Trash2, label: "Delete", onClick: () => store.removeStep(s.id) },
                      { icon: ArrowUp, label: "Move up", onClick: () => store.move(s.id, -1) },
                      { icon: ArrowDown, label: "Move down", onClick: () => store.move(s.id, 1) },
                    ].map((b) => (
                      <button
                        key={b.label}
                        aria-label={b.label}
                        onClick={b.onClick}
                        className="grid h-8 w-8 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                      >
                        <b.icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      <SmartRecommendations />

      {/* BOTTOM — run */}
      <div className="panel mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Execute pipeline</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {steps.length} step(s) will run in order against {dataset?.rows.length.toLocaleString()} rows.
          </p>
        </div>
        <button
          onClick={() => store.run()}
          disabled={steps.length === 0}
          className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl brand-gradient px-8 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Play className="h-4 w-4 fill-current" />
          Run Pipeline
        </button>
      </div>

      {preview && processed && (
        <section className="panel mt-6 p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <h2 className="text-base font-semibold">Processed dataset preview</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {processed.rows.length.toLocaleString()} rows · {processed.columns.length} columns
                after processing
              </p>
            </div>
            <ExportMenu
              label="Download dataset"
              icon={<Download className="h-4 w-4 text-cyan" />}
              groups={[
                {
                  label: "Processed dataset",
                  options: DATA_FORMATS.map((f) => ({
                    id: f.id,
                    label: f.label,
                    hint: f.hint,
                    onSelect: () => exportDataset(processed, f.id),
                  })),
                },
              ]}
            />
          </div>
          <div className="mt-5 overflow-x-auto scroll-slim">
            <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  {preview.columns.map((c) => (
                    <th key={c} className="border-b px-3 pb-3 font-medium">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r, i) => (
                  <tr key={i} className="transition-colors hover:bg-secondary/50">
                    {preview.columns.map((c) => (
                      <td key={c} className="border-b px-3 py-2.5 font-mono text-xs text-muted-foreground">
                        {r[c] === null || r[c] === undefined ? "—" : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageShell>
  );
}
