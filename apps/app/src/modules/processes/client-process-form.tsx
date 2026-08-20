"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientCreateProcessSchema, type ClientCreateProcessInput } from "@/lib/validations/process";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Company = { id: string; razaoSocial: string };
type ServiceType = { id: string; name: string; defaultDeadlineDays: number | null; defaultPriority: string | null };

function addDaysAsInputDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ClientProcessForm({
  companies,
  serviceTypes,
  onSubmit,
}: {
  companies: Company[];
  serviceTypes: ServiceType[];
  onSubmit: (data: ClientCreateProcessInput) => Promise<{ id: string } | void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<ClientCreateProcessInput>({
    resolver: zodResolver(clientCreateProcessSchema),
    defaultValues: { priority: "MEDIA" },
  });

  function handleServiceTypeChange(serviceTypeId: string) {
    const serviceType = serviceTypes.find((s) => s.id === serviceTypeId);
    if (!serviceType) return;
    if (!dirtyFields.requestedDeadline && serviceType.defaultDeadlineDays) {
      setValue("requestedDeadline", addDaysAsInputDate(serviceType.defaultDeadlineDays));
    }
    if (!dirtyFields.priority && serviceType.defaultPriority) {
      setValue("priority", serviceType.defaultPriority as ClientCreateProcessInput["priority"]);
    }
  }

  async function submit(data: ClientCreateProcessInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result?.id) {
        setSent(true);
        router.push(`/portal/processos/${result.id}`);
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível enviar sua solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
        Solicitação enviada! Nossa equipe vai analisar e entrar em contato.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        {companies.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="companyId">Empresa</Label>
            <Select id="companyId" {...register("companyId")}>
              <option value="">Nenhuma / não se aplica</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razaoSocial}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="serviceTypeId">Serviço desejado</Label>
          <Select
            id="serviceTypeId"
            {...register("serviceTypeId")}
            onChange={(e) => {
              register("serviceTypeId").onChange(e);
              handleServiceTypeChange(e.target.value);
            }}
          >
            <option value="">Selecione...</option>
            {serviceTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          {errors.serviceTypeId && <p className="text-xs text-red-600">{errors.serviceTypeId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" {...register("priority")}>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="requestedDeadline">Prazo desejado</Label>
          <Input id="requestedDeadline" type="date" {...register("requestedDeadline")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descreva o que você precisa</Label>
        <Textarea id="description" rows={4} {...register("description")} />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Enviando..." : "Enviar solicitação"}
      </Button>
    </form>
  );
}
