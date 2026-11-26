"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Hourglass } from "lucide-react";
import { SNOOZE_LABELS, SNOOZE_OPTIONS, daysLabel, type ReminderTiming } from "@/modules/reminders/logic";
import type { ReminderResult } from "@/modules/reminders/actions";

export type ListReminder = {
  id: string;
  processId: string;
  processNumber: number;
  processTitle: string;
  clientName: string;
  /** AAAA-MM-DD */
  remindOn: string;
  note: string;
  createdByName: string;
  assigneeNames: string[];
  timing: ReminderTiming;
};

export type ListStageAlert = {
  processId: string;
  processNumber: number;
  processTitle: string;
  clientName: string;
  stageLabel: string;
  alertAfterDays: number;
  daysInStage: number;
  overdueBy: number;
  assigneeNames: string[];
};

const dateBr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

function SnoozeSelect({ disabled, onPick }: { disabled: boolean; onPick: (option: string) => void }) {
  return (
    <select
      value=""
      disabled={disabled}
      aria-label="Adiar"
      onChange={(e) => e.target.value && onPick(e.target.value)}
      className="h-8 rounded-md border border-border bg-surface px-2 text-xs text-muted hover:border-border-strong"
    >
      <option value="">Adiar…</option>
      {SNOOZE_OPTIONS.map((o) => (
        <option key={o} value={o}>
          {SNOOZE_LABELS[o]}
        </option>
      ))}
    </select>
  );
}

/** Lista de lembretes e de tarefas paradas, com as ações de cada um (feito, adiar, abrir a tarefa). */
export function RemindersList({
  reminders,
  alerts,
  complete,
  snooze,
  snoozeAlert,
}: {
  reminders: ListReminder[];
  alerts: ListStageAlert[];
  complete: (reminderId: string) => Promise<ReminderResult>;
  snooze: (reminderId: string, option: string) => Promise<ReminderResult>;
  snoozeAlert: (processId: string, option: string) => Promise<ReminderResult>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, fn: () => Promise<ReminderResult>) {
    setBusy(key);
    setError(null);
    try {
      const result = await fn();
      if (!result.ok) setError(result.error);
      else router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível concluir.");
    } finally {
      setBusy(null);
    }
  }

  const due = reminders.filter((r) => r.timing !== "futuro");
  const upcoming = reminders.filter((r) => r.timing === "futuro");

  const reminderRow = (r: ListReminder) => (
    <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <span
        className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          r.timing === "atrasado"
            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            : r.timing === "hoje"
              ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
              : "bg-surface-alt text-muted"
        }`}
      >
        {r.timing === "atrasado" ? "Atrasado · " : r.timing === "hoje" ? "Hoje · " : ""}
        {dateBr(r.remindOn)}
      </span>
      {/* No celular o nome da tarefa ganha a linha inteira (etiqueta em cima, botões embaixo). */}
      <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
        <Link href={`/processos/${r.processId}`} className="block truncate text-sm font-semibold text-ink hover:underline">
          #{r.processNumber} — {r.processTitle}
        </Link>
        <p className="truncate text-xs text-muted">
          {r.clientName}
          {r.assigneeNames.length > 0 && ` · ${r.assigneeNames.join(", ")}`}
          {` · criado por ${r.createdByName}`}
        </p>
        {r.note && <p className="mt-1 text-sm text-ink">{r.note}</p>}
      </div>
      <div className="flex flex-none items-center gap-2">
        <SnoozeSelect disabled={busy !== null} onPick={(o) => run(r.id, () => snooze(r.id, o))} />
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => run(r.id, () => complete(r.id))}
          className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/10 dark:text-emerald-400"
        >
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Feito
        </button>
      </div>
    </li>
  );

  return (
    <div className="space-y-8">
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">{error}</p>}

      <section>
        <h2 className="mb-3 text-base font-semibold text-ink">
          Para verificar agora <span className="font-normal text-muted-soft">({due.length})</span>
        </h2>
        {due.length === 0 ? <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-soft">Nenhum lembrete para hoje. 🎉</p> : <ul className="space-y-2">{due.map(reminderRow)}</ul>}
      </section>

      <section>
        <h2 className="mb-1 text-base font-semibold text-ink">
          Tarefas paradas <span className="font-normal text-muted-soft">({alerts.length})</span>
        </h2>
        <p className="mb-3 text-xs text-muted">Tarefas que passaram do prazo de espera da etapa em que estão (configurado em Gerenciar etapas).</p>
        {alerts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-soft">Nenhuma tarefa parada além do prazo.</p>
        ) : (
          <ul className="space-y-2">
            {alerts.map((a) => (
              <li key={a.processId} className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
                <span className="flex flex-none items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                  <Hourglass className="h-3 w-3" /> há {daysLabel(a.daysInStage)}
                </span>
                <div className="min-w-0 basis-full sm:basis-0 sm:flex-1">
                  <Link href={`/processos/${a.processId}`} className="block truncate text-sm font-semibold text-ink hover:underline">
                    #{a.processNumber} — {a.processTitle}
                  </Link>
                  <p className="truncate text-xs text-muted">
                    {a.clientName} · em <b>{a.stageLabel}</b> (cobra após {daysLabel(a.alertAfterDays)})
                    {a.assigneeNames.length > 0 && ` · ${a.assigneeNames.join(", ")}`}
                  </p>
                </div>
                <SnoozeSelect disabled={busy !== null} onPick={(o) => run(a.processId, () => snoozeAlert(a.processId, o))} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-base font-semibold text-ink">
            Agendados <span className="font-normal text-muted-soft">({upcoming.length})</span>
          </h2>
          <ul className="space-y-2">{upcoming.map(reminderRow)}</ul>
        </section>
      )}
    </div>
  );
}
