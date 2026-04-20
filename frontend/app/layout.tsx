// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/layout.tsx
"use client";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserProvider } from "../lib/UserContext";
import { SubjectsProvider } from "../lib/SubjectsContext";
import "./globals.css";
import LoadingOverlay from "../components/LoadingOverlay";

import { useEffect } from "react";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleFocus = () => {
      // Show loading overlay
      const overlay = document.createElement("div");
      overlay.id = "global-loading-overlay";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.background = "rgba(31,42,56,0.85)";
      overlay.style.color = "#fff";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.innerHTML = `<div style='text-align:center'><div style='width:48px;height:48px;border:5px solid #6366f1;border-top:5px solid transparent;border-radius:50%;margin:0 auto 18px auto;animation:spin 1s linear infinite'></div><div style='font-weight:600;font-size:20px'>Loading...</div><style>@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}</style></div>`;
      document.body.appendChild(overlay);
      setTimeout(() => {
        window.location.reload();
      }, 120);
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      const overlay = document.getElementById("global-loading-overlay");
      if (overlay) overlay.remove();
    };
  }, []);
  return (
    <html lang="en">
      <head>
        <title>ComsOS</title>
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
        <UserProvider>
          <SubjectsProvider>
            <Navbar />
            <Sidebar />
            <LoadingOverlay />
            <main
              style={{
                marginTop: "56px",
                marginLeft: "220px",
                minHeight: "100vh",
                backgroundColor: "var(--main-bg, #f5f7fb)",
                color: "var(--text-color, #121212)",
                padding: "20px",
                boxSizing: "border-box",
                width: "calc(100% - 220px)",
                maxWidth: "1200px",
                transition: "margin-left 0.2s, width 0.2s",
              }}
            >
              {children}
            </main>
          </SubjectsProvider>
        </UserProvider>
      </body>
    </html>
  );
}
