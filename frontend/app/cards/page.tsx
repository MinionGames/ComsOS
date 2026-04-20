"use client";
import { useState, useEffect, useMemo } from "react";
import { useUser } from "../../lib/UserContext";
import { supabase } from "../../lib/supabaseClient";
import { useSubjects } from "../../lib/SubjectsContext";
import { useDraggableList } from "./useDraggableList";
import { useSearchParams } from "next/navigation";

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
  const { user } = useUser();
  const { subjects, loadingSubjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [search, setSearch] = useState("");

  // Card creation state
  const [cardName, setCardName] = useState("");
  const [cardType, setCardType] = useState(CARD_TYPES[0].value);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Fetch cards function for reuse
  async function fetchCards() {
    if (!user) {
      setCards([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, title, type, content, file_url, due_date, created_at, subject_id, order",
      )
      .eq("user_id", user.id)
      .order("order", { ascending: true });
    if (error) {
      setCards([]);
    } else {
      setCards(data || []);
    }
    setLoading(false);
    setFocusReloadNeeded(false);
  }

  useEffect(() => {
    fetchCards();
    function onFocus() {
      window.location.reload();
    }
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
        type: cardType,
        subject_id: selectedSubject || null,
        // Optionally add: content, file_url, due_date
      },
    ]);
    setCreating(false);
    if (insertError) {
      setError(insertError.message || "Failed to create card.");
      return;
    }
    setShowModal(false);
    setCardName("");
    setCardType(CARD_TYPES[0].value);
    setSelectedSubject("");
    // Refresh cards
    setLoading(true);
    const { data } = await supabase
      .from("cards")
      .select(
        "id, title, type, content, file_url, due_date, created_at, subject_id, order",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setCards(data || []);
    setLoading(false);
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
                  }}
                >
                  <div
                    style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}
                  >
                    <span
                      style={{ color: "#aaa", fontSize: 13, marginRight: 8 }}
                    >
                      {card.order ?? idx + 1}.
                    </span>
                    {card.title}
                    <span
                      style={{
                        marginLeft: 12,
                        background: "#6366f1",
                        color: "#fff",
                        borderRadius: 6,
                        fontSize: 13,
                        padding: "2px 10px",
                        fontWeight: 500,
                        verticalAlign: "middle",
                      }}
                    >
                      {card.type?.charAt(0).toUpperCase() + card.type?.slice(1)}
                    </span>
                  </div>
                  {card.content && (
                    <div style={{ color: "#aaa", fontSize: 15 }}>
                      {card.content}
                    </div>
                  )}
                  <div style={{ color: "#888", fontSize: 12, marginTop: 8 }}>
                    Created: {new Date(card.created_at).toLocaleString()}
                  </div>
                </li>
              ))}
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
              minWidth: 340,
              color: "#fff",
              boxShadow: "0 4px 24px 0 rgba(0,0,0,0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: 16 }}>Create Card</h2>
            <form onSubmit={handleCreateCard}>
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontWeight: 500 }}
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
                  }}
                  placeholder="Enter card name"
                  disabled={creating}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontWeight: 500 }}
                >
                  Card Type
                </label>
                <select
                  value={cardType}
                  onChange={(e) => setCardType(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #6366f1",
                    fontSize: 15,
                  }}
                  disabled={creating}
                >
                  {CARD_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label
                  style={{ display: "block", marginBottom: 6, fontWeight: 500 }}
                >
                  Subject
                </label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid #6366f1",
                    fontSize: 15,
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
