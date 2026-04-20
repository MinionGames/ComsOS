"use client";
import Link from "next/link";
import { useUser } from "../../lib/UserContext";

export default function NotesPage() {
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
        <h2>Sign in to access Notes</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32, fontFamily: "'Roboto', sans-serif" }}>
      <h1>Notes</h1>
      <p>Your notes will appear here.</p>
    </div>
  );
}
