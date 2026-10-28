import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Check, ChevronLeft, Minus, X } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { RoleSelect } from "@/modules/team/member-controls";
import { changeStaffRole } from "@/modules/team/actions";
import { PERMISSION_GROUPS, ROLE_DESCRIPTIONS, ROLE_LABELS, STAFF_ROLES, type StaffRole } from "@/modules/team/permissions";

export default async function MembroPermissoesPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/dashboard");
  const isAdmin = user.role === "ADMIN";

  const member = await prisma.user.findFirst({
    where: { id: params.id, tenantId: user.tenantId, clientId: null },
    include: { role: { select: { name: true } } },
  });
  if (!member) notFound();

  const role = member.role.name as StaffRole;
  const assignedCount = await prisma.processAssignee.count({
    where: { userId: member.id, process: { tenantId: user.tenantId, archivedAt: null } },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-8">
      <Link href="/equipe" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" />
        Voltar para Equipe
      </Link>

      <div className="rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-ink">{member.name}</h1>
            <p className="text-sm text-muted">{member.email.endsWith(".invalid") ? "Migrado do FreelaPRO (só histórico)" : member.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={member.active ? "success" : "neutral"}>{member.active ? "Ativo" : "Desativado"}</Badge>
              <span className="text-xs text-muted-soft">{assignedCount} tarefa(s) em andamento como responsável</span>
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-muted">Papel</p>
            {isAdmin && member.id !== user.id && member.active ? (
              <RoleSelect userId={member.id} current={role} changeRole={changeStaffRole} />
            ) : (
              <Badge variant="info">{ROLE_LABELS[role] ?? role}</Badge>
            )}
          </div>
        </div>
        <p className="mt-4 rounded-lg bg-surface-alt px-3 py-2 text-sm text-muted">{ROLE_DESCRIPTIONS[role]}</p>
      </div>

      <div className="rounded-2xl border border-border/70 bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Permissões de {ROLE_LABELS[role]}</h2>
          <p className="mt-1 text-xs text-muted">
            No Terceirizei OS o acesso é definido pelo <b>papel</b>: quem tem o mesmo papel tem as mesmas permissões. As colunas
            ao lado mostram, para comparar, o que os outros papéis podem.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-surface-alt text-xs text-muted">
                <th className="px-5 py-2 text-left font-medium">Permissão</th>
                {STAFF_ROLES.map((r) => (
                  <th key={r} className={`px-3 py-2 text-center font-medium ${r === role ? "bg-accent-soft text-accent" : ""}`}>
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            {PERMISSION_GROUPS.map((group) => (
              <tbody key={group.title}>
                <tr>
                  <td colSpan={5} className="border-t border-border px-5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    {group.title}
                  </td>
                </tr>
                {group.rows.map((row) => (
                  <tr key={row.label} className="border-t border-border/60">
                    <td className="px-5 py-2.5">
                      <p className="text-ink">{row.label}</p>
                      {row.hint && <p className="text-xs text-muted-soft">{row.hint}</p>}
                    </td>
                    {STAFF_ROLES.map((r) => {
                      const level = row.roles[r];
                      return (
                        <td key={r} className={`px-3 py-2.5 text-center ${r === role ? "bg-accent-soft/40" : ""}`}>
                          {level === true && <Check className="mx-auto h-4 w-4 text-emerald-600" aria-label="Permitido" />}
                          {level === "limitado" && <Minus className="mx-auto h-4 w-4 text-amber-500" aria-label="Limitado" />}
                          {level === false && <X className="mx-auto h-4 w-4 text-muted-soft" aria-label="Sem acesso" />}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>

        <p className="border-t border-border px-5 py-3 text-xs text-muted-soft">
          ✓ permitido · <span className="text-amber-600">—</span> limitado (só o que é dele) · ✕ sem acesso
        </p>
      </div>
    </div>
  );
}
