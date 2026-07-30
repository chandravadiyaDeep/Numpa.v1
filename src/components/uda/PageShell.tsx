import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Upload } from "lucide-react";
import { TopNav } from "./TopNav";
import { useStudio } from "@/lib/studio-store";

export function PageShell({
  title,
  subtitle,
  actions,
  children,
  requiresDataset = true,
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  children: ReactNode;
  requiresDataset?: boolean;
}) {
  const { dataset } = useStudio();

  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <main className="mx-auto max-w-[1600px] px-5 py-8 lg:px-8 lg:py-12">
        <div className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 lg:mb-10">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold lg:text-3xl">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {actions}
        </div>
        {requiresDataset && !dataset ? <EmptyState /> : children}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="panel flex flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
        <Upload className="h-6 w-6 text-cyan" />
      </span>
      <div>
        <h2 className="text-lg font-semibold">No dataset in the workspace</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
          Load a CSV file to unlock profiling, preprocessing, charts and readiness scoring.
        </p>
      </div>
      <Link
        to="/"
        className="mt-2 inline-flex h-11 items-center rounded-xl brand-gradient px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        Upload CSV
      </Link>
    </div>
  );
}
