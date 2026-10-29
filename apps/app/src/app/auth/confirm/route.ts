import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CONFIRM_TYPES, safeNextPath, type ConfirmType } from "@/lib/auth-links";

/**
 * Abre o link de convite / redefinição de senha: valida o código no servidor e cria a sessão nos cookies,
 * depois leva a pessoa para a tela de criar a senha. Link vencido ou já usado volta para "Esqueci minha senha".
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as ConfirmType | null;
  const next = safeNextPath(searchParams.get("next"), "/redefinir-senha");

  if (tokenHash && type && (CONFIRM_TYPES as readonly string[]).includes(type)) {
    const supabase = createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/esqueci-senha?link=invalido`);
}
