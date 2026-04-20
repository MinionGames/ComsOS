"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";
import { useEffect } from "react";

export default function DashboardPage() {
  const { user, loading } = useUser();

  const displayName = user?.name || user?.email?.split("@")[0] || "User";

  useEffect(() => {
    if (user) {
      document.title = `Hello, ${displayName}! | ComsOS`;
    }
  }, [user, displayName]);

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
        <h2>Sign in to access Dashboard</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, fontFamily: "'Roboto', sans-serif" }}>
      <h1>Hello, {displayName}!</h1>
      <p>Welcome to your dashboard.</p>
    </div>
  );
}
