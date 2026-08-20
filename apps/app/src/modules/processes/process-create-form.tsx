"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProcessSchema, type CreateProcessInput } from "@/lib/validations/process";
import { PRIORITY_LABELS } from "@/modules/processes/labels";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Client = { id: string; name: string };
type Company = { id: string; clientId: string; razaoSocial: string };
type ServiceType = { id: string; name: string };

export function ProcessCreateForm({
  clients,
  companies,
  serviceTypes,
  onSubmit,
}: {
  clients: Client[];
  companies: Company[];
  serviceTypes: ServiceType[];
  onSubmit: (data: CreateProcessInput) => Promise<{ id: string } | void>;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateProcessInput>({ resolver: zodResolver(createProcessSchema), defaultValues: { priority: "MEDIA" } });

  const watchedClientId = watch("clientId");
  const clientCompanies = useMemo(
    () => companies.filter((c) => c.clientId === (watchedClientId || selectedClientId)),
    [companies, watchedClientId, selectedClientId]
  );

  async function submit(data: CreateProcessInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit(data);
      if (result?.id) router.push(`/processos/${result.id}`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Cliente</Label>
          <Select
            id="clientId"
            {...register("clientId")}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
          {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="companyId">Empresa relacionada</Label>
          <Select id="companyId" {...register("companyId")} disabled={clientCompanies.length === 0}>
            <option value="">Nenhuma / não se aplica</option>
            {clientCompanies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.razaoSocial}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="serviceTypeId">Tipo de serviço</Label>
          <Select id="serviceTypeId" {...register("serviceTypeId")}>
            <option value="">Selecione...</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
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

        <div className="space-y-1.5">
          <Label htmlFor="value">Valor (R$)</Label>
          <Input id="value" type="number" step="0.01" min="0" {...register("value")} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" rows={4} {...register("description")} />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="notes">Observações</Label>
        <Textarea id="notes" rows={2} {...register("notes")} />
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : "Abrir processo"}
      </Button>
    </form>
  );
}
