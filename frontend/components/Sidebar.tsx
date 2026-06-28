import Link from "next/link";
import { useUser } from "../lib/UserContext";

const navLinkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 500,
  padding: "10px 18px",
  borderRadius: "6px",
  border: "2px solid #3b4252",
  background: "transparent",
  transition: "background 0.18s, color 0.18s, border 0.18s",
  marginBottom: 6,
  display: "block",
};

const navLinkActiveStyle = {
  background: "#0070f3",
  color: "#fff",
};

export default function Sidebar() {
  const { user, loading } = useUser();
  if (loading || !user) return null;

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 220,
        height: "100vh",
        background: "var(--sidebar-bg, #1f2a38)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        paddingTop: 56,
        zIndex: 999,
        fontFamily: "'Roboto', sans-serif",
        borderRight: "1px solid #222a34",
        boxShadow: "2px 0 8px 0 rgba(0,0,0,0.07)",
      }}
    >
      <div
        style={{
          padding: "24px 18px 12px 18px",
          fontWeight: 700,
          fontSize: "1.2rem",
          letterSpacing: 1,
        }}
      >
        Workspace
      </div>
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          padding: "0 18px",
        }}
      >
        <Link
          href="/dashboard"
          style={navLinkStyle}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("comsos:navigate", {
                detail: { pathname: "/dashboard" },
              }),
            )
          }
        >
          Dashboard
        </Link>
        <Link
          href="/resources"
          style={navLinkStyle}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("comsos:navigate", {
                detail: { pathname: "/resources" },
              }),
            )
          }
        >
          Resources
        </Link>
        <Link href="/settings" style={navLinkStyle}>
          Settings
        </Link>
      </nav>
      <div
        style={{
          padding: "10px 18px 14px 18px",
          fontSize: "0.8rem",
          color: "rgba(255,255,255,0.65)",
          borderTop: "1px solid #2c3e50",
          letterSpacing: 0.3,
        }}
      >
        Version alpha
      </div>
    </aside>
  );
}
