import { ActionForm } from "@/components/action-form";
import { Input, Select } from "@/components/ui/form";
import { Badge, Card, PageHeader } from "@/components/ui/surface";
import { can, ROLE_LABEL, ROLES } from "@/domain/permissions";
import { formatDateTime } from "@/lib/utils";
import { requirePagePermission } from "@/server/auth";
import { db } from "@/server/db";
import { updateUserAction } from "../actions";

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const actor = await requirePagePermission("support:users:read", "/admin/usuarios");
  const { q = "" } = await searchParams;
  const term = q.trim().slice(0, 80);
  const canManage = can(actor.role, "admin:users:manage");

  const users = await db.user.findMany({
    where: term ? { OR: [{ email: { contains: term, mode: "insensitive" } }, { name: { contains: term, mode: "insensitive" } }] } : {},
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, name: true, email: true, role: true, status: true, isDemo: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="Usuários" description={canManage ? "Gerencie papéis e acesso. Alterações ficam na auditoria." : "Consulta de usuários (somente leitura)."} />
      <form className="mb-5 flex gap-2" role="search">
        <Input name="q" defaultValue={term} placeholder="Buscar por nome ou e-mail" aria-label="Buscar usuários" />
        <button type="submit" className="rounded-full bg-ink px-5 text-sm font-semibold text-white">Buscar</button>
      </form>

      <Card className="divide-y divide-line">
        {users.length === 0 ? <p className="p-5 text-sm text-muted">Nenhum usuário encontrado.</p> : null}
        {users.map((u) => (
          <div key={u.id} className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {u.name} {u.isDemo ? <Badge tone="highlight">Demonstração</Badge> : null}
              </p>
              <p className="truncate text-sm text-muted">{u.email} · desde {formatDateTime(u.createdAt)}</p>
            </div>
            {canManage && u.id !== actor.id ? (
              <ActionForm action={updateUserAction} submitLabel="Salvar" variant="secondary" confirm="Confirmar alteração de papel/status deste usuário?" className="flex flex-wrap items-center gap-2 space-y-0">
                <input type="hidden" name="userId" value={u.id} />
                <Select name="role" defaultValue={u.role} aria-label="Papel" className="h-9 w-40">
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                </Select>
                <Select name="status" defaultValue={u.status} aria-label="Status" className="h-9 w-36">
                  <option value="ACTIVE">Ativo</option>
                  <option value="SUSPENDED">Suspenso</option>
                </Select>
              </ActionForm>
            ) : (
              <div className="flex gap-2">
                <Badge>{ROLE_LABEL[u.role]}</Badge>
                <Badge tone={u.status === "ACTIVE" ? "success" : "danger"}>{u.status === "ACTIVE" ? "Ativo" : "Suspenso"}</Badge>
              </div>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
