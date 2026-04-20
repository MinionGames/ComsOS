"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";

const StudyModePage = () => {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Sign in to access Study Mode</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Study Mode</h1>
      <p style={{ fontSize: '1.1rem', color: '#aaa' }}>
        Use this page to focus on your learning sessions and review your material.
      </p>
    </div>
  );
};

export default StudyModePage;
