"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORY_LABELS, formatFileSize } from "@/modules/documents/labels";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/document-upload";

type DocRequest = { id: string; label: string };
type Doc = {
  id: string;
  name: string;
  category: string;
  currentVersion: number;
  uploadedByName: string;
  createdAt: string;
  latestFileName: string;
  latestSizeBytes: number;
};

export function DocumentList({
  clientId,
  processId,
  documents,
  openRequests,
  canWrite,
  uploadNewDocument,
  uploadNewVersion,
}: {
  clientId: string;
  processId: string | null;
  documents: Doc[];
  openRequests: DocRequest[];
  canWrite: boolean;
  uploadNewDocument: (clientId: string, processId: string | null, requestId: string | null, formData: FormData) => Promise<void>;
  uploadNewVersion: (documentId: string, formData: FormData) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [versioningId, setVersioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleUpload(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      const requestId = (formData.get("requestId") as string) || null;
      await uploadNewDocument(clientId, processId, requestId, formData);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNewVersion(documentId: string, formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await uploadNewVersion(documentId, formData);
      setVersioningId(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a nova versão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Documentos</h3>
        {canWrite && (
          <Button variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancelar" : "+ Documento"}
          </Button>
        )}
      </div>

      {documents.length === 0 && !showForm && <p className="mt-3 text-sm text-muted-soft">Nenhum documento enviado.</p>}

      {documents.length > 0 && (
        <ul className="mt-3 divide-y divide-border">
          {documents.map((doc) => (
            <li key={doc.id} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink">{doc.name}</p>
                  <p className="text-xs text-muted-soft">
                    {CATEGORY_LABELS[doc.category]} · v{doc.currentVersion} · {formatFileSize(doc.latestSizeBytes)} ·{" "}
                    {doc.uploadedByName} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex flex-none items-center gap-3">
                  <a
                    href={`/documentos/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Baixar
                  </a>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => setVersioningId(versioningId === doc.id ? null : doc.id)}
                      className="text-xs text-muted hover:underline"
                    >
                      Nova versão
                    </button>
                  )}
                </div>
              </div>
              {versioningId === doc.id && (
                <form
                  action={(fd) => handleNewVersion(doc.id, fd)}
                  className="mt-2 flex items-center gap-2 rounded-md bg-surface-alt p-2"
                >
                  <input type="file" name="file" required className="text-xs" />
                  <Button type="submit" size="sm" disabled={busy}>
                    Enviar
                  </Button>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form action={handleUpload} className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="docName">Nome do documento</Label>
              <Input id="docName" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="docCategory">Categoria</Label>
              <Select id="docCategory" name="category" defaultValue="OUTROS">
                {DOCUMENT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </Select>
            </div>
            {openRequests.length > 0 && (
              <div className="col-span-2 space-y-1">
                <Label htmlFor="requestId">Isso atende a uma solicitação pendente?</Label>
                <Select id="requestId" name="requestId" defaultValue="">
                  <option value="">Não</option>
                  {openRequests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="col-span-2 space-y-1">
              <Label htmlFor="docFile">Arquivo</Label>
              <input id="docFile" type="file" name="file" required className="block w-full text-sm" />
              <p className="text-xs text-muted-soft">PDF, imagem, Word ou Excel, até 20MB.</p>
            </div>
          </div>

          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Enviando..." : "Enviar documento"}
          </Button>
        </form>
      )}

      {error && <p className="mt-3 rounded-md bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
