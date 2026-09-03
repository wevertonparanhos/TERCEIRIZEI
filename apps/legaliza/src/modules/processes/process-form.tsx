"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { processSchema, PROCESS_TYPES, PROCESS_PRIORITIES, type ProcessInput } from "@/lib/validations/process";
import { createProcess } from "@/modules/processes/actions";
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

type ClientOption = { id: string; name: string; companies: { id: string; legalName: string }[] };

export function ProcessForm({ clients }: { clients: ClientOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdInfo, setCreatedInfo] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProcessInput>({
    resolver: zodResolver(processSchema),
    defaultValues: { type: "OPENING", priority: "MEDIA" },
  });

  const selectedClientId = watch("clientId");
  const selectedType = watch("type");
  const companies = useMemo(
    () => clients.find((c) => c.id === selectedClientId)?.companies ?? [],
    [clients, selectedClientId]
  );

  async function submit(data: ProcessInput) {
    setServerError(null);
    setCreatedInfo(null);
    setSubmitting(true);
    try {
      const result = await createProcess(data);
      setCreatedInfo(
        result.stepsGenerated > 0
          ? `Este processo possui ${result.stepsGenerated} etapa${result.stepsGenerated > 1 ? "s" : ""}.`
          : "Processo criado sem workflow configurado — nenhuma regra bateu com esses critérios."
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
          <Label htmlFor="type">Tipo de Processo</Label>
          <Select id="type" {...register("type")}>
            {PROCESS_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        {selectedType !== "OPENING" && (
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
        )}

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
        {submitting ? "Criando..." : "Criar Processo"}
      </Button>
    </form>
  );
}
