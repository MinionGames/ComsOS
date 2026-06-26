"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "./supabaseClient";
import { getOrCreateUserProfile } from "./supabaseUser";

interface UserContextType {
  user: any;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
});

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const backendBase =
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:8000"
      : "https://api.comsos.legatusaisolutions.com");

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Prefer backend validation: check stored access token and call /auth/me
      try {
        const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
        if (tok) {
          const res = await fetch(`${backendBase}/auth/me`, {
            headers: { Authorization: `Bearer ${tok}` },
          });
          if (res.ok) {
            const j = await res.json();
            const uid = j?.user?.id ?? null;
            const prof = j?.profile ?? null;
            if (uid && mounted) {
              setUser({ id: uid, email: prof?.email ?? undefined });
              setProfile(prof);
              setLoading(false);
              return;
            }
          } else {
            try { window.localStorage.removeItem("access_token"); } catch (e) {}
          }
        }
      } catch (e) {
        // ignore
      }

      if (mounted) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }

    init();

    // Listen for explicit login/logout events dispatched by the auth helper
    const onLogin = async (ev: any) => {
      try {
        const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
        if (!tok) return;
        const res = await fetch(`${backendBase}/auth/me`, {
          headers: { Authorization: `Bearer ${tok}` },
        });
        if (!res.ok) return;
        const j = await res.json();
        const uid = j?.user?.id ?? null;
        const prof = j?.profile ?? null;
        if (uid && mounted) {
          setUser({ id: uid, email: prof?.email ?? undefined });
          setProfile(prof);
          setLoading(false);
        }
      } catch (e) {
        // ignore
      }
    };

    const onLogout = () => {
      if (!mounted) return;
      try { setUser(null); setProfile(null); setLoading(false); } catch (e) {}
    };

    if (typeof window !== "undefined") {
      window.addEventListener("comsos:login", onLogin as EventListener);
      window.addEventListener("comsos:logout", onLogout as EventListener);
    }

    return () => {
      mounted = false;
      if (typeof window !== "undefined") {
        try {
          window.removeEventListener("comsos:login", onLogin as EventListener);
          window.removeEventListener("comsos:logout", onLogout as EventListener);
        } catch (e) {}
      }
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user: profile ? { ...user, name: profile.name } : user,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
