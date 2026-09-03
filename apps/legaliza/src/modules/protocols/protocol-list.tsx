"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ProtocolStatus } from "@legaliza/db";
import { protocolSchema, PROTOCOL_STATUSES, type ProtocolInput } from "@/lib/validations/protocol";
import { createProtocol, updateProtocolStatus } from "@/modules/protocols/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type Protocol = {
  id: string;
  protocolNumber: string;
  status: string;
  url: string | null;
  governmentAgency: { name: string };
};
type AgencyOption = { id: string; name: string };
type StepOption = { id: string; name: string };

export function ProtocolList({
  processId,
  protocols,
  agencies,
  steps,
}: {
  processId: string;
  protocols: Protocol[];
  agencies: AgencyOption[];
  steps: StepOption[];
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProtocolInput>({ resolver: zodResolver(protocolSchema) });

  async function submit(data: ProtocolInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createProtocol(processId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível registrar o protocolo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onChangeStatus(protocolId: string, status: ProtocolStatus) {
    await updateProtocolStatus(processId, protocolId, status);
    router.refresh();
  }

  return (
    <div>
      {protocols.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Número</th>
                <th className="px-3 py-2 font-medium">Órgão</th>
                <th className="px-3 py-2 font-medium">URL</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{p.protocolNumber}</td>
                  <td className="px-3 py-2 text-muted">{p.governmentAgency.name}</td>
                  <td className="px-3 py-2 text-muted">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        link
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Select
                      key={`${p.id}-${p.status}`}
                      className="h-8 w-44 text-xs"
                      defaultValue={p.status}
                      onChange={(e) => onChangeStatus(p.id, e.target.value as ProtocolStatus)}
                    >
                      {PROTOCOL_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Registrar Protocolo
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="protocol-number">Número do protocolo</Label>
              <Input id="protocol-number" {...register("protocolNumber")} />
              {errors.protocolNumber && <p className="text-xs text-red-600">{errors.protocolNumber.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="protocol-agency">Órgão</Label>
              <Select id="protocol-agency" {...register("governmentAgencyId")}>
                <option value="">Selecione...</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              {errors.governmentAgencyId && <p className="text-xs text-red-600">{errors.governmentAgencyId.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="protocol-step">Etapa relacionada (opcional)</Label>
              <Select id="protocol-step" {...register("processStepId")}>
                <option value="">Nenhuma</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="protocol-url">URL (opcional)</Label>
              <Input id="protocol-url" placeholder="https://..." {...register("url")} />
              {errors.url && <p className="text-xs text-red-600">{errors.url.message}</p>}
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="protocol-notes">Observações</Label>
              <Input id="protocol-notes" {...register("notes")} />
            </div>
          </div>

          {serverError && <p className="text-xs text-red-600">{serverError}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Registrando..." : "Registrar"}
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
