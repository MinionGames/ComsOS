import { useEffect } from "react";
import { getOrCreateUserProfile } from "./supabaseUser";

export function useSupabaseProfileSync() {
  useEffect(() => {
    async function trySync() {
      try {
        const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
        if (!tok) return;
        // Trigger backend to ensure profile exists and is synced. Backend's /auth/me
        // already returns profile; calling getOrCreateUserProfile will fetch it.
        await getOrCreateUserProfile({ id: "", email: "" });
      } catch (e) {
        // ignore
      }
    }
    trySync();
  }, []);
}
