"use client";
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

interface Subject {
  id: string;
  title: string;
  color: string;
  description?: string;
}

interface SubjectsContextType {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  loadingSubjects: boolean;
  setLoadingSubjects: React.Dispatch<React.SetStateAction<boolean>>;
  reloadSubjects: (userId: string) => Promise<void>;
  focusReloadNeeded: boolean;
  setFocusReloadNeeded: React.Dispatch<React.SetStateAction<boolean>>;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(
  undefined,
);

import { useUser } from "./UserContext";
import { usePathname } from "next/navigation";
import { api } from "./api";

export const SubjectsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [focusReloadNeeded, setFocusReloadNeeded] = React.useState(false);
  const { user, loading: userLoading } = useUser();
  const pathname = usePathname();
  const mountedRef = useRef(true);
  const lastReloadTsRef = useRef<number>(0);
  const timersRef = useRef<number[]>([]);

  // Reload subjects; keep the existing list visible while refreshing
  // by only showing the loading state when there are no subjects yet.
  async function reloadSubjects(userId: string) {
    const now = Date.now();
    // avoid rapid duplicate reloads
    if (now - (lastReloadTsRef.current || 0) < 1500) return;
    lastReloadTsRef.current = now;
    const showLoading = subjects.length === 0;
    try {
      if (showLoading) setLoadingSubjects(true);
      const data = await api.subjects.list();
      setSubjects(data || []);
    } catch (e) {
      setSubjects([]);
    } finally {
      if (showLoading) setLoadingSubjects(false);
    }
  }

  // Fetch cards for the user and persist to localStorage (per-user and generic)
  async function fetchAndCacheCards(userId: string) {
    try {
      const data = (await api.cards.list()) || [];
      // normalize front/back -> title/content for local cache
      const normalized = (data || []).map((r: any) => ({
        ...r,
        title: r.title ?? r.front ?? null,
        content: r.content ?? r.back ?? null,
      }));
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `comsos:cards:${userId}`,
            JSON.stringify(normalized),
          );
          localStorage.setItem(`comsos:cards`, JSON.stringify(normalized));
        }
      } catch (e) {}
    } catch (e) {
      // ignore failures — we don't want to block app load
      console.error("Failed to fetch cards for cache:", e);
    }
  }

  // Fetch uploads for the user and persist to localStorage (per-user and generic)
  async function fetchAndCacheUploads(userId: string) {
    try {
      const data = (await api.uploads.list()) || [];
      const mapped = (data || []).map((r: any) => ({
        id: r.id,
        name: r.file_name,
        publicURL: r.public_url,
        path: r.storage_path,
        created_at: r.created_at,
        subject_id: r.subject_id,
        content: r.extracted_text || "",
      }));
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            `comsos:uploads:${userId}`,
            JSON.stringify(mapped),
          );
          localStorage.setItem(`comsos:uploads`, JSON.stringify(mapped));
        }
      } catch (e) {}
    } catch (e) {
      console.error("Failed to fetch uploads for cache:", e);
    }
  }

  React.useEffect(() => {
    mountedRef.current = true;

    if (user && user.id) {
      const shouldLoadForRoute =
        pathname?.startsWith("/subjects") || pathname?.startsWith("/resources");
      if (shouldLoadForRoute) {
        // defer fetches to avoid competing auth localStorage lock in StrictMode
        const t = window.setTimeout(() => {
          if (!mountedRef.current) return;
          reloadSubjects(user.id);
        }, 0);
        // cleanup timer if unmounting
        // store timer id on ref so we can clear in return
        (mountedRef as any).timer = t;
      }
    } else if (!userLoading) {
      // only clear subjects when auth is settled and there's no user
      setSubjects([]);
      setLoadingSubjects(false);
    }
    function schedule(fn: () => void) {
      try {
        const t = window.setTimeout(() => {
          try {
            fn();
          } catch (e) {}
        }, 0) as unknown as number;
        timersRef.current.push(t);
      } catch (e) {
        // ignore
      }
    }

    function onFocus() {
      if (user && user.id && pathname?.startsWith("/subjects")) {
        schedule(() => reloadSubjects(user.id).catch(() => {}));
      }
    }
    function onVisibility() {
      if (
        document.visibilityState === "visible" &&
        user &&
        user.id &&
        pathname?.startsWith("/subjects")
      ) {
        schedule(() => reloadSubjects(user.id).catch(() => {}));
      }
    }
    window.addEventListener("focus", onFocus);
    // persist current subjects to localStorage (per-user and generic fallback)
    try {
      if (typeof window !== "undefined") {
        if (user && user.id)
          localStorage.setItem(
            `comsos:subjects:${user.id}`,
            JSON.stringify(subjects),
          );
        localStorage.setItem(`comsos:subjects`, JSON.stringify(subjects));
      }
    } catch (e) {}
    document.addEventListener("visibilitychange", onVisibility);
    function onNavigate(e: any) {
      try {
        const p = e?.detail?.pathname;
        if (!p) return;
        // Only reload subjects and related caches when navigating to the Subjects page itself.
        // Other pages (decks/resources) have their own listeners and will fetch their own data.
        if (p.startsWith("/subjects") || p.startsWith("/resources")) {
          if (user && user.id) {
            schedule(() => reloadSubjects(user.id).catch(() => {}));
          }
        }
      } catch (err) {}
    }
    window.addEventListener("comsos:navigate", onNavigate as EventListener);
    return () => {
      mountedRef.current = false;
      // clear deferred timers
      try {
        timersRef.current.forEach((t) => window.clearTimeout(t));
        timersRef.current = [];
      } catch (e) {}
      // also clear initial deferred timer if present
      try {
        const t = (mountedRef as any).timer;
        if (t) window.clearTimeout(t);
      } catch (e) {}
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener(
        "comsos:navigate",
        onNavigate as EventListener,
      );
    };
  }, [user, userLoading, pathname]);

  // Add to context value for use in UI
  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        setSubjects,
        loadingSubjects,
        setLoadingSubjects,
        reloadSubjects,
        focusReloadNeeded,
        setFocusReloadNeeded,
      }}
    >
      {children}
    </SubjectsContext.Provider>
  );
};

export function useSubjects() {
  const ctx = useContext(SubjectsContext);
  if (!ctx)
    throw new Error("useSubjects must be used within a SubjectsProvider");
  return ctx;
}
