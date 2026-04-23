"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

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
import { supabase } from "./supabaseClient";

export const SubjectsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [focusReloadNeeded, setFocusReloadNeeded] = React.useState(false);
  const { user } = useUser();

  const reloadSubjects = useCallback(async (userId: string, supabase: any) => {
    setLoadingSubjects(true);
    const { data } = await supabase
      .from("subjects")
      .select("id, title, color, description, order")
      .eq("user_id", userId)
      .order("order", { ascending: true });
    setSubjects(data || []);
    setLoadingSubjects(false);
  }, []);

  React.useEffect(() => {
    if (user && user.id) {
      reloadSubjects(user.id, supabase);
    } else {
      setSubjects([]);
      setLoadingSubjects(false);
    }
    function onFocus() {
      // Instead of a full reload, refresh subjects in-place.
      if (user && user.id) {
        // best-effort refresh; ignore errors
        reloadSubjects(user.id, supabase).catch(() => {});
      }
    }
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

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
