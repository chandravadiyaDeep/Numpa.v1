import { Link, useRouterState } from "@tanstack/react-router";
import { Database, Moon, Sun, User, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { hydrateStudio, useStudio } from "@/lib/studio-store";

const NAV = [
  { to: "/analysis", label: "Analysis" },
  { to: "/preprocessing", label: "Preprocessing" },
  { to: "/visualization", label: "Visualization" },
  { to: "/ml-readiness", label: "ML Readiness" },
] as const;

export function TopNav() {
  const { dataset } = useStudio();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [dark, setDark] = useState(true);

  useEffect(() => {
    hydrateStudio();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);


  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-[0_8px_24px_-10px] shadow-primary">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">UDA</span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full border bg-secondary/60 px-3 py-1.5 sm:flex">
            <Database className="h-3.5 w-3.5 text-cyan" />
            <span className="max-w-[180px] truncate text-xs font-medium text-muted-foreground">
              {dataset ? dataset.name : "No dataset loaded"}
            </span>
          </div>
          <button
            onClick={() => setDark((d) => !d)}
            aria-label="Toggle theme"
            className="grid h-9 w-9 place-items-center rounded-lg border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            aria-label="User menu"
            className="grid h-9 w-9 place-items-center rounded-lg border bg-secondary/60 text-foreground transition-colors hover:bg-secondary"
          >
            <User className="h-4 w-4" />
          </button>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t px-4 py-2 md:hidden scroll-slim">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
              pathname === item.to
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
