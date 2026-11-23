/** Regras de texto e valor digitados pela equipe (testadas à parte das ações do servidor). */

/** Valor digitado em reais: aceita vírgula decimal e ponto de milhar ("1.500,50", "150", "150.5"). null se inválido. */
export function parseMoneyInput(raw: string | null | undefined): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 && n < 100_000_000 ? Math.round(n * 100) / 100 : null;
}

/** Nome da tarefa: sem espaços nas pontas e com espaços repetidos reduzidos a um só. */
export function normalizeTitle(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** Trecho curto de um texto, em uma linha, para mensagens do histórico. */
export function excerptOf(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
