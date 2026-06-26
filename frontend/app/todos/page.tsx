import { cookies } from "next/headers";
import { createClient } from "../../utils/supabase/server";

export default async function Page() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: todos, error } = await supabase.from("todos").select("*");

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <h1>Todos (server)</h1>
        <p style={{ color: "red" }}>
          Error loading todos: {String(error.message)}
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      <h1>Todos (server)</h1>
      <ul>
        {todos?.map((t: any) => (
          <li key={t.id}>{t.name}</li>
        ))}
      </ul>
    </div>
  );
}
