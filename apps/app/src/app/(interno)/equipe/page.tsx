import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { InviteStaffForm } from "@/modules/team/invite-form";
import { RoleSelect, RemoveMemberButton, ReactivateButton, ActivateMigratedButton } from "@/modules/team/member-controls";
import {
  inviteStaffMember,
  changeStaffRole,
  removeStaffMember,
  reactivateStaffMember,
  activateMigratedMember,
} from "@/modules/team/actions";
import { ROLE_LABELS } from "@/modules/team/permissions";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const PRIORITY_DOT: Record<string, string> = {
  URGENTE: "bg-red-500",
  ALTA: "bg-orange-500",
  MEDIA: "bg-amber-400",
  BAIXA: "bg-slate-400",
};

/** Segunda-feira (UTC) da semana que contém a data. */
function mondayOf(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const offset = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - offset * DAY_MS);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function lastSeenLabel(date: Date | null): string | null {
  if (!date) return null;
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 2) return "Online agora";
  if (minutes < 60) return `Visto há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Visto há ${hours} h`;
  const days = Math.round(hours / 24);
  return `Visto há ${days} ${days === 1 ? "dia" : "dias"}`;
}

export default async function EquipePage({ searchParams }: { searchParams: { semana?: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/dashboard");
  const isAdmin = user.role === "ADMIN";

  const reference = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.semana ?? "") ? new Date(`${searchParams.semana}T00:00:00Z`) : new Date();
  const weekStart = mondayOf(reference);
  const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS));
  const todayKey = isoDay(new Date());

  const [staff, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId: user.tenantId, clientId: null },
      include: { role: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.process.findMany({
      where: {
        tenantId: user.tenantId,
        archivedAt: null,
        dueAt: { gte: weekStart, lt: weekEnd },
        stage: { label: { notIn: ["Concluído", "Cancelado"] } },
      },
      select: { id: true, number: true, description: true, priority: true, dueAt: true, assignees: { select: { userId: true } } },
      orderBy: { dueAt: "asc" },
    }),
  ]);

  const lastSignIns = staff.length
    ? await prisma.$queryRaw<{ id: string; last_sign_in_at: Date | null }[]>`
        select id, last_sign_in_at from auth.users where id = any(${staff.map((s) => s.id)}::uuid[])`
    : [];
  const lastSeenById = new Map(lastSignIns.map((r) => [r.id, r.last_sign_in_at]));

  const activeStaff = staff.filter((m) => m.active);
  const isMigrated = (m: { email: string }) => m.email.endsWith(".invalid");
  const mainMembers = [...activeStaff, ...staff.filter((m) => !m.active && !isMigrated(m))];
  const migratedMembers = staff.filter((m) => !m.active && isMigrated(m));

  // carga de trabalho: membro × dia
  type Cell = { id: string; number: number; title: string; priority: string }[];
  const grid = new Map<string, Map<string, Cell>>();
  const unassigned = new Map<string, Cell>();
  const totals = new Map<string, number>();
  const push = (target: Map<string, Cell>, key: string, t: Cell[number]) => target.set(key, [...(target.get(key) ?? []), t]);
  for (const t of tasks) {
    if (!t.dueAt) continue;
    const dayKey = isoDay(t.dueAt);
    const item = { id: t.id, number: t.number, title: t.description, priority: t.priority };
    totals.set(dayKey, (totals.get(dayKey) ?? 0) + 1);
    if (t.assignees.length === 0) push(unassigned, dayKey, item);
    for (const a of t.assignees) {
      if (!grid.has(a.userId)) grid.set(a.userId, new Map());
      push(grid.get(a.userId)!, dayKey, item);
    }
  }
  const weekTaskCount = (userId: string) => {
    let n = 0;
    grid.get(userId)?.forEach((cell) => (n += cell.length));
    return n;
  };

  const prevWeek = isoDay(new Date(weekStart.getTime() - 7 * DAY_MS));
  const nextWeek = isoDay(new Date(weekStart.getTime() + 7 * DAY_MS));
  const rangeLabel = `${weekStart.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })} – ${new Date(weekEnd.getTime() - DAY_MS).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" })}`;

  const renderCell = (cell: Cell | undefined) => (
    <div className="space-y-1">
      {(cell ?? []).slice(0, 3).map((t) => (
        <Link
          key={t.id}
          href={`/processos/${t.id}`}
          title={`#${t.number} · ${t.title}`}
          className="flex items-center gap-1.5 rounded-md border border-border/70 bg-surface px-1.5 py-1 text-[11px] text-ink hover:bg-surface-alt"
        >
          <span className={`h-2 w-2 flex-none rounded-full ${PRIORITY_DOT[t.priority] ?? "bg-slate-400"}`} />
          <span className="truncate">{t.title}</span>
        </Link>
      ))}
      {(cell?.length ?? 0) > 3 && <p className="px-1 text-[11px] text-muted-soft">+{(cell?.length ?? 0) - 3} tarefa(s)</p>}
    </div>
  );

  const renderMemberRow = (member: (typeof staff)[number]) => {
      const migrated = member.email.endsWith(".invalid");
      const seen = lastSeenLabel(lastSeenById.get(member.id) ?? null);
      const isSelf = member.id === user.id;
      return (
        <tr key={member.id} className={`border-b border-border last:border-0 hover:bg-surface-alt ${member.active ? "" : "opacity-70"}`}>
          <td className="px-4 py-3 font-medium text-ink">{member.name}</td>
          <td className="px-4 py-3 text-muted">
            {migrated ? <span className="text-muted-soft">Migrado do FreelaPRO (só histórico)</span> : member.email}
          </td>
          <td className="px-4 py-3">
            {isAdmin && !isSelf ? (
              <RoleSelect userId={member.id} current={member.role.name} changeRole={changeStaffRole} />
            ) : (
              <Badge variant="info">{ROLE_LABELS[member.role.name] ?? member.role.name}</Badge>
            )}
          </td>
          <td className="px-4 py-3">
            <Badge variant={member.active ? "success" : "neutral"}>{member.active ? "Ativo" : "Desativado"}</Badge>
            {member.active && seen && <p className="mt-1 text-[11px] text-muted-soft">{seen}</p>}
          </td>
          <td className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <Link href={`/equipe/${member.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
                <ShieldCheck className="h-3.5 w-3.5" />
                Permissões
              </Link>
              {isAdmin && !isSelf && !member.active && !migrated && (
              <ReactivateButton userId={member.id} reactivate={reactivateStaffMember} />
            )}
            {isAdmin && !isSelf && !member.active && migrated && (
              <ActivateMigratedButton userId={member.id} name={member.name} activate={activateMigratedMember} />
            )}
              {isAdmin && !isSelf && (
                <RemoveMemberButton userId={member.id} name={member.name} remove={removeStaffMember} />
              )}
            </div>
          </td>
        </tr>
      );
  };

  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold text-ink">Equipe</h1>
        <p className="mt-1 text-sm text-muted">Acompanhe a carga de trabalho do time e gerencie acessos em um único lugar.</p>
      </div>

      {/* Carga de trabalho */}
      <section className="rounded-2xl border border-border/70 bg-surface shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">Carga de trabalho</h2>
            <p className="text-xs text-muted">Tarefas abertas pela data de conclusão prevista, por responsável.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <Link href={`/equipe?semana=${prevWeek}`} aria-label="Semana anterior" className="rounded-lg border border-border-strong p-1.5 text-muted hover:text-ink">
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="min-w-[9rem] text-center text-sm font-medium text-ink">{rangeLabel}</span>
            <Link href={`/equipe?semana=${nextWeek}`} aria-label="Próxima semana" className="rounded-lg border border-border-strong p-1.5 text-muted hover:text-ink">
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/equipe" className="ml-1 rounded-lg border border-border-strong px-3 py-1.5 text-sm text-ink hover:bg-surface-alt">
              Hoje
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] table-fixed border-collapse text-sm">
            <thead>
              <tr className="bg-surface-alt text-xs text-muted">
                <th className="w-48 border-b border-border px-4 py-2 text-left font-medium">Membro</th>
                {days.map((d) => {
                  const key = isoDay(d);
                  return (
                    <th key={key} className={`border-b border-l border-border px-2 py-2 font-medium ${key === todayKey ? "bg-accent-soft text-accent" : ""}`}>
                      {WEEKDAYS[d.getUTCDay()]} <span className="font-bold text-ink">{d.getUTCDate()}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {activeStaff.map((m) => (
                <tr key={m.id} className="align-top">
                  <td className="border-b border-border px-4 py-3">
                    <p className="truncate font-medium text-ink">{m.name}</p>
                    <p className="text-xs text-muted-soft">{weekTaskCount(m.id)} tarefa(s) na semana</p>
                  </td>
                  {days.map((d) => {
                    const key = isoDay(d);
                    return (
                      <td key={key} className={`border-b border-l border-border p-1.5 ${key === todayKey ? "bg-accent-soft/40" : ""}`}>
                        {renderCell(grid.get(m.id)?.get(key))}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {unassigned.size > 0 && (
                <tr className="align-top">
                  <td className="border-b border-border px-4 py-3">
                    <p className="font-medium text-muted">Sem responsável</p>
                  </td>
                  {days.map((d) => (
                    <td key={isoDay(d)} className="border-b border-l border-border p-1.5">
                      {renderCell(unassigned.get(isoDay(d)))}
                    </td>
                  ))}
                </tr>
              )}
              <tr className="bg-surface-alt text-xs">
                <td className="px-4 py-2 text-muted">Total do dia</td>
                {days.map((d) => (
                  <td key={isoDay(d)} className="border-l border-border px-2 py-2 text-center font-semibold text-ink">
                    {totals.get(isoDay(d)) ?? "–"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-border px-5 py-3 text-[11px] text-muted">
          <span>Prioridade:</span>
          {[
            ["URGENTE", "Urgente"],
            ["ALTA", "Alta"],
            ["MEDIA", "Média"],
            ["BAIXA", "Baixa"],
          ].map(([k, label]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[k]}`} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Membros */}
      <section className="rounded-2xl border border-border/70 bg-surface shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold text-ink">Membros ({activeStaff.length} ativo(s))</h2>
          <p className="text-xs text-muted">Convide pessoas, defina o papel de cada uma e veja o que cada papel acessa.</p>
        </div>

        {isAdmin && (
          <div className="border-b border-border px-5 py-4">
            <h3 className="mb-3 text-sm font-semibold text-ink">Convidar novo membro</h3>
            <InviteStaffForm invite={inviteStaffMember} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Papel</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {mainMembers.map(renderMemberRow)}
            </tbody>
          </table>
        </div>

        {migratedMembers.length > 0 && (
          <details className="border-t border-border" open>
            <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-ink">
              Migrados do FreelaPRO ({migratedMembers.length}) <span className="font-normal text-muted">— só histórico; ative com um e-mail real ou remova</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>{migratedMembers.map(renderMemberRow)}</tbody>
              </table>
            </div>
          </details>
        )}
      </section>
    </div>
  );
}