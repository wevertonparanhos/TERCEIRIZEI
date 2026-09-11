"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientUploadDocument } from "@/modules/documents/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Doc = { id: string; name: string; currentVersion: number };

// Versão simplificada do DocumentList pro cliente: só envia e baixa, sem
// nova versão/remover (isso é controle do escritório, não do cliente final).
export function PortalDocumentList({ processId, documents }: { processId: string; documents: Doc[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleUpload(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await clientUploadDocument(processId, formData);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o documento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {documents.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Versão</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-border last:border-0 bg-surface">
                  <td className="px-3 py-2 text-ink">{doc.name}</td>
                  <td className="px-3 py-2 text-muted">v{doc.currentVersion}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/documentos/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-accent hover:underline"
                    >
                      Baixar
                    </a>
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
              <Label htmlFor="pdocName">Nome do documento</Label>
              <Input id="pdocName" name="name" required />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="pdocFile">Arquivo</Label>
              <input id="pdocFile" type="file" name="file" required className="block w-full text-sm" />
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
