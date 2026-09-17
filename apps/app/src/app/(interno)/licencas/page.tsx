import { redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { LicenseBoard } from "@/modules/licenses/license-board";
import { createLicenseDocument, deleteLicenseDocument, ensureAutoRenewalTasks } from "@/modules/licenses/actions";

export default async function LicencasPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"].includes(user.role)) redirect("/dashboard");

  await ensureAutoRenewalTasks(user.tenantId);

  const canManage = user.role === "ADMIN" || user.role === "GESTOR";

  const [clients, companies, staff, licenses] = await Promise.all([
    prisma.client.findMany({
      where: { tenantId: user.tenantId, status: "ativo" },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.company.findMany({
      where: { tenantId: user.tenantId },
      select: { id: true, clientId: true, razaoSocial: true },
      orderBy: { razaoSocial: "asc" },
    }),
    prisma.user.findMany({
      where: { tenantId: user.tenantId, role: { name: { in: ["ADMIN", "GESTOR", "OPERACIONAL"] } }, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.licenseDocument.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { expiresAt: "asc" },
      include: {
        client: { select: { name: true } },
        company: { select: { razaoSocial: true } },
        responsible: { select: { name: true } },
        autoTask: { select: { number: true } },
      },
    }),
  ]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-ink">Licenças e Certidões</h1>
      <p className="mt-1 text-sm text-muted">
        Controle de vencimento de alvarás, certidões e certificados dos clientes. Quando um documento entra na janela
        de aviso, uma tarefa de renovação é criada automaticamente.
      </p>

      <div className="mt-6">
        <LicenseBoard
          clients={clients}
          companies={companies}
          staff={staff}
          canManage={canManage}
          licenses={licenses.map((l) => ({
            id: l.id,
            clientId: l.clientId,
            clientName: l.client.name,
            companyName: l.company?.razaoSocial ?? null,
            type: l.type,
            name: l.name,
            issuingBody: l.issuingBody,
            documentNumber: l.documentNumber,
            expiresAt: l.expiresAt.toISOString(),
            reminderDaysBefore: l.reminderDaysBefore,
            responsibleName: l.responsible?.name ?? null,
            autoTaskId: l.autoTaskId,
            autoTaskNumber: l.autoTask?.number ?? null,
          }))}
          createLicense={createLicenseDocument}
          deleteLicense={deleteLicenseDocument}
        />
      </div>
    </div>
  );
}
