"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
// no direct supabase auth fetch here — UserContext handles session lifecycle
import { useState, useEffect } from "react";

const SettingsPage = () => {
  const { user, loading } = useUser();
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [cardTimeFormat, setCardTimeFormat] = useState("relative");
  const [initialCardTimeFormat, setInitialCardTimeFormat] =
    useState("relative");
  const [initialIs24Hour, setInitialIs24Hour] = useState(false);
  const [initialShowSeconds, setInitialShowSeconds] = useState(true);
  useEffect(() => {
    const stored24 = window.localStorage.getItem("comsos-clock-24hr");
    const storedSeconds = window.localStorage.getItem("comsos-show-seconds");
    const storedCardFormat = window.localStorage.getItem(
      "comsos-cards-time-format",
    );

    // Robustly parse values, default to false/true if not set
    let starting24 = false;
    if (stored24 === "true") starting24 = true;
    else if (stored24 === "false") starting24 = false;
    // If null or any other value, default to false

    let startingSeconds = true;
    if (storedSeconds === "false") startingSeconds = false;
    else if (storedSeconds === "true") startingSeconds = true;
    // If null or any other value, default to true

    setIs24Hour(starting24);
    setInitialIs24Hour(starting24);
    setShowSeconds(startingSeconds);
    setInitialShowSeconds(startingSeconds);
    // card time format: 'relative' or 'absolute'
    let startingCardFormat = "relative";
    if (storedCardFormat === "absolute") startingCardFormat = "absolute";
    else if (storedCardFormat === "relative") startingCardFormat = "relative";
    setCardTimeFormat(startingCardFormat);
    setInitialCardTimeFormat(startingCardFormat);
  }, []);

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
        <h2>Sign in to access Settings</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  const hasChanges =
    is24Hour !== initialIs24Hour ||
    showSeconds !== initialShowSeconds ||
    cardTimeFormat !== initialCardTimeFormat;

  const saveSettings = () => {
    window.localStorage.setItem("comsos-clock-24hr", String(is24Hour));
    window.localStorage.setItem("comsos-show-seconds", String(showSeconds));
    window.localStorage.setItem(
      "comsos-cards-time-format",
      String(cardTimeFormat),
    );
    // No full reload: settings are persisted to localStorage and components
    // that read those values will pick them up on next render.
  };

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: "2rem", fontWeight: 700, marginBottom: 12 }}>
        Settings
      </h1>
      <p style={{ fontSize: "1.1rem", color: "#aaa" }}>
        Manage your account and workspace settings here.
      </p>

      <section style={{ marginTop: "16px" }}>
        <Link href="/settings/admin">Internal Admin Dashboard</Link>
      </section>

      <section style={{ marginTop: "24px", maxWidth: "600px" }}>
        <h2 style={{ marginBottom: "12px" }}>Clock Settings</h2>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "12px",
          }}
        >
          <input
            type="checkbox"
            checked={is24Hour}
            onChange={(e) => setIs24Hour(e.target.checked)}
          />
          <span>Use 24-hour clock</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="checkbox"
            checked={showSeconds}
            onChange={(e) => setShowSeconds(e.target.checked)}
          />
          <span>Show seconds in time display</span>
        </label>
      </section>

      <section style={{ marginTop: "24px", maxWidth: "600px" }}>
        <h2 style={{ marginBottom: "12px" }}>Decks</h2>
        <label style={{ display: "block", marginBottom: 12 }}>
          Show card dates as
        </label>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: 8,
          }}
        >
          <input
            type="radio"
            name="cardTime"
            value="relative"
            checked={cardTimeFormat === "relative"}
            onChange={() => setCardTimeFormat("relative")}
          />
          <span>Relative (e.g., 2 days ago)</span>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="radio"
            name="cardTime"
            value="absolute"
            checked={cardTimeFormat === "absolute"}
            onChange={() => setCardTimeFormat("absolute")}
          />
          <span>Absolute (e.g., Apr 21, 2026)</span>
        </label>
      </section>

      {hasChanges && (
        <button
          type="button"
          style={{
            marginTop: "24px",
            padding: "10px 20px",
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
          }}
          onClick={saveSettings}
        >
          Save Settings
        </button>
      )}
    </div>
  );
};

export default SettingsPage;
