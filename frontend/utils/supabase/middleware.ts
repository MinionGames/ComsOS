import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { type NextRequest, type NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const createClient = (request: NextRequest, response?: NextResponse) => {
  let token: string | undefined = undefined;
  try {
    const c =
      request.cookies.get("sb-access-token") ??
      request.cookies.get("access_token") ??
      request.cookies.get("sb:token");
    if (c) token = (c as any).value ?? String(c);
  } catch {}

  if (token) {
    return createSupabaseClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  return createSupabaseClient(supabaseUrl, supabaseKey);
};
