"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeOAuthFromCurrentUrl } from "../../../lib/supabaseAuth";

export default function AuthCallbackPage() {
  const [status, setStatus] = useState("Completing Google sign-in...");
  const router = useRouter();

  useEffect(() => {
    const result = completeOAuthFromCurrentUrl();
    const error = (result as any)?.error;

    if (error) {
      const msg = encodeURIComponent(error.message || "Google sign-in failed.");
      setStatus("Google sign-in failed. Redirecting to login...");
      router.replace(`/auth/login?error=${msg}`);
      return;
    }

    setStatus("Signed in. Redirecting to dashboard...");
    router.replace("/dashboard");
  }, [router]);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Roboto', sans-serif",
        color: "#121212",
      }}
    >
      <p>{status}</p>
    </main>
  );
}
