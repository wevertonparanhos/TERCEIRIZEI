"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument, uploadNewVersion, deleteDocument } from "@/modules/documents/actions";
import { DOCUMENT_CATEGORIES } from "@/lib/validations/document-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CATEGORY_LABELS: Record<string, string> = {
  DOCUMENTACAO_CADASTRAL: "Documentação Cadastral",
  CONTRATOS: "Contratos",
  CERTIDOES: "Certidões",
  DOCUMENTOS_SOCIETARIOS: "Documentos Societários",
  DOCUMENTOS_FISCAIS: "Documentos Fiscais",
  DOCUMENTOS_PESSOAIS: "Documentos Pessoais",
  COMPROVANTES: "Comprovantes",
  OUTROS: "Outros",
};

type Doc = { id: string; name: string; category: string; currentVersion: number };

export function DocumentList({ processId, documents }: { processId: string; documents: Doc[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleUpload(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await uploadDocument(processId, formData);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o documento.");
    } finally {
      setBusy(false);
    }
  }

  async function handleNewVersion(documentId: string, formData: FormData) {
    setError(null);
    try {
      await uploadNewVersion(processId, documentId, formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a nova versão.");
    }
  }

  async function remove(documentId: string) {
    await deleteDocument(processId, documentId);
    router.refresh();
  }

  return (
    <div>
      {documents.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Categoria</th>
                <th className="px-3 py-2 font-medium">Versão</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{doc.name}</td>
                  <td className="px-3 py-2 text-muted">
                    <Badge variant="neutral">{CATEGORY_LABELS[doc.category] ?? doc.category}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted">v{doc.currentVersion}</td>
                  <td className="px-3 py-2 text-right space-x-3">
                    <a
                      href={`/documentos/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Baixar
                    </a>
                    <label className="cursor-pointer text-xs text-accent hover:underline">
                      Nova versão
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const fd = new FormData();
                          fd.set("file", file);
                          handleNewVersion(doc.id, fd);
                        }}
                      />
                    </label>
                    <button type="button" onClick={() => remove(doc.id)} className="text-xs text-red-600 hover:underline">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

      {!showForm && (
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
          + Enviar Documento
        </Button>
      )}

      {showForm && (
        <form action={handleUpload} className="space-y-3 rounded-lg border border-border p-4">
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
            <div className="col-span-2 space-y-1">
              <Label htmlFor="docFile">Arquivo</Label>
              <input id="docFile" type="file" name="file" required className="block w-full text-sm" />
              <p className="text-xs text-muted-soft">PDF, imagem, Word ou Excel, até 20MB.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Enviando..." : "Enviar documento"}
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
