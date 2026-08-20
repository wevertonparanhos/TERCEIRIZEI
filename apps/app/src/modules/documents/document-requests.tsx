"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { REQUEST_STATUS_LABELS, REQUEST_STATUS_VARIANT } from "@/modules/documents/labels";
import type { DocumentRequestInput } from "@/lib/validations/document-upload";

type Request = { id: string; label: string; deadline: string | null; status: string };

export function DocumentRequests({
  clientId,
  processId,
  requests,
  canWrite,
  requestDocument,
  markRequestReceived,
  cancelRequest,
}: {
  clientId: string;
  processId: string | null;
  requests: Request[];
  canWrite: boolean;
  requestDocument: (clientId: string, processId: string | null, input: DocumentRequestInput) => Promise<void>;
  markRequestReceived: (requestId: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleCreate(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await requestDocument(clientId, processId, {
        label: (formData.get("label") as string) ?? "",
        deadline: (formData.get("deadline") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
      });
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReceived(id: string) {
    await markRequestReceived(id);
    router.refresh();
  }

  async function handleCancel(id: string) {
    await cancelRequest(id);
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Documentos solicitados</h3>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Solicitar"}
          </Button>
        )}
      </div>

      {requests.length === 0 && !showForm && <p className="mt-3 text-sm text-muted-soft">Nenhuma solicitação.</p>}

      {requests.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-ink">{r.label}</p>
                {r.deadline && (
                  <p className="text-xs text-muted-soft">prazo {new Date(r.deadline).toLocaleDateString("pt-BR")}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={REQUEST_STATUS_VARIANT[r.status]}>{REQUEST_STATUS_LABELS[r.status]}</Badge>
                {canWrite && r.status === "PENDENTE" && (
                  <>
                    <button onClick={() => handleReceived(r.id)} className="text-xs text-accent hover:underline">
                      Marcar recebido
                    </button>
                    <button onClick={() => handleCancel(r.id)} className="text-xs text-red-500 hover:underline">
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form action={handleCreate} className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="reqLabel">Documento necessário</Label>
              <Input id="reqLabel" name="label" placeholder="Ex: RG do sócio" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="reqDeadline">Prazo</Label>
              <Input id="reqDeadline" name="deadline" type="date" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="reqNotes">Observação</Label>
            <Textarea id="reqNotes" name="notes" rows={2} />
          </div>

          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Salvando..." : "Solicitar"}
          </Button>
        </form>
      )}

      {error && <p className="mt-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
