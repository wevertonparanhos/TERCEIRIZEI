"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentRequestSchema, type DocumentRequestInput } from "@/lib/validations/document-request";
import { requestDocument, cancelDocumentRequest, respondDocumentRequest } from "@/modules/document-requests/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Req = {
  id: string;
  label: string;
  deadline: string | null;
  status: string;
  documentId: string | null;
};

const STATUS_VARIANT: Record<string, "success" | "neutral" | "warning"> = {
  PENDENTE: "warning",
  RECEBIDO: "success",
  CANCELADO: "neutral",
};

export function DocumentRequestList({
  processId,
  requests,
  canCreate,
}: {
  processId: string;
  requests: Req[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DocumentRequestInput>({ resolver: zodResolver(documentRequestSchema) });

  async function submit(data: DocumentRequestInput) {
    setError(null);
    setSubmitting(true);
    try {
      await requestDocument(processId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a solicitação.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancel(requestId: string) {
    await cancelDocumentRequest(processId, requestId);
    router.refresh();
  }

  async function respond(requestId: string, file: File) {
    setError(null);
    setRespondingId(requestId);
    try {
      const fd = new FormData();
      fd.set("file", file);
      await respondDocumentRequest(processId, requestId, fd);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o arquivo.");
    } finally {
      setRespondingId(null);
    }
  }

  return (
    <div>
      {requests.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Pedido</th>
                <th className="px-3 py-2 font-medium">Prazo</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{r.label}</td>
                  <td className="px-3 py-2 text-muted">
                    {r.deadline ? new Date(r.deadline).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={STATUS_VARIANT[r.status] ?? "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!canCreate && r.status === "PENDENTE" && (
                      <label className="cursor-pointer text-xs text-accent hover:underline">
                        {respondingId === r.id ? "Enviando..." : "Enviar arquivo"}
                        <input
                          type="file"
                          className="hidden"
                          disabled={respondingId === r.id}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) respond(r.id, file);
                          }}
                        />
                      </label>
                    )}
                    {canCreate && r.status === "PENDENTE" && (
                      <button type="button" onClick={() => cancel(r.id)} className="text-xs text-red-600 hover:underline">
                        Cancelar
                      </button>
                    )}
                    {r.documentId && (
                      <a
                        href={`/documentos/${r.documentId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-3 text-xs text-accent hover:underline"
                      >
                        ver documento
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {canCreate && !showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Solicitar Documento
        </Button>
      )}

      {canCreate && showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dr-label">O que está sendo pedido</Label>
              <Input id="dr-label" placeholder="ex: RG do sócio administrador" {...register("label")} />
              {errors.label && <p className="text-xs text-red-600">{errors.label.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="dr-deadline">Prazo (opcional)</Label>
              <Input id="dr-deadline" type="date" {...register("deadline")} />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="dr-notes">Observações</Label>
              <Input id="dr-notes" {...register("notes")} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? "Solicitando..." : "Solicitar"}
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
