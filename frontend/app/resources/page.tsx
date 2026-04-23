"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { api } from "../../lib/api";

export default function ResourcesPage() {
  const { user, loading } = useUser();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);

  useEffect(() => {
    if (user) document.title = `Resources | ComsOS`;
  }, [user]);
  async function fetchFiles() {
    if (!user) return;
    try {
      const prefix = `${user.id}/`;
      const { data, error } = await supabase.storage
        .from("studyos-uploads")
        .list(prefix, { limit: 100, offset: 0 });
      if (error) {
        console.error(error);
        setFiles([]);
      } else {
        // enrich with public URLs
        const enriched = await Promise.all(
          (data || []).map(async (item: any) => {
            const path = `${user.id}/${item.name}`;
            const { data: urlData } = supabase.storage
              .from("studyos-uploads")
              .getPublicUrl(path);
            return { name: item.name, path, publicURL: urlData.publicUrl };
          }),
        );
        setFiles(enriched);
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
    const file = e.target.files?.[0];
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
      e.currentTarget.value = "";
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
          <div style={{ color: "#888" }}>No files uploaded yet.</div>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {files.map((f) => (
              <li key={f.path} style={{ marginBottom: 8 }}>
                <a
                  href={f.publicURL}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#0070f3" }}
                >
                  {f.name}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
