"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { signOut } from "../lib/supabaseAuth";
import { useUser } from "../lib/UserContext";

const Navbar = () => {
  const { user } = useUser();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [dateTime, setDateTime] = useState(new Date());
  const [is24Hour, setIs24Hour] = useState(false);
  const [showSeconds, setShowSeconds] = useState(true);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("comsos-theme");
    const stored24 = window.localStorage.getItem("comsos-clock-24hr");
    const storedSeconds = window.localStorage.getItem("comsos-show-seconds");

    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }

    if (stored24 === "true") {
      setIs24Hour(true);
    }
    if (storedSeconds === "false") {
      setShowSeconds(false);
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setDateTime(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("comsos-clock-24hr", String(is24Hour));
  }, [is24Hour]);

  useEffect(() => {
    window.localStorage.setItem("comsos-show-seconds", String(showSeconds));
  }, [showSeconds]);

  useEffect(() => {
    const root = document.body;
    root.style.setProperty(
      "--topbar-bg",
      theme === "dark" ? "#18262f" : "#2c3e50",
    );
    root.style.setProperty(
      "--sidebar-bg",
      theme === "dark" ? "#131f29" : "#1f2a38",
    );
    root.style.setProperty(
      "--navlink-bg",
      theme === "dark" ? "#1a2934" : "#2c3e50",
    );
    root.style.setProperty(
      "--settings-bg",
      theme === "dark" ? "#243548" : "#34495e",
    );
    root.style.setProperty(
      "--main-bg",
      theme === "dark" ? "#111720" : "#f5f7fb",
    );
    root.style.setProperty(
      "--text-color",
      theme === "dark" ? "#f5f5f5" : "#121212",
    );
    root.style.backgroundColor = theme === "dark" ? "#111720" : "#f5f7fb";
    root.style.color = theme === "dark" ? "#f5f5f5" : "#121212";
    window.localStorage.setItem("comsos-theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  const formatDateLabel = (date: Date) => {
    const month = date.toLocaleString("default", { month: "long" });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
  };

  const formatTimeLabel = (date: Date) => {
    return date.toLocaleTimeString(undefined, {
      hour12: !is24Hour,
      hour: "2-digit",
      minute: "2-digit",
      second: showSeconds ? "2-digit" : undefined,
    });
  };

  if (!user) {
    return null; // Don't show navbar if not signed in
  }

  const displayName = user.name || user.email?.split("@")[0] || "User";

  return (
    <>
      <header
        style={{
          backgroundColor: "var(--topbar-bg, #2c3e50)",
          color: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 32px",
          height: 56,
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          fontFamily: "'Roboto', sans-serif",
          boxShadow: "0 2px 8px 0 rgba(0,0,0,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ fontWeight: 700, fontSize: 20, marginRight: 24 }}>ComsOS</div>
          <div style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.7)" }}>
            {formatDateLabel(dateTime)} {formatTimeLabel(dateTime)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span style={{ fontSize: "0.95rem", fontWeight: 500 }}>Welcome, {displayName}</span>
          <button
            onClick={toggleTheme}
            style={{
              backgroundColor: "transparent",
              color: "white",
              border: "1px solid rgba(255,255,255,0.5)",
              padding: "8px 12px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontFamily: "inherit",
            }}
          >
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
            style={{
              backgroundColor: "#e74c3c",
              color: "white",
              border: "none",
              padding: "8px 14px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "0.95rem",
              fontFamily: "inherit",
            }}
          >
            Sign Out
          </button>
        </div>
      </header>
    </>
  );
};

export default Navbar;
