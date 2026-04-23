import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = (
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) => {
  // attempt to read common Supabase auth cookie names
  let token: string | undefined = undefined;
  try {
    const c =
      cookieStore.get("sb-access-token") ??
      cookieStore.get("access_token") ??
      cookieStore.get("sb:token");
    if (c) token = (c as any).value ?? String(c);
  } catch {}

  if (token) {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
};
