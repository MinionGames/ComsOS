"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmail } from "../../../lib/supabaseAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { error } = await signInWithEmail(email, password);
    if (error) {
      setError(error.message);
    } else {
      router.push("/dashboard");
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
      <h1>Sign in to ComsOS</h1>
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
          Sign In
        </button>
        {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
      </form>
      <div style={{ marginTop: 16 }}>
        Don't have an account? <a href="/auth/signup">Sign up</a>
      </div>
    </div>
  );
}
