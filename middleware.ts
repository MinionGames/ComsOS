import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // NextAuth middleware has been disabled.
  // Supabase auth is handled by the frontend/backend auth flow.
  return NextResponse.next();
}

export const config = {
  matcher: ["/protected/:path*"], // Adjust the path to match your protected routes
};
