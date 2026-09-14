"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APPROVAL_STATUS_LABELS, APPROVAL_STATUS_VARIANT } from "@/modules/documents/labels";

type DeliverableType = "TEXTO" | "LINK" | "ARQUIVO";
type Deliverable = {
  id: string;
  type: DeliverableType;
  title: string;
  content: string | null;
  url: string | null;
  documentId: string | null;
  documentName: string | null;
  approvalStatus: "PENDENTE" | "APROVADO" | "RECUSADO";
  approvalNote: string | null;
  createdAt: string;
};
type AvailableDocument = { id: string; name: string };

const TYPE_LABELS: Record<DeliverableType, string> = { TEXTO: "Texto", LINK: "Link", ARQUIVO: "Arquivo" };

export function Deliverables({
  processId,
  deliverables,
  availableDocuments,
  canWrite,
  canRespond,
  addDeliverable,
  deleteDeliverable,
  respondDeliverable,
}: {
  processId: string;
  deliverables: Deliverable[];
  availableDocuments: AvailableDocument[];
  canWrite: boolean;
  canRespond: boolean;
  addDeliverable?: (
    processId: string,
    input: { type: DeliverableType; title: string; content?: string; url?: string; documentId?: string }
  ) => Promise<void>;
  deleteDeliverable?: (processId: string, deliverableId: string) => Promise<void>;
  respondDeliverable?: (processId: string, deliverableId: string, approved: boolean, note: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<DeliverableType>("TEXTO");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  async function submit(formData: FormData) {
    if (!addDeliverable) return;
    setBusy(true);
    setError(null);
    try {
      await addDeliverable(processId, {
        type,
        title: (formData.get("title") as string) ?? "",
        content: (formData.get("content") as string) ?? "",
        url: (formData.get("url") as string) ?? "",
        documentId: (formData.get("documentId") as string) ?? "",
      });
      setShowForm(false);
      setType("TEXTO");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar o entregável.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(deliverableId: string) {
    if (!deleteDeliverable) return;
    setBusy(true);
    try {
      await deleteDeliverable(processId, deliverableId);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove(deliverableId: string) {
    if (!respondDeliverable) return;
    setBusy(true);
    setError(null);
    try {
      await respondDeliverable(processId, deliverableId, true, "");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a aprovação.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(deliverableId: string) {
    if (!respondDeliverable) return;
    setBusy(true);
    setError(null);
    try {
      await respondDeliverable(processId, deliverableId, false, rejectNote);
      setRejectingId(null);
      setRejectNote("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar a recusa.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Entregáveis</h3>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Adicionar entregável"}
          </Button>
        )}
      </div>

      {canRespond && (
        <p className="mt-2 text-xs text-muted-soft">
          A equipe enviou os itens abaixo para sua avaliação — aprove ou peça ajustes.
        </p>
      )}

      {deliverables.length === 0 && !showForm && (
        <p className="mt-3 text-sm text-muted-soft">
          {canRespond ? "Nenhum entregável enviado ainda." : "Nenhum entregável ainda. Envie textos, links ou arquivos para o cliente aprovar."}
        </p>
      )}

      {deliverables.length > 0 && (
        <ul className="mt-3 space-y-2">
          {deliverables.map((d) => (
            <li key={d.id} className="rounded-md border border-border bg-surface p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    {d.title}
                    <span className="rounded-full bg-surface-alt px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-soft">
                      {TYPE_LABELS[d.type]}
                    </span>
                  </p>
                  {d.type === "TEXTO" && d.content && <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{d.content}</p>}
                  {d.type === "LINK" && d.url && (
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm text-accent hover:underline">
                      {d.url}
                    </a>
                  )}
                  {d.type === "ARQUIVO" && d.documentName && (
                    <a
                      href={`/documentos/${d.documentId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 block text-sm text-accent hover:underline"
                    >
                      {d.documentName}
                    </a>
                  )}
                  <Badge variant={APPROVAL_STATUS_VARIANT[d.approvalStatus]} className="mt-2">
                    {APPROVAL_STATUS_LABELS[d.approvalStatus]}
                  </Badge>
                  {d.approvalStatus === "RECUSADO" && d.approvalNote && (
                    <p className="mt-1 text-xs italic text-muted-soft">"{d.approvalNote}"</p>
                  )}
                </div>
                <div className="flex flex-none items-center gap-3">
                  {canWrite && deleteDeliverable && (
                    <button type="button" disabled={busy} onClick={() => handleDelete(d.id)} className="text-xs text-red-500 hover:underline">
                      Remover
                    </button>
                  )}
                  {canRespond && respondDeliverable && d.approvalStatus === "PENDENTE" && (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(d.id)}
                        className="text-xs font-medium text-emerald-700 hover:underline dark:text-emerald-400"
                      >
                        Aprovar
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setRejectingId(rejectingId === d.id ? null : d.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Pedir ajuste
                      </button>
                    </>
                  )}
                </div>
              </div>

              {rejectingId === d.id && (
                <div className="mt-2 flex items-center gap-2 rounded-md bg-surface-alt p-2">
                  <Input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="O que precisa ajustar?"
                    className="h-8 flex-1 text-xs"
                  />
                  <Button type="button" size="sm" disabled={busy} onClick={() => handleReject(d.id)}>
                    Enviar
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && canWrite && (
        <form action={submit} className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="deliverableType">Tipo</Label>
              <Select id="deliverableType" value={type} onChange={(e) => setType(e.target.value as DeliverableType)}>
                <option value="TEXTO">Texto</option>
                <option value="LINK">Link</option>
                <option value="ARQUIVO">Arquivo já enviado</option>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="deliverableTitle">Título</Label>
              <Input id="deliverableTitle" name="title" required />
            </div>
          </div>

          {type === "TEXTO" && (
            <div className="space-y-1">
              <Label htmlFor="deliverableContent">Conteúdo</Label>
              <Textarea id="deliverableContent" name="content" rows={3} />
            </div>
          )}
          {type === "LINK" && (
            <div className="space-y-1">
              <Label htmlFor="deliverableUrl">URL</Label>
              <Input id="deliverableUrl" name="url" type="url" placeholder="https://" />
            </div>
          )}
          {type === "ARQUIVO" && (
            <div className="space-y-1">
              <Label htmlFor="deliverableDocumentId">Arquivo</Label>
              {availableDocuments.length === 0 ? (
                <p className="text-xs text-muted-soft">
                  Nenhum arquivo enviado nesta tarefa ainda — envie um na aba Documentos primeiro.
                </p>
              ) : (
                <Select id="deliverableDocumentId" name="documentId">
                  {availableDocuments.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name}
                    </option>
                  ))}
                </Select>
              )}
            </div>
          )}

          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Adicionando..." : "Adicionar"}
          </Button>
        </form>
      )}

      {error && <p className="mt-2 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
