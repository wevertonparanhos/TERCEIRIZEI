"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Stage = { id: string; label: string; color: string; processCount: number };

export function StageManager({
  stages,
  createStage,
  renameStage,
  deleteStage,
  moveStage,
}: {
  stages: Stage[];
  createStage: (label: string) => Promise<void>;
  renameStage: (stageId: string, label: string) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  moveStage: (stageId: string, direction: "up" | "down") => Promise<void>;
}) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(formData: FormData) {
    const label = (formData.get("label") as string) ?? "";
    await run(() => createStage(label));
  }

  async function handleRename(formData: FormData) {
    const label = (formData.get("label") as string) ?? "";
    const stageId = formData.get("stageId") as string;
    await run(() => renameStage(stageId, label));
    setEditingId(null);
  }

  return (
    <div>
      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: stage.color }} />

            {editingId === stage.id ? (
              <form action={handleRename} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="stageId" value={stage.id} />
                <Input name="label" defaultValue={stage.label} className="h-8 flex-1" autoFocus />
                <Button type="submit" size="sm" disabled={busy}>
                  Salvar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                  Cancelar
                </Button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-brand-navy">{stage.label}</span>
                <span className="text-xs text-slate-400">{stage.processCount} processo(s)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => run(() => moveStage(stage.id, "up"))}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === stages.length - 1}
                    onClick={() => run(() => moveStage(stage.id, "down"))}
                    className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(stage.id)}
                    className="rounded px-2 py-1 text-xs text-brand-blue hover:bg-slate-100"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteStage(stage.id))}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-slate-100"
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <form action={handleCreate} className="mt-4 flex gap-2">
        <Input name="label" placeholder="Nome da nova etapa" className="max-w-xs" />
        <Button type="submit" disabled={busy}>
          + Adicionar etapa
        </Button>
      </form>

      {error && <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
