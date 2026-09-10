"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { taskSchema, type TaskInput, TASK_STATUSES } from "@/lib/validations/process";
import { PRIORITY_LABELS, TASK_STATUS_LABELS } from "@/modules/processes/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { TaskImpediments } from "@/modules/processes/task-impediments";

type StaffUser = { id: string; name: string };
type TaskImpediment = {
  id: string;
  title: string;
  createdAt: string;
  createdByName: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
};
type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueAt: string | null;
  assigneeName: string | null;
  impediments: TaskImpediment[];
};

export function TaskList({
  processId,
  tasks,
  staff,
  canWrite,
  createTask,
  updateTaskStatus,
  deleteTask,
  addTaskImpediment,
  resolveTaskImpediment,
  reopenTaskImpediment,
}: {
  processId: string;
  tasks: Task[];
  staff: StaffUser[];
  canWrite: boolean;
  createTask: (processId: string, input: TaskInput) => Promise<void>;
  updateTaskStatus: (processId: string, taskId: string, status: (typeof TASK_STATUSES)[number]) => Promise<void>;
  deleteTask: (processId: string, taskId: string) => Promise<void>;
  addTaskImpediment: (processId: string, taskId: string, title: string) => Promise<void>;
  resolveTaskImpediment: (processId: string, taskId: string, impedimentId: string) => Promise<void>;
  reopenTaskImpediment: (processId: string, taskId: string, impedimentId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TaskInput>({ resolver: zodResolver(taskSchema), defaultValues: { priority: "MEDIA" } });

  async function submit(data: TaskInput) {
    setError(null);
    setSubmitting(true);
    try {
      await createTask(processId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(taskId: string, status: string) {
    await updateTaskStatus(processId, taskId, status as (typeof TASK_STATUSES)[number]);
    router.refresh();
  }

  async function handleDelete(taskId: string) {
    await deleteTask(processId, taskId);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Tarefas</h3>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Tarefa"}
          </Button>
        )}
      </div>

      {tasks.length === 0 && !showForm && <p className="mt-3 text-sm text-muted-soft">Nenhuma tarefa cadastrada.</p>}

      {tasks.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {tasks.map((task) => {
            const openCount = task.impediments.filter((i) => !i.resolvedAt).length;
            const isExpanded = expandedTaskId === task.id;
            return (
              <li key={task.id} className="py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm font-medium text-ink">
                      {task.title}
                      {openCount > 0 && (
                        <span
                          title={`${openCount} pendência(s) aberta(s)`}
                          className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600 dark:bg-red-500/15 dark:text-red-400"
                        >
                          !
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-soft">
                      {PRIORITY_LABELS[task.priority]}
                      {task.assigneeName ? ` · ${task.assigneeName}` : ""}
                      {task.dueAt ? ` · ${new Date(task.dueAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-none items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="text-xs text-accent hover:underline"
                    >
                      Pendência{task.impediments.length > 0 ? ` (${task.impediments.length})` : ""}
                    </button>
                    <Select
                      defaultValue={task.status}
                      disabled={!canWrite}
                      className="h-8 w-[150px] text-xs"
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                    >
                      {TASK_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {TASK_STATUS_LABELS[status]}
                        </option>
                      ))}
                    </Select>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => handleDelete(task.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="mt-2.5">
                    <TaskImpediments
                      processId={processId}
                      taskId={task.id}
                      impediments={task.impediments}
                      canWrite={canWrite}
                      addTaskImpediment={addTaskImpediment}
                      resolveTaskImpediment={resolveTaskImpediment}
                      reopenTaskImpediment={reopenTaskImpediment}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="mt-4 space-y-3 border-t border-border pt-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="taskTitle">Tarefa</Label>
              <Input id="taskTitle" {...register("title")} />
              {errors.title && <p className="text-xs text-red-600">{errors.title.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskAssignee">Responsável</Label>
              <Select id="taskAssignee" {...register("assigneeId")}>
                <option value="">Sem responsável</option>
                {staff.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskPriority">Prioridade</Label>
              <Select id="taskPriority" {...register("priority")}>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="taskDueAt">Prazo</Label>
              <Input id="taskDueAt" type="date" {...register("dueAt")} />
            </div>
          </div>

          {error && <p className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}

          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Salvando..." : "Salvar tarefa"}
          </Button>
        </form>
      )}
    </div>
  );
}
