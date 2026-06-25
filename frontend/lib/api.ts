const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
import { supabase } from "./supabaseClient";

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token");
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "(no body)");
    // Try several strategies to parse JSON error bodies because some
    // backends (or proxies) may double-encode or wrap JSON in strings.
    const safeParse = (input: string) => {
      if (!input || typeof input !== "string") return null;
      const s = input.trim();
      try {
        // First attempt: direct JSON.parse
        const parsed = JSON.parse(s);
        // If parsed is a string containing JSON, try parse again
        if (typeof parsed === "string") {
          try {
            return JSON.parse(parsed);
          } catch (_) {
            return parsed;
          }
        }
        return parsed;
      } catch (_e) {
        // Try to extract a JSON object substring like {...}
        const m = s.match(/(\{[\s\S]*\})/);
        if (m && m[1]) {
          try {
            return JSON.parse(m[1]);
          } catch (_e2) {
            // fallthrough
          }
        }
        // Try unwrapping a quoted JSON string (leading/trailing quotes)
        if (s.startsWith('"') && s.endsWith('"')) {
          try {
            const unq = s.slice(1, -1).replace(/\\"/g, '"');
            return JSON.parse(unq);
          } catch (_e3) {
            // fallthrough
          }
        }
        return null;
      }
    };

    const parsed = safeParse(txt);
    if (parsed && typeof parsed === "object") {
      const msg = (parsed as any).detail || (parsed as any).message || JSON.stringify(parsed);
      throw new Error(msg);
    }
    // fallback to raw text
    throw new Error(txt || "(no body)");
  }
  return res.json();
}

// Small in-memory cache + in-flight coalescing to coalesce rapid duplicate requests
const _cache = new Map<string, { ts: number; ttl: number; value: any }>();
const _inflight = new Map<string, Promise<any>>();
async function cachedApiFetch(
  path: string,
  options: RequestInit = {},
  ttl = 3000,
) {
  const key =
    path + (options && options.method ? `|${options.method}` : "|GET");
  const now = Date.now();
  const existing = _cache.get(key);
  if (existing && now - existing.ts < existing.ttl) return existing.value;
  // If a request for this key is already in flight, reuse its promise
  const inflight = _inflight.get(key);
  if (inflight) return inflight;
  const p = (async () => {
    try {
      const v = await apiFetch(path, options);
      try {
        _cache.set(key, { ts: Date.now(), ttl, value: v });
      } catch (e) {}
      return v;
    } finally {
      // clear inflight regardless of success or failure
      _inflight.delete(key);
    }
  })();
  _inflight.set(key, p);
  return p;
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
    signup: (email: string, password: string) =>
      apiFetch("/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }),
  },
  subjects: {
    list: () => apiFetch("/subjects/"),
    create: (title: string, color: string, description?: string) =>
      apiFetch("/subjects/", {
        method: "POST",
        body: JSON.stringify({ title, color, description }),
      }),
    update: (id: string, updates: any) =>
      apiFetch(`/subjects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => apiFetch(`/subjects/${id}`, { method: "DELETE" }),
  },
  cards: {
    list: () => cachedApiFetch("/cards/", {}, 2000),
    counts: () => cachedApiFetch("/cards/counts", {}, 2000),
  },
  decks: {
    list: () => cachedApiFetch("/decks/", {}, 2000),
    counts: () => cachedApiFetch("/decks/counts", {}, 2000),
    update: (id: string, updates: any) =>
      apiFetch(`/decks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
  },
  notes: {
    list: (subjectId: string) => apiFetch(`/notes/?subject_id=${subjectId}`),
    create: (subjectId: string, title: string, content: string) =>
      apiFetch("/notes/", {
        method: "POST",
        body: JSON.stringify({ subject_id: subjectId, title, content }),
      }),
    update: (id: string, content: string) =>
      apiFetch(`/notes/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ content }),
      }),
  },
  ai: {
    generateCards: (
      extracted_text: string,
      subject_name?: string,
      deck_title?: string,
      upload_id?: string | number,
      model?: string,
    ) =>
      apiFetch("/ai/generate-cards", {
        method: "POST",
        body: JSON.stringify({
          extracted_text,
          subject_name,
          deck_title,
          upload_id,
          model,
        }),
      }),
  },
  uploads: {
    list: () => cachedApiFetch("/uploads/", {}, 2000),
    upload: async (subjectId: string, file: File) => {
      const form = new FormData();
      form.append("file", file);
      // Prefer reading token from localStorage (fast, avoids gotrue locks).
      // Fall back to supabase.auth.getSession() only if localStorage is empty.
      // Prefer reading token from localStorage (fast, avoids gotrue locks).
      let token: string | undefined = undefined;
      try {
        token = localStorage.getItem("access_token") ?? undefined;
      } catch (e) {
        token = undefined;
      }
      // sanitize common bad values that may have been stored as strings
      if (typeof token === "string") {
        const t = token.trim();
        if (
          t === "" ||
          t.toLowerCase() === "null" ||
          t.toLowerCase() === "undefined"
        ) {
          token = undefined;
        } else {
          token = t;
        }
      }
      // Basic JWT structure check (two or three dot-separated parts).
      // If it doesn't look like a JWT, treat as missing so we don't send
      // an unauthenticated POST request that will 401.
      if (token && token.split(".").length < 2) {
        token = undefined;
      }

      // Require a token for uploads — otherwise surface a helpful error
      // instead of sending an unauthenticated POST (no preflight).
      if (!token) {
        throw new Error(
          "No access token available. Please sign in before uploading.",
        );
      }
      try {
        const res = await fetch(`${BASE}/uploads/${subjectId}`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "(no body)");
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        return res.json();
      } catch (e: any) {
        // Network-level failures (CORS, network down) surface as TypeError: Failed to fetch
        throw new Error(
          `Upload failed: ${e?.message || String(e)}. Check that the backend is reachable and CORS allows requests from this origin.`,
        );
      }
    },
    getSignedUrl: async (uploadId: string | number) => {
      // reuse same token logic as upload
      let token: string | undefined = undefined;
      try {
        token = localStorage.getItem("access_token") ?? undefined;
      } catch (e) {
        token = undefined;
      }
      if (typeof token === "string") {
        const t = token.trim();
        if (
          t === "" ||
          t.toLowerCase() === "null" ||
          t.toLowerCase() === "undefined"
        )
          token = undefined;
        else token = t;
      }
      const headers: any = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${BASE}/uploads/download/${uploadId}`, {
        headers,
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    update: (uploadId: string | number, updates: any) =>
      apiFetch(`/uploads/${uploadId}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      }),
  },
};
