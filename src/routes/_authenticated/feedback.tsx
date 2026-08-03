import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, MessageSquare, Star } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageShell } from "@/components/uda/PageShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback — Numpa" },
      {
        name: "description",
        content: "Send general feedback, report a bug or request a feature for the Numpa data workspace.",
      },
      { property: "og:title", content: "Feedback — Numpa" },
      {
        property: "og:description",
        content: "Share feedback, bugs and feature requests with the Numpa team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FeedbackPage,
});

const TYPES = [
  { id: "general", label: "General" },
  { id: "bug", label: "Bug Report" },
  { id: "feature", label: "Feature Request" },
] as const;

const schema = z.object({
  feedback_type: z.enum(["general", "bug", "feature"]),
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters).").max(2000),
});

function FeedbackPage() {
  const [type, setType] = useState<(typeof TYPES)[number]["id"]>("general");
  const [rating, setRating] = useState(5);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = schema.safeParse({ feedback_type: type, rating, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your input.");
      return;
    }

    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      setLoading(false);
      setError("Your session expired. Sign in again to send feedback.");
      return;
    }

    const { error: err } = await supabase.from("feedback").insert({
      user_id: uid,
      feedback_type: parsed.data.feedback_type,
      message: parsed.data.message,
      rating: parsed.data.rating,
      page: typeof window !== "undefined" ? window.location.pathname : null,
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      toast.error("Could not send feedback");
      return;
    }

    setSent(true);
    setMessage("");
    toast.success("Thanks — your feedback was sent");
  };

  return (
    <PageShell
      title="Feedback"
      subtitle="Tell us what works, what breaks and what you need next."
      requiresDataset={false}
    >
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,620px)_minmax(0,1fr)]">
        <form onSubmit={submit} className="panel grid gap-5 p-6">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Type</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`h-10 rounded-xl border px-4 text-sm font-medium transition-colors ${
                    type === t.id
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Rating</p>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  onClick={() => setRating(n)}
                  className="grid h-10 w-10 place-items-center rounded-xl border bg-secondary/50 transition-colors hover:bg-secondary"
                >
                  <Star
                    className={`h-4.5 w-4.5 transition-colors ${
                      n <= rating ? "fill-current text-cyan" : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 font-mono text-sm text-muted-foreground">{rating}/5</span>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Message</span>
            <textarea
              rows={6}
              maxLength={2000}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setSent(false);
              }}
              placeholder="What happened, or what would make Numpa better?"
              className="w-full rounded-xl border bg-secondary/50 p-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            />
            <span className="mt-1 block text-right text-[11px] text-muted-foreground">
              {message.length}/2000
            </span>
          </label>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {sent && !error && (
            <p className="text-sm text-cyan">Feedback received — thank you for helping us improve.</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl brand-gradient text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
            {loading ? "Sending…" : "Send feedback"}
          </button>
        </form>

        <aside className="panel h-fit p-6">
          <h2 className="text-base font-semibold">What helps most</h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground">
            <li className="rounded-xl border bg-secondary/40 p-4">
              <strong className="text-foreground">Bug report</strong> — the module you were in, the
              file type and what you expected to happen.
            </li>
            <li className="rounded-xl border bg-secondary/40 p-4">
              <strong className="text-foreground">Feature request</strong> — the preprocessing step,
              chart or export format you are missing.
            </li>
            <li className="rounded-xl border bg-secondary/40 p-4">
              <strong className="text-foreground">General</strong> — anything about the workspace
              flow, performance or clarity.
            </li>
          </ul>
        </aside>
      </div>
    </PageShell>
  );
}
