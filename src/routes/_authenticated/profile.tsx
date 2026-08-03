import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/uda/PageShell";
import { Field, inputClass, submitClass } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — Numpa Data Studio" },
      { name: "description", content: "Manage your Numpa account name and review the email tied to your data workspace." },
      { property: "og:title", content: "Your profile — Numpa Data Studio" },
      { property: "og:description", content: "Manage your Numpa account name and review the email tied to your data workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || !active) return;
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, created_at")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      setFullName(profile?.full_name ?? (user.user_metadata?.full_name as string) ?? "");
      setCreatedAt(profile?.created_at ?? user.created_at ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (!userId) return;
    setSaving(true);
    const { error: err } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", userId);
    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    await supabase.auth.updateUser({ data: { full_name: fullName.trim() } });
    toast.success("Profile updated");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <PageShell
      title="Your profile"
      subtitle="Account details for this workspace."
      requiresDataset={false}
      actions={
        <button
          onClick={signOut}
          className="inline-flex h-10 items-center gap-2 rounded-xl border bg-secondary/60 px-4 text-sm font-medium transition-colors hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="panel p-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
            </div>
          ) : (
            <form onSubmit={save} className="grid max-w-md gap-4">
              <Field label="Full name">
                <input
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email">
                <input className={`${inputClass} opacity-70`} value={email} readOnly disabled />
              </Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button type="submit" disabled={saving} className={submitClass}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          )}
        </div>

        <div className="panel grid content-start gap-4 p-6">
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 text-cyan" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="truncate text-sm font-medium">{email || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 text-cyan" />
            <div>
              <p className="text-xs text-muted-foreground">Member since</p>
              <p className="text-sm font-medium">
                {createdAt ? new Date(createdAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Datasets stay in your browser. Your account only stores your name and email.
          </p>
        </div>
      </div>
    </PageShell>
  );
}
