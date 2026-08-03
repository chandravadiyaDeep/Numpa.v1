import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, Field, inputClass, submitClass } from "@/components/auth/AuthShell";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Create account — Numpa Data Studio" },
      { name: "description", content: "Create a Numpa account to upload CSVs, build cleaning pipelines and export model-ready data." },
      { property: "og:title", content: "Create account — Numpa Data Studio" },
      { property: "og:description", content: "Create a Numpa account to upload CSVs, build cleaning pipelines and export model-ready data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/", replace: true });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (fullName.trim().length < 2) return setError("Enter your full name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: { full_name: fullName.trim() },
      },
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (!data.session) {
      setSent(true);
      toast.success("Check your email to confirm your account");
      return;
    }

    await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", data.session.user.id);

    toast.success("Account created");
    navigate({ to: "/", replace: true });
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Set up your Numpa workspace in a few seconds."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-foreground hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to <span className="text-foreground">{email}</span>. Confirm
            your email, then sign in to open your workspace.
          </p>
          <Link to="/login" className={submitClass}>
            Go to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="grid gap-4">
          <Field label="Full name">
            <input
              className={inputClass}
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ada Lovelace"
            />
          </Field>
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
          <Field label="Password">
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                autoComplete="new-password"
                className={`${inputClass} pr-11`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Field label="Confirm password">
            <input
              type={show ? "text" : "password"}
              autoComplete="new-password"
              className={inputClass}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Repeat your password"
            />
          </Field>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button type="submit" disabled={loading} className={submitClass}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Creating account…" : "Create account"}
          </button>

          <GoogleButton onError={setError} />
        </form>
      )}
    </AuthShell>
  );
}
