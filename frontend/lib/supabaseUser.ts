import { supabase } from "./supabaseClient";

export async function getOrCreateUserProfile(user: {
  id: string;
  email: string;
  name?: string;
}) {
  // Try to fetch the profile
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (data) return data;

  // If not found, create it
  const { data: newProfile, error: insertError } = await supabase
    .from("profiles")
    .insert([{ id: user.id, email: user.email, name: user.name || null }])
    .select()
    .single();

  if (insertError) throw insertError;
  return newProfile;
}
