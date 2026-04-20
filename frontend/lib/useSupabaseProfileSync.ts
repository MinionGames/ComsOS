import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { getOrCreateUserProfile } from "./supabaseUser";

export function useSupabaseProfileSync() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  useEffect(() => {
    if (user?.email && user?.id) {
      getOrCreateUserProfile({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || null,
      });
    }
  }, [user]);
}
