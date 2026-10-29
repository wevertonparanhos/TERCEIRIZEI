import { proposalContentSchema, type ProposalContent } from "@/lib/validations/proposal";

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
  return proposalContentSchema.parse({ title });
}

/** Lê o JSON salvo num modelo (ou qualquer valor) sem quebrar se faltar campo. */
export function parseContent(raw: unknown, fallbackTitle = "Proposta comercial"): ProposalContent {
  const data = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const parsed = proposalContentSchema.safeParse({ ...data, title: typeof data.title === "string" && data.title.length >= 3 ? data.title : fallbackTitle });
  return parsed.success ? parsed.data : emptyContent(fallbackTitle);
}

export function subtotalOf(content: Pick<ProposalContent, "items">): number {
  return content.items.reduce((sum, item) => sum + (Number.isFinite(item.value) ? item.value : 0), 0);
}

export function totalOf(content: Pick<ProposalContent, "items" | "discount">): number {
  return Math.max(0, subtotalOf(content) - (content.discount || 0));
}

type ProposalRow = {
  title: string;
  intro: string | null;
  notes: string | null;
  startImmediately: boolean;
  startDate: Date | null;
  duration: string | null;
  paymentStructure: string;
  installments: number | null;
  paymentMethods: string[];
  validDays: number;
  discount: { toString(): string } | number;
  coverUrl: string | null;
  hideClientContact: boolean;
  extraSections: unknown;
  items: { description: string; detail: string | null; value: { toString(): string } | number }[];
};

export function proposalToContent(p: ProposalRow): ProposalContent {
  return parseContent({
    title: p.title,
    intro: p.intro ?? "",
    notes: p.notes ?? "",
    startImmediately: p.startImmediately,
    startDate: p.startDate ? p.startDate.toISOString().slice(0, 10) : "",
    duration: p.duration ?? "",
    paymentStructure: p.paymentStructure === "PARCELADO" ? "PARCELADO" : "AVISTA",
    installments: p.installments,
    paymentMethods: p.paymentMethods,
    validDays: p.validDays,
    discount: Number(p.discount),
    coverUrl: p.coverUrl ?? "",
    hideClientContact: p.hideClientContact,
    extraSections: Array.isArray(p.extraSections) ? p.extraSections : [],
    items: p.items.map((i) => ({ description: i.description, detail: i.detail ?? "", value: Number(i.value) })),
  });
}
