import { supabase } from "./supabaseClient";
import { getOrCreateUserProfile } from "./supabaseUser";

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string,
) {
  // Sign up with email/password
  const result = await supabase.auth.signUp({ email, password });
  // If successful and name is provided, store name in user profile
  if (result.data?.user && name) {
    try {
      await getOrCreateUserProfile({
        id: result.data.user.id,
        email: result.data.user.email ?? email, // fallback to provided email
        name,
      });
    } catch (e) {
      // Optionally handle profile creation error
      // console.error("Profile creation failed", e);
    }
  }
  return result;
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}
