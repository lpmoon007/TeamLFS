import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, serviceRoleKey } from '@/lib/env';

// Service-role client. Bypasses RLS — used ONLY on the server to resolve the
// magic-link token, read the seat bundle, and (later phases) write runtime state.
// Never import this from a client component.
export function createAdminClient() {
  return createClient(SUPABASE_URL, serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
