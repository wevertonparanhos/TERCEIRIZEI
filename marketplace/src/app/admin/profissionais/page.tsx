import Link from "next/link";
import type { ProviderStatus } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { Select, Textarea } from "@/components/ui/form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { cn, formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { PROVIDER_STATUS } from "@/server/provider";
import { decideProviderAction } from "../actions";

const FILTERS: (ProviderStatus | "ALL")[] = ["PENDING", "APPROVED", "REJECTED", "SUSPENDED", "ALL"];

export default async function AdminProvidersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requirePagePermission("admin:providers:approve", "/admin/profissionais");
  const { status: raw } = await searchParams;
  const status = (FILTERS as string[]).includes(raw ?? "") ? (raw as ProviderStatus | "ALL") : "PENDING";

  const providers = await db.providerProfile.findMany({
    where: status === "ALL" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: { select: { email: true, isDemo: true } },
      categories: { include: { category: { select: { name: true } } } },
      _count: { select: { offers: { where: { active: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="Profissionais" description="Aprove, rejeite ou suspenda cadastros. Toda decisão fica registrada na auditoria." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/profissionais?status=${f}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium",
              f === status ? "bg-ink text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:text-ink",
            )}
          >
            {f === "ALL" ? "Todos" : PROVIDER_STATUS[f].label}
          </Link>
        ))}
      </div>

      {providers.length === 0 ? (
        <EmptyState title="Nenhum profissional neste filtro" />
      ) : (
        <div className="space-y-4">
          {providers.map((p) => {
            const st = PROVIDER_STATUS[p.status];
            const complete = !!(p.displayName && p.baseCity && p.phone && p.bio) && p.categories.length > 0 && p._count.offers > 0;
            return (
              <Card key={p.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {p.displayName} {p.user.isDemo ? <Badge tone="highlight">Demonstração</Badge> : null}
                    </p>
                    <p className="text-sm text-muted">
                      {p.user.email} · {p.baseCity ? `${p.baseCity}/${p.baseState}` : "cidade não informada"} · desde {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone={complete ? "success" : "warning"}>{complete ? "Cadastro completo" : "Cadastro incompleto"}</Badge>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                </div>

                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Categorias</dt>
                    <dd>{p.categories.map((c) => c.category.name).join(", ") || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Preços ativos</dt>
                    <dd>{p._count.offers}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Experiência</dt>
                    <dd>{p.experienceYears != null ? `${p.experienceYears} anos` : "—"}</dd>
                  </div>
                  {p.bio ? (
                    <div className="sm:col-span-3">
                      <dt className="text-muted">Apresentação</dt>
                      <dd className="whitespace-pre-line">{p.bio}</dd>
                    </div>
                  ) : null}
                  {p.qualifications ? (
                    <div className="sm:col-span-3">
                      <dt className="text-muted">Qualificações</dt>
                      <dd className="whitespace-pre-line">{p.qualifications}</dd>
                    </div>
                  ) : null}
                </dl>

                <details className="mt-4 rounded-xl bg-canvas p-4">
                  <summary className="cursor-pointer text-sm font-semibold">Decidir</summary>
                  <ActionForm action={decideProviderAction} submitLabel="Registrar decisão" className="mt-4" footerClassName="flex justify-end">
                    <input type="hidden" name="providerId" value={p.id} />
                    <div className="grid gap-3 sm:grid-cols-[14rem_1fr]">
                      <Select name="decision" defaultValue={p.status === "APPROVED" ? "SUSPENDED" : "APPROVED"} aria-label="Decisão">
                        <option value="APPROVED">Aprovar / reativar</option>
                        <option value="REJECTED">Rejeitar</option>
                        <option value="SUSPENDED">Suspender</option>
                      </Select>
                      <Textarea name="reason" rows={2} placeholder="Motivo (obrigatório para rejeitar ou suspender; o profissional verá)" aria-label="Motivo" />
                    </div>
                  </ActionForm>
                </details>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
