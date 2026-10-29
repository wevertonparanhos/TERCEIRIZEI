"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { stageKind } from "@/modules/portal/progress";

type Stage = {
  id: string;
  label: string;
  color: string;
  processCount: number;
  /** % definido para a etapa (null = automático) */
  progressPercent: number | null;
  /** % que o sistema calcularia sozinho (null = etapa de pausa, sem %) */
  autoPercent: number | null;
};

export function StageManager({
  stages,
  createStage,
  renameStage,
  deleteStage,
  moveStage,
  setProgress,
}: {
  stages: Stage[];
  createStage: (label: string) => Promise<void>;
  renameStage: (stageId: string, label: string, color?: string) => Promise<void>;
  deleteStage: (stageId: string) => Promise<void>;
  moveStage: (stageId: string, direction: "up" | "down") => Promise<void>;
  setProgress: (stageId: string, percent: number | null) => Promise<void>;
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
    const color = (formData.get("color") as string) ?? "";
    const stageId = formData.get("stageId") as string;
    await run(() => renameStage(stageId, label, color));
    setEditingId(null);
  }

  async function handleProgress(stage: Stage, raw: string) {
    const value = raw.trim() === "" ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 0 || value > 100)) {
      setError("Use um número inteiro de 0 a 100 (ou deixe vazio para o cálculo automático).");
      return;
    }
    if (value === stage.progressPercent) return;
    await run(() => setProgress(stage.id, value));
  }

  return (
    <div>
      <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-ink">
        <b>% de conclusão</b>: o que o cliente vê no portal quando a tarefa está na etapa. Deixe vazio para o sistema calcular pela posição da etapa
        (o número cinza é a sugestão). Etapas de pausa, como Paralisadas e Suspensas, não têm %: a tarefa mantém o da última etapa por onde passou.
      </p>
      <ul className="divide-y divide-border rounded-2xl border border-border/70 bg-surface shadow-sm">
        {stages.map((stage, index) => (
          <li key={stage.id} className="flex items-center gap-3 px-4 py-3">
            <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ backgroundColor: stage.color }} />

            {editingId === stage.id ? (
              <form action={handleRename} className="flex flex-1 items-center gap-2">
                <input type="hidden" name="stageId" value={stage.id} />
                <input
                  type="color"
                  name="color"
                  defaultValue={stage.color}
                  className="h-8 w-8 flex-none cursor-pointer rounded border border-border-strong bg-transparent p-0.5"
                  title="Cor da etapa"
                />
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
                <span className="flex-1 text-sm font-medium text-ink">{stage.label}</span>
                <span className="text-xs text-muted-soft">{stage.processCount} tarefa(s)</span>
                {stageKind(stage.label) === "pause" ? (
                  <span className="w-24 text-right text-[11px] text-muted-soft">pausa</span>
                ) : (
                  <label className="flex w-24 items-center justify-end gap-1 text-xs text-muted" title="% de conclusão que o cliente vê nesta etapa">
                    <input
                      key={`${stage.id}-${stage.progressPercent ?? "auto"}`}
                      type="number"
                      min={0}
                      max={100}
                      inputMode="numeric"
                      aria-label={`% de conclusão da etapa ${stage.label}`}
                      defaultValue={stage.progressPercent ?? ""}
                      placeholder={stage.autoPercent === null ? "" : String(stage.autoPercent)}
                      disabled={busy}
                      onBlur={(e) => handleProgress(stage, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                      }}
                      className="h-7 w-14 rounded-md border border-border-strong bg-surface px-1.5 text-right text-xs text-ink placeholder:text-muted-soft"
                    />
                    %
                  </label>
                )}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={busy || index === 0}
                    onClick={() => run(() => moveStage(stage.id, "up"))}
                    className="rounded px-2 py-1 text-xs text-muted hover:bg-surface-alt disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={busy || index === stages.length - 1}
                    onClick={() => run(() => moveStage(stage.id, "down"))}
                    className="rounded px-2 py-1 text-xs text-muted hover:bg-surface-alt disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(stage.id)}
                    className="rounded px-2 py-1 text-xs text-accent hover:bg-surface-alt"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => deleteStage(stage.id))}
                    className="rounded px-2 py-1 text-xs text-red-500 hover:bg-surface-alt"
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

      {error && <p className="mt-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
