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
      if (!ignore) {
        setUser(data.session?.user ?? null);
        // persist access token for backend API
        try {
          const tok =
            (data.session as any)?.access_token ??
            (data.session as any)?.accessToken;
          if (tok) {
            window.localStorage.setItem("access_token", tok as string);
            // ping backend to confirm server recognizes this token
            try {
              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`,
                {
                  headers: { Authorization: `Bearer ${tok}` },
                },
              );
              if (!res.ok) {
                console.warn("Backend /auth/me responded", res.status);
              }
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          // ignore
        }
        setLoading(false);
        if (data.session?.user) {
          const profile = await getOrCreateUserProfile({
            id: data.session.user.id,
            email: data.session.user.email ?? "", // fallback to empty string
          });
          setProfile(profile);
        } else {
          setProfile(null);
        }
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
