"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FREQUENCIES, FREQUENCY_LABELS, isRecurringTaskDue } from "@/modules/recurring-tasks/labels";
import type { RecurringTaskInput } from "@/lib/validations/recurring-task";

type Client = { id: string; name: string };
type StaffUser = { id: string; name: string };
type RecurringTaskRow = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  frequency: (typeof FREQUENCIES)[number];
  nextDueAt: string;
  active: boolean;
  assigneeName: string | null;
};

export function RecurringTasksBoard({
  clients,
  staff,
  tasks,
  canManage,
  createTask,
  completeOccurrence,
  deactivateTask,
  reactivateTask,
}: {
  clients: Client[];
  staff: StaffUser[];
  tasks: RecurringTaskRow[];
  canManage: boolean;
  createTask: (clientId: string, input: RecurringTaskInput) => Promise<void>;
  completeOccurrence: (taskId: string) => Promise<void>;
  deactivateTask: (taskId: string) => Promise<void>;
  reactivateTask: (taskId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      const clientId = formData.get("clientId") as string;
      await createTask(clientId, {
        title: (formData.get("title") as string) ?? "",
        assigneeId: (formData.get("assigneeId") as string) ?? "",
        frequency: formData.get("frequency") as RecurringTaskInput["frequency"],
        nextDueAt: (formData.get("nextDueAt") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
      });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleComplete(taskId: string) {
    setBusyId(taskId);
    try {
      await completeOccurrence(taskId);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleActive(taskId: string, active: boolean) {
    setBusyId(taskId);
    try {
      await (active ? deactivateTask(taskId) : reactivateTask(taskId));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-4">
          {!showForm ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              + Nova Tarefa Recorrente
            </Button>
          ) : (
            <form action={handleCreate} className="rounded-lg border border-border bg-surface p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientId">Cliente</Label>
                  <Select id="clientId" name="clientId" required>
                    <option value="">Selecione...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="assigneeId">Responsável</Label>
                  <Select id="assigneeId" name="assigneeId">
                    <option value="">Sem responsável</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="frequency">Frequência</Label>
                  <Select id="frequency" name="frequency" defaultValue="MENSAL">
                    {FREQUENCIES.map((f) => (
                      <option key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nextDueAt">Próxima ocorrência</Label>
                  <Input id="nextDueAt" name="nextDueAt" type="date" required />
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="title">Título</Label>
                <Input id="title" name="title" placeholder="Ex.: Enviar relatório mensal" required />
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Input id="notes" name="notes" />
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <div className="mt-4 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Criando..." : "Criar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium">Frequência</th>
              <th className="px-4 py-3 font-medium">Próxima ocorrência</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-soft">
                  Nenhuma tarefa recorrente cadastrada.
                </td>
              </tr>
            )}
            {tasks.map((task) => {
              const due = isRecurringTaskDue(new Date(task.nextDueAt), task.active);
              return (
                <tr key={task.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3 text-ink">{task.clientName}</td>
                  <td className="px-4 py-3 text-ink">{task.title}</td>
                  <td className="px-4 py-3 text-muted">{FREQUENCY_LABELS[task.frequency]}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(task.nextDueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3 text-muted">{task.assigneeName ?? "Sem responsável"}</td>
                  <td className="px-4 py-3">
                    {!task.active ? (
                      <Badge variant="neutral">Inativa</Badge>
                    ) : due ? (
                      <Badge variant="danger">Atrasada</Badge>
                    ) : (
                      <Badge variant="success">Em dia</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {task.active && (
                        <button
                          type="button"
                          disabled={busyId === task.id}
                          onClick={() => handleComplete(task.id)}
                          className="text-xs text-accent hover:underline"
                        >
                          Concluir agora
                        </button>
                      )}
                      {canManage && (
                        <button
                          type="button"
                          disabled={busyId === task.id}
                          onClick={() => handleToggleActive(task.id, task.active)}
                          className={`text-xs hover:underline ${task.active ? "text-red-500" : "text-accent"}`}
                        >
                          {task.active ? "Desativar" : "Reativar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
