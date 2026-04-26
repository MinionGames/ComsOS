import Link from "next/link";
import { useUser } from "../lib/UserContext";
import { SidebarSubjectsList } from "./SidebarSubjectsList";

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
          href="/subjects"
          style={navLinkStyle}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("comsos:navigate", {
                detail: { pathname: "/subjects" },
              }),
            )
          }
        >
          Subjects
        </Link>
        <Link
          href="/decks"
          style={navLinkStyle}
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("comsos:navigate", {
                detail: { pathname: "/decks" },
              }),
            )
          }
        >
          Decks
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
        <Link href="/study-mode" style={navLinkStyle}>
          Study Mode
        </Link>
        <Link href="/planner" style={navLinkStyle}>
          Planner
        </Link>
        <Link href="/settings" style={navLinkStyle}>
          Settings
        </Link>
      </nav>
      <div
        style={{
          padding: "24px 18px 12px 18px",
          fontWeight: 700,
          fontSize: "1.1rem",
          letterSpacing: 1,
          marginTop: 24,
          borderTop: "1px solid #2c3e50",
        }}
      >
        Subjects
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          maxHeight: "calc(100vh - 420px)",
          padding: "0 12px 0 12px",
        }}
      >
        {/* Subject list with color dots */}
        <SidebarSubjectsList />
      </div>
    </aside>
  );
}
