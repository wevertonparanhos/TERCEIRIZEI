/**
 * Link de acesso (convite / redefinição de senha) que abre uma rota NOSSA, em vez do endereço do Supabase.
 *
 * O link padrão do Supabase devolve a sessão depois do "#" do endereço, que o servidor não enxerga, e depende
 * da lista de endereços permitidos do projeto. Com o código (token_hash) a rota /auth/confirm valida tudo no
 * servidor e cria a sessão em cookies — o fluxo recomendado para apps com renderização no servidor.
 */
export function buildConfirmLink(origin: string, tokenHash: string, type: "recovery" | "invite" | "magiclink" = "recovery", next = "/redefinir-senha"): string {
  const params = new URLSearchParams({ token_hash: tokenHash, type, next });
  return `${origin}/auth/confirm?${params.toString()}`;
}

/** Só caminhos internos: evita redirecionar o usuário para outro site depois do login. */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("://")) return fallback;
  return next;
}

export const CONFIRM_TYPES = ["recovery", "invite", "magiclink", "signup", "email"] as const;
export type ConfirmType = (typeof CONFIRM_TYPES)[number];
