"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateDocumentFromTemplate } from "@/modules/document-templates/generate-actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

type TemplateOption = { id: string; name: string };

export function GenerateDocumentForm({ processId, templates }: { processId: string; templates: TemplateOption[] }) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function generate() {
    if (!templateId) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await generateDocumentFromTemplate(processId, templateId);
      setSuccess("Documento gerado — confira na lista de Documentos abaixo.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível gerar o documento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-64 space-y-1">
        <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="button" size="sm" onClick={generate} disabled={submitting || !templateId}>
        {submitting ? "Gerando..." : "Gerar Documento"}
      </Button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      {success && <p className="w-full text-xs text-emerald-600">{success}</p>}
    </div>
  );
}
