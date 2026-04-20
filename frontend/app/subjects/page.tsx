"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSubjects } from "../../lib/SubjectsContext";
import { useDraggableList } from "./useDraggableList";
import { useRouter } from "next/navigation";

// Add description to subject type for editing
type EditableSubject = {
  id: string;
  title: string;
  color: string;
  description?: string;
};

export default function SubjectsPage() {
  const { user, loading } = useUser();
  const [showModal, setShowModal] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectColor, setSubjectColor] = useState("#6366f1");
  const [subjectDescription, setSubjectDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Edit modal state
  const [editModal, setEditModal] = useState<null | EditableSubject>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");
  const [editDescription, setEditDescription] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Only load subjects on first mount and after creation
  const {
    subjects,
    setSubjects,
    loadingSubjects,
    reloadSubjects,
    focusReloadNeeded,
    setFocusReloadNeeded,
  } = useSubjects();

  // Card count state and effect (must be after subjects is defined)
  const [cardCounts, setCardCounts] = useState<{ [subjectId: string]: number }>(
    {},
  );
  useEffect(() => {
    async function fetchCardCounts() {
      if (!user) return;
      const { data, error } = await supabase
        .from("cards")
        .select("id, subject_id")
        .eq("user_id", user.id);
      if (!error && data) {
        const counts: { [subjectId: string]: number } = {};
        data.forEach((row: any) => {
          if (row.subject_id) {
            counts[row.subject_id] = (counts[row.subject_id] || 0) + 1;
          }
        });
        setCardCounts(counts);
      }
    }
    fetchCardCounts();
  }, [user, subjects]);

  // Save new order to Supabase
  async function saveOrderToDatabase(newSubjects: any[]) {
    // Batch update order in Supabase
    await Promise.all(
      newSubjects.map((subject, idx) =>
        supabase
          .from("subjects")
          .update({ order: idx + 1 })
          .eq("id", subject.id),
      ),
    );
    reloadSubjects(user.id, supabase);
  }

  const { handleDragStart, handleDragEnter, handleDragEnd, isDragging } =
    useDraggableList(subjects, setSubjects, saveOrderToDatabase);

  const router = useRouter();

  if (!user) {
    return (
      <div style={{ padding: 32, textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
          Sign in to access Subjects
        </h1>
        <p style={{ fontSize: "1.1rem", color: "#aaa" }}>
          Please sign in to view and manage your subjects.
        </p>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
        Subjects
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#aaa", marginBottom: 24 }}>
        Manage your subjects here. Create, edit, and organize your study
        subjects below.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 24,
          marginTop: 32,
        }}
      >
        {loadingSubjects ? (
          <div
            style={{
              gridColumn: "1/-1",
              textAlign: "center",
              minHeight: 80,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                border: "3px solid #6366f1",
                borderTop: "3px solid transparent",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 1s linear infinite",
              }}
            />
            <span>Loading subjects...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {subjects.map((subject, idx) => (
              <div
                key={subject.id}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragEnter={() => handleDragEnter(idx)}
                onDragEnd={handleDragEnd}
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
                  cursor: "move",
                  opacity: isDragging ? 0.7 : 1,
                  transition: "box-shadow 0.2s, opacity 0.15s",
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
                  {subject.description && (
                    <div
                      style={{
                        marginTop: 6,
                        fontSize: 14,
                        color: "var(--card-text, #e5e7eb)",
                        opacity: 0.85,
                        wordBreak: "break-word",
                        maxHeight: 48,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {subject.description}
                    </div>
                  )}
                  {/* Card count box */}
                  <div
                    style={{
                      marginTop: 14,
                      background: "#232946",
                      color: "#fff",
                      borderRadius: 8,
                      padding: "6px 0",
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: 15,
                      boxShadow: "0 1px 4px 0 rgba(0,0,0,0.07)",
                      width: "100%",
                      cursor: "pointer",
                      transition: "background 0.15s, color 0.15s",
                    }}
                    title="Show cards for this subject"
                    onClick={() => router.push(`/cards?subject=${subject.id}`)}
                  >
                    {cardCounts[subject.id] || 0} card
                    {cardCounts[subject.id] === 1 ? "" : "s"}
                  </div>
                </div>
                {/* Edit button bottom right */}
                <button
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 8px 0 rgba(99,102,241,0.10)",
                    cursor: "pointer",
                    fontSize: 18,
                    zIndex: 2,
                  }}
                  title="Edit Subject"
                  onClick={() => {
                    setEditModal({
                      id: subject.id,
                      title: subject.title,
                      color: subject.color,
                      description: subject.description || "",
                    });
                    setEditName(subject.title);
                    setEditColor(subject.color || "#6366f1");
                    setEditDescription(subject.description || "");
                    setEditError("");
                    setEditSuccess("");
                  }}
                >
                  ✏️
                </button>
              </div>
            ))}
            {/* Edit Subject Modal */}
            {editModal && (
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
                  zIndex: 2100,
                }}
              >
                <div
                  style={{
                    background: "var(--card-bg, var(--background, #f3f4f6)",
                    borderRadius: 10,
                    padding: 32,
                    minWidth: 340,
                    boxShadow: "0 2px 16px 0 rgba(0,0,0,0.12)",
                    fontFamily: "'Roboto', sans-serif",
                    color: "var(--card-text, var(--foreground, #222))",
                  }}
                >
                  <h2 style={{ marginBottom: 16 }}>Edit Subject</h2>
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setEditing(true);
                      setEditError("");
                      setEditSuccess("");
                      try {
                        const { error } = await supabase
                          .from("subjects")
                          .update({
                            title: editName,
                            color: editColor,
                            description: editDescription,
                          })
                          .eq("id", editModal.id);
                        if (error) {
                          setEditError(error.message);
                        } else {
                          setEditSuccess("Subject updated!");
                          setTimeout(() => setEditModal(null), 700);
                          reloadSubjects(user.id, supabase);
                        }
                      } catch (err: any) {
                        setEditError(err.message || "Unknown error");
                      }
                      setEditing(false);
                    }}
                  >
                    <input
                      type="text"
                      placeholder="Subject Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
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
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
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
                            onClick={() => setEditColor(c.color)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              border:
                                editColor === c.color
                                  ? "3px solid #333"
                                  : "2px solid #ccc",
                              background: c.color,
                              cursor: "pointer",
                              outline: "none",
                            }}
                          />
                        ))}
                        {/* Color picker */}
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          title="Pick a custom color"
                          style={{
                            width: 36,
                            height: 36,
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: 0,
                          }}
                        />
                      </div>
                    </div>
                    <textarea
                      placeholder="Description (optional)"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      style={{
                        width: "100%",
                        minHeight: 60,
                        marginBottom: 16,
                        padding: "8px 14px",
                        borderRadius: 6,
                        border: "1px solid #6366f1",
                        fontSize: 15,
                        resize: "vertical",
                        background: "var(--main-bg, #f5f7fb)",
                        color: "var(--text-color, #121212)",
                        outline: "none",
                        transition: "background 0.2s, color 0.2s",
                        fontFamily: "inherit",
                      }}
                    />
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      <button
                        type="submit"
                        disabled={editing}
                        style={{
                          background: "#6366f1",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "10px 18px",
                          fontWeight: 600,
                          fontSize: 16,
                          cursor: editing ? "not-allowed" : "pointer",
                        }}
                      >
                        {editing ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditModal(null)}
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
                    {editError && (
                      <div style={{ color: "red", marginTop: 12 }}>
                        {editError}
                      </div>
                    )}
                    {editSuccess && (
                      <div style={{ color: "green", marginTop: 12 }}>
                        {editSuccess}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}
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
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: 32, color: "#bbb", marginBottom: 8 }}>
                  +
                </span>
                <span style={{ fontWeight: 600, color: "#888" }}>
                  Create Subject
                </span>
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
                <textarea
                  placeholder="Description (optional)"
                  value={subjectDescription}
                  onChange={(e) => setSubjectDescription(e.target.value)}
                  style={{
                    width: "100%",
                    minHeight: 60,
                    marginBottom: 16,
                    padding: "8px 14px",
                    borderRadius: 6,
                    border: "1px solid #6366f1",
                    fontSize: 15,
                    resize: "vertical",
                    background: "var(--main-bg, #f5f7fb)",
                    color: "var(--text-color, #121212)",
                    outline: "none",
                    transition: "background 0.2s, color 0.2s",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ marginBottom: 8, fontWeight: 500 }}>
                  Pick a color:
                </div>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                  {/* Color picker */}
                  <input
                    type="color"
                    value={subjectColor}
                    onChange={(e) => setSubjectColor(e.target.value)}
                    title="Pick a custom color"
                    style={{
                      width: 36,
                      height: 36,
                      border: "none",
                      background: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  />
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
