"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { workflowSchema, type WorkflowInput } from "@/lib/validations/workflow";
import { PROCESS_TYPES } from "@/lib/validations/process";
import { createWorkflow } from "@/modules/workflows/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

export function WorkflowForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkflowInput>({ resolver: zodResolver(workflowSchema), defaultValues: { processType: "OPENING" } });

  async function submit(data: WorkflowInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await createWorkflow(data);
      router.push(`/workflows/${result.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar o workflow.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nome do Workflow</Label>
          <Input id="name" placeholder="Abertura de Empresa — Padrão" {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="processType">Tipo de Processo</Label>
          <Select id="processType" {...register("processType")}>
            {PROCESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">UF (opcional — vazio = qualquer)</Label>
          <Input id="state" maxLength={2} placeholder="MG" {...register("state")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="legalNature">Natureza Jurídica (opcional — vazio = qualquer)</Label>
          <Input id="legalNature" {...register("legalNature")} />
        </div>
      </div>

      {serverError && <p className="text-xs text-red-600">{serverError}</p>}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Criando..." : "Criar Workflow"}
      </Button>
    </form>
  );
}
