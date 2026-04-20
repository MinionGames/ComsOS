import Link from "next/link";

const navLinkStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 500,
  padding: "10px 18px",
  borderRadius: "6px",
  transition: "background 0.18s, color 0.18s",
  marginBottom: 2,
  display: "block",
};

const navLinkActiveStyle = {
  background: "#0070f3",
  color: "#fff",
};

export default function Sidebar() {
  // Optionally, you can highlight the active link using router.pathname
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
      <nav
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          padding: 18,
        }}
      >
        <Link href="/dashboard" style={navLinkStyle}>
          Dashboard
        </Link>
        <Link href="/subjects" style={navLinkStyle}>
          Subjects
        </Link>
        <Link href="/dashboard/notes" style={navLinkStyle}>
          Notes
        </Link>
        <Link href="/dashboard/uploads" style={navLinkStyle}>
          Files
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
    </aside>
  );
}
