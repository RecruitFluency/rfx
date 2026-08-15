import { createClient, SupabaseClient } from '@supabase/supabase-js';

// The RFX production database. These are Supabase *publishable* credentials —
// safe to ship to browsers; write access is governed by RLS policies.
// Env vars, when set, take precedence (e.g. to point at a staging project).
const DEFAULT_URL = 'https://auclsmmqipjwrzcnzssl.supabase.co';
const DEFAULT_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1Y2xzbW1xaXBqd3J6Y256c3NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzMTk3NDIsImV4cCI6MjA5OTg5NTc0Mn0.jSt-e8qOHx0d3CqnfUM7cb4UJpXfQ2R5Veq3vfLUth4';

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL;
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_KEY;

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
