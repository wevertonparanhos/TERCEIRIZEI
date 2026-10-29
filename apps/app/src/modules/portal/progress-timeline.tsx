import { Check } from "lucide-react";
import { stageProgress } from "@/modules/portal/progress";

export type TimelineStage = { id: string; label: string; position: number };

/** Linha do tempo do andamento: etapas do quadro, a atual destacada e o % de conclusão. */
export function ProgressTimeline({
  stages,
  currentStageId,
  reachedAt,
  checklist,
}: {
  stages: TimelineStage[];
  currentStageId: string;
  /** etapa → data em que a tarefa chegou nela (dd/mm/aaaa) */
  reachedAt: Record<string, string>;
  checklist?: { done: number; total: number } | null;
}) {
  const sorted = [...stages].sort((a, b) => a.position - b.position);
  const { percent, index } = stageProgress(sorted, currentStageId);
  const finished = percent === 100;

  return (
    <section aria-label="Progresso da tarefa" className="rounded-2xl border border-border/70 bg-surface-alt/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">Progresso</h2>
        <p className="text-sm text-muted">
          <span className={`text-2xl font-extrabold ${finished ? "text-emerald-600" : "text-accent"}`}>{percent}%</span> concluído
        </p>
      </div>

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-border" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full rounded-full transition-all ${finished ? "bg-emerald-500" : "bg-accent"}`} style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-5 grid gap-3 sm:auto-cols-fr sm:grid-flow-col sm:gap-2">
        {sorted.map((stage, i) => {
          const done = i < index || (finished && i === index);
          const current = i === index && !finished;
          return (
            <li key={stage.id} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
              <span
                className={`flex h-7 w-7 flex-none items-center justify-center rounded-full border-2 text-xs font-bold ${
                  done ? "border-emerald-500 bg-emerald-500 text-white" : current ? "border-accent bg-surface text-accent ring-4 ring-accent/20" : "border-border-strong bg-surface text-muted-soft"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-0">
                <p className={`text-xs leading-tight ${current ? "font-bold text-ink" : done ? "font-medium text-ink" : "text-muted"}`}>{stage.label}</p>
                {reachedAt[stage.id] && <p className="mt-0.5 text-[11px] text-muted-soft">{reachedAt[stage.id]}</p>}
                {current && <p className="mt-0.5 text-[11px] font-semibold text-accent">Etapa atual</p>}
              </div>
            </li>
          );
        })}
      </ol>

      {checklist && checklist.total > 0 && (
        <p className="mt-4 text-xs text-muted">
          Checklist: {checklist.done} de {checklist.total} itens concluídos ({Math.round((checklist.done / checklist.total) * 100)}%)
        </p>
      )}
    </section>
  );
}
