// Frontend no longer performs direct Supabase auth or DB access.
// All authentication and profile/database operations go through the backend API.
// We export a minimal stub to avoid runtime import errors in components that
// import `supabase` but should not call auth/db methods directly.

export const supabaseConfigured = false;

const noopAsync = async () => ({ data: null, error: null });

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null } }),
    getUser: async () => ({ data: { user: null } }),
    onAuthStateChange: (_cb: any) => ({ subscription: { unsubscribe: () => {} } }),
    signOut: async () => ({}),
  },
  from: () => ({ select: noopAsync }),
};
