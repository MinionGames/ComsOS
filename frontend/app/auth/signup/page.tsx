"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "../../../lib/supabaseAuth";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const { error } = await signUpWithEmail(email, password);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email for a confirmation link.");
      setTimeout(() => router.push("/auth/login"), 2000);
    }
  };

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "40px auto",
        fontFamily: "'Roboto', sans-serif",
      }}
    >
      <h1>Sign up for ComsOS</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ width: "100%", marginBottom: 12, padding: 8 }}
        />
        <button
          type="submit"
          style={{
            width: "100%",
            padding: 10,
            background: "#0070f3",
            color: "#fff",
            border: "none",
            borderRadius: 4,
          }}
        >
          Sign Up
        </button>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
        {success && (
          <div style={{ color: "green", marginTop: 8 }}>{success}</div>
        )}
      </form>
      <div style={{ marginTop: 16 }}>
        Already have an account? <a href="/auth/login">Sign in</a>
      </div>
    </div>
  );
}
