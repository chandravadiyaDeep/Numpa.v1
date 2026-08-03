import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, inputClass, submitClass } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Numpa Data Studio" },
      { name: "description", content: "Request a password reset link for your Numpa data preparation workspace." },
      { property: "og:title", content: "Reset password — Numpa Data Studio" },
      { property: "og:description", content: "Request a password reset link for your Numpa data preparation workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent");
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to set a new password."
      footer={
        <Link to="/login" className="font-semibold text-foreground hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-muted-foreground">
          If an account exists for <span className="text-foreground">{email}</span>, a reset link is
          on its way. Check your inbox and spam folder.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Email">
            <input
              type="email"
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
            />
          </Field>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className={submitClass}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
