"use server";

import { prisma } from "@terceirizei/db";
import { sendEmail } from "@/lib/email";
import { deadlineReminderEmail } from "@/lib/email-templates";

const ACTIVE_STAGE_FILTER = { notIn: ["Concluído", "Cancelado"] };

/** true na primeira vez que esta chave é reivindicada para o tenant — o
 * insert falha (unique constraint) se já tiver sido enviado antes, sem
 * select-then-insert. Usado tanto para não repetir o mesmo aviso lazy a cada
 * carregamento de página quanto como trava de concorrência: duas requisições
 * simultâneas (ex.: dois cliques/abas carregando o Dashboard ao mesmo tempo)
 * só deixam uma delas passar pra criar o mesmo recurso. */
export async function tryClaimNotification(tenantId: string, key: string): Promise<boolean> {
  try {
    await prisma.notificationLog.create({ data: { tenantId, key } });
    return true;
  } catch {
    return false;
  }
}

/** Sem job/cron — dispara e-mail de prazo (vencendo em até 3 dias, ou já
 * vencido) na primeira leitura do Dashboard depois que a tarefa entra nessa
 * janela; dedupe via NotificationLog garante um único aviso por
 * tarefa+vencimento+tipo. */
export async function sendDeadlineReminders(tenantId: string): Promise<void> {
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const processes = await prisma.process.findMany({
    where: {
      tenantId,
      stage: { label: ACTIVE_STAGE_FILTER },
      dueAt: { lte: in3Days, not: null },
    },
    select: {
      id: true,
      number: true,
      description: true,
      dueAt: true,
      client: { select: { name: true } },
      assignees: { select: { user: { select: { email: true, name: true } } } },
    },
  });

  for (const process of processes) {
    if (!process.dueAt) continue;
    const overdue = process.dueAt.getTime() < now.getTime();
    const dueAtKey = process.dueAt.toISOString().slice(0, 10);
    const key = `deadline:${process.id}:${dueAtKey}:${overdue ? "overdue" : "upcoming"}`;

    const claimed = await tryClaimNotification(tenantId, key);
    if (!claimed) continue;
    if (process.assignees.length === 0) continue;

    const { subject, html } = deadlineReminderEmail({
      processId: process.id,
      processNumber: process.number,
      description: process.description,
      clientName: process.client.name,
      dueAt: process.dueAt,
      overdue,
    });

    for (const assignee of process.assignees) {
      await sendEmail({ to: assignee.user.email, subject, html });
    }
  }
}
