const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem("access_token")
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  auth: {
    login: (email: string, password: string) =>
      apiFetch("/auth/login", { method: "POST",
        body: JSON.stringify({ email, password }) }),
    signup: (email: string, password: string) =>
      apiFetch("/auth/signup", { method: "POST",
        body: JSON.stringify({ email, password }) }),
  },
  subjects: {
    list: () => apiFetch("/subjects/"),
    create: (title: string, color: string) =>
      apiFetch("/subjects/", { method: "POST",
        body: JSON.stringify({ title, color }) }),
    delete: (id: string) =>
      apiFetch(`/subjects/${id}`, { method: "DELETE" }),
  },
  notes: {
    list: (subjectId: string) => apiFetch(`/notes/?subject_id=${subjectId}`),
    create: (subjectId: string, title: string, content: string) =>
      apiFetch("/notes/", { method: "POST",
        body: JSON.stringify({ subject_id: subjectId, title, content }) }),
    update: (id: string, content: string) =>
      apiFetch(`/notes/${id}`, { method: "PATCH",
        body: JSON.stringify({ content }) }),
  },
  uploads: {
    upload: (subjectId: string, file: File) => {
      const form = new FormData()
      form.append("file", file)
      const token = localStorage.getItem("access_token")
      return fetch(`${BASE}/uploads/${subjectId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      }).then(r => r.json())
    },
  },
}