import "server-only";
import type { ProviderStatus } from "@prisma/client";
import type { BadgeTone } from "@/components/ui/surface";
import { db } from "./db";

export const PROVIDER_STATUS: Record<ProviderStatus, { label: string; tone: BadgeTone; help: string }> = {
  PENDING: { label: "Em análise", tone: "warning", help: "Complete seu cadastro. Nossa equipe vai analisar seu perfil antes de publicá-lo." },
  APPROVED: { label: "Aprovado", tone: "success", help: "Seu perfil está publicado e aparece para clientes." },
  REJECTED: { label: "Não aprovado", tone: "danger", help: "Seu cadastro não foi aprovado. Veja o motivo abaixo e fale com o suporte." },
  SUSPENDED: { label: "Suspenso", tone: "danger", help: "Seu perfil está temporariamente fora do ar. Fale com o suporte." },
};

/** Itens de cadastro que o admin usa para decidir a aprovação. */
export async function providerChecklist(providerId: string) {
  const p = await db.providerProfile.findUniqueOrThrow({
    where: { id: providerId },
    include: {
      _count: { select: { categories: true, offers: { where: { active: true } } } },
    },
  });
  const items = [
    { key: "profile", label: "Perfil com nome, cidade, telefone e apresentação", done: !!(p.displayName && p.baseCity && p.phone && p.bio) },
    { key: "categories", label: "Pelo menos uma categoria escolhida", done: p._count.categories > 0 },
    { key: "offers", label: "Preços publicados para os serviços", done: p._count.offers > 0 },
  ];
  return { provider: p, items, complete: items.every((i) => i.done) };
}
