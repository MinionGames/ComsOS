"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";

export default function SubjectsPage() {
  const { user, loading } = useUser();

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
        <h2>Sign in to access Subjects</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, fontFamily: "'Roboto', sans-serif" }}>
      <h1>Subjects</h1>
      <p>Your subjects will appear here.</p>
    </div>
  );
}
