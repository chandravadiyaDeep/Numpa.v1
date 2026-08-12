import { useRef, useState } from "react";
import { FileUp, Loader2, Plus } from "lucide-react";
import { ACCEPTED_EXTENSIONS, ParseError, parseFile } from "@/lib/parse-file";
import { store } from "@/lib/studio-store";

/**
 * Compact multi-format dataset uploader (CSV, XLSX/XLS, JSON).
 * `variant="button"` renders the toolbar action; `variant="dropzone"` renders a drop target.
 */
export function Uploader({
  variant = "button",
  label = "Upload Dataset",
  onLoaded,
}: {
  variant?: "button" | "dropzone";
  label?: string;
  onLoaded?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = async (file: File) => {
    setError(null);
    setStatus(null);
    setBusy(true);
    try {
      const ds = await parseFile(file, {
        onProgress: (p) => {
          if (p.phase === "done") return setStatus(null);
          const pct = p.ratio !== undefined ? ` ${Math.round(p.ratio * 100)}%` : "";
          setStatus(
            p.rows
              ? `Reading${pct} · ${p.rows.toLocaleString()} rows`
              : `${p.phase === "parsing" ? "Parsing" : "Reading"}${pct}`,
          );
        },
      });
      store.setDataset(ds);
      onLoaded?.();
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") setError(null);
      else setError(e instanceof ParseError ? e.message : "That file could not be read.");
    } finally {
      setStatus(null);
      setBusy(false);
    }
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_EXTENSIONS}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (file) void load(file);
      }}
    />
  );

  if (variant === "button")
    return (
      <div className="shrink-0">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-11 items-center gap-2 rounded-xl brand-gradient px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {label}
        </button>
        {input}
        {status && !error && (
          <p className="mt-2 max-w-xs text-right text-xs text-muted-foreground">{status}</p>
        )}
        {error && <p className="mt-2 max-w-xs text-right text-xs text-destructive">{error}</p>}
      </div>
    );

  return (
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
      className={`panel flex flex-col items-center gap-4 px-6 py-10 text-center transition-all duration-200 ${
        drag ? "scale-[1.01] border-primary bg-secondary/50" : ""
      }`}
    >
      <span className="grid h-14 w-14 place-items-center rounded-2xl brand-gradient shadow-[0_16px_40px_-18px] shadow-primary">
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
        ) : (
          <FileUp className="h-6 w-6 text-primary-foreground" />
        )}
      </span>
      <div>
        <h2 className="text-base font-semibold">Drop a dataset to begin</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          CSV, XLSX, XLS or JSON — parsed locally in your browser.
        </p>
      </div>
      <button
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex h-11 items-center gap-2 rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
      >
        <Plus className="h-4 w-4" />
        {label}
      </button>
      {input}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
