import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Cliente com a service_role key — bypassa RLS. Só pode ser importado por
// código server-only (Server Actions/Components); nunca expor ao navegador.
export function createSupabaseAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
