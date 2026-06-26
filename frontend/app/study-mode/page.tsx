"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { api } from "../../lib/api";

const StudyModePageContent = () => {
  const { user, loading } = useUser();
  const searchParams = useSearchParams();
  const [isDark, setIsDark] = useState(false);
  const [decks, setDecks] = useState<any[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [loadingCards, setLoadingCards] = useState(false);
  const [ratingCounts, setRatingCounts] = useState<number[]>([0, 0, 0, 0, 0, 0]);
  const [showSummary, setShowSummary] = useState(false);

  // Navigation helpers removed — replaced by rating controls.

  // Close summary and also close the deck (reset selection)
  const handleCloseSummaryAndDeck = () => {
    setShowSummary(false);
    setSelectedDeck(null);
    setCards([]);
    setCurrentIndex(0);
    setFlipped(false);
    setRatingCounts([0, 0, 0, 0, 0, 0]);
  };

  useEffect(() => {
    // If a deck id was supplied in the URL (from the Decks page), auto-select it
    try {
      const deckParam = searchParams?.get?.("deck") || null;
      if (deckParam) {
        setSelectedDeck(deckParam);
      }
    } catch (e) {}

    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      // some browsers pass event, others the MediaQueryList itself
      // @ts-ignore
      setIsDark(typeof e.matches === "boolean" ? e.matches : mq.matches);
    };
    setIsDark(mq.matches);
    if ((mq as any).addEventListener) mq.addEventListener("change", handler);
    else (mq as any).addListener(handler);
    return () => {
      try {
        if ((mq as any).removeEventListener) mq.removeEventListener("change", handler);
        else (mq as any).removeListener(handler);
      } catch (e) {}
    };
  }, []);

  useEffect(() => {
    // fetch decks for user
    let mounted = true;
    const load = async () => {
      setLoadingDecks(true);
      try {
        const d = await api.decks.list();
        if (!mounted) return;
        setDecks(Array.isArray(d) ? d : []);
      } catch (e) {
        console.error("Failed to load decks", e);
      } finally {
        setLoadingDecks(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    // load cards when deck selected
    if (!selectedDeck) {
      setCards([]);
      setCurrentIndex(0);
      setFlipped(false);
      return;
    }
    let mounted = true;
    const load = async () => {
      setLoadingCards(true);
      try {
        const all = await api.cards.list();
        if (!mounted) return;
        const filtered = (Array.isArray(all) ? all : []).filter(
          (c: any) => String(c.deck_id) === String(selectedDeck),
        );
        setCards(filtered);
        setCurrentIndex(0);
        setFlipped(false);
        setShowSummary(false);
        setRatingCounts([0, 0, 0, 0, 0, 0]);
      } catch (e) {
        console.error("Failed to load cards", e);
      } finally {
        setLoadingCards(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [selectedDeck]);

  if (loading) return null;
  if (!user) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Sign in to access Study Mode</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

    const displayIndex = cards.length ? Math.min(currentIndex + 1, cards.length) : 0;
    const currentCard = currentIndex >= 0 && currentIndex < cards.length ? cards[currentIndex] : null;

  return (
    <div
      style={{
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '6vh',
        height: '100vh',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Study Mode</h1>
      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', width: '100%' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexDirection: 'column', width: '100%' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <label style={{ fontWeight: 600 }}>Deck</label>
            <select
              value={selectedDeck ?? ""}
              onChange={(e) => setSelectedDeck(e.target.value || null)}
              style={{ padding: '8px 12px', borderRadius: 8 }}
              aria-label="Select deck"
            >
              <option value="">-- Select a deck --</option>
              {loadingDecks ? (
                <option disabled>Loading...</option>
              ) : (
                decks.map((d) => (
                  <option key={d.id} value={d.id}>{d.deck_name || d.id}</option>
                ))
              )}
            </select>
            {selectedDeck && <div style={{ color: '#6B7280' }}>{cards.length} cards</div>}
          </div>

          <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexDirection: 'column', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              {(!selectedDeck || cards.length === 0) ? (
                // show dashed placeholder when no deck/cards
                <div
                  role="button"
                  onClick={() => {}}
                  style={{
                    width: 612,
                    aspectRatio: '7 / 5',
                    border: '3.6px dotted #9CA3AF',
                    borderRadius: 16,
                    background: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 29,
                    cursor: 'default',
                    color: isDark ? '#9CA3AF' : '#374151',
                  }}
                >
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 18 }}>
                    {loadingCards ? 'Loading cards...' : !selectedDeck ? 'Select a deck to get started' : 'No cards in selected deck'}
                  </div>
                </div>
              ) : (
                <div
                  role="button"
                  onClick={() => setFlipped((s) => !s)}
                  style={{ width: 612, aspectRatio: '7 / 5', padding: 12 }}
                >
                  {/* perspective container copied from existing card markup */}
                  <div style={{ width: '100%', height: '100%', borderRadius: 12, perspective: 1200 }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transition: 'transform 600ms cubic-bezier(0.2, 0.8, 0.2, 1)', transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)', borderRadius: 12 }}>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 12, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: isDark ? '#0f1724' : '#ffffff', boxShadow: isDark ? '0 10px 30px rgba(2,6,23,0.6)' : '0 8px 24px rgba(15,23,42,0.06)', border: isDark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #E5E7EB', color: isDark ? '#E6F6EA' : '#111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{`${displayIndex} / ${cards.length}`}</div>
                          <div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{currentCard?.subject_id ? currentCard.subject_id : ''}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px' }}>
                          <div style={{ fontSize: 20, lineHeight: 1.4, textAlign: 'center', maxHeight: '100%', overflow: 'auto', width: '100%' }}>{currentCard?.front || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{'Front'}</div></div>
                      </div>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 20, borderRadius: 12, transform: 'rotateY(180deg)', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', background: isDark ? '#08121a' : '#F9FAFB', boxShadow: isDark ? '0 10px 30px rgba(2,6,23,0.6)' : '0 8px 24px rgba(15,23,42,0.04)', border: isDark ? '1px solid rgba(255,255,255,0.03)' : '1px solid #E6EEF7', color: isDark ? '#E6F6EA' : '#111827' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{`${displayIndex} / ${cards.length}`}</div>
                          <div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{currentCard?.subject_id ? currentCard.subject_id : ''}</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 12px' }}>
                          <div style={{ fontSize: 20, lineHeight: 1.4, textAlign: 'center', maxHeight: '100%', overflow: 'auto', width: '100%' }}>{currentCard?.back || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}><div style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>{'Back'}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* rating buttons 0-5 */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center' }}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    if (cards.length === 0) return;
                    const next = currentIndex + 1;
                    setRatingCounts((prev) => {
                      const copy = [...prev];
                      copy[n] = (copy[n] || 0) + 1;
                      return copy;
                    });
                    if (next >= cards.length) {
                      setCurrentIndex(cards.length);
                      setShowSummary(true);
                    } else {
                      setCurrentIndex(next);
                    }
                    setFlipped(false);
                  }}
                  aria-label={`Rate ${n}`}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 9999,
                    border: '1px solid ' + (isDark ? '#334155' : '#E5E7EB'),
                    background: isDark ? '#071226' : '#FFFFFF',
                    color: isDark ? '#E6F6EA' : '#111827',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* navigation: Prev/Next buttons removed from UI and marked obsolete.
              Handlers are preserved above as `obsoletePrev`/`obsoleteNext` for reference. */}
          <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            {/*
              Obsolete Prev/Next buttons (kept for reference):
              <button onClick={obsoletePrev}>Prev</button>
              <button onClick={obsoleteNext}>Next</button>
            */}

            <button
              onClick={() => {
                // Remove deck / reset selection
                setSelectedDeck(null);
                setCards([]);
                setCurrentIndex(0);
                setFlipped(false);
                setRatingCounts([0, 0, 0, 0, 0, 0]);
                setShowSummary(false);
              }}
              aria-label="Remove deck"
              style={{ padding: '8px 12px', borderRadius: 8 }}
            >
              Remove deck
            </button>
          </div>
        </div>
      </div>
      {showSummary && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)',
            zIndex: 60,
          }}
          onClick={handleCloseSummaryAndDeck}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: isDark ? '#0f1724' : '#fff',
              color: isDark ? '#E6F6EA' : '#111827',
              padding: 24,
              borderRadius: 12,
              minWidth: 320,
              maxWidth: '90%',
              boxShadow: isDark ? '0 10px 30px rgba(2,6,23,0.7)' : '0 10px 30px rgba(0,0,0,0.2)',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Session Summary</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isDark ? '#071226' : '#F8FAFC', border: '1px solid ' + (isDark ? '#334155' : '#E5E7EB') }}>{n}</div>
                  <div style={{ fontWeight: 700 }}>{ratingCounts[n] ?? 0}</div>
                  <div style={{ color: isDark ? '#9CA3AF' : '#6B7280' }}>{n === 0 ? 'completely wrong' : n === 5 ? 'completely understand' : `rating ${n}`}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  // Restart session for the same deck
                  setCurrentIndex(0);
                  setRatingCounts([0, 0, 0, 0, 0, 0]);
                  setFlipped(false);
                  setShowSummary(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '2px solid ' + (isDark ? '#059669' : '#10B981'),
                  background: isDark ? '#053626' : '#10B98122',
                  color: isDark ? '#86efac' : '#059669',
                }}
              >
                Restart
              </button>

              <button
                onClick={() => {
                  // Back to decks — reset selection
                  setSelectedDeck(null);
                  setCards([]);
                  setCurrentIndex(0);
                  setFlipped(false);
                  setRatingCounts([0, 0, 0, 0, 0, 0]);
                  setShowSummary(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid ' + (isDark ? '#374151' : '#D1D5DB'),
                  background: 'transparent',
                  color: isDark ? '#E6F6EA' : '#111827',
                }}
              >
                Back to decks
              </button>

              <button
                onClick={handleCloseSummaryAndDeck}
                style={{
                  padding: '8px 12px',
                  borderRadius: 8,
                  border: '1px solid ' + (isDark ? '#374151' : '#D1D5DB'),
                  background: 'transparent',
                  color: isDark ? '#E6F6EA' : '#111827',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default function StudyModePage() {
  return (
    <Suspense fallback={null}>
      <StudyModePageContent />
    </Suspense>
  );
}
