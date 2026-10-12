import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeRedirectPath } from "@/lib/utils";
import { supabaseServer } from "@/server/supabase";

/**
 * Destino dos links enviados por e-mail (confirmação de conta e recuperação
 * de senha). Aceita o fluxo PKCE (?code=) e o de token (?token_hash=&type=).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = safeRedirectPath(url.searchParams.get("next"), "/entrar");
  const supabase = await supabaseServer();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  let ok = false;
  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ token_hash: tokenHash, type })).error;
  }

  const target = ok ? (type === "recovery" ? "/redefinir-senha" : next) : "/entrar?erro=link";
  return NextResponse.redirect(new URL(target, url.origin));
}
