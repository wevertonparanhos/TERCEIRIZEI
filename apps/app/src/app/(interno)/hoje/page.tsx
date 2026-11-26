import Link from "next/link";
import { waitUntil } from "@vercel/functions";
import { AtSign, BellRing, CalendarClock, ChevronRight, Inbox, Wallet, AlertTriangle, type LucideIcon } from "lucide-react";
import { getCurrentUser } from "@/lib/rbac";
import { loadReminderOverview } from "@/modules/reminders/data";
import { completeReminder, snoozeReminder, snoozeStageAlert } from "@/modules/reminders/actions";
import { RemindersList } from "@/modules/reminders/reminders-list";
import { loadToday } from "@/modules/today/data";
import { firstName, greetingFor, longDate, relativeDay, shortDate } from "@/modules/today/logic";
import { ensureAutoRenewalTasks } from "@/modules/licenses/actions";
import { sendDeadlineReminders } from "@/modules/notifications/actions";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const moneyShort = (v: number) => money.format(v).replace(/,00$/, "");

type Tone = "warning" | "danger" | "accent" | "neutral";
const TONE_TEXT: Record<Tone, string> = {
  warning: "text-amber-700 dark:text-amber-400",
  danger: "text-red-600 dark:text-red-400",
  accent: "text-accent",
  neutral: "text-ink",
};

function SummaryCard({ href, label, value, hint, icon: Icon, tone }: { href: string; label: string; value: string | number; hint: string; icon: LucideIcon; tone: Tone }) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1.5 rounded-2xl border border-border/70 bg-surface p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
    >
      <span className="flex items-center justify-between text-[13px] text-muted">
        {label}
        <Icon className="h-4 w-4 text-muted-soft group-hover:text-ink" />
      </span>
      <span className={`font-display text-[28px] font-extrabold leading-none ${TONE_TEXT[tone]}`}>{value}</span>
      <span className="text-xs text-muted">{hint}</span>
    </Link>
  );
}

function SideCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
      <h2 className="text-[15px] font-bold text-ink">{title}</h2>
      {children}
      {action}
    </section>
  );
}

function MoreLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-[13px] font-semibold text-accent hover:underline">
      {children} <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default async function HojePage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();

  // Rotinas automáticas (renovações e avisos de prazo) rodam em segundo plano, depois da resposta,
  // como no Dashboard — a tela Hoje agora é a primeira que abre ao entrar.
  waitUntil(
    Promise.all([ensureAutoRenewalTasks(user.tenantId), sendDeadlineReminders(user.tenantId)]).catch((err) =>
      console.error("[hoje] rotinas automáticas falharam:", err)
    )
  );

  const [overview, data] = await Promise.all([loadReminderOverview(user), loadToday(user, now)]);
  const usesReminders = ["ADMIN", "GESTOR", "OPERACIONAL"].includes(user.role);
  const dueReminders = overview.reminders.filter((r) => r.timing !== "futuro");
  const upcomingReminders = overview.reminders.length - dueReminders.length;

  const summaryParts: string[] = [];
  if (usesReminders) summaryParts.push(overview.attentionCount === 1 ? "1 coisa para verificar" : `${overview.attentionCount} coisas para verificar`);
  if (data.receivables) summaryParts.push(`${moneyShort(data.receivables.total)} para receber nos próximos 7 dias`);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 p-4 sm:p-8">
      <header className="space-y-1">
        <p className="text-[13px] text-muted first-letter:uppercase">{longDate(data.today)}</p>
        <h1 className="font-display text-[28px] font-extrabold tracking-tight text-ink sm:text-[30px]">
          {greetingFor(now)}, {firstName(user.name)}
        </h1>
        {summaryParts.length > 0 && <p className="text-[15px] text-muted">Você tem {summaryParts.join(" e ")}.</p>}
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {usesReminders ? (
          <SummaryCard
            href="/lembretes"
            label="Verificar hoje"
            value={overview.attentionCount}
            hint={`${dueReminders.length} lembrete${dueReminders.length === 1 ? "" : "s"} · ${overview.stageAlerts.length} parada${overview.stageAlerts.length === 1 ? "" : "s"}`}
            icon={BellRing}
            tone={overview.attentionCount > 0 ? "warning" : "neutral"}
          />
        ) : (
          <SummaryCard href="/processos" label="Tarefas ativas" value={data.activeCount} hint="em andamento" icon={CalendarClock} tone="neutral" />
        )}
        <SummaryCard
          href="/processos"
          label={user.role === "OPERACIONAL" ? "Minhas atrasadas" : "Tarefas atrasadas"}
          value={data.overdueCount}
          hint={`das ${data.activeCount} ativas`}
          icon={AlertTriangle}
          tone={data.overdueCount > 0 ? "danger" : "neutral"}
        />
        {data.receivables ? (
          <SummaryCard
            href="/financeiro"
            label="A receber em 7 dias"
            value={moneyShort(data.receivables.total)}
            hint={`${data.receivables.count} pagamento${data.receivables.count === 1 ? "" : "s"}`}
            icon={Wallet}
            tone="accent"
          />
        ) : (
          <SummaryCard
            href="/calendario"
            label="Entregas em 3 dias"
            value={data.deliveries.length}
            hint="hoje, amanhã e depois"
            icon={CalendarClock}
            tone="accent"
          />
        )}
        {data.portal ? (
          <SummaryCard href="/pedidos" label="Pedidos do portal" value={data.portal.count} hint="esperando revisão" icon={Inbox} tone={data.portal.count > 0 ? "warning" : "neutral"} />
        ) : (
          <SummaryCard href="/atividades" label="Menções para você" value={data.mentions.count} hint="não lidas" icon={AtSign} tone={data.mentions.count > 0 ? "warning" : "neutral"} />
        )}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="space-y-6 rounded-2xl border border-border/70 bg-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-ink">Para fazer agora</h2>
            {usesReminders && (
              <MoreLink href="/lembretes">{upcomingReminders > 0 ? `Lembretes (${upcomingReminders} agendados)` : "Todos os lembretes"}</MoreLink>
            )}
          </div>

          {usesReminders && (
            <RemindersList
              reminders={dueReminders.map((r) => ({
                id: r.id,
                processId: r.processId,
                processNumber: r.processNumber,
                processTitle: r.processTitle,
                clientName: r.clientName,
                remindOn: r.remindOn.toISOString().slice(0, 10),
                note: r.note,
                createdByName: r.createdByName,
                assigneeNames: r.assigneeNames,
                timing: r.timing,
              }))}
              alerts={overview.stageAlerts}
              complete={completeReminder}
              snooze={snoozeReminder}
              snoozeAlert={snoozeStageAlert}
            />
          )}

          <div>
            <h2 className="mb-3 text-base font-semibold text-ink">
              Entregas próximas <span className="font-normal text-muted-soft">({data.deliveries.length})</span>
            </h2>
            {data.deliveries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-soft">Nenhuma entrega prevista para hoje, amanhã ou depois.</p>
            ) : (
              <ul className="space-y-2">
                {data.deliveries.map((d) => {
                  const when = relativeDay(d.dueAt, data.today);
                  return (
                    <li key={d.id}>
                      <Link
                        href={`/processos/${d.id}`}
                        className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-alt/50"
                      >
                        <span
                          className={`flex-none rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            when === "hoje" ? "bg-accent-soft text-accent" : "bg-surface-alt text-muted"
                          }`}
                        >
                          {when === "hoje" ? "Hoje" : `${when} · ${shortDate(d.dueAt)}`}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-ink">
                            #{d.number} — {d.title}
                          </span>
                          <span className="block truncate text-xs text-muted">
                            {d.clientName} · em <b>{d.stageLabel}</b>
                            {d.assigneeNames.length > 0 && ` · ${d.assigneeNames.join(", ")}`}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 flex-none text-muted-soft" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          {data.receivables && (
            <SideCard title="Recebimentos dos próximos 7 dias" action={<MoreLink href="/financeiro">Ver no Financeiro</MoreLink>}>
              {data.receivables.items.length === 0 ? (
                <p className="text-sm text-muted-soft">Nenhum pagamento previsto.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.receivables.items.map((r) => (
                    <li key={r.id}>
                      <Link href={`/processos/${r.processId}?tab=financeiro`} className="flex items-start justify-between gap-3 text-[13px] hover:underline">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{r.clientName}</span>
                          <span className="block truncate text-xs text-muted">
                            #{r.processNumber} · {r.label} · {relativeDay(r.dueDate, data.today)}
                          </span>
                        </span>
                        <b className="flex-none tabular-nums text-ink">{money.format(r.value)}</b>
                      </Link>
                    </li>
                  ))}
                  {data.receivables.count > data.receivables.items.length && (
                    <li className="text-xs text-muted">+ {data.receivables.count - data.receivables.items.length} outros</li>
                  )}
                </ul>
              )}
            </SideCard>
          )}

          {data.portal && (
            <SideCard title="Pedidos do portal" action={data.portal.count > 0 ? <MoreLink href="/pedidos">Revisar pedidos</MoreLink> : undefined}>
              {data.portal.items.length === 0 ? (
                <p className="text-sm text-muted-soft">Nenhum pedido esperando revisão.</p>
              ) : (
                <ul className="space-y-2.5">
                  {data.portal.items.map((r) => (
                    <li key={r.id} className="text-[13px]">
                      <span className="block font-semibold text-ink">{r.clientName}</span>
                      <span className="block text-xs text-muted">
                        {r.serviceName} · {relativeDay(r.createdAt, data.today)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SideCard>
          )}

          <section className="space-y-3 rounded-2xl bg-brand-navy p-5 text-white shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-white/70">Menções para você</h2>
            {data.mentions.items.length === 0 ? (
              <p className="text-sm text-white/85">Nenhuma menção nova.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.mentions.items.map((m) => (
                  <li key={m.id}>
                    <Link href={`/processos/${m.processId}?tab=atividade`} className="block text-sm text-white hover:underline">
                      <b>{m.authorName}</b> mencionou você em #{m.processNumber} {m.processTitle}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data.mentions.count > data.mentions.items.length && (
              <Link href="/atividades" className="text-[13px] text-white underline">
                Ver todas ({data.mentions.count})
              </Link>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
