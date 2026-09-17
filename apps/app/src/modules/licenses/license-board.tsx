"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  LICENSE_TYPES,
  LICENSE_TYPE_LABELS,
  LICENSE_STATUSES,
  LICENSE_STATUS_LABELS,
  LICENSE_STATUS_BADGE_VARIANT,
  getLicenseStatus,
  type LicenseType,
  type LicenseStatus,
} from "@/modules/licenses/labels";
import type { LicenseDocumentInput } from "@/lib/validations/license";

type Client = { id: string; name: string };
type Company = { id: string; clientId: string; razaoSocial: string };
type StaffUser = { id: string; name: string };
type LicenseRow = {
  id: string;
  clientId: string;
  clientName: string;
  companyName: string | null;
  type: LicenseType;
  name: string;
  issuingBody: string | null;
  documentNumber: string | null;
  expiresAt: string;
  reminderDaysBefore: number;
  responsibleName: string | null;
  autoTaskId: string | null;
  autoTaskNumber: number | null;
};

const STATUS_FILTERS = ["TODOS", ...LICENSE_STATUSES] as const;

export function LicenseBoard({
  clients,
  companies,
  staff,
  licenses,
  canManage,
  createLicense,
  deleteLicense,
}: {
  clients: Client[];
  companies: Company[];
  staff: StaffUser[];
  licenses: LicenseRow[];
  canManage: boolean;
  createLicense: (input: LicenseDocumentInput) => Promise<void>;
  deleteLicense: (licenseId: string) => Promise<void>;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("TODOS");

  const clientCompanies = useMemo(() => companies.filter((c) => c.clientId === selectedClientId), [companies, selectedClientId]);

  const filteredLicenses = useMemo(() => {
    if (statusFilter === "TODOS") return licenses;
    return licenses.filter((l) => getLicenseStatus(new Date(l.expiresAt), l.reminderDaysBefore) === statusFilter);
  }, [licenses, statusFilter]);

  const counts = useMemo(() => {
    const result: Record<LicenseStatus, number> = { OK: 0, VENCE_EM_BREVE: 0, VENCIDO: 0 };
    for (const l of licenses) result[getLicenseStatus(new Date(l.expiresAt), l.reminderDaysBefore)]++;
    return result;
  }, [licenses]);

  async function handleCreate(formData: FormData) {
    setSubmitting(true);
    setError(null);
    try {
      await createLicense({
        clientId: (formData.get("clientId") as string) ?? "",
        companyId: (formData.get("companyId") as string) ?? "",
        type: formData.get("type") as LicenseType,
        name: (formData.get("name") as string) ?? "",
        issuingBody: (formData.get("issuingBody") as string) ?? "",
        documentNumber: (formData.get("documentNumber") as string) ?? "",
        issuedAt: (formData.get("issuedAt") as string) ?? "",
        expiresAt: (formData.get("expiresAt") as string) ?? "",
        reminderDaysBefore: Number(formData.get("reminderDaysBefore") ?? 30),
        responsibleId: (formData.get("responsibleId") as string) ?? "",
        notes: (formData.get("notes") as string) ?? "",
      });
      setShowForm(false);
      setSelectedClientId("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(licenseId: string) {
    setBusyId(licenseId);
    try {
      await deleteLicense(licenseId);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatusFilter(status)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              statusFilter === status ? "bg-accent text-white" : "bg-surface-alt text-muted hover:text-ink"
            }`}
          >
            {status === "TODOS" ? `Todos (${licenses.length})` : `${LICENSE_STATUS_LABELS[status]} (${counts[status]})`}
          </button>
        ))}
      </div>

      {canManage && (
        <div className="mb-4">
          {!showForm ? (
            <Button type="button" onClick={() => setShowForm(true)}>
              + Novo Documento
            </Button>
          ) : (
            <form action={handleCreate} className="rounded-2xl border border-border/70 bg-surface shadow-sm p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clientId">Cliente</Label>
                  <Select id="clientId" name="clientId" required onChange={(e) => setSelectedClientId(e.target.value)}>
                    <option value="">Selecione...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="companyId">Empresa (opcional)</Label>
                  <Select id="companyId" name="companyId" disabled={clientCompanies.length === 0}>
                    <option value="">Nenhuma / não se aplica</option>
                    {clientCompanies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.razaoSocial}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="type">Tipo</Label>
                  <Select id="type" name="type" defaultValue="ALVARA">
                    {LICENSE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {LICENSE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome do documento</Label>
                  <Input id="name" name="name" placeholder="Ex.: Alvará de Funcionamento" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issuingBody">Órgão emissor</Label>
                  <Input id="issuingBody" name="issuingBody" placeholder="Ex.: Prefeitura Municipal" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="documentNumber">Número</Label>
                  <Input id="documentNumber" name="documentNumber" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="issuedAt">Data de emissão</Label>
                  <Input id="issuedAt" name="issuedAt" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expiresAt">Data de vencimento</Label>
                  <Input id="expiresAt" name="expiresAt" type="date" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="reminderDaysBefore">Avisar com quantos dias de antecedência</Label>
                  <Input id="reminderDaysBefore" name="reminderDaysBefore" type="number" min={1} max={365} defaultValue={30} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="responsibleId">Responsável</Label>
                  <Select id="responsibleId" name="responsibleId">
                    <option value="">Sem responsável</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="mt-4 space-y-1.5">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" name="notes" rows={2} />
              </div>
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              <div className="mt-4 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Salvando..." : "Salvar"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Vencimento</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Tarefa</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filteredLicenses.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum documento encontrado.
                </td>
              </tr>
            )}
            {filteredLicenses.map((l) => {
              const status = getLicenseStatus(new Date(l.expiresAt), l.reminderDaysBefore);
              return (
                <tr key={l.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                  <td className="px-4 py-3 text-ink">
                    <Link href={`/clientes/${l.clientId}`} className="hover:underline">
                      {l.clientName}
                    </Link>
                    {l.companyName && <p className="text-xs text-muted-soft">{l.companyName}</p>}
                  </td>
                  <td className="px-4 py-3 text-ink">
                    {l.name}
                    {l.documentNumber && <p className="text-xs text-muted-soft">nº {l.documentNumber}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted">{LICENSE_TYPE_LABELS[l.type]}</td>
                  <td className="px-4 py-3 text-muted">{new Date(l.expiresAt).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                  <td className="px-4 py-3 text-muted">{l.responsibleName ?? "Sem responsável"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={LICENSE_STATUS_BADGE_VARIANT[status]}>{LICENSE_STATUS_LABELS[status]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {l.autoTaskId ? (
                      <Link href={`/processos/${l.autoTaskId}`} className="text-xs text-accent hover:underline">
                        #{l.autoTaskNumber}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-soft">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage && (
                      <button
                        type="button"
                        disabled={busyId === l.id}
                        onClick={() => handleDelete(l.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
