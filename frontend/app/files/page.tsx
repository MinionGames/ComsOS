"use client";

import { useUser } from "../../lib/UserContext";
import Link from "next/link";

const FilesPage = () => {
  const { user, loading } = useUser();

  if (loading) return null;
  if (!user) {
    return (
      <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
        <h1>Sign in to access Files</h1>
        <Link href="/">Return to homepage</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "'Roboto', sans-serif" }}>
      <h1>Files</h1>
      <p>Upload and manage your study materials here.</p>
    </div>
  );
};

export default FilesPage;
