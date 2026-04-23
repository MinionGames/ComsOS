"use client";
import { useEffect, useState } from "react";

export default function LoadingOverlay() {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleStop = () => setLoading(false);
    // Listen for Next.js route changes
    window.addEventListener("routeChangeStart", handleStart);
    window.addEventListener("routeChangeComplete", handleStop);
    window.addEventListener("routeChangeError", handleStop);
    // Fallback for initial load
    setLoading(false);

    // Do not reload on tab focus; preserve state and fetchers should refresh data as needed.

    return () => {
      window.removeEventListener("routeChangeStart", handleStart);
      window.removeEventListener("routeChangeComplete", handleStop);
      window.removeEventListener("routeChangeError", handleStop);
    };
  }, []);

  if (!loading) return null;

  // Use CSS variables for light/dark mode
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(var(--overlay-bg-rgb, 31,42,56), 0.85)",
        color: "var(--text-color, #fff)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.2s",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: 48,
            height: 48,
            border: "5px solid var(--primary, #6366f1)",
            borderTop: "5px solid transparent",
            borderRadius: "50%",
            margin: "0 auto 18px auto",
            animation: "spin 1s linear infinite",
          }}
        />
        <div style={{ fontWeight: 600, fontSize: 20 }}>Loading...</div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
