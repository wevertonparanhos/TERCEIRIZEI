"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type TaskImpediment = {
  id: string;
  title: string;
  createdAt: string;
  createdByName: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
};

export function TaskImpediments({
  processId,
  taskId,
  impediments,
  canWrite,
  addTaskImpediment,
  resolveTaskImpediment,
  reopenTaskImpediment,
}: {
  processId: string;
  taskId: string;
  impediments: TaskImpediment[];
  canWrite: boolean;
  addTaskImpediment: (processId: string, taskId: string, title: string) => Promise<void>;
  resolveTaskImpediment: (processId: string, taskId: string, impedimentId: string) => Promise<void>;
  reopenTaskImpediment: (processId: string, taskId: string, impedimentId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = impediments.filter((i) => !i.resolvedAt);
  const resolved = impediments.filter((i) => i.resolvedAt);

  async function action(formData: FormData) {
    const title = (formData.get("title") as string) ?? "";
    setSubmitting(true);
    setError(null);
    try {
      await addTaskImpediment(processId, taskId, title);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(impedimentId: string, resolve: boolean) {
    setBusyId(impedimentId);
    try {
      await (resolve
        ? resolveTaskImpediment(processId, taskId, impedimentId)
        : reopenTaskImpediment(processId, taskId, impedimentId));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded-md bg-surface-alt p-3">
      {impediments.length === 0 && <p className="text-xs text-muted-soft">Nenhuma pendência registrada nesta tarefa.</p>}

      {open.length > 0 && (
        <ul className="space-y-2">
          {open.map((item) => (
            <li key={item.id} className="rounded-md border border-red-200 bg-red-50 p-2.5 dark:border-red-500/30 dark:bg-red-500/10">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-medium text-ink">{item.title}</p>
                {canWrite && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleToggle(item.id, true)}
                    className="flex-none text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {busyId === item.id ? "Salvando..." : "Resolver"}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-soft">
                {new Date(item.createdAt).toLocaleString("pt-BR")} · {item.createdByName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <ul className={`space-y-2 ${open.length > 0 ? "mt-2" : ""}`}>
          {resolved.map((item) => (
            <li key={item.id} className="rounded-md bg-surface p-2.5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs text-muted line-through">{item.title}</p>
                {canWrite && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleToggle(item.id, false)}
                    className="flex-none text-xs text-muted hover:underline"
                  >
                    {busyId === item.id ? "Salvando..." : "Reabrir"}
                  </button>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-soft">
                Resolvido em {new Date(item.resolvedAt!).toLocaleDateString("pt-BR")}
                {item.resolvedByName ? ` por ${item.resolvedByName}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form action={action} className={`flex items-end gap-2 ${impediments.length > 0 ? "mt-3 border-t border-border pt-3" : ""}`}>
          <Input name="title" placeholder="Descreva a pendência..." required className="h-8 flex-1 text-xs" />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
