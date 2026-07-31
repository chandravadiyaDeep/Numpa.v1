import { supabase } from "@/integrations/supabase/client";

const REMEMBER_KEY = "uda.remember";
const TAB_KEY = "uda.session-active";

export function setRemember(remember: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false");
  sessionStorage.setItem(TAB_KEY, "1");
}

/**
 * When the user opted out of "Remember session", drop the persisted session
 * as soon as the browser is opened in a fresh session (no tab marker).
 */
export async function enforceRememberPolicy() {
  if (typeof window === "undefined") return;
  const remember = localStorage.getItem(REMEMBER_KEY);
  const tabActive = sessionStorage.getItem(TAB_KEY);
  if (remember === "false" && !tabActive) {
    await supabase.auth.signOut();
    localStorage.removeItem(REMEMBER_KEY);
    return;
  }
  sessionStorage.setItem(TAB_KEY, "1");
}
