"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { amendmentSchema, AMENDMENT_ASPECTS, type AmendmentInput } from "@/lib/validations/amendment";
import { PROCESS_PRIORITIES } from "@/lib/validations/process";
import { createAmendmentProcess } from "@/modules/processes/amendment-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type ClientOption = { id: string; name: string; companies: { id: string; legalName: string }[] };

export function AmendmentWizard({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AmendmentInput>({
    resolver: zodResolver(amendmentSchema),
    defaultValues: { priority: "MEDIA", aspects: [] },
  });

  const selectedClientId = watch("clientId");
  const companies = useMemo(
    () => clients.find((c) => c.id === selectedClientId)?.companies ?? [],
    [clients, selectedClientId]
  );

  async function submit(data: AmendmentInput) {
    setServerError(null);
    setCreatedInfo(null);
    setSubmitting(true);
    try {
      const result = await createAmendmentProcess(data);
      setCreatedInfo(
        `Processo criado com ${data.aspects.length} item(ns) de checklist. ${
          result.stepsGenerated > 0 ? `${result.stepsGenerated} etapa(s) geradas.` : ""
        }`
      );
      setTimeout(() => router.push(`/processos/${result.id}`), 1200);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível criar o processo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(submit)} method="post" className="space-y-4" noValidate>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="clientId">Cliente</Label>
          <Select id="clientId" {...register("clientId")}>
            <option value="">Selecione...</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          {errors.clientId && <p className="text-xs text-red-600">{errors.clientId.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="companyId">Empresa</Label>
          <Select id="companyId" {...register("companyId")} disabled={!selectedClientId}>
            <option value="">Selecione...</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.legalName}
              </option>
            ))}
          </Select>
          {errors.companyId && <p className="text-xs text-red-600">{errors.companyId.message}</p>}
        </div>
      </div>

      <div>
        <Label>O que está mudando?</Label>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {AMENDMENT_ASPECTS.map((aspect) => (
            <label key={aspect} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <input type="checkbox" value={aspect} {...register("aspects")} className="h-4 w-4" />
              {aspect}
            </label>
          ))}
        </div>
        {errors.aspects && <p className="mt-1 text-xs text-red-600">{errors.aspects.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="priority">Prioridade</Label>
          <Select id="priority" {...register("priority")}>
            {PROCESS_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="state">UF</Label>
          <Input id="state" maxLength={2} placeholder="MG" {...register("state")} />
          {errors.state && <p className="text-xs text-red-600">{errors.state.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="municipality">Município</Label>
          <Input id="municipality" {...register("municipality")} />
          {errors.municipality && <p className="text-xs text-red-600">{errors.municipality.message}</p>}
        </div>
      </div>

      {serverError && (
        <p role="alert" className="rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {serverError}
        </p>
      )}
      {createdInfo && (
        <p className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {createdInfo}
        </p>
      )}

      <Button type="submit" disabled={submitting}>
        {submitting ? "Criando..." : "Criar Processo de Alteração"}
      </Button>
    </form>
  );
}
