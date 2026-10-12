/** Constantes e rótulos de avaliação — sem dependências, seguro para o navegador. */

export const REVIEW_WINDOW_DAYS = 14;
/** Abaixo disso o perfil mostra "Novo" em vez da média (como no Airbnb). */
export const MIN_REVIEWS_FOR_AVERAGE = 3;

export const CRITERIA = [
  { key: "punctualityRating", label: "Pontualidade" },
  { key: "qualityRating", label: "Qualidade do serviço" },
  { key: "communicationRating", label: "Comunicação" },
  { key: "careRating", label: "Cuidado com o imóvel" },
  { key: "valueRating", label: "Custo-benefício" },
] as const;

export type CriterionKey = (typeof CRITERIA)[number]["key"];

export const PRAISE_TAGS = {
  pontual: "Pontual",
  caprichoso: "Caprichoso",
  educado: "Educado",
  organizado: "Organizado",
  comunicacao: "Ótima comunicação",
  agil: "Ágil",
  superou: "Superou as expectativas",
} as const;

export const IMPROVE_TAGS = {
  atraso: "Atrasou",
  incompleto: "Serviço incompleto",
  pouca_comunicacao: "Pouca comunicação",
  desorganizado: "Deixou desorganizado",
  diferente_escopo: "Diferente do combinado",
} as const;

export type ReviewTag = keyof typeof PRAISE_TAGS | keyof typeof IMPROVE_TAGS;

export const TAG_LABEL: Record<string, string> = { ...PRAISE_TAGS, ...IMPROVE_TAGS };

export const RATING_LABEL: Record<number, string> = {
  1: "Muito ruim",
  2: "Ruim",
  3: "Regular",
  4: "Bom",
  5: "Excelente",
};

/** Elogios para notas 4–5; pontos de melhoria para 1–3 (fluxo do Uber). */
export function tagsForRating(rating: number): Record<string, string> {
  return rating >= 4 ? PRAISE_TAGS : IMPROVE_TAGS;
}
