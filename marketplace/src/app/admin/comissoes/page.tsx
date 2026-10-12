import { ActionForm } from "@/components/action-form";
import { Input, Select } from "@/components/ui/form";
import { Card, Notice, PageHeader } from "@/components/ui/surface";
import { formatBps } from "@/domain/money";
import { formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { getSettings } from "@/server/settings";
import { removeCategoryCommissionAction, setCommissionAction } from "../actions";

export default async function AdminCommissionsPage() {
  await requirePagePermission("admin:commission:manage", "/admin/comissoes");

  const [rules, categories, history, settings] = await Promise.all([
    db.commissionRule.findMany({ where: { active: true }, include: { category: true } }),
    db.serviceCategory.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.commissionRule.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { category: true } }),
    getSettings(),
  ]);
  const global = rules.find((r) => r.scope === "GLOBAL");
  const byCategory = rules.filter((r) => r.scope === "CATEGORY");

  return (
    <>
      <PageHeader title="Comissões" description="Taxa da plataforma sobre o preço dos profissionais." />
      <div className="mb-6">
        <Notice>
          {settings.commissionMode === "ON_TOP"
            ? "Modo atual: a comissão é ACRESCIDA ao preço do profissional (ex.: R$ 200 + 20% = cliente paga R$ 240; profissional recebe R$ 200)."
            : "Modo atual: a comissão é DESCONTADA do preço do profissional."}{" "}
          Mudanças valem só para novos pedidos; pedidos existentes mantêm a taxa gravada.
        </Notice>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold">Comissão global</h2>
          <p className="mt-1 text-3xl font-bold">{global ? formatBps(global.rateBps) : "—"}</p>
          <ActionForm action={setCommissionAction} submitLabel="Alterar comissão global" confirm="Alterar a comissão global para novos pedidos?" className="mt-4">
            <input type="hidden" name="scope" value="GLOBAL" />
            <label className="text-sm">Novo percentual (%)<Input name="rate" inputMode="decimal" placeholder="20" required className="mt-1" /></label>
          </ActionForm>
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold">Comissão por categoria</h2>
          <p className="mt-1 text-sm text-muted">Sobrepõe a global para a categoria escolhida.</p>
          <ActionForm action={setCommissionAction} submitLabel="Definir" className="mt-4">
            <input type="hidden" name="scope" value="CATEGORY" />
            <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
              <Select name="categoryId" aria-label="Categoria" required defaultValue="">
                <option value="" disabled>Escolha a categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
              <Input name="rate" inputMode="decimal" placeholder="%" aria-label="Percentual" required />
            </div>
          </ActionForm>
          {byCategory.length > 0 ? (
            <ul className="mt-5 divide-y divide-line text-sm">
              {byCategory.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span>{r.category?.name} · <span className="font-semibold">{formatBps(r.rateBps)}</span></span>
                  <ActionForm action={removeCategoryCommissionAction} submitLabel="Remover" variant="ghost" confirm="Voltar a usar a comissão global nesta categoria?" className="space-y-0">
                    <input type="hidden" name="ruleId" value={r.id} />
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </div>

      <h2 className="mb-3 mt-10 text-lg font-semibold">Histórico</h2>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[32rem] text-sm">
          <thead className="text-left text-muted">
            <tr className="border-b border-line">
              <th className="p-3 font-medium">Escopo</th>
              <th className="p-3 font-medium">Taxa</th>
              <th className="p-3 font-medium">Vigência</th>
              <th className="p-3 font-medium">Situação</th>
            </tr>
          </thead>
          <tbody>
            {history.map((r) => (
              <tr key={r.id} className="border-b border-line last:border-0">
                <td className="p-3">{r.scope === "GLOBAL" ? "Global" : r.category?.name ?? r.scope}</td>
                <td className="p-3 font-semibold">{formatBps(r.rateBps)}</td>
                <td className="p-3 text-muted">{formatDateTime(r.validFrom)}{r.validTo ? ` → ${formatDateTime(r.validTo)}` : ""}</td>
                <td className="p-3">{r.active ? "Vigente" : "Encerrada"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
