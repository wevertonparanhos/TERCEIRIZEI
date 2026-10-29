import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { ClientProcessForm } from "@/modules/processes/client-process-form";
import { clientSubmitRequest } from "@/modules/processes/actions";
import { clientUploadDocument, clientUploadRequestAttachment } from "@/modules/documents/actions";

export default async function PortalNovaDemandaPage() {
  const user = await getCurrentUser();
  if (!user || !user.clientId) return null;

  const settings = await prisma.clientPortalSettings.findUnique({ where: { clientId: user.clientId }, select: { allowRequests: true } });
  if (settings && !settings.allowRequests) {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <h1 className="text-2xl font-bold text-ink">Nova Demanda</h1>
        <p className="mt-3 rounded-2xl border border-border/70 bg-surface p-6 text-sm text-muted shadow-sm">
          Seu portal não está liberado para abrir novas demandas. Fale com a equipe da Terceirizei pelo chat.
        </p>
      </div>
    );
  }

  const [questions, companies, serviceTypes] = await Promise.all([
    prisma.clientPortalQuestion.findMany({
      where: { clientId: user.clientId, tenantId: user.tenantId },
      orderBy: { position: "asc" },
      select: { id: true, label: true, kind: true, required: true },
    }),
    prisma.company.findMany({ where: { clientId: user.clientId }, select: { id: true, razaoSocial: true } }),
    prisma.serviceType.findMany({
      where: { tenantId: user.tenantId, active: true },
      select: { id: true, name: true, defaultDeadlineDays: true, defaultPriority: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="text-2xl font-bold text-ink">Nova Demanda</h1>
      <p className="mt-1 text-sm text-muted">
        Conte pra gente o que você precisa — nossa equipe vai analisar e entrar em contato.
      </p>

      <div className="mt-6 rounded-2xl border border-border/70 bg-surface shadow-sm p-6">
        <ClientProcessForm
          companies={companies}
          serviceTypes={serviceTypes}
          onSubmit={clientSubmitRequest}
          uploadRequestAttachment={clientUploadRequestAttachment}
          questions={questions.map((q) => ({ id: q.id, label: q.label, kind: q.kind === "TEXTO" ? "TEXTO" : "TEXTO_LONGO", required: q.required }))}
          clientId={user.clientId}
          uploadDocument={clientUploadDocument}
        />
      </div>
    </div>
  );
}
