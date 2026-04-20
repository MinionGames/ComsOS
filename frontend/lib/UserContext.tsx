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
    <UserContext.Provider value={{ user: profile ? { ...user, name: profile.name } : user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
