import { useSubjects } from "../lib/SubjectsContext";

export function SidebarSubjectsList() {
  const { subjects = [], loadingSubjects = false } = useSubjects?.() || {};
  if (loadingSubjects)
    return <div style={{ color: "#aaa", padding: 12 }}>Loading...</div>;
  if (!subjects.length)
    return <div style={{ color: "#aaa", padding: 12 }}>No subjects</div>;
  return (
    <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {subjects.map((subject: any) => (
        <li
          key={subject.id}
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 8,
            paddingLeft: 6,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: subject.color || "#6366f1",
              marginRight: 10,
              border: "1.5px solid #fff",
              boxShadow: "0 0 0 1.5px #222a34",
            }}
          />
          <span
            style={{
              color: "#fff",
              fontSize: 15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {subject.title}
          </span>
        </li>
      ))}
    </ul>
  );
}
