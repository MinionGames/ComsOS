"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";

const PlannerPage = () => {
  const { data: session } = useSession();

  useEffect(() => {
    document.title = "ComsOS - Planner";
  }, []);

  if (!session) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Sign in to access Planner</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
      <h1>Planner</h1>
      <p>Manage your study schedule and track your upcoming tasks here.</p>
    </div>
  );
};

export default PlannerPage;
