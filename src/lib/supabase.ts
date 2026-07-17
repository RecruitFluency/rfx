import { createClient, SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True once the app has been pointed at a live Supabase project. */
export const isConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;
if (isConfigured) {
  client = createClient(url!, anonKey!);
}

/** Throws with a friendly message if the database hasn't been connected yet. */
export function db(): SupabaseClient {
  if (!client) {
    throw new Error('Database not connected. Open Settings to finish setup.');
  }
  return client;
}
