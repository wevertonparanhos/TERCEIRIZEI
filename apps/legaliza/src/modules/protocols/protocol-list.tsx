"use client";

import Link from "next/link";
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

const TERMINAL_STATUSES = new Set(["APPROVED", "REJECTED", "COMPLETED"]);

type Protocol = {
  id: string;
  protocolNumber: string;
  status: string;
  url: string | null;
  documentId: string | null;
  expectedResponseAt: string | null;
  governmentAgency: { name: string; portalUrl: string | null };
};
type AgencyOption = { id: string; name: string };
type StepOption = { id: string; name: string };
type DocumentOption = { id: string; name: string };

export function ProtocolList({
  processId,
  protocols,
  agencies,
  steps,
  documents,
}: {
  processId: string;
  protocols: Protocol[];
  agencies: AgencyOption[];
  steps: StepOption[];
  documents: DocumentOption[];
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
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Prazo</th>
                <th className="px-3 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {protocols.map((p) => {
                const overdue =
                  !TERMINAL_STATUSES.has(p.status) &&
                  !!p.expectedResponseAt &&
                  new Date(p.expectedResponseAt) < new Date();
                return (
                  <tr key={p.id} className="border-b border-border last:border-0 bg-surface">
                    <td className="px-3 py-2 text-ink">
                      {p.url ? (
                        <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                          {p.protocolNumber}
                        </a>
                      ) : (
                        p.protocolNumber
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {p.governmentAgency.name}
                      {p.governmentAgency.portalUrl && (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={p.governmentAgency.portalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                          >
                            portal do órgão →
                          </a>
                        </>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {p.documentId ? (
                        <Link href={`/documentos/${p.documentId}`} className="text-accent hover:underline">
                          ver documento
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`px-3 py-2 ${overdue ? "font-medium text-red-600" : "text-muted"}`}>
                      {p.expectedResponseAt
                        ? new Date(p.expectedResponseAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })
                        : "—"}
                      {overdue && " (vencido)"}
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
                );
              })}
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
            <div className="space-y-1">
              <Label htmlFor="protocol-document">Documento enviado (opcional)</Label>
              <Select id="protocol-document" {...register("documentId")}>
                <option value="">Nenhum</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="protocol-expected-response">Prazo esperado de resposta (opcional)</Label>
              <Input id="protocol-expected-response" type="date" {...register("expectedResponseAt")} />
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
