import { useState } from "react";
import { Loader2 } from "lucide-react";
import { lovable } from "@/integrations/lovable/index";

/**
 * Continue with Google. Uses the managed Lovable OAuth broker on top of the
 * existing Supabase client/session — email + password sign-in is untouched.
 */
export function GoogleButton({ onError }: { onError?: (message: string) => void }) {
  const [loading, setLoading] = useState(false);

  const click = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });

    if (result.error) {
      setLoading(false);
      onError?.(result.error.message ?? "Google sign-in failed. Try again.");
      return;
    }
    if (result.redirected) return;
    window.location.assign("/dashboard");
  };

  return (
    <>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>
      <button
        type="button"
        onClick={click}
        disabled={loading}
        className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border bg-secondary/50 text-sm font-medium transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1a6.2 6.2 0 0 1 0-12.4c1.9 0 3.2.8 3.9 1.5l2.7-2.6A9.6 9.6 0 0 0 12 2.2a9.8 9.8 0 1 0 0 19.6c5.7 0 9.4-4 9.4-9.6 0-.7-.1-1.2-.2-1.7H12z"
            />
          </svg>
        )}
        Continue with Google
      </button>
    </>
  );
}
