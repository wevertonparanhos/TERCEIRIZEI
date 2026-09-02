"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Impediment = {
  id: string;
  title: string;
  createdAt: string;
  createdByName: string;
  resolvedAt: string | null;
  resolvedByName: string | null;
};

export function Impediments({
  processId,
  impediments,
  canWrite,
  addImpediment,
  resolveImpediment,
  reopenImpediment,
}: {
  processId: string;
  impediments: Impediment[];
  canWrite: boolean;
  addImpediment: (processId: string, title: string) => Promise<void>;
  resolveImpediment: (processId: string, impedimentId: string) => Promise<void>;
  reopenImpediment: (processId: string, impedimentId: string) => Promise<void>;
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
      await addImpediment(processId, title);
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
      await (resolve ? resolveImpediment(processId, impedimentId) : reopenImpediment(processId, impedimentId));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {open.length === 0 && resolved.length > 0 && (
        <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Todos resolvidos
        </p>
      )}

      {impediments.length === 0 && <p className="text-sm text-muted-soft">Nenhum impedimento registrado.</p>}

      {open.length > 0 && (
        <ul className="space-y-2">
          {open.map((item) => (
            <li key={item.id} className="rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {canWrite && (
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleToggle(item.id, true)}
                    className="flex-none text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    {busyId === item.id ? "Salvando..." : "Marcar resolvido"}
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-soft">
                {new Date(item.createdAt).toLocaleString("pt-BR")} · {item.createdByName}
              </p>
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 && (
        <ul className={`space-y-2 ${open.length > 0 ? "mt-4" : ""}`}>
          {resolved.map((item) => (
            <li key={item.id} className="rounded-md bg-surface-alt p-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted line-through">{item.title}</p>
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
              <p className="mt-1 text-xs text-muted-soft">
                Resolvido em {new Date(item.resolvedAt!).toLocaleDateString("pt-BR")}
                {item.resolvedByName ? ` por ${item.resolvedByName}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form action={action} className="mt-4 flex items-end gap-2 border-t border-border pt-4">
          <Input name="title" placeholder="Descreva o impedimento..." required className="flex-1" />
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
