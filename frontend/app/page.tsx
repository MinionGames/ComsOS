// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import styles from "./page.module.css";

const Page = () => {
  const router = useRouter();
  useEffect(() => {
    document.title = "ComsOS - Homepage";
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.push("/dashboard");
    });
  }, [router]);

  return (
    <>
      <h1 className={styles.title}>ComsOS</h1>
      <div className={styles.welcome}>
        <h1 className={styles.heading1}>You are not signed in</h1>
        <a className={styles.button} href="/auth/login">
          Sign in with Email
        </a>
        <div style={{ marginTop: 16 }}>
          Don't have an account? <a href="/auth/signup">Sign up</a>
        </div>
      </div>
    </>
  );
};

export default Page;
