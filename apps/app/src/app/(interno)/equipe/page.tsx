import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { InviteStaffForm } from "@/modules/team/invite-form";
import { DeactivateButton } from "@/modules/team/deactivate-button";
import { inviteStaffMember, deactivateStaffMember } from "@/modules/team/actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

export default async function EquipePage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") redirect("/dashboard");

  const staff = await prisma.user.findMany({
    where: { tenantId: user.tenantId, clientId: null },
    include: { role: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Equipe</h1>
      <p className="mt-1 text-sm text-muted">{staff.length} membro(s)</p>

      <div className="mt-6 rounded-lg border border-border bg-surface p-6">
        <h2 className="mb-4 text-base font-semibold text-ink">Convidar novo membro</h2>
        <InviteStaffForm invite={inviteStaffMember} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Papel</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3 font-medium text-ink">{member.name}</td>
                <td className="px-4 py-3 text-muted">{member.email}</td>
                <td className="px-4 py-3">
                  <Badge variant="info">{ROLE_LABELS[member.role.name] ?? member.role.name}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={member.active ? "success" : "neutral"}>
                    {member.active ? "Ativo" : "Desativado"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  {member.active && member.id !== user.id && (
                    <DeactivateButton userId={member.id} deactivate={deactivateStaffMember} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
