import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/rbac";
import { loadReminderOverview } from "@/modules/reminders/data";
import { completeReminder, snoozeReminder, snoozeStageAlert } from "@/modules/reminders/actions";
import { RemindersList } from "@/modules/reminders/reminders-list";

export default async function LembretesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role)) redirect("/");

  const { reminders, stageAlerts, attentionCount } = await loadReminderOverview(user);

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Lembretes</h1>
        <p className="text-sm text-muted">
          {attentionCount > 0 ? `${attentionCount} para verificar agora.` : "Nada pendente por enquanto."} Aqui aparecem os lembretes marcados nas tarefas e as tarefas paradas
          além do prazo da etapa
          {user.role === "OPERACIONAL" ? " (as suas e as que você criou)" : " (de toda a equipe)"}.
        </p>
      </div>

      <RemindersList
        reminders={reminders.map((r) => ({
          id: r.id,
          processId: r.processId,
          processNumber: r.processNumber,
          processTitle: r.processTitle,
          clientName: r.clientName,
          remindOn: r.remindOn.toISOString().slice(0, 10),
          note: r.note,
          createdByName: r.createdByName,
          assigneeNames: r.assigneeNames,
          timing: r.timing,
        }))}
        alerts={stageAlerts}
        complete={completeReminder}
        snooze={snoozeReminder}
        snoozeAlert={snoozeStageAlert}
      />
    </div>
  );
}
