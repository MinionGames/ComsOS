// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/api/auth/[...nextauth]/route.ts
import { NextResponse } from "next/server";

// Google/NextAuth has been intentionally disabled.
// All auth must go through Supabase + backend /auth endpoints.
async function disabled() {
  return NextResponse.json(
    {
      error: "NextAuth is disabled",
      detail: "Use Supabase auth via /auth/login and /auth/signup instead.",
    },
    { status: 410 },
  );
}

export { disabled as GET, disabled as POST };
