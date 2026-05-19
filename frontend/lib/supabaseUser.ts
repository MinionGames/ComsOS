export async function getOrCreateUserProfile(user: {
  id: string;
  email: string;
  name?: string | null;
}) {
  // Delegate profile lookup/creation to the backend `/auth/me` or a profiles
  // endpoint. If the backend is called without a token, fall back to null.
  try {
    const tok = typeof window !== "undefined" ? window.localStorage.getItem("access_token") : null;
    if (!tok) return null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/me`, {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.profile ?? null;
  } catch (e) {
    return null;
  }
}
