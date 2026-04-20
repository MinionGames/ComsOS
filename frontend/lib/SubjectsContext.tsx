"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

interface Subject {
  id: string;
  title: string;
  color: string;
}

interface SubjectsContextType {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
  loadingSubjects: boolean;
  setLoadingSubjects: React.Dispatch<React.SetStateAction<boolean>>;
  reloadSubjects: (userId: string, supabase: any) => Promise<void>;
}

const SubjectsContext = createContext<SubjectsContextType | undefined>(
  undefined,
);

export const SubjectsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const reloadSubjects = useCallback(async (userId: string, supabase: any) => {
    setLoadingSubjects(true);
    const { data } = await supabase
      .from("subjects")
      .select("id, title, color")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setSubjects(data || []);
    setLoadingSubjects(false);
  }, []);

  return (
    <SubjectsContext.Provider
      value={{
        subjects,
        setSubjects,
        loadingSubjects,
        setLoadingSubjects,
        reloadSubjects,
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
