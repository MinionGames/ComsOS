"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";

const StudyModePage = () => {
  const { data: session } = useSession();

  useEffect(() => {
    document.title = "ComsOS - Study Mode";
  }, []);

  if (!session) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Sign in to access Study Mode</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
      <h1>Study Mode</h1>
      <p>
        Use this page to focus on your learning sessions and review your
        material.
      </p>
    </div>
  );
};

export default StudyModePage;
