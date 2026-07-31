import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="ambient flex min-h-screen items-center justify-center px-5 py-14">
        <div className="relative z-10 w-full max-w-md">
          <Link to="/" className="mx-auto mb-8 flex w-fit items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-[0_8px_24px_-10px] shadow-primary">
              <Sparkles className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.4} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">UDA</span>
          </Link>

          <div className="panel p-7">
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
            <div className="mt-6">{children}</div>
          </div>

          {footer && (
            <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div>
          )}
        </div>
      </main>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "h-11 w-full rounded-xl border bg-secondary/50 px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary";

export const submitClass =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl brand-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60";
