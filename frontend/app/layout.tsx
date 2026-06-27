// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/layout.tsx
"use client";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserProvider } from "../lib/UserContext";
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
      <body className="m-0 overflow-x-hidden">
        <UserProvider>
          <Navbar />
          <Sidebar />
          <LoadingOverlay />
          <main
            className="mt-14 ml-[220px] min-h-screen w-[calc(100%-220px)] max-w-[1200px] box-border bg-[var(--main-bg,#f5f7fb)] p-5 text-[var(--text-color,#121212)] transition-[margin-left,width] duration-200"
          >
            {children}
          </main>
        </UserProvider>
      </body>
    </html>
  );
}
