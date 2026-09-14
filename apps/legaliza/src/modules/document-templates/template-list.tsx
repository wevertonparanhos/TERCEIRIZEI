"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadTemplate, deleteTemplate } from "@/modules/document-templates/actions";
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

const AVAILABLE_TAGS = [
  "cliente_nome",
  "cliente_doc",
  "cliente_email",
  "empresa_razaoSocial",
  "empresa_nomeFantasia",
  "empresa_cnpj",
  "empresa_naturezaJuridica",
  "empresa_capitalSocial",
  "endereco_logradouro",
  "endereco_numero",
  "endereco_bairro",
  "endereco_cidade",
  "endereco_uf",
  "endereco_cep",
  "socio_nome",
  "socio_cpf",
  "socio_qualificacao",
  "processo_tipo",
  "processo_uf",
  "processo_municipio",
  "data_hoje",
];

type Template = { id: string; name: string; category: string; description: string | null };

export function TemplateList({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function handleUpload(formData: FormData) {
    setBusy(true);
    setError(null);
    try {
      await uploadTemplate(formData);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar o modelo.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(templateId: string) {
    await deleteTemplate(templateId);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-sm font-medium text-ink">Modelos cadastrados</h2>
        {templates.length > 0 ? (
          <div className="mb-4 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt text-left text-muted">
                  <th className="px-3 py-2 font-medium">Nome</th>
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Descrição</th>
                  <th className="px-3 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0 bg-surface">
                    <td className="px-3 py-2 text-ink">{t.name}</td>
                    <td className="px-3 py-2 text-muted">
                      <Badge variant="neutral">{CATEGORY_LABELS[t.category] ?? t.category}</Badge>
                    </td>
                    <td className="px-3 py-2 text-muted">{t.description ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" onClick={() => remove(t.id)} className="text-xs text-red-600 hover:underline">
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mb-4 text-sm text-muted-soft">Nenhum modelo cadastrado ainda.</p>
        )}

        {error && <p className="mb-3 text-xs text-red-600">{error}</p>}

        {!showForm && (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(true)}>
            + Enviar Modelo
          </Button>
        )}

        {showForm && (
          <form action={handleUpload} className="space-y-3 rounded-lg border border-border p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="tplName">Nome do modelo</Label>
                <Input id="tplName" name="name" placeholder="ex: Procuração" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tplCategory">Categoria do documento gerado</Label>
                <Select id="tplCategory" name="category" defaultValue="OUTROS">
                  {DOCUMENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="tplDescription">Descrição (opcional)</Label>
                <Input id="tplDescription" name="description" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="tplFile">Arquivo .docx</Label>
                <input id="tplFile" type="file" name="file" accept=".docx" required className="block w-full text-sm" />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Enviando..." : "Enviar modelo"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        )}
      </div>

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-2 text-sm font-medium text-ink">Variáveis disponíveis</h2>
        <p className="mb-3 text-sm text-muted">
          Escreva essas variáveis entre chaves no seu arquivo .docx (ex: <code>{"{cliente_nome}"}</code>) — na geração,
          são substituídas pelos dados reais do cliente/empresa/processo.
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TAGS.map((tag) => (
            <code key={tag} className="rounded bg-surface-alt px-2 py-1 text-xs text-ink">
              {`{${tag}}`}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}
