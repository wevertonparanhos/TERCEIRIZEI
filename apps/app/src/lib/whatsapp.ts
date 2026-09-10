/** Monta um link "clique para conversar" (wa.me) a partir de um telefone em
 * qualquer formato (com ou sem DDI/pontuação) e uma mensagem opcional
 * pré-preenchida. Números com 10-11 dígitos (DDD + telefone, sem DDI) recebem
 * o prefixo do Brasil (55); com 12+ dígitos são usados como estão — assumindo
 * que já incluem o DDI. Retorna null quando não há telefone plausível. */
export function buildWhatsAppLink(rawPhone: string | null | undefined, message?: string): string | null {
  if (!rawPhone) return null;
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length < 10) return null;

  const withCountryCode = digits.length <= 11 ? `55${digits}` : digits;
  const base = `https://wa.me/${withCountryCode}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
