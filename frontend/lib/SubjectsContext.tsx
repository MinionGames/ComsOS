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
  reloadSubjects: (userId: string, supabase: any) => Promise<void>;
  focusReloadNeeded: boolean;
  setFocusReloadNeeded: React.Dispatch<React.SetStateAction<boolean>>;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(
  undefined,
);

import { useUser } from "./UserContext";
import { usePathname } from "next/navigation";
import { supabase } from "./supabaseClient";

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
  const timersRef = useRef<number[]>([]);

  // Reload subjects; keep the existing list visible while refreshing
  // by only showing the loading state when there are no subjects yet.
  async function reloadSubjects(userId: string, supabaseClient: any) {
    const showLoading = subjects.length === 0;
    try {
      if (showLoading) setLoadingSubjects(true);
      const { data, error } = await supabaseClient
        .from("subjects")
        .select("id, title, color, description, order")
        .eq("user_id", userId)
        .order("order", { ascending: true });
      if (!error) setSubjects(data || []);
      else setSubjects([]);
    } catch (e) {
      setSubjects([]);
    } finally {
      if (showLoading) setLoadingSubjects(false);
    }
  }

  // Fetch cards for the user and persist to localStorage (per-user and generic)
  async function fetchAndCacheCards(userId: string, supabaseClient: any) {
    try {
      const res = await supabaseClient
        .from("cards")
        .select(
          "id, front, back, file_url, due_date, created_at, subject_id, order, mastery_level, last_reviewed_at, next_review_at",
        )
        .eq("user_id", userId)
        .order("order", { ascending: true });
      const data = (res as any).data || [];
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
  async function fetchAndCacheUploads(userId: string, supabaseClient: any) {
    try {
      const res = await supabaseClient
        .from("uploads")
        .select(
          "id, file_name, public_url, storage_path, created_at, subject_id, extracted_text",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(200);
      const data = (res as any).data || [];
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
      // defer fetches to avoid competing auth localStorage lock in StrictMode
      const t = window.setTimeout(() => {
        if (!mountedRef.current) return;
        reloadSubjects(user.id, supabase);
        // also fetch and cache cards and uploads so data is available immediately
        fetchAndCacheCards(user.id, supabase).catch(() => {});
        fetchAndCacheUploads(user.id, supabase).catch(() => {});
      }, 0);
      // cleanup timer if unmounting
      // store timer id on ref so we can clear in return
      (mountedRef as any).timer = t;
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
      if (user && user.id) {
        schedule(() => reloadSubjects(user.id, supabase).catch(() => {}));
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible" && user && user.id) {
        schedule(() => reloadSubjects(user.id, supabase).catch(() => {}));
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
        // reload subjects when navigating to pages that use subjects
        if (
          p.startsWith("/subjects") ||
          p.startsWith("/decks") ||
          p.startsWith("/resources")
        ) {
          if (user && user.id) {
            schedule(() => reloadSubjects(user.id, supabase).catch(() => {}));
            // also refresh cached cards and uploads so previews and lists are available
            schedule(() =>
              fetchAndCacheCards(user.id, supabase).catch(() => {}),
            );
            schedule(() =>
              fetchAndCacheUploads(user.id, supabase).catch(() => {}),
            );
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
