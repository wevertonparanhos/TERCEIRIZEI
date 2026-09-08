"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  complianceItemSchema,
  COMPLIANCE_ITEM_TYPES,
  type ComplianceItemInput,
} from "@/lib/validations/compliance";
import { createComplianceItem, deleteComplianceItem, updateComplianceItemExpiry } from "@/modules/compliance/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

const TYPE_LABELS: Record<string, string> = {
  CERTIDAO_NEGATIVA: "Certidão Negativa",
  ALVARA: "Alvará",
  CERTIFICADO_DIGITAL: "Certificado Digital",
};

// Alerta com 30 dias de antecedência — renovação de certidão/alvará precisa
// de lead time, diferente de protocolo (que é reativo, alerta só quando já
// venceu). Mesmo corte usado na query do Dashboard.
const ALERT_WINDOW_DAYS = 30;

type ComplianceItem = {
  id: string;
  type: string;
  name: string;
  issuedAt: string | null;
  expiresAt: string | null;
  documentId: string | null;
  notes: string | null;
};
type DocumentOption = { id: string; name: string };

export function ComplianceList({
  companyId,
  items,
  documents,
}: {
  companyId: string;
  items: ComplianceItem[];
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
  } = useForm<ComplianceItemInput>({
    resolver: zodResolver(complianceItemSchema),
    defaultValues: { type: "CERTIDAO_NEGATIVA" },
  });

  async function submit(data: ComplianceItemInput) {
    setServerError(null);
    setSubmitting(true);
    try {
      await createComplianceItem(companyId, data);
      reset();
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Não foi possível registrar o item.");
    } finally {
      setSubmitting(false);
    }
  }

  async function onRemove(itemId: string) {
    await deleteComplianceItem(companyId, itemId);
    router.refresh();
  }

  async function onRenew(itemId: string, expiresAt: string) {
    await updateComplianceItemExpiry(companyId, itemId, expiresAt);
    router.refresh();
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="mb-4 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-muted">
                <th className="px-3 py-2 font-medium">Tipo</th>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Validade</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const expiresAt = item.expiresAt ? new Date(item.expiresAt) : null;
                const alertAt = expiresAt
                  ? new Date(Date.now() + ALERT_WINDOW_DAYS * 24 * 60 * 60 * 1000)
                  : null;
                const expired = !!expiresAt && expiresAt < new Date();
                const expiringSoon = !!expiresAt && !expired && !!alertAt && expiresAt < alertAt;
                return (
                  <tr key={item.id} className="border-b border-border last:border-0 bg-surface">
                    <td className="px-3 py-2 text-muted">{TYPE_LABELS[item.type] ?? item.type}</td>
                    <td className="px-3 py-2 text-ink">{item.name}</td>
                    <td className="px-3 py-2 text-muted">
                      {item.documentId ? (
                        <Link href={`/documentos/${item.documentId}`} className="text-accent hover:underline">
                          ver documento
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        key={`${item.id}-${item.expiresAt ?? ""}`}
                        type="date"
                        defaultValue={item.expiresAt ? item.expiresAt.slice(0, 10) : ""}
                        onChange={(e) => onRenew(item.id, e.target.value)}
                        className={`h-8 rounded-md border border-border-strong bg-surface px-2 text-xs ${
                          expired ? "font-medium text-red-600" : expiringSoon ? "font-medium text-amber-600" : "text-muted"
                        }`}
                      />
                      {expired && <span className="ml-1 text-xs text-red-600">vencido</span>}
                      {expiringSoon && <span className="ml-1 text-xs text-amber-600">vence em breve</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => onRemove(item.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Remover
                      </button>
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
          + Registrar Item de Compliance
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(submit)} method="post" className="space-y-3 rounded-lg border border-border p-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="ci-type">Tipo</Label>
              <Select id="ci-type" {...register("type")}>
                {COMPLIANCE_ITEM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci-name">Nome</Label>
              <Input id="ci-name" placeholder="ex: CND Federal, Alvará de Funcionamento" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci-issued">Emitido em (opcional)</Label>
              <Input id="ci-issued" type="date" {...register("issuedAt")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci-expires">Válido até (opcional)</Label>
              <Input id="ci-expires" type="date" {...register("expiresAt")} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ci-document">Documento anexado (opcional)</Label>
              <Select id="ci-document" {...register("documentId")}>
                <option value="">Nenhum</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="ci-notes">Observações</Label>
              <Input id="ci-notes" {...register("notes")} />
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
