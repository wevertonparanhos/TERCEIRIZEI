import type { SupabaseClient } from "@supabase/supabase-js";

/** Id do usuário autenticado, sem ida ao servidor de autenticação quando possível.
 *
 * `getClaims()` valida a assinatura do JWT localmente (chaves públicas em cache) e só
 * renova a sessão quando o token expira; `getUser()` faz uma chamada de rede ao
 * Supabase Auth em TODA requisição — e o sistema fazia isso duas vezes por clique
 * (middleware + layout). Se `getClaims` falhar ou o projeto usar chave simétrica
 * (aí ele mesmo recorre à rede), cai para `getUser()`: nunca fica pior que antes.
 * Usuário desativado/removido continua barrado pela consulta ao perfil (`active`). */
export async function getAuthUserId(supabase: SupabaseClient): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getClaims();
    const sub = data?.claims?.sub;
    if (sub) return sub;
  } catch {
    // segue para o caminho completo
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}
