import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ChatThread } from "@/modules/chat/chat-thread";
import { MarkMessagesRead } from "@/modules/chat/mark-messages-read";
import { sendClientMessage, markMessagesRead } from "@/modules/chat/actions";

export default async function PortalChatPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const messages = await prisma.clientMessage.findMany({
    where: { clientId: user.clientId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: { select: { name: true } } } } },
  });

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="flex-none">
        <h1 className="text-2xl font-bold text-ink">Chat</h1>
        <p className="text-sm text-muted">Fale diretamente com a equipe da Terceirizei.</p>
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-border bg-surface">
        <ChatThread
          messages={messages.map((m) => ({
            id: m.id,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            authorName: m.author.name,
            isMine: m.author.role.name === "CLIENTE",
          }))}
          send={sendClientMessage}
        />
      </div>

      <MarkMessagesRead clientId={user.clientId} markMessagesRead={markMessagesRead} />
    </div>
  );
}
