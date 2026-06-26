// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "../lib/UserContext";

const Page = () => {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/auth/login");
    }
  }, [user, loading, router]);

  // Optionally, render nothing while redirecting
  return null;
};

export default Page;
