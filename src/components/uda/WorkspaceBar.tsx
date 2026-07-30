import { Database, GitBranch, Layers, Rows3, CheckCircle2, CircleDashed, Loader2 } from "lucide-react";
import { useStudio } from "@/lib/studio-store";

export function WorkspaceBar() {
  const { dataset, steps, processed } = useStudio();
  if (!dataset) return null;

  const active = processed ?? dataset;
  const pipeline =
    steps.length === 0 ? "Empty pipeline" : `${steps.length} step${steps.length > 1 ? "s" : ""} configured`;
  const processing = processed
    ? "Processed copy active"
    : steps.length > 0
      ? "Pending run"
      : "Raw dataset";

  const ProcessIcon = processed ? CheckCircle2 : steps.length > 0 ? Loader2 : CircleDashed;

  return (
    <div className="panel mb-6 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3.5">
      <Item icon={Database} label="Dataset" value={active.name} strong />
      <Divider />
      <Item icon={Rows3} label="Rows" value={active.rows.length.toLocaleString()} />
      <Divider />
      <Item icon={Layers} label="Columns" value={String(active.columns.length)} />
      <Divider />
      <Item icon={GitBranch} label="Pipeline" value={pipeline} />
      <Divider />
      <Item icon={ProcessIcon} label="Processing" value={processing} />
    </div>
  );
}

function Divider() {
  return <span className="hidden h-6 w-px bg-border sm:block" />;
}

function Item({
  icon: Icon,
  label,
  value,
  strong,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Icon className="h-4 w-4 shrink-0 text-cyan" />
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`truncate text-sm ${strong ? "font-semibold" : "font-medium"}`}>{value}</p>
      </div>
    </div>
  );
}
