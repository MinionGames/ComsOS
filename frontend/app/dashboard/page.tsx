"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { signOut } from "../../lib/supabaseAuth";
import { useSupabaseProfileSync } from "../../lib/useSupabaseProfileSync";

const Dashboard = () => {
  const [user, setUser] = useState<any>(null);
  useSupabaseProfileSync();

  useEffect(() => {
    document.title = "ComsOS - Dashboard";
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) {
    return (
      <div>
        <h1>You need to be signed in to access the dashboard</h1>
        <Link href="/">Go back to homepage</Link>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "20px",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <h1>Dashboard</h1>
      <p>Welcome to your dashboard, {user.email}!</p>

      <div style={{ marginTop: "20px" }}>
        <h2>Quick Actions</h2>
        <ul>
          <li>
            <Link href="/subjects">View Subjects</Link>
          </li>
          <li>
            <Link href="/dashboard/notes">View Notes</Link>
          </li>
          <li>
            <Link href="/dashboard/uploads">Upload Files</Link>
          </li>
        </ul>
      </div>

      <div style={{ marginTop: "20px" }}>
        <button
          onClick={async () => {
            await signOut();
            window.location.href = "/";
          }}
          style={{
            backgroundColor: "#0070f3",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
