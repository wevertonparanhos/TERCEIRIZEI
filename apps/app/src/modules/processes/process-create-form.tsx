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
type ServiceType = {
  id: string;
  name: string;
  defaultPrice: string | null;
  defaultDeadlineDays: number | null;
  defaultPriority: string | null;
  checklistCount: number;
};

function addDaysAsInputDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

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
  const [hasPayment, setHasPayment] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CreateProcessInput>({ resolver: zodResolver(createProcessSchema), defaultValues: { priority: "MEDIA" } });

  const watchedClientId = watch("clientId");
  const clientCompanies = useMemo(
    () => companies.filter((c) => c.clientId === (watchedClientId || selectedClientId)),
    [companies, watchedClientId, selectedClientId]
  );

  const watchedServiceTypeId = watch("serviceTypeId");
  const selectedServiceType = useMemo(
    () => serviceTypes.find((st) => st.id === watchedServiceTypeId),
    [serviceTypes, watchedServiceTypeId]
  );

  function handleServiceTypeChange(serviceTypeId: string) {
    const serviceType = serviceTypes.find((st) => st.id === serviceTypeId);
    if (!serviceType) return;
    // Só preenche automaticamente campos que o usuário ainda não editou —
    // trocar de tipo de serviço nunca sobrescreve um ajuste manual.
    if (!dirtyFields.value && serviceType.defaultPrice) {
      setValue("value", serviceType.defaultPrice);
      setHasPayment(true);
    }
    if (!dirtyFields.requestedDeadline && serviceType.defaultDeadlineDays) {
      setValue("requestedDeadline", addDaysAsInputDate(serviceType.defaultDeadlineDays));
    }
    if (!dirtyFields.priority && serviceType.defaultPriority) {
      setValue("priority", serviceType.defaultPriority as CreateProcessInput["priority"]);
    }
  }

  async function submit(data: CreateProcessInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await onSubmit(hasPayment ? data : { ...data, value: "", paymentDueDate: "" });
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
            onChange={(e) => {
              register("clientId").onChange(e);
              setSelectedClientId(e.target.value);
            }}
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
          <Select
            id="serviceTypeId"
            {...register("serviceTypeId")}
            onChange={(e) => {
              register("serviceTypeId").onChange(e);
              handleServiceTypeChange(e.target.value);
            }}
          >
            <option value="">Selecione...</option>
            {serviceTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
          {errors.serviceTypeId && <p className="text-xs text-red-600">{errors.serviceTypeId.message}</p>}
          {selectedServiceType && selectedServiceType.checklistCount > 0 && (
            <p className="text-xs text-muted-soft">
              {selectedServiceType.checklistCount} item(s) de checklist padrão serão adicionados automaticamente.
            </p>
          )}
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

      <div className="rounded-lg border border-border bg-surface-alt p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-ink">
          <input
            type="checkbox"
            checked={hasPayment}
            onChange={(e) => setHasPayment(e.target.checked)}
            className="h-4 w-4 rounded border-border-strong"
          />
          Esta demanda tem pagamento
        </label>

        {hasPayment && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" type="number" step="0.01" min="0" {...register("value")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="paymentDueDate">Data prevista de pagamento</Label>
              <Input id="paymentDueDate" type="date" {...register("paymentDueDate")} />
            </div>
          </div>
        )}
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
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Salvando..." : "Abrir processo"}
      </Button>
    </form>
  );
}
