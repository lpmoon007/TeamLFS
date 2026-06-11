'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/env';

// Browser (anon) client — used for Supabase Realtime broadcast + presence on the
// participant channel. The anon key is public by design; no privileged reads here.
let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (cached) return cached;
  cached = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return cached;
}
