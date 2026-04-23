"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabaseClient";
import { api } from "../../lib/api";
import { useSubjects } from "../../lib/SubjectsContext";

export default function ResourcesPage() {
  const { user, loading } = useUser();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSubject, setEditingSubject] = useState("");
  const { subjects, loadingSubjects } = useSubjects();
  const [editingSignedUrl, setEditingSignedUrl] = useState<string | null>(null);
  const [editingSignedUrlError, setEditingSignedUrlError] = useState<
    string | null
  >(null);
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    if (user) document.title = `Resources | ComsOS`;
  }, [user]);

  async function fetchFiles() {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("uploads")
        .select(
          "id, file_name, public_url, storage_path, created_at, subject_id, extracted_text",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        console.error("Failed to load uploads:", error);
        setFiles([]);
      } else {
        const mapped = (data || []).map((r: any) => ({
          id: r.id,
          name: r.file_name,
          publicURL: r.public_url,
          path: r.storage_path,
          created_at: r.created_at,
          subject_id: r.subject_id,
          content: r.extracted_text || "",
        }));
        setFiles(mapped);
      }
    } catch (e) {
      console.error(e);
      setFiles([]);
    }
  }

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load a signed URL when modal opens for private preview
  useEffect(() => {
    if (!editModalOpen || !editingFile) return;
    setEditingSignedUrl(null);
    setEditingSignedUrlError(null);
    let cancelled = false;
    (async () => {
      try {
        const j = await api.uploads.getSignedUrl(editingFile.id);
        if (!cancelled && j?.signed_url) setEditingSignedUrl(j.signed_url);
      } catch (e: any) {
        console.error("Failed to fetch signed URL:", e);
        if (!cancelled) setEditingSignedUrlError(e?.message || String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editModalOpen, editingFile]);

  // detect prefers-color-scheme and keep in state
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      // some browsers pass an event, others the MediaQueryList itself
      // @ts-ignore
      setIsDark(typeof e.matches === "boolean" ? e.matches : mq.matches);
    };
    // set initial
    setIsDark(mq.matches);
    // add listener
    if ((mq as any).addEventListener) mq.addEventListener("change", handler);
    else (mq as any).addListener(handler);
    return () => {
      try {
        if ((mq as any).removeEventListener)
          mq.removeEventListener("change", handler);
        else (mq as any).removeListener(handler);
      } catch (e) {}
    };
  }, []);

  if (loading) return null;
  if (!user) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <h2>Sign in to access Resources</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".pdf")) {
      alert("Only PDF files are supported");
      return;
    }
    setUploading(true);
    try {
      // Use backend endpoint so the server uploads to Storage and inserts DB row
      // If not associating with a subject, pass 'null' so backend stores NULL
      const subjectId = "null";
      // call backend upload helper (it attaches the current session token)
      await api.uploads.upload(subjectId, file);
      // refresh listing
      await fetchFiles();
      // use captured input reference to avoid React synthetic event pooling
      input.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(
        err.message ||
          "Upload failed: network error or server unreachable. Check DevTools Network and backend logs.",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "'Roboto', sans-serif" }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
        Resources
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#aaa" }}>
        A place to store and manage shared resources for your subjects and
        study.
      </p>

      <div style={{ marginTop: 20, maxWidth: 700 }}>
        <label style={{ display: "block", marginBottom: 8 }}>Upload PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={uploading}
        />
        {uploading && (
          <div style={{ marginTop: 8, color: "#888" }}>Uploading...</div>
        )}

        <h3 style={{ marginTop: 20, marginBottom: 8 }}>Your Files</h3>
        {files.length === 0 ? (
          <div style={{ color: "#aaa" }}>No files uploaded yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {files.map((f, idx) => (
              <li
                key={f.id || f.path || idx}
                style={{
                  background: "#232946",
                  color: "#fff",
                  borderRadius: 8,
                  marginBottom: 16,
                  padding: "14px 18px",
                  boxShadow: "0 2px 8px 0 rgba(0,0,0,0.07)",
                  border: "1px solid #2c3e50",
                  maxWidth: 640,
                  position: "relative",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>
                      {f.name}
                    </div>
                    <div style={{ color: "#aaa", fontSize: 13, marginTop: 6 }}>
                      {f.created_at
                        ? new Date(f.created_at).toLocaleString()
                        : ""}
                    </div>
                  </div>
                  <div />
                </div>
                {f.publicURL ? (
                  <div style={{ marginTop: 8 }}>
                    <a
                      href={f.publicURL}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#7dd3fc" }}
                    >
                      Open
                    </a>
                  </div>
                ) : null}
                <button
                  onClick={() => {
                    setEditingFile(f);
                    setEditingTitle(f.name || "");
                    setEditingSubject(f.subject_id || "");
                    setEditingSignedUrl(null);
                    setEditModalOpen(true);
                  }}
                  title="Edit source"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "6px 10px",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
        )}
        {editModalOpen && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
          >
            <div
              style={{
                background: isDark ? "#0b1220" : "#fff",
                color: isDark ? "#e6eef8" : "#000",
                padding: 20,
                borderRadius: 8,
                width: "96%",
                maxWidth: 1100,
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2 style={{ margin: 0 }}>Edit Source</h2>
                <div>
                  <button
                    onClick={() => {
                      setEditModalOpen(false);
                      setEditingFile(null);
                    }}
                    style={{
                      background: "#eee",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 18 }}>
                <div style={{ width: 320, minWidth: 240 }}>
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                  >
                    Title
                  </label>
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${isDark ? "#2c3e50" : "#ddd"}`,
                      background: isDark ? "#081024" : "#fff",
                      color: isDark ? "#e6eef8" : "#000",
                    }}
                  />
                  <label
                    style={{
                      display: "block",
                      fontSize: 13,
                      marginTop: 12,
                      marginBottom: 6,
                    }}
                  >
                    Subject
                  </label>
                  <select
                    value={editingSubject}
                    onChange={(e) => setEditingSubject(e.target.value)}
                    style={{
                      width: "100%",
                      padding: 8,
                      borderRadius: 6,
                      border: `1px solid ${isDark ? "#2c3e50" : "#ddd"}`,
                      background: isDark ? "#081024" : "#fff",
                      color: isDark ? "#e6eef8" : "#000",
                    }}
                  >
                    <option value="">(None)</option>
                    {(subjects || []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ width: 520, minWidth: 360, maxWidth: 660 }}>
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                  >
                    PDF Preview
                  </label>
                  {editingSignedUrl || editingFile?.publicURL ? (
                    <iframe
                      src={editingSignedUrl || editingFile?.publicURL}
                      title="PDF preview"
                      style={{
                        width: "100%",
                        height: 360,
                        border: `1px solid ${isDark ? "#2c3e50" : "#ddd"}`,
                        borderRadius: 6,
                        background: isDark ? "#081024" : undefined,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 360,
                        border: `1px dashed ${isDark ? "#294058" : "#ddd"}`,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: isDark ? "#9fb4c8" : "#666",
                      }}
                    >
                      <div>
                        <div>PDF not available</div>
                        {editingSignedUrlError && (
                          <div style={{ marginTop: 8, color: "#b91c1c" }}>
                            {editingSignedUrlError}
                          </div>
                        )}
                        {!editingSignedUrlError && !editingFile?.publicURL && (
                          <div style={{ marginTop: 8, color: "#666" }}>
                            No public URL and signed-url failed.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 360 }}>
                  <label
                    style={{ display: "block", fontSize: 13, marginBottom: 6 }}
                  >
                    Extracted Content (read-only)
                  </label>
                  <textarea
                    value={editingFile?.content || ""}
                    readOnly
                    style={{
                      width: "100%",
                      height: 360,
                      minHeight: 360,
                      fontFamily: "monospace",
                      fontSize: 13,
                      padding: 10,
                      background: isDark ? "#071122" : "#f7f7f8",
                      color: isDark ? "#e6eef8" : "#000",
                      borderRadius: 6,
                      border: `1px solid ${isDark ? "#223244" : "#e5e7eb"}`,
                      overflowY: "auto",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        {/* signed URL loader is handled in useEffect */}
      </div>
    </div>
  );
}
