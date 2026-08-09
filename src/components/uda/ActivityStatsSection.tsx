import { BarChart3, Cpu, Download, Layers, Search } from "lucide-react";
import { AnimatedNumber } from "@/components/uda/AnimatedNumber";
import { useActivityStats } from "@/lib/activity-stats";

const CARDS = [
  { key: "files_analysed", label: "Files Analysed", icon: Search },
  { key: "files_preprocessed", label: "Files Preprocessed", icon: Layers },
  { key: "files_visualized", label: "Files Visualized", icon: BarChart3 },
  { key: "files_exported", label: "Files Exported", icon: Download },
  { key: "ml_readiness_runs", label: "ML Readiness", icon: Cpu },
] as const;

/** Per-user activity counters, kept live through the backend. */
export function ActivityStatsSection() {
  const { stats } = useActivityStats();

  return (
    <section className="relative z-10 mt-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-base font-semibold">Numpa Activity Stats</h2>
        <span className="rounded-full border bg-secondary/60 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          Live
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {CARDS.map((c) => (
          <div
            key={c.key}
            className="panel lift p-5 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </p>
              <c.icon className="h-4 w-4 text-cyan" />
            </div>
            <AnimatedNumber
              value={stats[c.key]}
              className="mt-3 block font-display text-2xl font-bold"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
