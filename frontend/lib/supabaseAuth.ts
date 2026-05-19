import { supabase } from "./supabaseClient";

const BACKEND_BASE =
  (process.env.NEXT_PUBLIC_API_URL as string) || "http://localhost:8000";

async function fetchJson(path: string, init: RequestInit) {
  const res = await fetch(`${BACKEND_BASE}${path}`, init);
  let body: any = null;
  try {
    body = await res.json();
  } catch (e) {
    body = null;
  }
  return { ok: res.ok, status: res.status, body };
}

export async function signUpWithEmail(email: string, password: string) {
  const r = await fetchJson("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
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

export async function getCurrentUser() {
  const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
  if (!tok) return null;
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`,
      { headers: { Authorization: `Bearer ${tok}` } },
    );
    if (!res.ok) return null;
    const j = await res.json();
    return j?.user ?? null;
  } catch (e) {
    return null;
  }
}
