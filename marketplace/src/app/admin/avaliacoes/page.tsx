import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { ReviewCard } from "@/components/reviews/review-card";
import { Input, Select } from "@/components/ui/form";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { moderateReviewAction } from "../actions";

const STATUS: Record<ReviewStatus, { label: string; tone: "success" | "neutral" | "warning" }> = {
  PUBLISHED: { label: "Publicada", tone: "success" },
  HIDDEN: { label: "Oculta", tone: "neutral" },
  FLAGGED: { label: "Sinalizada", tone: "warning" },
};

const FILTERS = ["LOW", "ALL", "PUBLISHED", "FLAGGED", "HIDDEN"] as const;
const FILTER_LABEL = { LOW: "Notas baixas (1–2)", ALL: "Todas", PUBLISHED: "Publicadas", FLAGGED: "Sinalizadas", HIDDEN: "Ocultas" };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  await requirePagePermission("admin:reviews:moderate", "/admin/avaliacoes");
  const { filtro } = await searchParams;
  const filter = (FILTERS as readonly string[]).includes(filtro ?? "") ? (filtro as (typeof FILTERS)[number]) : "LOW";

  const reviews = await db.review.findMany({
    where:
      filter === "LOW" ? { rating: { lte: 2 } } : filter === "ALL" ? {} : { status: filter },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      customer: { select: { name: true, email: true } },
      provider: { select: { id: true, displayName: true } },
      booking: { select: { code: true, service: { select: { name: true } } } },
    },
  });

  return (
    <>
      <PageHeader title="Avaliações" description="Modere conteúdo abusivo sem apagar o histórico. A média do profissional é recalculada automaticamente." />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={`/admin/avaliacoes?filtro=${f}`}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-medium", f === filter ? "bg-ink text-white" : "bg-surface text-ink-soft ring-1 ring-line hover:text-ink")}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </div>

      {reviews.length === 0 ? (
        <EmptyState title="Nenhuma avaliação neste filtro" />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id} className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted">
                  Pedido {r.booking.code} · para{" "}
                  <Link href={`/profissionais/${r.provider.id}`} className="font-medium text-ink hover:text-brand">{r.provider.displayName}</Link>
                  {" "}· cliente {r.customer.email}
                </span>
                <Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge>
              </div>
              <ReviewCard reviewer={r.customer.name} serviceName={r.booking.service.name} {...r} />
              {r.moderationReason ? <p className="mt-3 text-xs text-muted">Motivo da moderação: {r.moderationReason}</p> : null}
              <ActionForm action={moderateReviewAction} submitLabel="Aplicar" variant="secondary" className="mt-4 flex flex-wrap items-center gap-2 space-y-0 border-t border-line pt-4">
                <input type="hidden" name="reviewId" value={r.id} />
                <Select name="status" defaultValue={r.status === "PUBLISHED" ? "HIDDEN" : "PUBLISHED"} aria-label="Novo estado" className="h-9 w-40">
                  <option value="PUBLISHED">Publicar</option>
                  <option value="FLAGGED">Sinalizar</option>
                  <option value="HIDDEN">Ocultar</option>
                </Select>
                <Input name="reason" placeholder="Motivo (obrigatório para ocultar/sinalizar)" aria-label="Motivo" className="h-9 min-w-56 flex-1" />
              </ActionForm>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
