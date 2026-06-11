// Centralized env access. Server-only secrets must never reach the client bundle,
// so SUPABASE_SERVICE_ROLE is read lazily inside server-only modules.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? '';

/** Server-only. Throws if read in a context where it is missing. */
export function serviceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE ?? '';
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE is not set. The participant read path resolves the ' +
        'magic-link token server-side and requires the service role key.',
    );
  }
  return key;
}

export function assertPublicEnv(): void {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copy .env.example to .env.local and fill in your Supabase project values.',
    );
  }
}
