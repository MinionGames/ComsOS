// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/page.tsx
"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect } from "react";
import styles from "./page.module.css";

const Page = () => {
  const { data: session } = useSession();

  useEffect(() => {
    document.title = "ComsOS - Homepage";
  }, []);

  return (
    <>
      <h1 className={styles.title}>ComsOS</h1>
      {!session ? (
        <div className={styles.signin}>
          <h1>You are not signed in</h1>
          <button className={styles.button} onClick={() => signIn("google")}>
            Sign in with Google
          </button>
        </div>
      ) : (
        <div className={styles.container}>
          <div className={styles.welcome}>
            <h1>Welcome, {session.user?.name}</h1>
            <button className={styles.button} onClick={() => signOut()}>
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Page;
