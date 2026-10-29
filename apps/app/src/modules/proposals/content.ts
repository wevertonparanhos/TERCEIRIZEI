import { proposalContentSchema, type ProposalContent } from "@/lib/validations/proposal";
import { defaultClauses, ensureMandatoryClauses } from "./contract-clauses";

export const BRAND = {
  navy: "#1B2558",
  blue: "#14528D",
  orange: "#EA7E12",
  cyan: "#3194BE",
  name: "Terceirizei Consultoria e Gestão Empresarial",
  cnpj: "50.821.759/0001-03",
  phone: "(31) 98354-6696",
  email: "contato@terceirizei.com.br",
  paymentInfo: "Chave PIX (CNPJ): 50.821.759/0001-03\nBanco: Mercado Pago\nFavorecido: Terceirizei Consultoria e Gestão Empresarial",
};

export function emptyContent(title = "Proposta comercial"): ProposalContent {
  return { ...proposalContentSchema.parse({ title }), clauses: defaultClauses() };
}

/** Lê o JSON salvo num modelo (ou qualquer valor) sem quebrar se faltar campo. Cláusulas sempre completas. */
export function parseContent(raw: unknown, fallbackTitle = "Proposta comercial"): ProposalContent {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const parsed = proposalContentSchema.safeParse({ ...data, title: typeof data.title === "string" && data.title.length >= 3 ? data.title : fallbackTitle });
  if (!parsed.success) return emptyContent(fallbackTitle);
  return { ...parsed.data, clauses: ensureMandatoryClauses(parsed.data.clauses) };
}

type ProposalRow = {
  title: string;
  intro: string | null;
  notes: string | null;
  paymentMethods: string[];
  dueBusinessDay: number;
  lateFeePercent: { toString(): string } | number;
  lateInterestPercent: { toString(): string } | number;
  noticeDays: number;
  termMonths: number | null;
  foro: string;
  validDays: number;
  coverUrl: string | null;
  hideClientContact: boolean;
  clauses: unknown;
  extraSections: unknown;
  items: { description: string; detail: string | null; unit: string | null; value: { toString(): string } | number }[];
};

export function proposalToContent(p: ProposalRow): ProposalContent {
  return parseContent({
    title: p.title,
    intro: p.intro ?? "",
    notes: p.notes ?? "",
    paymentMethods: p.paymentMethods,
    dueBusinessDay: p.dueBusinessDay,
    lateFeePercent: Number(p.lateFeePercent),
    lateInterestPercent: Number(p.lateInterestPercent),
    noticeDays: p.noticeDays,
    termMonths: p.termMonths,
    foro: p.foro,
    validDays: p.validDays,
    coverUrl: p.coverUrl ?? "",
    hideClientContact: p.hideClientContact,
    clauses: Array.isArray(p.clauses) ? p.clauses : [],
    extraSections: Array.isArray(p.extraSections) ? p.extraSections : [],
    items: p.items.map((i) => ({ description: i.description, detail: i.detail ?? "", unit: i.unit ?? "", value: Number(i.value) })),
  });
}

/** 11 dígitos = CPF, 14 = CNPJ; qualquer outro valor fica como está. */
export function formatDoc(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}
