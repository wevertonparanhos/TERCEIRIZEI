/** Normaliza para busca: minúsculas e sem acentos ("Alteração" casa com "alteracao"). */
export function normalizeSearch(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Todas as palavras digitadas precisam aparecer em algum lugar do texto da tarefa. */
export function matchesSearch(haystack: string[], query: string): boolean {
  const words = normalizeSearch(query).replace(/#/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalizeSearch(haystack.join(" "));
  return words.every((w) => text.includes(w));
}
