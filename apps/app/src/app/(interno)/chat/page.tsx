import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { hasUnreadMessage } from "@/modules/chat/labels";

export default async function ChatListPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/dashboard");

  const clients = await prisma.client.findMany({
    where: { tenantId: user.tenantId, status: "ativo" },
    select: {
      id: true,
      name: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      messageReads: { where: { userId: user.id }, take: 1 },
    },
    orderBy: { name: "asc" },
  });

  const rows = clients
    .map((c) => ({
      id: c.id,
      name: c.name,
      lastMessage: c.messages[0] ?? null,
      unread: hasUnreadMessage(c.messages[0]?.createdAt ?? null, c.messageReads[0]?.lastReadAt ?? null),
    }))
    .sort((a, b) => {
      if (a.unread !== b.unread) return a.unread ? -1 : 1;
      const aTime = a.lastMessage?.createdAt.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt.getTime() ?? 0;
      return bTime - aTime;
    });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Chat</h1>
      <p className="text-sm text-muted">Conversa direta com cada cliente.</p>

      <div className="mt-6 max-w-2xl divide-y divide-border rounded-lg border border-border bg-surface">
        {rows.length === 0 && <p className="px-4 py-10 text-center text-sm text-muted-soft">Nenhum cliente ativo.</p>}
        {rows.map((row) => (
          <Link key={row.id} href={`/chat/${row.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-alt">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-ink">{row.name}</span>
                {row.unread && <Badge variant="info">Nova</Badge>}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-soft">
                {row.lastMessage ? row.lastMessage.body : "Nenhuma mensagem ainda."}
              </p>
            </div>
            {row.lastMessage && (
              <span className="flex-none text-xs text-muted-soft">
                {row.lastMessage.createdAt.toLocaleDateString("pt-BR")}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
