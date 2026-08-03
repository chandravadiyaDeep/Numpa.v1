import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Database, LogOut, Moon, Sun, User, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hydrateStudio, useStudio } from "@/lib/studio-store";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/analysis", label: "Analysis" },
  { to: "/preprocessing", label: "Preprocessing" },
  { to: "/visualization", label: "Visualization" },
  { to: "/ml-readiness", label: "ML Readiness" },
  { to: "/feedback", label: "Feedback" },
] as const;

export function TopNav() {
  const { dataset } = useStudio();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dark, setDark] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateStudio();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const signOut = async () => {
    setMenuOpen(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };



  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-6 px-5 lg:px-8">
        <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl brand-gradient shadow-[0_8px_24px_-10px] shadow-primary">
            <Sparkles className="h-4.5 w-4.5 text-primary-foreground" strokeWidth={2.4} />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">Numpa</span>
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
          <div className="relative" ref={menuRef}>
            <button
              aria-label="User menu"
              onClick={() => setMenuOpen((o) => !o)}
              className="grid h-9 w-9 place-items-center rounded-lg border bg-secondary/60 text-foreground transition-colors hover:bg-secondary"
            >
              <User className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-xl border bg-popover p-1.5 shadow-xl">
                <p className="truncate px-2.5 py-2 text-xs text-muted-foreground">
                  {email ?? "Signed in"}
                </p>
                <Link
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <User className="h-4 w-4" />
                  Profile
                </Link>
                <button
                  onClick={signOut}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-secondary"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>

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
