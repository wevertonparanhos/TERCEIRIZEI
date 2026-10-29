import { createHmac, timingSafeEqual } from "crypto";

/**
 * Token do link de "criar senha de acesso" (convite da equipe, convite do portal e redefinição).
 *
 * É assinado por nós (HMAC) e não depende de e-mail nem do código de uso único do Supabase. Carrega o usuário,
 * a validade e uma impressão da senha atual: depois que a pessoa cria a senha, a impressão muda e o link para
 * de funcionar (uso único).
 */
export type InvitePayload = { u: string; e: number; f: string };

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function createInviteToken(params: { userId: string; fingerprint: string; ttlHours: number; secret: string; now?: number }): string {
  const exp = (params.now ?? Date.now()) + params.ttlHours * 3600 * 1000;
  const body = Buffer.from(JSON.stringify({ u: params.userId, e: exp, f: params.fingerprint } satisfies InvitePayload)).toString("base64url");
  return `${body}.${sign(body, params.secret)}`;
}

/** Confere assinatura e validade. A impressão da senha é conferida por quem chama (precisa do banco). */
export function readInviteToken(token: string, secret: string, now = Date.now()): InvitePayload | null {
  const [body, signature, extra] = token.split(".");
  if (!body || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<InvitePayload>;
    if (typeof payload.u !== "string" || typeof payload.f !== "string" || typeof payload.e !== "number") return null;
    if (payload.e < now) return null;
    return { u: payload.u, e: payload.e, f: payload.f };
  } catch {
    return null;
  }
}

export function buildInviteLink(origin: string, token: string): string {
  return `${origin}/convite/${token}`;
}
