"use client";

import { useRouter } from "next/navigation";
import type { ProcessStepStatus } from "@legaliza/db";
import { updateProcessStepStatus } from "@/modules/processes/actions";
import { Select } from "@/components/ui/select";

const STEP_STATUSES = ["PENDING", "READY", "IN_PROGRESS", "WAITING", "COMPLETED", "BLOCKED", "CANCELLED"] as const;

const STATUS_ICON: Record<string, string> = {
  COMPLETED: "✓",
  IN_PROGRESS: "→",
};

type Step = { id: string; name: string; status: string; order: number; dueDate: string | null };

export function ProcessSteps({ processId, steps }: { processId: string; steps: Step[] }) {
  const router = useRouter();

  async function onChangeStatus(stepId: string, status: ProcessStepStatus) {
    await updateProcessStepStatus(processId, stepId, status);
    router.refresh();
  }

  if (steps.length === 0) {
    return <p className="text-sm text-muted">Nenhuma etapa gerada — sem workflow configurado para este processo.</p>;
  }

  return (
    <ol className="space-y-2">
      {steps.map((step) => (
        <li key={step.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-alt px-4 py-2.5">
          <div className="flex items-center gap-3">
            <span className="w-4 text-center font-mono text-accent">{STATUS_ICON[step.status] ?? "○"}</span>
            <span className="text-sm text-ink">{step.name}</span>
            {step.dueDate && (
              <span className="text-xs text-muted-soft">prazo: {new Date(step.dueDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>
            )}
          </div>
          {/* Uncontrolled (defaultValue, não value) — mesmo padrão já adotado no
              Terceirizei OS: um <select> controlado por useState/value não
              responde de forma confiável a automação de teste neste ambiente. */}
          <Select
            key={`${step.id}-${step.status}`}
            className="h-8 w-40 text-xs"
            defaultValue={step.status}
            onChange={(e) => onChangeStatus(step.id, e.target.value as ProcessStepStatus)}
          >
            {STEP_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </li>
      ))}
    </ol>
  );
}
