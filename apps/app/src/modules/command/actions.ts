"use server";

import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { parseSearchQuery } from "@/modules/command/query";

export type CommandHit =
  | { kind: "tarefa"; id: string; href: string; title: string; subtitle: string; archived: boolean }
  | { kind: "cliente"; id: string; href: string; title: string; subtitle: string }
  | { kind: "empresa"; id: string; href: string; title: string; subtitle: string };

export type CommandSearchResult = { ok: true; hits: CommandHit[] } | { ok: false; error: string };

/** Busca geral (Ctrl K): tarefas por número, nome ou cliente; clientes por nome ou documento; empresas por razão social ou CNPJ.
 * O operacional só encontra as tarefas em que é responsável, como no quadro. */
export async function searchCommand(raw: string): Promise<CommandSearchResult> {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "CLIENTE") return { ok: false, error: "Sessão expirada. Entre de novo." };

    const query = parseSearchQuery(raw);
    if (!query) return { ok: true, hits: [] };

    const scope = user.role === "OPERACIONAL" ? { assignees: { some: { userId: user.id } } } : {};
    const text = { contains: query.text, mode: "insensitive" as const };

    const [processes, clients, companies] = await Promise.all([
      prisma.process.findMany({
        where: {
          tenantId: user.tenantId,
          ...scope,
          OR: [
            ...(query.number !== null ? [{ number: query.number }] : []),
            ...(query.text ? [{ description: text }, { client: { name: text } }] : []),
          ],
        },
        orderBy: [{ archivedAt: { sort: "desc", nulls: "first" } }, { number: "desc" }],
        take: 8,
        select: {
          id: true,
          number: true,
          description: true,
          archivedAt: true,
          client: { select: { name: true } },
          stage: { select: { label: true } },
        },
      }),
      query.text
        ? prisma.client.findMany({
            where: { tenantId: user.tenantId, OR: [{ name: text }, { fantasyName: text }, ...(query.digits ? [{ doc: { contains: query.digits } }] : [])] },
            orderBy: { name: "asc" },
            take: 5,
            select: { id: true, name: true, status: true },
          })
        : Promise.resolve([]),
      query.text
        ? prisma.company.findMany({
            where: { tenantId: user.tenantId, OR: [{ razaoSocial: text }, ...(query.digits ? [{ cnpj: { contains: query.digits } }] : [])] },
            orderBy: { razaoSocial: "asc" },
            take: 4,
            select: { id: true, razaoSocial: true, clientId: true, client: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const hits: CommandHit[] = [
      ...processes.map((p) => ({
        kind: "tarefa" as const,
        id: p.id,
        href: `/processos/${p.id}`,
        title: `#${p.number} — ${p.description}`,
        subtitle: `${p.client.name} · ${p.archivedAt ? "arquivada" : p.stage.label}`,
        archived: p.archivedAt !== null,
      })),
      ...clients.map((c) => ({
        kind: "cliente" as const,
        id: c.id,
        href: `/clientes/${c.id}`,
        title: c.name,
        subtitle: c.status === "ativo" ? "Cliente" : `Cliente · ${c.status}`,
      })),
      ...companies.map((c) => ({
        kind: "empresa" as const,
        id: c.id,
        href: `/clientes/${c.clientId}`,
        title: c.razaoSocial,
        subtitle: `Empresa de ${c.client.name}`,
      })),
    ];
    return { ok: true, hits };
  } catch (err) {
    console.error("[busca] falhou:", err);
    return { ok: false, error: "A busca falhou. Tente de novo." };
  }
}
