/** Interpreta o que foi digitado na busca geral (Ctrl K).
 * - "#269" procura só a tarefa 269;
 * - "269" procura a tarefa 269 e também textos/documentos com 269;
 * - "12.345.678/0001-90" procura documento/CNPJ pelos dígitos;
 * - texto livre procura nomes. Menos de 2 letras não busca. */
export type SearchQuery = { text: string; number: number | null; digits: string | null };

export function parseSearchQuery(raw: string): SearchQuery | null {
  const q = raw.trim().replace(/\s+/g, " ");
  if (!q) return null;

  const numberMatch = /^#?\s*(\d{1,9})$/.exec(q);
  const number = numberMatch ? Number(numberMatch[1]) : null;

  const looksLikeDocument = /^[\d.\-/\s#]+$/.test(q);
  const onlyDigits = q.replace(/\D/g, "");
  const digits = looksLikeDocument && onlyDigits.length >= 3 ? onlyDigits : null;

  const text = q.startsWith("#") ? "" : q;

  if (number === null && text.length < 2) return null;
  return { text, number, digits };
}
