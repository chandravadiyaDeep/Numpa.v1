import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export interface ExportOption {
  id: string;
  label: string;
  hint?: string;
  onSelect: () => void | Promise<void>;
}

export interface ExportGroup {
  label: string;
  options: ExportOption[];
}

/** Small dropdown used across the workspace to pick an export format. */
export function ExportMenu({
  label,
  icon,
  groups,
  variant = "ghost",
}: {
  label: string;
  icon?: ReactNode;
  groups: ExportGroup[];
  variant?: "ghost" | "primary";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const run = async (opt: ExportOption) => {
    setBusy(opt.id);
    setOpen(false);
    try {
      await new Promise((r) => requestAnimationFrame(r));
      await opt.onSelect();
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-semibold transition-all ${
          variant === "primary"
            ? "brand-gradient text-primary-foreground hover:opacity-90"
            : "border bg-secondary/60 hover:bg-secondary"
        }`}
      >
        {icon}
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl">
          {groups.map((g) => (
            <div key={g.label} className="py-1">
              <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </p>
              {g.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => run(o)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <span className="text-sm font-medium">{o.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {busy === o.id ? "Preparing…" : o.hint}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
