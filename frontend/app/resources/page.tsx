"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase, supabaseConfigured } from "../../lib/supabaseClient";
import { api } from "../../lib/api";
import { useSubjects } from "../../lib/SubjectsContext";

export default function ResourcesPage() {
  const { user, loading } = useUser();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const fetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSubject, setEditingSubject] = useState("");
  const { subjects, loadingSubjects } = useSubjects();
  const pathname = usePathname();
  const [editingSignedUrl, setEditingSignedUrl] = useState<string | null>(null);
  const [editingSignedUrlError, setEditingSignedUrlError] = useState<
    string | null
  >(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [extractedOpen, setExtractedOpen] = useState<boolean>(false);

  useEffect(() => {
    if (user) document.title = `Resources | ComsOS`;
  }, [user]);

  async function fetchFiles() {
    if (!user) return;

    // show spinner only when no cached files
    const showSpinner = files.length === 0;
    if (showSpinner) setUploading(false); // leave uploading state alone

    if (isFetchingRef.current) return;

    async function doFetch(attempt = 0) {
      isFetchingRef.current = true;
      const start = performance.now();
      try {
        const res = await supabase
          .from("uploads")
          .select(
            "id, file_name, public_url, storage_path, created_at, subject_id, extracted_text",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        const duration = Math.round(performance.now() - start);

        if (res.error) {
          try {
            console.error("Failed to load uploads:", {
              error: res.error,
              status: (res as any).status,
              statusText: (res as any).statusText,
              data: res.data,
              duration,
              attempt,
            });
          } catch (logErr) {
            console.error("Failed to load uploads (fallback):", res, {
              duration,
              attempt,
            });
          }

          if (attempt < 2) {
            const delay = 300 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
            return doFetch(attempt + 1);
          }

          if (showSpinner) setFiles([]);
        } else {
          const data = res.data as any[] | null;
          const mapped = (data || []).map((r: any) => ({
            id: r.id,
            name: r.file_name,
            publicURL: r.public_url,
            path: r.storage_path,
            created_at: r.created_at,
            subject_id: r.subject_id,
            content: r.extracted_text || "",
          }));
          console.info("Loaded uploads", { count: mapped.length, duration });
          setFiles(mapped);
          // If the edit modal is open for a file, sync the editingFile state
          // with the freshly-fetched record so publicURL and content stay current.
          try {
            if (editingFile && editingFile.id) {
              const updated = mapped.find((m: any) => m.id === editingFile.id);
              if (updated)
                setEditingFile((prev: any) => ({
                  ...(prev || {}),
                  ...updated,
                }));
            }
          } catch (e) {}
          // persist cache (per-user and generic fallback)
          try {
            if (typeof window !== "undefined") {
              if (user?.id)
                localStorage.setItem(
                  `comsos:uploads:${user.id}`,
                  JSON.stringify(mapped),
                );
              localStorage.setItem(`comsos:uploads`, JSON.stringify(mapped));
            }
          } catch (e) {}
          fetchedRef.current = true;
        }
      } catch (e) {
        console.error(e);
        if (showSpinner) setFiles([]);
      } finally {
        isFetchingRef.current = false;
      }
    }

    await doFetch();
  }

  useEffect(() => {
    // Only fetch when this page is active, or on mount if already on the page
    if (!pathname || !pathname.startsWith("/resources")) return;

    // load cached uploads first (per-user or generic)
    try {
      if (typeof window !== "undefined") {
        let raw: string | null = null;
        if (user && user.id)
          raw = localStorage.getItem(`comsos:uploads:${user.id}`);
        if (!raw) raw = localStorage.getItem(`comsos:uploads`);
        if (raw) setFiles(JSON.parse(raw));
      }
    } catch (e) {}

    // fetch now and whenever the page regains focus/visibility or navigation returns
    if (!fetchedRef.current) fetchFiles();
    if (typeof window === "undefined") return;
    const onFocus = () => {
      // always attempt to refresh files when window regains focus
      fetchFiles();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchFiles();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    function onNavigate(e: any) {
      try {
        const p = e?.detail?.pathname;
        if (!p) return;
        if (p.startsWith("/resources")) fetchFiles();
      } catch (err) {}
    }
    window.addEventListener("comsos:navigate", onNavigate as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "comsos:navigate",
        onNavigate as EventListener,
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pathname]);

  // Load a signed URL when modal opens for private preview
  useEffect(() => {
    if (!editModalOpen || !editingFile) return;
    let cancelled = false;

    async function fetchSignedUrl() {
      setEditingSignedUrl(null);
      setEditingSignedUrlError(null);
      try {
        const j = await api.uploads.getSignedUrl(editingFile.id);
        if (!cancelled && j?.signed_url) setEditingSignedUrl(j.signed_url);
      } catch (e: any) {
        console.error("Failed to fetch signed URL:", e);
        if (!cancelled) setEditingSignedUrlError(e?.message || String(e));
      }
    }

    // initial fetch
    fetchSignedUrl();

    // refresh signed URL when returning to the tab or navigating back
    const onFocus = () => {
      fetchSignedUrl();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchSignedUrl();
    };
    const onNavigate = (e: any) => {
      try {
        const p = e?.detail?.pathname;
        if (!p) return;
        if (p.startsWith("/resources")) fetchSignedUrl();
      } catch (err) {}
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("comsos:navigate", onNavigate as EventListener);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "comsos:navigate",
        onNavigate as EventListener,
      );
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

  // If we're still resolving the auth state, don't blank the UI if we
  // already have files loaded — show a small loading indicator only
  // when there are no files yet.
  if (loading && files.length === 0) {
    return (
      <div
        style={{
          padding: 32,
          textAlign: "center",
          fontFamily: "'Roboto', sans-serif",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

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

  // Save edits to upload metadata (name and subject)
  async function handleSaveEdit() {
    if (!editingFile) return;
    try {
      const updates: any = {};
      if (editingTitle != null) updates.file_name = editingTitle;
      // normalize empty string to null for subject
      updates.subject_id = editingSubject || null;
      const { data, error } = await supabase
        .from("uploads")
        .update(updates)
        .eq("id", editingFile.id)
        .select();
      if (error) {
        console.error("Failed to update upload:", error);
        alert(error.message || "Failed to save");
        return;
      }
      const updated = (data && data[0]) || null;
      // Update local state list
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editingFile.id
            ? {
                ...f,
                name: updated?.file_name ?? editingTitle,
                subject_id: updated?.subject_id ?? (editingSubject || null),
              }
            : f,
        ),
      );
      // update editingFile object shown in modal
      setEditingFile((prev: any) => ({
        ...(prev || {}),
        name: editingTitle,
        subject_id: editingSubject || null,
      }));

      // update cached localStorage entries
      try {
        if (typeof window !== "undefined") {
          const userKey = user?.id ? `comsos:uploads:${user.id}` : null;
          if (userKey) {
            const raw = localStorage.getItem(userKey);
            if (raw) {
              const arr = JSON.parse(raw) as any[];
              const newArr = arr.map((r) =>
                r.id === editingFile.id
                  ? {
                      ...r,
                      name: updated?.file_name ?? editingTitle,
                      subject_id:
                        updated?.subject_id ?? (editingSubject || null),
                    }
                  : r,
              );
              localStorage.setItem(userKey, JSON.stringify(newArr));
            }
          }
          const rawGen = localStorage.getItem("comsos:uploads");
          if (rawGen) {
            const arr = JSON.parse(rawGen) as any[];
            const newArr = arr.map((r) =>
              r.id === editingFile.id
                ? {
                    ...r,
                    name: updated?.file_name ?? editingTitle,
                    subject_id: updated?.subject_id ?? (editingSubject || null),
                  }
                : r,
            );
            localStorage.setItem("comsos:uploads", JSON.stringify(newArr));
          }
        }
      } catch (e) {}

      setEditModalOpen(false);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || String(e));
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
        {/* Hidden native file input - replaced with custom button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={handleUpload}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{
              background: "#6366f1",
              color: "#fff",
              border: "none",
              borderRadius: 9999,
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: 15,
              cursor: uploading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 18px rgba(99,102,241,0.12)",
            }}
          >
            {uploading ? "Uploading..." : "Upload PDF"}
          </button>
          {uploading && (
            <div style={{ marginTop: 8, color: "#888" }}>Uploading...</div>
          )}
        </div>
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
                padding: 24,
                borderRadius: 8,
                width: "100%",
                maxWidth: "none",
                height: "90vh",
                maxHeight: "90vh",
                boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
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
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editingFile}
                    style={{
                      background: "#16a34a",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: editingFile ? "pointer" : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={async () => {
                      if (!editingFile) return;
                      try {
                        const txt = editingFile.content || "";
                        // simple confirmation
                        const proceed = confirm(
                          "Send extracted text to generate flashcards?",
                        );
                        if (!proceed) return;
                        const res = await api.ai.generateCards(
                          txt,
                          editingFile.subject_id || undefined,
                        );
                        console.log("Generated cards:", res);
                        alert(
                          `Request complete — generated ${res.cards?.length || 0} cards (see console).`,
                        );
                      } catch (err: any) {
                        console.error(err);
                        alert(
                          "Card generation failed: " +
                            (err?.message || String(err)),
                        );
                      }
                    }}
                    style={{
                      background: "#0ea5a4",
                      color: "#fff",
                      border: "none",
                      padding: "6px 10px",
                      borderRadius: 6,
                      cursor: editingFile ? "pointer" : "not-allowed",
                      fontWeight: 600,
                    }}
                  >
                    Generate Cards
                  </button>
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
              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 18,
                  flex: 1,
                  overflow: "hidden",
                }}
              >
                <div style={{ width: 320, minWidth: 240, overflow: "auto" }}>
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

                <div
                  style={{
                    flex: 1,
                    minWidth: 520,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <label style={{ display: "block", fontSize: 13 }}>
                      PDF Preview
                    </label>
                    <button
                      onClick={() => setExtractedOpen((v) => !v)}
                      style={{
                        background: extractedOpen
                          ? isDark
                            ? "#1f2937"
                            : "#eef2ff"
                          : isDark
                            ? "#0b1220"
                            : "#fff",
                        border: `1px solid ${isDark ? "#223244" : "#ddd"}`,
                        color: isDark ? "#e6eef8" : "#111827",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                      title={
                        extractedOpen
                          ? "Hide extracted text"
                          : "Show extracted text"
                      }
                    >
                      {extractedOpen ? "Hide Extracted" : "Show Extracted"}
                    </button>
                  </div>
                  {editingSignedUrl || editingFile?.publicURL ? (
                    <iframe
                      key={
                        editingSignedUrl ||
                        editingFile?.publicURL ||
                        editingFile?.id
                      }
                      src={editingSignedUrl || editingFile?.publicURL}
                      title="PDF preview"
                      style={{
                        width: "100%",
                        height: "100%",
                        border: `1px solid ${isDark ? "#2c3e50" : "#ddd"}`,
                        borderRadius: 6,
                        background: isDark ? "#081024" : undefined,
                        flex: 1,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 520,
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
                {/* extracted text panel: animated open/closed */}
                <div
                  style={
                    extractedOpen
                      ? {
                          width: 420,
                          minWidth: 420,
                          transition:
                            "width 220ms ease, opacity 220ms ease, margin-left 220ms ease",
                          opacity: 1,
                          overflow: "auto",
                        }
                      : {
                          width: 0,
                          minWidth: 0,
                          transition:
                            "width 220ms ease, opacity 220ms ease, margin-left 220ms ease",
                          opacity: 0,
                          overflow: "hidden",
                          marginLeft: 0,
                        }
                  }
                >
                  <div style={{ paddingLeft: extractedOpen ? 0 : 0 }}>
                    <label
                      style={{
                        display: "block",
                        fontSize: 13,
                        marginBottom: 6,
                      }}
                    >
                      Extracted Content (read-only)
                    </label>
                    <textarea
                      value={editingFile?.content || ""}
                      readOnly
                      style={{
                        width: "100%",
                        height: 520,
                        minHeight: 520,
                        fontFamily: "monospace",
                        fontSize: 13,
                        padding: 10,
                        background: isDark ? "#071122" : "#f7f7f8",
                        color: isDark ? "#e6eef8" : "#000",
                        borderRadius: 6,
                        border: `1px solid ${isDark ? "#223244" : "#e5e7eb"}`,
                        overflowY: "auto",
                        display: extractedOpen ? "block" : "none",
                      }}
                    />
                  </div>
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
