"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseProfileSync } from "../../lib/useSupabaseProfileSync";

const SettingsPage = () => {
  const [user, setUser] = useState<any>(null);
  useSupabaseProfileSync();
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);
  const [initialIs24Hour, setInitialIs24Hour] = useState(false);
  const [initialShowSeconds, setInitialShowSeconds] = useState(true);

  useEffect(() => {
    document.title = "ComsOS - Settings";
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const stored24 = window.localStorage.getItem("comsos-clock-24hr");
    const storedSeconds = window.localStorage.getItem("comsos-show-seconds");

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
  }, []);

  const hasChanges =
    is24Hour !== initialIs24Hour || showSeconds !== initialShowSeconds;

  const saveSettings = () => {
    window.localStorage.setItem("comsos-clock-24hr", String(is24Hour));
    window.localStorage.setItem("comsos-show-seconds", String(showSeconds));
    window.location.reload();
  };

  if (!user) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Please sign in to access Settings</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
      <h1>Settings</h1>
      <p>Adjust your application and account preferences here.</p>

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
