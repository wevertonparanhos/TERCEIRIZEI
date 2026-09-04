"use server";

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@legaliza/db";
import { requireRole, type CurrentUser } from "@/lib/rbac";
import { logAudit } from "@/lib/audit";
import { clientSchema, type ClientInput } from "@/lib/validations/client";
import { companySchema, type CompanyInput } from "@/lib/validations/company";
import { partnerSchema, type PartnerInput } from "@/lib/validations/partner";
import { activitySchema, type ActivityInput } from "@/lib/validations/activity";
import { addressSchema, type AddressInput } from "@/lib/validations/address";
import { toDecimalOrNull } from "@/lib/decimal";
import { resolveWorkflow, generateProcessSteps, generateChecklist } from "./workflow-engine";

async function requireWriteAccess(): Promise<CurrentUser> {
  return requireRole("TENANT_ADMIN", "OPERATOR");
}

export type OpeningWizardInput = {
  existingClientId?: string;
  newClient?: ClientInput;
  company: CompanyInput;
  partners: PartnerInput[];
  activities: ActivityInput[];
  address: AddressInput;
  state: string;
  municipality: string;
  priority: "BAIXA" | "MEDIA" | "ALTA" | "URGENTE";
};

function rethrowFriendly(err: unknown, duplicateMessage: string): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw new Error(duplicateMessage);
  }
  throw err;
}

/** Cria Cliente (ou reaproveita um existente) + Empresa + Sócios + CNAEs +
 * Endereço + Processo de ABERTURA numa experiência guiada única (seção 23 do
 * briefing). Reaproveita os mesmos schemas Zod e regras de negócio já
 * validados nas Fases 2-4 (soma de participação ≤ 100%, CNAE principal
 * único) — nenhuma validação nova. */
export async function createOpeningWizard(input: OpeningWizardInput) {
  const user = await requireWriteAccess();

  if (!input.existingClientId && !input.newClient) {
    throw new Error("Selecione um cliente existente ou preencha os dados de um novo cliente.");
  }
  if (input.partners.length === 0) throw new Error("Adicione pelo menos um sócio.");
  if (input.activities.length === 0) throw new Error("Adicione pelo menos uma atividade (CNAE).");

  const companyData = companySchema.parse(input.company);
  const partnersData = input.partners.map((p) => partnerSchema.parse(p));
  const activitiesData = input.activities.map((a) => activitySchema.parse(a));
  const addressData = addressSchema.parse(input.address);

  const totalParticipation = partnersData.reduce((sum, p) => sum + p.participationPercentage, 0);
  if (totalParticipation > 100) {
    throw new Error(`Participação dos sócios soma ${totalParticipation.toFixed(2)}%, acima de 100%.`);
  }

  let companyId: string;
  let clientId: string;
  let companyLegalName: string;

  try {
    const created = await prisma.$transaction(async (tx) => {
      let client;
      if (input.existingClientId) {
        client = await tx.client.findFirst({ where: { id: input.existingClientId, tenantId: user.tenantId! } });
        if (!client) throw new Error("Cliente não encontrado.");
      } else {
        const clientData = clientSchema.parse(input.newClient);
        client = await tx.client.create({
          data: {
            tenantId: user.tenantId!,
            name: clientData.name,
            fantasyName: clientData.fantasyName || null,
            type: clientData.type,
            doc: clientData.doc.replace(/\D/g, ""),
            email: clientData.email,
            phone: clientData.phone || null,
            whatsapp: clientData.whatsapp || null,
            status: clientData.status,
          },
        });
      }

      const company = await tx.company.create({
        data: {
          tenantId: user.tenantId!,
          clientId: client.id,
          cnpj: companyData.cnpj.replace(/\D/g, ""),
          legalName: companyData.legalName,
          tradeName: companyData.tradeName || null,
          legalNature: companyData.legalNature || null,
          companySize: companyData.companySize || null,
          capital: toDecimalOrNull(companyData.capital),
          stateRegistration: companyData.stateRegistration || null,
          municipalRegistration: companyData.municipalRegistration || null,
          businessPurpose: companyData.businessPurpose || null,
          status: "ativa",
        },
      });

      await tx.partner.createMany({
        data: partnersData.map((p) => ({
          companyId: company.id,
          name: p.name,
          cpf: p.cpf.replace(/\D/g, ""),
          qualification: p.qualification,
          participationPercentage: p.participationPercentage,
          capitalContribution: toDecimalOrNull(p.capitalContribution),
          administrator: p.administrator,
          email: p.email || null,
          phone: p.phone || null,
        })),
      });

      // Normaliza pra garantir exatamente 1 principal: usa o primeiro índice
      // marcado como principal (se mais de um vier marcado do client, só o
      // primeiro vale) ou o índice 0 se nenhum vier marcado.
      const firstPrimaryIndex = activitiesData.findIndex((a) => a.isPrimary);
      const primaryIndex = firstPrimaryIndex === -1 ? 0 : firstPrimaryIndex;
      await tx.companyActivity.createMany({
        data: activitiesData.map((a, index) => ({
          companyId: company.id,
          cnae: a.cnae,
          description: a.description,
          isPrimary: index === primaryIndex,
        })),
      });

      await tx.companyAddress.create({
        data: {
          companyId: company.id,
          cep: addressData.cep.replace(/\D/g, ""),
          street: addressData.street,
          number: addressData.number,
          complement: addressData.complement || null,
          neighborhood: addressData.neighborhood,
          city: addressData.city,
          state: addressData.state.toUpperCase(),
        },
      });

      return { companyId: company.id, clientId: client.id, legalName: company.legalName };
    });

    companyId = created.companyId;
    clientId = created.clientId;
    companyLegalName = created.legalName;
  } catch (err) {
    rethrowFriendly(err, "Já existe um cliente ou empresa cadastrado com este CPF/CNPJ.");
  }

  // Fora da transação de propósito: se o motor de workflow falhar aqui, a
  // empresa já criada continua um estado válido e recuperável — o usuário
  // pode criar o processo manualmente depois pela tela da empresa.
  const startedAt = new Date();
  const workflowId = await resolveWorkflow(user.tenantId!, {
    processType: "OPENING",
    state: input.state.toUpperCase(),
    legalNature: companyData.legalNature,
  });

  const process = await prisma.process.create({
    data: {
      tenantId: user.tenantId!,
      clientId,
      companyId,
      workflowId,
      type: "OPENING",
      priority: input.priority,
      state: input.state.toUpperCase(),
      municipality: input.municipality,
      startedAt,
    },
  });

  const stepsGenerated = workflowId ? await generateProcessSteps(process.id, workflowId, startedAt) : 0;
  if (workflowId) await generateChecklist(process.id, workflowId);

  await logAudit({
    tenantId: user.tenantId!,
    userId: user.id,
    action: "process.create",
    entityType: "process",
    entityId: process.id,
    description: `Processo de abertura criado via assistente para "${companyLegalName}" (${stepsGenerated} etapa(s)).`,
  });

  revalidatePath("/processos");
  revalidatePath("/clientes");
  revalidatePath("/empresas");
  return { id: process.id, stepsGenerated };
}
