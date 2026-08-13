import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Server-only Supabase client with service role (Storage uploads, etc.). */
export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Response("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not configured", {
      status: 500,
    });
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
