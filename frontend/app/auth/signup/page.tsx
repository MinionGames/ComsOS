"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signUpWithEmail } from "../../../lib/supabaseAuth";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const router = useRouter();

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("comsos-theme");
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const { error } = await signUpWithEmail(email, password, name);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Check your email for a confirmation link.");
      setTimeout(() => router.push("/auth/login"), 2000);
    }
  };

  const bgColor = theme === "dark" ? "#111720" : "#f5f7fb";
  const cardBg = theme === "dark" ? "#18262f" : "#fff";
  const textColor = theme === "dark" ? "#f5f5f5" : "#121212";
  const inputBg = theme === "dark" ? "#222a34" : "#fff";
  const inputBorder = theme === "dark" ? "#444c5c" : "#ccc";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bgColor,
        color: textColor,
        fontFamily: "'Roboto', sans-serif",
        transition: "background 0.2s, color 0.2s",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          background: cardBg,
          borderRadius: 10,
          boxShadow: "0 2px 16px 0 rgba(0,0,0,0.07)",
          padding: "36px 32px 28px 32px",
          fontFamily: "'Roboto', sans-serif",
          color: textColor,
          transition: "background 0.2s, color 0.2s",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: 24, color: textColor }}>
          Sign up for ComsOS
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${inputBorder}`,
              background: inputBg,
              color: textColor,
              fontFamily: "'Roboto', sans-serif",
              transition: "background 0.2s, color 0.2s, border 0.2s",
            }}
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 12,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${inputBorder}`,
              background: inputBg,
              color: textColor,
              fontFamily: "'Roboto', sans-serif",
              transition: "background 0.2s, color 0.2s, border 0.2s",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              marginBottom: 18,
              padding: 10,
              borderRadius: 6,
              border: `1px solid ${inputBorder}`,
              background: inputBg,
              color: textColor,
              fontFamily: "'Roboto', sans-serif",
              transition: "background 0.2s, color 0.2s, border 0.2s",
            }}
          />
          <button
            type="submit"
            style={{
              width: "100%",
              padding: 12,
              background: "#0070f3",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontWeight: 600,
              fontSize: 16,
              marginBottom: 8,
              cursor: "pointer",
              fontFamily: "'Roboto', sans-serif",
            }}
          >
            Sign Up
          </button>
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          {success && (
            <div style={{ color: "green", marginTop: 8 }}>{success}</div>
          )}
        </form>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          Already have an account?{" "}
          <a
            href="/auth/login"
            style={{ color: theme === "dark" ? "#7ecfff" : "#0070f3" }}
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
