import { supabase } from "./supabaseClient";

const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL as string) ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:8000"
    : "https://api.comsos.legatusaisolutions.com");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function resolveSiteUrl() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return (process.env.NEXT_PUBLIC_SITE_URL as string) || "http://localhost:3000";
}

function getGoogleCallbackUrl() {
  const explicit = process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URL as string | undefined;
  if (explicit && explicit.trim().length > 0) return explicit.trim();
  return `${resolveSiteUrl().replace(/\/$/, "")}/auth/callback`;
}

async function fetchJson(path: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${BACKEND_BASE}${path}`, init);
  } catch (e) {
    // Network error — backend is unreachable (not running, wrong URL, or CORS preflight failed)
    return { ok: false, status: 0, body: { detail: "Cannot reach the server. Please ensure the backend is running." } };
  }
  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  name?: string,
) {
  const r = await fetchJson("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!r.ok) return { error: { message: r.body?.detail || r.body || "Signup failed" } };
  // Backend returns a message; keep shape compatible with client expectations
  return { data: { message: r.body?.message || "ok" } };
}

export async function signInWithEmail(email: string, password: string) {
  const r = await fetchJson("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) return { error: { message: r.body?.detail || r.body || "Login failed" } };
  // Backend returns { access_token, user }
  const access_token = r.body?.access_token;
  const user = r.body?.user;
  // Persist token to localStorage and emit a login event so the app updates
  try {
    if (typeof window !== "undefined" && access_token) {
      try {
        window.localStorage.setItem("access_token", access_token);
      } catch (e) {}
      try {
        window.dispatchEvent(new CustomEvent("comsos:login", { detail: { user } }));
      } catch (e) {}
    }
  } catch (e) {}
  return { data: { session: { access_token }, user } };
}

export async function signOut() {
  try {
    await fetchJson("/auth/logout", { method: "POST" });
  } catch (e) {
    // ignore
  }
  // Remove token and notify listeners
  try {
    if (typeof window !== "undefined") {
      try { window.localStorage.removeItem("access_token"); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("comsos:logout")); } catch (e) {}
    }
  } catch (e) {}
  try {
    const fn = (supabase.auth as any)?.signOut;
    if (typeof fn === "function") await fn();
  } catch (e) {}
  return { ok: true };
}

export async function signInWithGoogle() {
  if (!SUPABASE_URL) {
    return {
      error: {
        message:
          "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to frontend/.env.local.",
      },
    };
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    return {
      error: {
        message:
          "Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add it to frontend/.env.local.",
      },
    };
  }

  try {
    const authUrl = new URL(`${SUPABASE_URL.replace(/\/$/, "")}/auth/v1/authorize`);
    authUrl.searchParams.set("provider", "google");
    authUrl.searchParams.set("redirect_to", getGoogleCallbackUrl());
    authUrl.searchParams.set("response_type", "token");

    if (typeof window !== "undefined") {
      window.location.assign(authUrl.toString());
    }

    return { data: { redirect: true } };
  } catch (e: any) {
    return {
      error: {
        message: e?.message || "Failed to start Google sign-in.",
      },
    };
  }
}

export function completeOAuthFromCurrentUrl() {
  if (typeof window === "undefined") {
    return { error: { message: "OAuth callback can only run in the browser." } };
  }

  const hash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash || "");
  const queryParams = new URLSearchParams(window.location.search || "");

  const oauthError = hashParams.get("error") || queryParams.get("error");
  if (oauthError) {
    return {
      error: {
        message:
          hashParams.get("error_description") ||
          queryParams.get("error_description") ||
          oauthError,
      },
    };
  }

  const accessToken =
    hashParams.get("access_token") || queryParams.get("access_token");
  if (!accessToken) {
    return { error: { message: "No access token found in OAuth callback." } };
  }

  try {
    window.localStorage.setItem("access_token", accessToken);
  } catch (e) {
    return { error: { message: "Unable to save access token in localStorage." } };
  }

  try {
    window.dispatchEvent(new CustomEvent("comsos:login"));
  } catch (e) {
    // non-fatal
  }

  return { data: { access_token: accessToken } };
}

export async function getCurrentUser() {
  const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
  if (!tok) return null;
  try {
    const res = await fetch(`${BACKEND_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.user ?? null;
  } catch (e) {
    return null;
  }
}
