import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Bell } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/surface";
import { HOME_BY_ROLE } from "@/domain/permissions";
import { cn, formatDateTime } from "@/lib/utils";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

async function markAllRead() {
  "use server";
  const user = await getSessionUser();
  if (!user) return;
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/entrar?redirect=/notificacoes");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 });
  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <BrandMark />
        <Link href={HOME_BY_ROLE[user.role]} className="text-sm font-medium text-brand hover:underline">Voltar para minha área</Link>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Bell className="size-6" aria-hidden /> Notificações</h1>
        {unread > 0 ? (
          <form action={markAllRead}>
            <Button type="submit" variant="secondary" size="sm">Marcar todas como lidas</Button>
          </form>
        ) : null}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Nenhuma notificação" />
      ) : (
        <Card className="divide-y divide-line">
          {items.map((n) => (
            <div key={n.id} className={cn("p-4", !n.readAt && "bg-brand-soft/40")}>
              <p className="flex items-center gap-2 font-semibold">
                {!n.readAt ? <span className="size-2 rounded-full bg-brand" aria-label="Não lida" /> : null}
                {n.title}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">{n.body}</p>
              <p className="mt-1 flex items-center gap-3 text-xs text-muted">
                {formatDateTime(n.createdAt)}
                {n.link ? <Link href={n.link} className="font-medium text-brand hover:underline">Abrir</Link> : null}
              </p>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
