"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SNOOZE_LABELS, SNOOZE_OPTIONS, type ReminderTiming } from "@/modules/reminders/logic";
import type { ReminderResult } from "@/modules/reminders/actions";

export type CardReminder = {
  id: string;
  /** AAAA-MM-DD */
  remindOn: string;
  note: string;
  createdByName: string;
  timing: ReminderTiming;
};

const dateBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

const TIMING_STYLE: Record<ReminderTiming, string> = {
  atrasado: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  hoje: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  futuro: "bg-surface-alt text-muted",
};
const TIMING_LABEL: Record<ReminderTiming, string> = { atrasado: "Atrasado", hoje: "Hoje", futuro: "Agendado" };

/** Lembretes da tarefa: marque uma data para verificar de novo; no dia, a tarefa aparece em "Lembretes" e no quadro. */
export function RemindersCard({
  processId,
  reminders,
  todayIso,
  canWrite,
  create,
  complete,
  snooze,
  remove,
}: {
  processId: string;
  reminders: CardReminder[];
  /** hoje (dia de Brasília), AAAA-MM-DD */
  todayIso: string;
  canWrite: boolean;
  create: (processId: string, date: string, note: string) => Promise<ReminderResult>;
  complete: (reminderId: string) => Promise<ReminderResult>;
  snooze: (reminderId: string, option: string) => Promise<ReminderResult>;
  remove: (reminderId: string) => Promise<ReminderResult>;
}) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<ReminderResult>): Promise<boolean> {
    setBusy(key);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      router.refresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function add() {
    if (!date) {
      setError("Escolha a data do lembrete.");
      return;
    }
    if (await run("new", () => create(processId, date, note))) {
      setDate("");
      setNote("");
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <BellRing className="h-4 w-4 text-muted-soft" />
        Lembretes
        {reminders.length > 0 && <span className="rounded-full bg-surface-alt px-1.5 text-[11px] font-medium text-muted">{reminders.length}</span>}
      </p>

      {reminders.length === 0 && <p className="mb-3 text-xs text-muted-soft">Nenhum lembrete. Marque uma data para verificar esta tarefa de novo.</p>}

      {reminders.length > 0 && (
        <ul className="mb-3 space-y-2">
          {reminders.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface-alt/40 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIMING_STYLE[r.timing]}`}>{TIMING_LABEL[r.timing]}</span>
                  <span className="text-xs font-medium text-ink">{dateBr(r.remindOn)}</span>
                </span>
                {canWrite && (
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run(r.id, () => complete(r.id))}
                      title="Feito"
                      aria-label="Marcar lembrete como feito"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:hover:bg-emerald-500/10"
                    >
                      <Check className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => run(r.id, () => remove(r.id))}
                      title="Excluir lembrete"
                      aria-label="Excluir lembrete"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>
              {r.note && <p className="mt-1.5 text-xs text-ink">{r.note}</p>}
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-soft">por {r.createdByName}</span>
                {canWrite && (
                  <select
                    value=""
                    disabled={busy !== null}
                    aria-label="Adiar lembrete"
                    onChange={(e) => e.target.value && run(r.id, () => snooze(r.id, e.target.value))}
                    className="rounded-md border border-border bg-surface px-1.5 py-0.5 text-[11px] text-muted hover:border-border-strong"
                  >
                    <option value="">Adiar…</option>
                    {SNOOZE_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {SNOOZE_LABELS[o]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite && (
        <form
          className="space-y-2 border-t border-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input type="date" min={todayIso} value={date} onChange={(e) => setDate(e.target.value)} aria-label="Data do lembrete" className="h-9" />
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="O que verificar? Ex.: ver andamento na Junta" maxLength={300} aria-label="Nota do lembrete" className="h-9" />
          <Button type="submit" size="sm" variant="outline" className="w-full" disabled={busy !== null}>
            {busy === "new" ? "Salvando..." : "Adicionar lembrete"}
          </Button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
