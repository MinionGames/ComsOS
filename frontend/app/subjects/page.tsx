"use client";

import React, { useState } from "react";
import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSubjects } from "../../lib/SubjectsContext";

export default function SubjectsPage() {
  const { user, loading } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#6366f1");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Removed local subjects and loadingSubjects state, using context instead

  // Only load subjects on first mount and after creation
  const { subjects, loadingSubjects, reloadSubjects } = useSubjects();

  // On first mount, load subjects if not already loaded
  React.useEffect(() => {
    if (user && subjects.length === 0) {
      reloadSubjects(user.id, supabase);
    }
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
        <h2>Sign in to access Subjects</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setSuccess("");
    try {
      const { error } = await supabase
        .from("subjects")
        .insert([
          { title: subjectName, color: subjectColor, user_id: user.id },
        ]);
      if (error) {
        setError(error.message);
      } else {
        setSuccess("Subject created!");
        setSubjectName("");
        setSubjectColor("#6366f1");
        setShowModal(false);
        reloadSubjects(user.id, supabase);
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
    }
    setCreating(false);
  };

  return (
    <div style={{ padding: 32, fontFamily: "'Roboto', sans-serif" }}>
      <h1>Subjects</h1>
      <p>Your subjects will appear here.</p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          marginTop: 32,
        }}
      >
        {/* Subject Cards */}
        {loadingSubjects ? (
          <div style={{ gridColumn: "1/-1", textAlign: "center" }}>
            Loading...
          </div>
        ) : (
          <>
            {subjects.map((subject) => (
              <div
                key={subject.id}
                style={{
                  borderRadius: 12,
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
                  background: "var(--card-bg, var(--background, #f3f4f6))",
                  color: "var(--card-text, var(--foreground, #fff))",
                  aspectRatio: "2.5 / 3.5",
                  width: "100%",
                  minWidth: 0,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  position: "relative",
                  overflow: "hidden",
                  cursor: "pointer",
                  transition: "box-shadow 0.2s",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: subject.color || "#6366f1",
                    borderTopLeftRadius: 12,
                    borderTopRightRadius: 12,
                    borderBottom: "2px solid rgba(0,0,0,0.07)",
                    marginBottom: 12,
                  }}
                />
                <div style={{ padding: 18, width: "100%" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 18,
                      color: "#fff",
                      textShadow: "0 1px 4px rgba(0,0,0,0.10)",
                    }}
                  >
                    {subject.title}
                  </div>
                </div>
              </div>
            ))}
            {/* Create Subject Card at the end */}
            <div
              onClick={() => setShowModal(true)}
              style={{
                cursor: "pointer",
                borderRadius: 12,
                boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
                background: "var(--card-bg, var(--background, #f3f4f6))",
                color: "var(--card-text, var(--foreground, #222))",
                aspectRatio: "2.5 / 3.5",
                width: "100%",
                minWidth: 0,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                border: "2px dashed #bbb",
                transition: "box-shadow 0.2s",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: 8,
                  borderTopLeftRadius: 12,
                  borderTopRightRadius: 12,
                  background: "transparent",
                  marginBottom: 0,
                }}
              />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%" }}>
                <span style={{ fontSize: 32, color: "#bbb", marginBottom: 8 }}>+</span>
                <span style={{ fontWeight: 600, color: "#888" }}>Create Subject</span>
              </div>
            </div>
          </>
        )}
      </div>
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              padding: 32,
              minWidth: 320,
              boxShadow: "0 2px 16px 0 rgba(0,0,0,0.12)",
              fontFamily: "'Roboto', sans-serif",
              color: "#121212",
            }}
          >
            <h2 style={{ marginBottom: 16 }}>Create Subject</h2>
            <form onSubmit={handleCreateSubject}>
              <input
                type="text"
                placeholder="Subject Name"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                required
                style={{
                  width: "100%",
                  marginBottom: 16,
                  padding: 10,
                  borderRadius: 6,
                  border: "1px solid #ccc",
                  fontSize: 16,
                }}
              />
              <div style={{ marginBottom: 16 }}>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  Pick a color:
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  {[
                    { color: "#ef4444", name: "Red" },
                    { color: "#f59e42", name: "Orange" },
                    { color: "#fde047", name: "Yellow" },
                    { color: "#22c55e", name: "Green" },
                    { color: "#3b82f6", name: "Blue" },
                    { color: "#a855f7", name: "Purple" },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      aria-label={c.name}
                      onClick={() => setSubjectColor(c.color)}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border:
                          subjectColor === c.color
                            ? "3px solid #333"
                            : "2px solid #ccc",
                        background: c.color,
                        cursor: "pointer",
                        outline: "none",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={creating}
                  style={{
                    background: "var(--cosmos-purple)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 18px",
                    fontWeight: 600,
                    fontSize: 16,
                    cursor: creating ? "not-allowed" : "pointer",
                  }}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: "#eee",
                    color: "#333",
                    border: "none",
                    borderRadius: 6,
                    padding: "10px 18px",
                    fontWeight: 500,
                    fontSize: 16,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
              {error && (
                <div style={{ color: "red", marginTop: 12 }}>{error}</div>
              )}
              {success && (
                <div style={{ color: "green", marginTop: 12 }}>{success}</div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
