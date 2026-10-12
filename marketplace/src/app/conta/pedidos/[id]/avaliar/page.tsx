import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Notice } from "@/components/ui/surface";
import { canReview } from "@/domain/reviews";
import { requirePageRole } from "@/server/auth";
import { db } from "@/server/db";
import { ReviewForm } from "./review-form";

export default async function ReviewBookingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePageRole(["CUSTOMER"], `/conta/pedidos/${id}/avaliar`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  // Busca restrita ao cliente da sessão: pedido de outra pessoa = 404.
  const booking = await db.booking.findFirst({
    where: { id, customerId: user.id },
    select: {
      id: true,
      code: true,
      status: true,
      customerId: true,
      providerId: true,
      completedAt: true,
      service: { select: { name: true } },
      provider: { select: { displayName: true } },
      review: { select: { id: true } },
    },
  });
  if (!booking) notFound();

  const eligibility = canReview({ booking, userId: user.id, alreadyReviewed: !!booking.review });

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/conta" className="text-sm font-medium text-brand hover:underline">← Meus pedidos</Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight">Avaliar atendimento</h1>
      <p className="mt-1 text-sm text-muted">{booking.service.name} · pedido {booking.code}</p>
      <Card className="mt-6 p-6">
        {eligibility.ok ? (
          <ReviewForm bookingId={booking.id} providerFirstName={booking.provider?.displayName.split(" ")[0] ?? "o profissional"} />
        ) : (
          <Notice tone="warning">{eligibility.reason}</Notice>
        )}
      </Card>
    </div>
  );
}
