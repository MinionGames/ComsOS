"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import Link from "next/link";

const FilesPage = () => {
  const { data: session } = useSession();

  useEffect(() => {
    document.title = "ComsOS - Files";
  }, []);

  if (!session) {
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
