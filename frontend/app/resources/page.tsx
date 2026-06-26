"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import { api } from "../../lib/api";
import { useSubjects } from "../../lib/SubjectsContext";

export default function ResourcesPage() {
  const { user, loading } = useUser();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<any[]>([]);
  const fetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const lastFetchTsRef = useRef<number>(0);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingSubject, setEditingSubject] = useState("");
  const { subjects } = useSubjects();
  const pathname = usePathname();
  const [editingSignedUrl, setEditingSignedUrl] = useState<string | null>(null);
  const [editingSignedUrlError, setEditingSignedUrlError] = useState<
    string | null
  >(null);
  const [isDark, setIsDark] = useState<boolean>(false);
  const [extractedOpen, setExtractedOpen] = useState<boolean>(false);
  const [generationState, setGenerationState] = useState<
    "idle" | "in-progress" | "success" | "error"
  >("idle");
  const [generationMessage, setGenerationMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (user) document.title = `Resources | ComsOS`;
  }, [user]);

  async function fetchFiles() {
    // Prevent rapid duplicate fetches (e.g. navigate event + component mount)
    const now = Date.now();
    if (now - (lastFetchTsRef.current || 0) < 1500) return;
    lastFetchTsRef.current = now;
    if (!user) return;
    if (isFetchingRef.current) return;
    const showSpinner = files.length === 0;
    if (showSpinner) setUploading(false);
    isFetchingRef.current = true;
    try {
      const data = (await api.uploads.list()) || [];
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        name: r.file_name,
        publicURL: r.public_url,
        path: r.storage_path,
        created_at: r.created_at,
        subject_id: r.subject_id,
        content: r.extracted_text || "",
        generation_error: r?.metadata?.generation_error || null,
        processed: r?.processed ?? null,
      }));
      setFiles(mapped);
      // persist cache
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
    } catch (e) {
      console.error("Failed to fetch uploads:", e);
      if (showSpinner) setFiles([]);
    } finally {
      isFetchingRef.current = false;
    }
  }

  useEffect(() => {
    if (!pathname || !pathname.startsWith("/resources")) return;
    try {
      if (typeof window !== "undefined") {
        let raw: string | null = null;
        if (user && user.id)
          raw = localStorage.getItem(`comsos:uploads:${user.id}`);
        if (!raw) raw = localStorage.getItem(`comsos:uploads`);
        if (raw) setFiles(JSON.parse(raw));
      }
    } catch (e) {}

    if (!fetchedRef.current) fetchFiles();
    if (typeof window === "undefined") return;
    const onFocus = () => fetchFiles();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchFiles();
    };
    const onNavigate = (e: any) => {
      try {
        const p = e?.detail?.pathname;
        if (!p) return;
        if (p.startsWith("/resources")) fetchFiles();
      } catch (err) {}
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("comsos:navigate", onNavigate as EventListener);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "comsos:navigate",
        onNavigate as EventListener,
      );
    };
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
    fetchSignedUrl();
    const onFocus = () => fetchSignedUrl();
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
    setIsDark(mq.matches);
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

  if (loading && files.length === 0) {
    return (
      <>
        <div
          style={{
            padding: 32,
            textAlign: "center",
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          <div>Loading...</div>
        </div>
        {generationState !== "idle" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
            }}
          >
            <div
              style={{
                background: isDark ? "#0b1220" : "#fff",
                color: isDark ? "#e6eef8" : "#000",
                padding: 28,
                borderRadius: 10,
                minWidth: 320,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              {generationState === "in-progress" && (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: "5px solid var(--primary, #6366f1)",
                      borderTop: "5px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    Generating deck…
                  </div>
                </>
              )}
              {generationState === "success" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 34, color: "#10b981" }}>✓</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {generationMessage || "Deck generated"}
                  </div>
                </div>
              )}
              {generationState === "error" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 34, color: "#ef4444" }}>✕</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {generationMessage || "Generation failed"}
                  </div>
                </div>
              )}
              <style>{`@keyframes spin {0% { transform: rotate(0deg);}100% { transform: rotate(360deg);} }`}</style>
            </div>
          </div>
        )}
      </>
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
      const subjectId = "null";
      await api.uploads.upload(subjectId, file);
      await fetchFiles();
      input.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(
        err.message || "Upload failed: network error or server unreachable.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingFile) return;
    try {
      const updates: any = {};
      if (editingTitle != null) updates.file_name = editingTitle;
      updates.subject_id = editingSubject || null;
      const updated = await api.uploads.update(editingFile.id, updates);
      if (!updated) {
        alert("Failed to save");
        return;
      }
      setFiles((prev) =>
        prev.map((f) =>
          f.id === editingFile.id
            ? {
                ...f,
                name: updated?.file_name ?? editingTitle,
                subject_id: updated?.subject_id ?? (editingSubject || null),
                generation_error:
                  updated?.metadata?.generation_error ?? f.generation_error,
              }
            : f,
        ),
      );
      setEditingFile((prev: any) => ({
        ...(prev || {}),
        name: editingTitle,
        subject_id: editingSubject || null,
      }));
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
                      generation_error:
                        updated?.metadata?.generation_error ??
                        r?.generation_error,
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
                    generation_error:
                      updated?.metadata?.generation_error ??
                      r?.generation_error,
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
                {f.generation_error ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        background: "#fee2e2",
                        color: "#991b1b",
                        padding: "6px 8px",
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      Generation failed — try again
                    </div>
                    <button
                      onClick={() => {
                        setEditingFile(f);
                        setEditingTitle(f.name || "");
                        setEditingSubject(f.subject_id || "");
                        setEditingSignedUrl(null);
                        setEditModalOpen(true);
                        setGenerationState("idle");
                        setGenerationMessage(null);
                      }}
                      style={{
                        background: "#ef4444",
                        color: "#fff",
                        border: "none",
                        padding: "6px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      Try again
                    </button>
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
                    disabled={!editingFile || generationState === "in-progress"}
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
                        setGenerationState("in-progress");
                        setGenerationMessage(null);
                        // Retry loop for transient AI generation failures
                        const maxAttempts = 3;
                        let attempt = 0;
                        let lastErr: any = null;
                        let res: any = null;
                        while (attempt < maxAttempts) {
                          attempt += 1;
                          try {
                            res = await api.ai.generateCards(
                              txt,
                              editingFile.subject_id || undefined,
                              editingTitle || editingFile.name || undefined,
                              editingFile.id,
                            );
                            // success — break the retry loop
                            lastErr = null;
                            break;
                          } catch (e: any) {
                            lastErr = e;
                            console.warn(
                              `AI generation attempt ${attempt} failed:`,
                              e?.message || e,
                            );
                            // if this was the last attempt, rethrow below; otherwise wait before retrying
                            if (attempt < maxAttempts) {
                              setGenerationMessage(
                                `Attempt ${attempt} failed — retrying...`,
                              );
                              // exponential backoff small delay
                              await new Promise((r) =>
                                setTimeout(r, 800 * attempt),
                              );
                              continue;
                            }
                          }
                        }
                        if (lastErr) throw lastErr;
                        console.log("Generated cards:", res);
                        setGenerationState("success");
                        setGenerationMessage(
                          `Generated ${res.cards?.length || 0} cards.`,
                        );
                        // refresh listing after generation
                        await fetchFiles();
                        // auto-hide success after short delay
                        setTimeout(() => setGenerationState("idle"), 2500);
                      } catch (err: any) {
                        console.error(err);
                        setGenerationState("error");
                        // err.message should now be friendly (api.ts parses JSON detail)
                        setGenerationMessage(
                          err && err.message ? err.message : String(err),
                        );
                        setTimeout(() => setGenerationState("idle"), 6000);
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
                    disabled={generationState === "in-progress"}
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

        {generationState !== "idle" && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100000,
            }}
          >
            <div
              style={{
                background: isDark ? "#0b1220" : "#fff",
                color: isDark ? "#e6eef8" : "#000",
                padding: 28,
                borderRadius: 10,
                minWidth: 320,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              {generationState === "in-progress" && (
                <>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      border: "5px solid var(--primary, #6366f1)",
                      borderTop: "5px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    Generating deck…
                  </div>
                </>
              )}
              {generationState === "success" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 34, color: "#10b981" }}>✓</div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>
                    {generationMessage || "Deck generated"}
                  </div>
                </div>
              )}
              {generationState === "error" && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 34, color: "#ef4444" }}>✕</div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>
                    {generationMessage || "Generation failed"}
                  </div>
                </div>
              )}
              <style>{`@keyframes spin {0% { transform: rotate(0deg);}100% { transform: rotate(360deg);} }`}</style>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
