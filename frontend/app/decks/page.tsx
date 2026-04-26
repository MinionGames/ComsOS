"use client";
import React, { useEffect, useState, useRef } from "react";
import { useUser } from "../../lib/UserContext";

export default function DecksPage() {
  const { user, loading: userLoading } = useUser();
  const [decks, setDecks] = useState<any[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(true);
  const mountedRef = useRef(true);
  const CACHE_KEY = "comsos:decks";

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
      // Prefer server API to avoid client-side supabase auth/storage locks
      try {
        const token = (() => {
          try {
            return window.localStorage.getItem("access_token") || undefined;
          } catch (e) {
            return undefined;
          }
        })();

        const headers: any = { "Content-Type": "application/json" };
        if (token) headers.Authorization = `Bearer ${token}`;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/decks`,
          { headers },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "(no body)");
          throw new Error(`Server error ${res.status}: ${text}`);
        }
        const data = await res.json();
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
                      Mastery:{" "}
                      {typeof deck.mastery_level === "number"
                        ? deck.mastery_level
                        : (deck.mastery_level ?? 0)}
                    </div>
                  </div>
                  <div style={{ color: "#999", fontSize: 12 }}>
                    {deck.created_at ? formatDate(deck.created_at) : ""}
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
