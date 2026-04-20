// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/layout.tsx
"use client";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { UserProvider } from "../lib/UserContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>ComsOS</title>
      </head>
      <body style={{ margin: 0, padding: 0, overflowX: "hidden" }}>
        <UserProvider>
          <Navbar />
          <Sidebar />
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
        </UserProvider>
      </body>
    </html>
  );
}
