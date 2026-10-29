import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { PortalAccessRow } from "@/modules/clients/portal-access-row";
import { inviteClientToPortal, deactivateClientPortalAccess, reactivateClientPortalAccess, sendPortalAccessLink } from "@/modules/clients/actions";
import { PortalSettingsForm } from "@/modules/portal/portal-settings-form";
import { PortalVisibilityList } from "@/modules/portal/portal-visibility-list";
import { PortalQuestionsEditor } from "@/modules/portal/portal-questions-editor";
import { DEFAULT_ACCENT } from "@/modules/portal/settings";

export default async function ClientePortalConfigPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/clientes");

  const client = await prisma.client.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { users: { select: { id: true, email: true, active: true }, take: 1 }, portalSettings: true },
  });
  if (!client) notFound();

  const processes = await prisma.process.findMany({
    where: { clientId: client.id, tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true,
      number: true,
      description: true,
      visibleInPortal: true,
      requestedByClient: true,
      archivedAt: true,
      serviceType: { select: { name: true } },
      stage: { select: { label: true } },
    },
  });

  // Tarefas em andamento primeiro; arquivadas por último.
  const items = [...processes]
    .sort((a, b) => Number(!!a.archivedAt) - Number(!!b.archivedAt))
    .map((p) => ({
      id: p.id,
      number: p.number,
      title: p.description.split("\n")[0].slice(0, 90),
      service: p.serviceType.name,
      stage: p.stage.label,
      visible: p.visibleInPortal,
      requestedByClient: p.requestedByClient,
      archived: !!p.archivedAt,
    }));

  const [questions, otherClients, pendingRequests, awaitingApproval, approved] = await Promise.all([
    prisma.clientPortalQuestion.findMany({ where: { clientId: client.id, tenantId: user.tenantId }, orderBy: { position: "asc" } }),
    prisma.client.findMany({
      where: { tenantId: user.tenantId, id: { not: client.id }, portalQuestions: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.portalRequest.count({ where: { tenantId: user.tenantId, clientId: client.id, status: "PENDENTE" } }),
    prisma.processDeliverable.count({ where: { approvalStatus: "PENDENTE", process: { clientId: client.id, tenantId: user.tenantId, visibleInPortal: true } } }),
    prisma.processDeliverable.count({ where: { approvalStatus: "APROVADO", process: { clientId: client.id, tenantId: user.tenantId } } }),
  ]);

  const visible = items.filter((i) => i.visible).length;
  const portalUser = client.users[0] ?? null;
  const settings = client.portalSettings;

  const card = "rounded-2xl border border-border/70 bg-surface p-5 shadow-sm sm:p-6";

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-8">
      <div>
        <Link href="/clientes/portal" className="text-sm text-accent hover:underline">
          ← Voltar para Portal de Clientes
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">Portal de {client.name}</h1>
        <p className="text-sm text-muted">Acesso, aparência e o que este cliente enxerga. As mudanças valem na hora.</p>
      </div>

      <section className={card}>
        <h2 className="text-base font-semibold text-ink">Acesso</h2>
        <p className="mb-3 text-xs text-muted">Crie o acesso, envie o convite e, se o cliente esquecer a senha, gere um link de redefinição. Ele define a própria senha pelo link.</p>
        <PortalAccessRow
          clientId={client.id}
          defaultEmail={client.email ?? ""}
          portalUser={portalUser}
          invite={inviteClientToPortal}
          deactivate={deactivateClientPortalAccess}
          reactivate={reactivateClientPortalAccess}
          sendAccess={sendPortalAccessLink}
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tarefas visíveis ao cliente", value: `${visible} de ${items.length}`, href: undefined },
          { label: "Pedidos para revisar", value: String(pendingRequests), href: `/pedidos` },
          { label: "Entregas aguardando aprovação", value: `${awaitingApproval} · ${approved} aprovadas`, href: undefined },
          { label: "Conversa com o cliente", value: "Abrir chat", href: `/chat/${client.id}` },
        ].map((c) => {
          const body = (
            <div className="rounded-2xl border border-border/70 bg-surface p-4 shadow-sm">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{c.label}</p>
              <p className="mt-1 text-xl font-bold text-ink">{c.value}</p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href} className="block transition-shadow hover:shadow-md">
              {body}
            </Link>
          ) : (
            <div key={c.label}>{body}</div>
          );
        })}
      </div>

      <section className={card}>
        <h2 className="text-base font-semibold text-ink">Aparência e funções</h2>
        <p className="mb-4 text-xs text-muted">Mensagem de boas-vindas, cor de destaque e o que o cliente pode fazer no portal.</p>
        <PortalSettingsForm
          clientId={client.id}
          clientName={client.name}
          initial={{
            welcomeMessage: settings?.welcomeMessage ?? "",
            accentColor: settings?.accentColor ?? DEFAULT_ACCENT,
            allowRequests: settings?.allowRequests ?? true,
            reviewRequests: settings?.reviewRequests ?? true,
            allowApprovals: settings?.allowApprovals ?? true,
          }}
        />
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold text-ink">Perguntas do pedido</h2>
        <p className="mb-4 text-xs text-muted">Campos extras que o cliente preenche ao enviar um pedido pelo portal. As respostas vão para as anotações da tarefa.</p>
        <PortalQuestionsEditor
          clientId={client.id}
          questions={questions.map((q) => ({ id: q.id, label: q.label, kind: q.kind === "TEXTO" ? "TEXTO" : "TEXTO_LONGO", required: q.required }))}
          copyFrom={otherClients}
        />
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold text-ink">O que o cliente vê</h2>
        <p className="mb-4 text-xs text-muted">
          Cada tarefa visível aparece no portal com título, status e comentários liberados. Tarefas ocultas ficam só para a equipe. As importadas do FreelaPRO começam ocultas.
        </p>
        <PortalVisibilityList clientId={client.id} items={items} />
      </section>
    </div>
  );
}
