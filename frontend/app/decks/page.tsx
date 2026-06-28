// ----------DEPRECATED Effective 6/27/2026----------
"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../../lib/UserContext";
import { api } from "../../lib/api";

export default function DecksPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [decks, setDecks] = useState<any[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const mountedRef = useRef(true);
  const [viewerDeck, setViewerDeck] = useState<any | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);
  const CACHE_KEY = "comsos:decks";
  const [viewerName, setViewerName] = useState("");
  const [viewerSubject, setViewerSubject] = useState("");

  // Load cached decks immediately on mount so returning users see something instantly
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setDecks(parsed);
          setLoadingDecks(false);
        }
      }
    } catch (e) {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    async function loadDecks() {
      setLoadingDecks(true);
      // Use centralized api wrapper to handle token and caching
      try {
        const data = await api.decks.list();
        if (mountedRef.current) {
          setDecks(Array.isArray(data) ? data : []);
          try {
            window.localStorage.setItem(CACHE_KEY, JSON.stringify(data || []));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to fetch decks from server", err);
        // restore from cache if available
        try {
          const raw = window.localStorage.getItem(CACHE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setDecks(parsed);
          }
        } catch (e) {}
      } finally {
        if (mountedRef.current) setLoadingDecks(false);
      }
    }

    // initial load when user becomes available
    loadDecks();

    // when the tab becomes visible again, refresh decks from server if authenticated
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        if (user && user.id) {
          loadDecks();
        } else {
          // no user: try to restore cached decks
          try {
            const raw = window.localStorage.getItem(CACHE_KEY);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) setDecks(parsed);
            }
          } catch (e) {
            // ignore
          }
          // ensure we exit loading state when restoring from cache / no user
          if (mountedRef.current) setLoadingDecks(false);
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user]);

  // when viewerDeck opens, populate local form fields
  useEffect(() => {
    if (viewerDeck) {
      setViewerName(viewerDeck.deck_name || viewerDeck.title || "");
      // prefer subject_id for syncing with DB
      setViewerSubject(viewerDeck.subject_id || "");
    } else {
      setViewerName("");
      setViewerSubject("");
    }
  }, [viewerDeck]);

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const diff = Date.now() - d.getTime();
    const s = Math.floor(Math.abs(diff) / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    const days = Math.floor(h / 24);
    if (s < 60) return `${s}s ago`;
    if (m < 60) return `${m}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${days}d ago`;
  }

  return (
    <div style={{ padding: 32 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
          Decks
        </h1>
      </div>
      {viewerOpen && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            setViewerOpen(false);
            setViewerDeck(null);
          }}
        >
          <div
            style={{
              width: "90%",
              maxWidth: 880,
              background: "var(--card-bg, #fff)",
              borderRadius: 8,
              padding: 20,
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
            >
              <button
                onClick={() => {
                  // exit without saving
                  setViewerOpen(false);
                  setViewerDeck(null);
                }}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(0,0,0,0.08)",
                  padding: "6px 10px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Exit
              </button>
              <button
                onClick={() => {
                  // start studying this deck in Study Mode
                  if (!viewerDeck) return;
                  setViewerOpen(false);
                  setViewerDeck(null);
                  try {
                    router.push(`/study-mode?deck=${viewerDeck.id}`);
                  } catch (e) {
                    // fallback
                    window.location.href = `/study-mode?deck=${viewerDeck.id}`;
                  }
                }}
                style={{
                  background: "#059669",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Study
              </button>
              <button
                onClick={async () => {
                  if (!viewerDeck) return;
                  const payload: any = { deck_name: viewerName };
                  // send null for empty selection
                  payload.subject_id =
                    viewerSubject === "" ? null : viewerSubject;
                  try {
                    const updated = await api.decks.update(
                      viewerDeck.id,
                      payload,
                    );
                    // update local state from server response
                    const newDecks = decks.map((d) =>
                      d.id === viewerDeck.id ? { ...d, ...updated } : d,
                    );
                    setDecks(newDecks);
                    try {
                      window.localStorage.setItem(
                        CACHE_KEY,
                        JSON.stringify(newDecks),
                      );
                    } catch (e) {}
                  } catch (err: any) {
                    console.error("Failed to save deck:", err);
                    // surface a basic alert for now
                    alert(
                      "Failed to save deck: " + (err?.message || String(err)),
                    );
                    return;
                  }
                  setViewerOpen(false);
                  setViewerDeck(null);
                }}
                style={{
                  background: "#6366f1",
                  color: "#fff",
                  border: "none",
                  padding: "6px 12px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
            </div>

            <div style={{ height: 16 }} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 20,
              }}
            >
              <div>
                <h3 style={{ marginTop: 0 }}>Deck settings</h3>
                <label style={{ display: "block", marginBottom: 8 }}>
                  Name
                </label>
                <input
                  value={viewerName}
                  onChange={(e) => setViewerName(e.target.value)}
                  placeholder="Deck name"
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ddd",
                  }}
                />
                <div style={{ height: 12 }} />
                <label style={{ display: "block", marginBottom: 8 }}>
                  Subject
                </label>
                <select
                  value={viewerSubject}
                  onChange={(e) => setViewerSubject(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 6,
                    border: "1px solid #ddd",
                  }}
                >
                  <option value="">None</option>
                </select>
              </div>
              <div>
                <h3 style={{ marginTop: 0 }}>Cards</h3>
                <div style={{ color: "#666" }}>
                  {/* Placeholder: list of cards will appear here (not implemented) */}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <p style={{ fontSize: "1.1rem", color: "#aaa" }}>
        This is the Decks page. Here you can view and manage your decks.
      </p>

      <div style={{ marginTop: 32 }}>
        {loadingDecks ? (
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
            <span>Loading decks...</span>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : decks.length === 0 ? (
          <div style={{ color: "#aaa" }}>No decks</div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 20,
            }}
          >
            {decks.map((deck) => (
              <div
                key={deck.id}
                style={{
                  borderRadius: 12,
                  boxShadow: "0 2px 12px 0 rgba(0,0,0,0.08)",
                  background: "var(--card-bg, var(--background, #f3f4f6))",
                  color: "var(--card-text, var(--foreground, #111))",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  aspectRatio: "5 / 7",
                  width: "100%",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>
                      {deck.deck_name || deck.title}
                    </div>
                    <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>
                      {/* Mastery removed from schema */}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, alignItems: "center" }}
                  >
                    <div style={{ color: "#999", fontSize: 12 }}>
                      {deck.created_at ? formatDate(deck.created_at) : ""}
                    </div>
                    <button
                      onClick={() => {
                        setViewerDeck(deck);
                        setViewerOpen(true);
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(0,0,0,0.08)",
                        padding: "6px 10px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      View
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: 12, color: "#444", fontSize: 13 }}>
                  {/* space for future description or stats */}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
