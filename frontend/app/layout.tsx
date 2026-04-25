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
    // Previously we reloaded the entire page when the window regained focus.
    // Remove that behavior to avoid losing in-memory state; do nothing on focus now.
    return () => {};
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
