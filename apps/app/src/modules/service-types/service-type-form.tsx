"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceTypeSchema, type ServiceTypeInput } from "@/lib/validations/service-type";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export function ServiceTypeForm({
  defaultValues,
  submitLabel,
  onSubmit,
}: {
  defaultValues?: Partial<ServiceTypeInput>;
  submitLabel: string;
  onSubmit: (data: ServiceTypeInput) => Promise<{ id: string } | void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ServiceTypeInput>({ resolver: zodResolver(serviceTypeSchema), defaultValues });

  async function submit(data: ServiceTypeInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result?.id) router.push(`/servicos/${result.id}`);
      else router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="name">Nome do modelo</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="defaultPrice">Valor padrão (R$)</Label>
          <Input id="defaultPrice" type="number" step="0.01" min="0" {...register("defaultPrice")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="defaultDeadlineDays">Prazo padrão (dias)</Label>
          <Input id="defaultDeadlineDays" type="number" min="0" {...register("defaultDeadlineDays")} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="defaultPriority">Prioridade padrão</Label>
          <Select id="defaultPriority" {...register("defaultPriority")}>
            <option value="">Média (padrão do sistema)</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="defaultNotes">Observações padrão</Label>
        <Textarea id="defaultNotes" rows={2} {...register("defaultNotes")} />
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : submitLabel}
      </Button>
    </form>
  );
}
