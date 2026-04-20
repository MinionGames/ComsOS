"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";

export default function PlannerPage() {
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
        <h2>Sign in to access Planner</h2>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Planner</h1>
      <p style={{ fontSize: '1.1rem', color: '#aaa' }}>
        Your planner will appear here. Plan and organize your study schedule and tasks.
      </p>
    </div>
  );
}
