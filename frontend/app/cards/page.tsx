"use client";
import { useState, useEffect, useMemo, useRef } from "react";

// ...existing code...
import { useUser } from "../../lib/UserContext";
import { supabase } from "../../lib/supabaseClient";
import { useSubjects } from "../../lib/SubjectsContext";
import { useDraggableList } from "./useDraggableList";
import { useSearchParams, usePathname } from "next/navigation";

const CARD_TYPES = [
  { value: "task", label: "Task" },
  { value: "file", label: "File" },
  { value: "note", label: "Note" },
];

export default function CardsPage() {
  const [showModal, setShowModal] = useState(false);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusReloadNeeded, setFocusReloadNeeded] = useState(false);
  const { user, loading: userLoading } = useUser();
  const { subjects, loadingSubjects } = useSubjects();
  const pathname = usePathname();
  const fetchedRef = useRef(false);
  const isFetchingRef = useRef(false);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Card creation state
  const [cardName, setCardName] = useState("");
  const [cardContent, setCardContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Card edit modal state
  const [editModal, setEditModal] = useState<null | any>(null);
  const [editName, setEditName] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editSubject, setEditSubject] = useState<string | null>(null);
  const [editMastery, setEditMastery] = useState(0);
  const [editLastReviewed, setEditLastReviewed] = useState<string | null>(null);
  const [editNextReview, setEditNextReview] = useState<string | null>(null);
  const [cardTimeFormat, setCardTimeFormat] = useState("relative");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // load card time format preference from localStorage
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("comsos-cards-time-format");
      if (stored === "absolute" || stored === "relative") {
        setCardTimeFormat(stored);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    if (cardTimeFormat === "absolute") return d.toLocaleString();
    const diff = Date.now() - d.getTime();
    const abs = Math.abs(diff);
    const s = Math.floor(abs / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const day = Math.floor(h / 24);
    if (s < 60) return diff >= 0 ? `${s} seconds ago` : `in ${s} seconds`;
    if (m < 60) return diff >= 0 ? `${m} minutes ago` : `in ${m} minutes`;
    if (h < 24) return diff >= 0 ? `${h} hours ago` : `in ${h} hours`;
    if (day < 30) return diff >= 0 ? `${day} days ago` : `in ${day} days`;
    return d.toLocaleString();
  }

  // Fetch cards function for reuse
  async function fetchCards() {
    // If auth is still resolving, keep the existing cards visible and
    // skip clearing them. Only clear when we know there's no user.
    if (!user) {
      if (!userLoading) {
        setCards([]);
        setLoading(false);
      } else {
        // Auth still resolving. If we have a cached generic copy, restore it
        // so the UI doesn't show a spinner while auth completes.
        try {
          if (typeof window !== "undefined") {
            let raw: string | null = null;
            // prefer per-user cache when available
            if (user && user.id)
              raw = localStorage.getItem(`comsos:cards:${user.id}`);
            if (!raw) raw = localStorage.getItem(`comsos:cards`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                setCards(parsed);
                setLoading(false);
                // do not mark fetchedRef; wait for real fetch when user set
              }
            }
          }
        } catch (e) {}
      }
      return;
    }

    // show spinner only when there are no cached cards
    const showSpinner = cards.length === 0;
    if (showSpinner) setLoading(true);

    if (isFetchingRef.current) return;

    async function doFetch(attempt = 0) {
      isFetchingRef.current = true;
      const start = performance.now();
      try {
        const res = await supabase
          .from("cards")
          .select(
            "id, title, type, content, file_url, due_date, created_at, subject_id, order, mastery_level, last_reviewed_at, next_review_at",
          )
          .eq("user_id", user.id)
          .order("order", { ascending: true });

        const duration = Math.round(performance.now() - start);

        if (res.error) {
          try {
            console.error("Failed to load cards:", {
              error: res.error,
              status: (res as any).status,
              statusText: (res as any).statusText,
              data: res.data,
              duration,
              attempt,
            });
          } catch (logErr) {
            console.error("Failed to load cards (fallback):", res, {
              duration,
              attempt,
            });
          }

          if (attempt < 2) {
            const delay = 300 * Math.pow(2, attempt);
            await new Promise((r) => setTimeout(r, delay));
            return doFetch(attempt + 1);
          }

          if (showSpinner) setCards([]);
        } else {
          console.info("Loaded cards", {
            count: (res.data || []).length,
            duration,
          });
          setCards(res.data || []);
          // persist to localStorage (per-user and generic fallback)
          try {
            if (typeof window !== "undefined") {
              if (user?.id)
                localStorage.setItem(
                  `comsos:cards:${user.id}`,
                  JSON.stringify(res.data || []),
                );
              localStorage.setItem(
                `comsos:cards`,
                JSON.stringify(res.data || []),
              );
            }
          } catch (e) {}
          fetchedRef.current = true;
        }
      } catch (e) {
        console.error("Error fetching cards:", e);
        if (showSpinner) setCards([]);
      } finally {
        isFetchingRef.current = false;
        if (showSpinner) setLoading(false);
        setFocusReloadNeeded(false);
      }
    }

    await doFetch();
  }

  useEffect(() => {
    // Load cached cards first (per-user)
    try {
      if (typeof window !== "undefined") {
        let raw: string | null = null;
        if (user && user.id)
          raw = localStorage.getItem(`comsos:cards:${user.id}`);
        if (!raw) raw = localStorage.getItem(`comsos:cards`);
        if (raw) {
          setCards(JSON.parse(raw));
          setLoading(false);
        }
      }
    } catch (e) {}

    // Fetch when navigating to /cards. Re-fetch if we haven't fetched yet,
    // if there are no cards cached, or if a focus/visibility-triggered reload is needed.
    if (pathname && pathname.startsWith("/cards")) {
      if (!fetchedRef.current || cards.length === 0 || focusReloadNeeded) {
        fetchCards();
      }
    }
    if (typeof window === "undefined") return;
    function onFocus() {
      if (!fetchedRef.current) fetchCards();
    }
    function onVisibility() {
      if (document.visibilityState === "visible" && !fetchedRef.current)
        fetchCards();
    }
    function onNavigate(e: any) {
      try {
        const p = e?.detail?.pathname;
        if (!p) return;
        if (p.startsWith("/cards")) fetchCards();
      } catch (err) {}
    }
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
    // include cards length and focusReloadNeeded so navigation back to this
    // page will trigger fetch when needed
  }, [user, userLoading, pathname, cards.length, focusReloadNeeded]);

  async function handleCreateCard(e: any) {
    e.preventDefault();
    if (!cardName.trim()) {
      setError("Card name is required.");
      return;
    }
    setCreating(true);
    setError("");
    const { error: insertError } = await supabase.from("cards").insert([
      {
        user_id: user.id,
        title: cardName,
        content: cardContent,
        subject_id: selectedSubject || null,
      },
    ]);
    setCreating(false);
    if (insertError) {
      setError(insertError.message || "Failed to create card.");
      return;
    }
    setShowModal(false);
    setCardName("");
    setCardContent("");
    setSelectedSubject("");
    // Refresh cards
    setLoading(true);
    const { data } = await supabase
      .from("cards")
      .select(
        "id, title, type, content, file_url, due_date, created_at, subject_id, order, mastery_level, last_reviewed_at, next_review_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCards(data || []);
    setLoading(false);
    // update cache after insert
    try {
      if (typeof window !== "undefined") {
        if (user && user.id) {
          const raw = localStorage.getItem(`comsos:cards:${user.id}`);
          const arr = raw ? (JSON.parse(raw) as any[]) : [];
          localStorage.setItem(
            `comsos:cards:${user.id}`,
            JSON.stringify(data || arr),
          );
        }
        // also update generic cache
        const rawGen = localStorage.getItem(`comsos:cards`);
        const arrGen = rawGen ? (JSON.parse(rawGen) as any[]) : [];
        localStorage.setItem(`comsos:cards`, JSON.stringify(data || arrGen));
      }
    } catch (e) {}
  }

  // Save new order to Supabase
  async function saveOrderToDatabase(newCards: any[]) {
    // Update each card's order field in Supabase
    await Promise.all(
      newCards.map((card, idx) =>
        supabase
          .from("cards")
          .update({ order: idx + 1 })
          .eq("id", card.id),
      ),
    );
  }

  // Mark the currently-open card as reviewed (sets last_reviewed_at to now)
  async function handleMarkReviewed() {
    if (!editModal) return;
    setEditing(true);
    setEditError("");
    try {
      const now = new Date().toISOString();
      const { error: markError } = await supabase
        .from("cards")
        .update({ last_reviewed_at: now })
        .eq("id", editModal.id);
      if (markError) {
        setEditError(markError.message || "Failed to mark reviewed.");
        return;
      }
      // update local state and refresh list
      setEditLastReviewed(now);
      setLoading(true);
      const { data } = await supabase
        .from("cards")
        .select(
          "id, title, content, created_at, subject_id, order, mastery_level, last_reviewed_at, next_review_at",
        )
        .eq("user_id", user.id)
        .order("order", { ascending: true });
      setCards(data || []);
      setLoading(false);
    } catch (err: any) {
      setEditError(err?.message || String(err));
    } finally {
      setEditing(false);
    }
  }

  const { handleDragStart, handleDragEnter, handleDragEnd, isDragging } =
    useDraggableList(cards, setCards, saveOrderToDatabase);

  // Get subject filter from URL
  const searchParams = useSearchParams();
  const subjectFilter = searchParams.get("subject") || "";

  // Filtered cards based on search and subject
  const filteredCards = useMemo(() => {
    let filtered = cards;
    if (subjectFilter) {
      filtered = filtered.filter((card) => card.subject_id === subjectFilter);
    }
    if (!search.trim()) return filtered;
    const lower = search.toLowerCase();
    return filtered.filter(
      (card) =>
        (card.title && card.title.toLowerCase().includes(lower)) ||
        (card.type && card.type.toLowerCase().includes(lower)) ||
        (card.content && card.content.toLowerCase().includes(lower)),
    );
  }, [cards, search, subjectFilter]);

  return (
    <div style={{ padding: 32, position: "relative" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
          Cards
        </h1>
        <button
          style={{
            background: "#6366f1",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "10px 22px",
            fontWeight: 600,
            fontSize: 16,
            cursor: "pointer",
            marginLeft: 16,
            boxShadow: "0 2px 8px 0 rgba(99,102,241,0.08)",
            transition: "background 0.18s",
          }}
          onClick={() => setShowModal(true)}
        >
          + Create Card
        </button>
      </div>
      <p style={{ fontSize: "1.1rem", color: "#aaa" }}>
        This is the Cards page. Here you will be able to view, create, and
        manage your study cards in the future.
      </p>

      {/* Search bar under description */}
      <div
        style={{
          margin: "18px 0 0 0",
          display: "flex",
          justifyContent: "flex-start",
        }}
      >
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cards..."
          style={{
            padding: "8px 14px",
            borderRadius: 6,
            border: "1px solid #6366f1",
            fontSize: 15,
            width: 260,
            outline: "none",
            background: "var(--main-bg, #f5f7fb)",
            color: "var(--text-color, #121212)",
            transition: "background 0.2s, color 0.2s",
          }}
        />
      </div>

      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: 16 }}>
          Your Cards
        </h2>
        <div style={{ minHeight: 80 }}>
          {loading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "#aaa",
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
              <span>Loading cards...</span>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            </div>
          ) : filteredCards.length === 0 ? (
            <div style={{ color: "#aaa" }}>No cards found.</div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {filteredCards.map((card, idx) => (
                <li
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  style={{
                    background: isDragging ? "#2d325a" : "#232946",
                    color: "#fff",
                    borderRadius: 8,
                    marginBottom: 16,
                    padding: "18px 20px 14px 20px",
                    boxShadow: "0 2px 8px 0 rgba(0,0,0,0.07)",
                    border: "1px solid #2c3e50",
                    maxWidth: 480,
                    opacity: isDragging ? 0.7 : 1,
                    cursor: "move",
                    transition: "background 0.15s, opacity 0.15s",
                    position: "relative",
                  }}
                >
                  <div
                    style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}
                  >
                    <span
                      style={{ color: "#aaa", fontSize: 13, marginRight: 8 }}
                    >
                      {Number.isFinite(card.order) ? card.order : idx + 1}.
                    </span>
                    {card.title}
                    {/* type badge removed */}
                    <button
                      style={{
                        position: "absolute",
                        top: 12,
                        right: 12,
                        background: "#6366f1",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "2px 10px",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                      title="Edit Card"
                      onClick={() => {
                        setEditModal(card);
                        setEditName(card.title);
                        setEditContent(card.content || "");
                        setEditSubject(card.subject_id || "");
                        setEditMastery(card.mastery_level ?? 0);
                        // keep full ISO for last reviewed so display helper can format it
                        setEditLastReviewed(card.last_reviewed_at || "");
                        // keep datetime-local format for next review input
                        setEditNextReview(
                          card.next_review_at
                            ? card.next_review_at.slice(0, 16)
                            : "",
                        );
                        setEditError("");
                      }}
                    >
                      ✏️ Edit
                    </button>
                  </div>
                  {card.content && (
                    <div style={{ color: "#aaa", fontSize: 15 }}>
                      {card.content}
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginTop: 8,
                    }}
                  >
                    <div style={{ flex: 1, marginRight: 12 }}>
                      <div
                        style={{
                          height: 10,
                          background: "#1f2430",
                          borderRadius: 6,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.round((card.mastery_level ?? 0) * 100)}%`,
                            background: "#6366f1",
                            transition: "width 0.25s ease",
                          }}
                        />
                      </div>
                    </div>
                    <div
                      style={{
                        minWidth: 140,
                        textAlign: "right",
                        color: "#888",
                        fontSize: 12,
                      }}
                    >
                      {card.last_reviewed_at
                        ? formatDate(card.last_reviewed_at)
                        : "Never reviewed"}
                    </div>
                  </div>
                </li>
              ))}
              {/* Card edit modal */}
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
                    zIndex: 1000,
                  }}
                  onClick={() => setEditModal(null)}
                >
                  <div
                    style={{
                      background: "#222a34",
                      padding: 32,
                      borderRadius: 12,
                      minWidth: 760,
                      maxWidth: 1100,
                      color: "#fff",
                      boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h2 style={{ marginBottom: 16 }}>Edit Card</h2>
                    <form
                      style={{ width: "100%" }}
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!editName.trim()) {
                          setEditError("Card name is required.");
                          return;
                        }
                        setEditing(true);
                        setEditError("");
                        // Validate mastery_level
                        if (editMastery < 0 || editMastery > 1) {
                          setEditError(
                            "Mastery level must be between 0 and 1.",
                          );
                          setEditing(false);
                          return;
                        }
                        const { error: updateError } = await supabase
                          .from("cards")
                          .update({
                            title: editName,
                            content: editContent,
                            subject_id: editSubject || null,
                            mastery_level: editMastery,
                            last_reviewed_at: editLastReviewed
                              ? new Date(editLastReviewed).toISOString()
                              : null,
                            next_review_at: editNextReview
                              ? new Date(editNextReview).toISOString()
                              : null,
                          })
                          .eq("id", editModal.id);
                        setEditing(false);
                        if (updateError) {
                          setEditError(
                            updateError.message || "Failed to update card.",
                          );
                          return;
                        }
                        setEditModal(null);
                        // Refresh cards
                        setLoading(true);
                        const { data } = await supabase
                          .from("cards")
                          .select(
                            "id, title, content, created_at, subject_id, order, mastery_level, last_reviewed_at, next_review_at",
                          )
                          .eq("user_id", user.id)
                          .order("order", { ascending: true });
                        setCards(data || []);
                        setLoading(false);
                      }}
                    >
                      {/* Removed duplicate Card Name field above the two-column layout */}
                      <div style={{ display: "flex", gap: 32 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ marginBottom: 18 }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Card Name
                            </label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid #6366f1",
                                fontSize: 15,
                                marginBottom: 4,
                                background: "var(--main-bg, #f5f7fb)",
                                color: "var(--text-color, #121212)",
                                fontFamily: "inherit",
                                outline: "none",
                              }}
                              placeholder="Enter card name"
                              disabled={editing}
                              autoFocus
                            />
                          </div>
                          <div style={{ marginBottom: 18 }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Subject
                            </label>
                            <select
                              value={editSubject ?? ""}
                              onChange={(e) => setEditSubject(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid #6366f1",
                                fontSize: 15,
                                background: "var(--main-bg, #f5f7fb)",
                                color: "var(--text-color, #121212)",
                                fontFamily: "inherit",
                                outline: "none",
                              }}
                              disabled={editing || loadingSubjects}
                            >
                              <option value="">No subject</option>
                              {subjects.map((subj) => (
                                <option key={subj.id} value={subj.id}>
                                  {subj.title}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div style={{ marginBottom: 18 }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Mastery Level
                            </label>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  flex: 1,
                                  height: 12,
                                  background: "#1f2430",
                                  borderRadius: 6,
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    height: "100%",
                                    width: `${Math.round((editMastery ?? 0) * 100)}%`,
                                    background: "#6366f1",
                                    transition: "width 0.25s ease",
                                  }}
                                />
                              </div>
                              <div
                                style={{
                                  minWidth: 48,
                                  textAlign: "right",
                                  color: "#ddd",
                                  fontWeight: 600,
                                }}
                              >
                                {Math.round((editMastery ?? 0) * 100)}%
                              </div>
                            </div>
                          </div>
                          <div style={{ marginBottom: 18 }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Last Reviewed At
                            </label>
                            <div
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid #2f3646",
                                background: "#14181f",
                                color: "#ddd",
                                fontSize: 14,
                                marginBottom: 4,
                                minHeight: 40,
                                display: "flex",
                                alignItems: "center",
                              }}
                            >
                              {editLastReviewed
                                ? formatDate(editLastReviewed)
                                : "Never reviewed"}
                            </div>
                          </div>
                          <div style={{ marginBottom: 18 }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Next Review At
                            </label>
                            <input
                              type="datetime-local"
                              value={editNextReview ?? ""}
                              onChange={(e) =>
                                setEditNextReview(e.target.value)
                              }
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                borderRadius: 6,
                                border: "1px solid #6366f1",
                                fontSize: 15,
                                marginBottom: 4,
                                background: "var(--main-bg, #f5f7fb)",
                                color: "var(--text-color, #121212)",
                                fontFamily: "inherit",
                                outline: "none",
                              }}
                              disabled={editing}
                            />
                          </div>
                        </div>
                        <div style={{ flex: 2, minWidth: 0 }}>
                          <div style={{ marginBottom: 18, height: "100%" }}>
                            <label
                              style={{
                                display: "block",
                                marginBottom: 6,
                                fontWeight: 500,
                              }}
                            >
                              Card Content
                            </label>
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              style={{
                                width: "100%",
                                padding: "12px 12px",
                                borderRadius: 8,
                                border: "1px solid #6366f1",
                                fontSize: 15,
                                minHeight: 320,
                                resize: "vertical",
                                fontFamily: "inherit",
                                background: "var(--main-bg, #f5f7fb)",
                                color: "var(--text-color, #121212)",
                                lineHeight: 1.6,
                                outline: "none",
                              }}
                              placeholder="Enter card content"
                              disabled={editing}
                            />
                          </div>
                        </div>
                      </div>
                      {editError && (
                        <div style={{ color: "#f77", marginBottom: 10 }}>
                          {editError}
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          marginTop: 8,
                        }}
                      >
                        <div style={{ color: "#888", fontSize: 12 }}>
                          {editModal?.created_at ? (
                            <span>
                              Created: {formatDate(editModal.created_at)}
                            </span>
                          ) : null}
                        </div>
                        <div style={{ display: "flex", gap: 12 }}>
                          <button
                            type="button"
                            onClick={handleMarkReviewed}
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "8px 18px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            disabled={editing}
                          >
                            Mark Reviewed
                          </button>
                          <button
                            type="button"
                            style={{
                              background: "#444c5e",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "8px 18px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            onClick={() => setEditModal(null)}
                            disabled={editing}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            style={{
                              background: "#6366f1",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "8px 18px",
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            disabled={editing}
                          >
                            {editing ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Card creation modal */}
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
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "#222a34",
              padding: 32,
              borderRadius: 12,
              minWidth: 760,
              maxWidth: 1100,
              color: "#fff",
              boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 16 }}>Create Card</h2>
            <form style={{ width: "100%" }} onSubmit={handleCreateCard}>
              <div style={{ display: "flex", gap: 32 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: 18 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      Card Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid #6366f1",
                        fontSize: 15,
                        marginBottom: 4,
                        background: "var(--main-bg, #f5f7fb)",
                        color: "var(--text-color, #121212)",
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                      placeholder="Enter card name"
                      disabled={creating}
                      autoFocus
                    />
                  </div>
                  <div style={{ marginBottom: 18 }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      Subject
                    </label>
                    <select
                      value={selectedSubject ?? ""}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: "1px solid #6366f1",
                        fontSize: 15,
                        background: "var(--main-bg, #f5f7fb)",
                        color: "var(--text-color, #121212)",
                        fontFamily: "inherit",
                        outline: "none",
                      }}
                      disabled={creating || loadingSubjects}
                    >
                      <option value="">No subject</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ flex: 2, minWidth: 0 }}>
                  <div style={{ marginBottom: 18, height: "100%" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: 6,
                        fontWeight: 500,
                      }}
                    >
                      Card Content
                    </label>
                    <textarea
                      value={cardContent}
                      onChange={(e) => setCardContent(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "12px 12px",
                        borderRadius: 8,
                        border: "1px solid #6366f1",
                        fontSize: 15,
                        minHeight: 320,
                        resize: "vertical",
                        fontFamily: "inherit",
                        background: "var(--main-bg, #f5f7fb)",
                        color: "var(--text-color, #121212)",
                        lineHeight: 1.6,
                        outline: "none",
                      }}
                      placeholder="Enter card content"
                      disabled={creating}
                    />
                  </div>
                </div>
              </div>
              {error && (
                <div style={{ color: "#f77", marginBottom: 10 }}>{error}</div>
              )}
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}
              >
                <button
                  type="button"
                  style={{
                    background: "#444c5e",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#6366f1",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "8px 18px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                  disabled={creating}
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
