import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityMetric =
  | "files_analysed"
  | "files_preprocessed"
  | "files_visualized"
  | "files_exported"
  | "ml_readiness_runs";

export interface ActivityStats {
  files_analysed: number;
  files_preprocessed: number;
  files_visualized: number;
  files_exported: number;
  ml_readiness_runs: number;
}

const EMPTY: ActivityStats = {
  files_analysed: 0,
  files_preprocessed: 0,
  files_visualized: 0,
  files_exported: 0,
  ml_readiness_runs: 0,
};

/* ------------------------------ tiny store ------------------------------- */

let current: ActivityStats | null = null;
const listeners = new Set<(s: ActivityStats) => void>();
const publish = (next: ActivityStats) => {
  current = next;
  listeners.forEach((l) => l(next));
};

const pick = (row: Record<string, unknown> | null | undefined): ActivityStats => ({
  files_analysed: Number(row?.["files_analysed"] ?? 0),
  files_preprocessed: Number(row?.["files_preprocessed"] ?? 0),
  files_visualized: Number(row?.["files_visualized"] ?? 0),
  files_exported: Number(row?.["files_exported"] ?? 0),
  ml_readiness_runs: Number(row?.["ml_readiness_runs"] ?? 0),
});

/** Increment one counter for the signed-in user. Silently no-ops when signed out. */
export async function trackActivity(metric: ActivityMetric) {
  try {
    const { data, error } = await supabase.rpc("increment_activity_stat", { _metric: metric });
    if (error) throw error;
    if (data) publish(pick(data as unknown as Record<string, unknown>));
  } catch (err) {
    console.warn("[activity-stats] increment failed", err);
  }
}

const seen = new Set<string>();
/** Increment at most once per unique key for this browser session. */
export function trackActivityOnce(metric: ActivityMetric, key: string) {
  const id = `${metric}:${key}`;
  if (seen.has(id)) return;
  seen.add(id);
  void trackActivity(metric);
}

/* --------------------------------- hook ---------------------------------- */

export function useActivityStats() {
  const [stats, setStats] = useState<ActivityStats>(current ?? EMPTY);
  const [loading, setLoading] = useState(current === null);

  useEffect(() => {
    let alive = true;
    const listener = (s: ActivityStats) => alive && setStats(s);
    listeners.add(listener);

    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId || !alive) {
        if (alive) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("activity_stats")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (!alive) return;
      publish(pick(data as Record<string, unknown> | null));
      setLoading(false);

      channel = supabase
        .channel(`activity_stats:${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "activity_stats", filter: `user_id=eq.${userId}` },
          (payload) => publish(pick(payload.new as Record<string, unknown>)),
        )
        .subscribe();
    })();

    return () => {
      alive = false;
      listeners.delete(listener);
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return { stats, loading };
}
