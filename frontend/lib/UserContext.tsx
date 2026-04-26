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

  useEffect(() => {
    let ignore = false;
    supabase.auth.getSession().then(async ({ data }) => {
      if (ignore) return;
      // If supabase has an in-memory session, use it and persist token
      if (data?.session?.user) {
        const sessUser = data.session.user;
        setUser(sessUser);
        try {
          const tok =
            (data.session as any)?.access_token ??
            (data.session as any)?.accessToken;
          if (tok) window.localStorage.setItem("access_token", tok as string);
        } catch (e) {}
        // ensure profile exists
        const profile = await getOrCreateUserProfile({
          id: sessUser.id,
          email: sessUser.email ?? "",
        });
        setProfile(profile);
        setLoading(false);
        return;
      }

      // No in-memory session: fall back to stored access_token and backend /auth/me
      try {
        const tok = window.localStorage.getItem("access_token");
        if (tok) {
          // validate with backend and load profile
          try {
            const res = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`,
              { headers: { Authorization: `Bearer ${tok}` } },
            );
            if (res.ok) {
              const j = await res.json();
              const uid = j?.user?.id ?? null;
              const prof = j?.profile ?? null;
              if (uid) {
                setUser({ id: uid, email: prof?.email ?? undefined });
                setProfile(prof);
                setLoading(false);
                return;
              }
            } else {
              // token invalid -> remove
              try {
                window.localStorage.removeItem("access_token");
              } catch (e) {}
            }
          } catch (e) {
            // ignore network/backend errors and fall through to no-user
          }
        }
      } catch (e) {
        // localStorage may be unavailable
      }

      // No session available
      if (!ignore) {
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
        if (session?.user) {
          const profile = await getOrCreateUserProfile({
            id: session.user.id,
            email: session.user.email ?? "", // fallback to empty string
          });
          setProfile(profile);
        } else {
          setProfile(null);
        }
      },
    );
    return () => {
      ignore = true;
      listener.subscription.unsubscribe();
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
