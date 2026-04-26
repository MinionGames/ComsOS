import { createClient } from "@supabase/supabase-js";

// TODO: Replace with your actual Supabase project URL and anon key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // show a clear dev-time warning in the browser console
  // so the developer knows why storage/list calls fail.
  // Keep the client created to avoid runtime import errors elsewhere.
  // eslint-disable-next-line no-console
  console.warn(
    "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
  );
}

export const supabaseConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Disable automatic session persistence to avoid gotrue-js localStorage locks
// We persist the access token manually in `UserContext` to send to the backend.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});
