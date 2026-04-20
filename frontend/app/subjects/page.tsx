"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseProfileSync } from "../../lib/useSupabaseProfileSync";

const SubjectsPage = () => {
  const [user, setUser] = useState<any>(null);
  useSupabaseProfileSync();

  useEffect(() => {
    document.title = "ComsOS - Subjects";
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  if (!user) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Please sign in to view subjects</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
      <h1>Subjects</h1>
      <p>Here you can view and manage your subjects.</p>
    </div>
  );
};

export default SubjectsPage;
