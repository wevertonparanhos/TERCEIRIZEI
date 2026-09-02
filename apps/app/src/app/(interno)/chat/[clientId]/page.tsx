import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ChatThread } from "@/modules/chat/chat-thread";
import { MarkMessagesRead } from "@/modules/chat/mark-messages-read";
import { sendStaffMessage, markMessagesRead } from "@/modules/chat/actions";

export default async function ChatThreadPage({ params }: { params: { clientId: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/dashboard");

  const client = await prisma.client.findFirst({
    where: { id: params.clientId, tenantId: user.tenantId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: { select: { name: true } } } } },
      },
    },
  });
  if (!client) notFound();

  const sendToThisClient = sendStaffMessage.bind(null, client.id);

  return (
    <div className="flex h-screen flex-col p-8">
      <div className="flex-none">
        <Link href="/chat" className="text-sm text-accent hover:underline">
          ← Voltar para Chat
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">{client.name}</h1>
      </div>

      <div className="mt-4 flex-1 overflow-hidden rounded-lg border border-border bg-surface">
        <ChatThread
          messages={client.messages.map((m) => ({
            id: m.id,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
            authorName: m.author.name,
            isMine: m.author.role.name !== "CLIENTE",
          }))}
          send={sendToThisClient}
        />
      </div>

      <MarkMessagesRead clientId={client.id} markMessagesRead={markMessagesRead} />
    </div>
  );
}
