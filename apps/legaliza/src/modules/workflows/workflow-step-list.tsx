"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workflowStepSchema, type WorkflowStepInput } from "@/lib/validations/workflow";
import { addWorkflowStep, deleteWorkflowStep } from "@/modules/workflows/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Step = { id: string; order: number; name: string; estimatedDays: number | null; requiresDocument: boolean; requiresProtocol: boolean };

export function WorkflowStepList({ workflowId, steps }: { workflowId: string; steps: Step[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkflowStepInput>({
    resolver: zodResolver(workflowStepSchema),
    defaultValues: { requiresDocument: false, requiresProtocol: false, isAutomated: false },
  });

  async function submit(data: WorkflowStepInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await addWorkflowStep(workflowId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível adicionar a etapa.");
    } finally {
      setSubmitting(false);
    }
  }

  async function remove(stepId: string) {
    await deleteWorkflowStep(workflowId, stepId);
    router.refresh();
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-medium text-ink">Etapas ({steps.length})</h2>

      {steps.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">Etapa</th>
                <th className="px-3 py-2 font-medium">Prazo (dias)</th>
                <th className="px-3 py-2 font-medium">Exige</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {steps.map((step) => (
                <tr key={step.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-muted">{step.order}</td>
                  <td className="px-3 py-2 text-ink">{step.name}</td>
                  <td className="px-3 py-2 text-muted">{step.estimatedDays ?? "—"}</td>
                  <td className="px-3 py-2 text-muted">
                    {[step.requiresDocument && "Documento", step.requiresProtocol && "Protocolo"].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" onClick={() => remove(step.id)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Adicionar Etapa
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="step-name">Nome da etapa</Label>
              <Input id="step-name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="step-days">Prazo estimado (dias)</Label>
              <Input id="step-days" inputMode="numeric" {...register("estimatedDays")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="step-role">Responsável (papel)</Label>
              <Input id="step-role" placeholder="Comercial" {...register("responsibleRole")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="step-agency">Órgão (se houver)</Label>
              <Input id="step-agency" placeholder="Junta Comercial" {...register("agencyName")} />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="step-doc" type="checkbox" {...register("requiresDocument")} className="h-4 w-4" />
              <Label htmlFor="step-doc">Exige documento</Label>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input id="step-protocol" type="checkbox" {...register("requiresProtocol")} className="h-4 w-4" />
              <Label htmlFor="step-protocol">Exige protocolo</Label>
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Adicionando..." : "Adicionar"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
