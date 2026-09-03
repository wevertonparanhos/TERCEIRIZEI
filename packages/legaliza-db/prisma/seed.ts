import { randomUUID } from "node:crypto";
import { PrismaClient, RoleName } from "../generated/client";

const prisma = new PrismaClient();

// Senha única para todos os logins de demonstração — só para ambiente local/demo,
// nunca usar em produção real.
const DEMO_PASSWORD = "Legaliza@Demo123";

const DEMO_TENANTS = [
  {
    name: "[DEMO] Legaliza Escritório A",
    legalName: "Legaliza Escritório A Contabilidade LTDA",
    document: "00000000000191",
    email: "contato@demoa.legaliza.local",
    adminEmail: "admin.a@legaliza.demo",
    adminName: "[DEMO] Admin Escritório A",
    client: {
      name: "[DEMO] Cliente Contabilidade A Ltda",
      doc: "11122233000183",
      email: "cliente@demoa.legaliza.local",
    },
    company: {
      cnpj: "33344455000183",
      legalName: "[DEMO] Padaria Pão Quente LTDA",
      tradeName: "Padaria Pão Quente",
      legalNature: "Sociedade Empresária Limitada",
      partners: [
        { name: "[DEMO] Sócio A1", cpf: "11122233043", qualification: "Sócio Administrador", pct: 60, administrator: true },
        { name: "[DEMO] Sócio A2", cpf: "22233344073", qualification: "Sócio", pct: 40, administrator: false },
      ],
      activities: [
        { cnae: "4721-1/02", description: "Padaria e confeitaria com predominância de produção própria", isPrimary: true },
        { cnae: "5611-2/01", description: "Restaurantes e similares", isPrimary: false },
      ],
      address: { cep: "30130010", street: "Avenida Afonso Pena", number: "1000", neighborhood: "Centro", city: "Belo Horizonte", state: "MG" },
    },
    process: { state: "MG", municipality: "Belo Horizonte" },
  },
  {
    name: "[DEMO] Legaliza Escritório B",
    legalName: "Legaliza Escritório B Consultoria LTDA",
    document: "00000000000272",
    email: "contato@demob.legaliza.local",
    adminEmail: "admin.b@legaliza.demo",
    adminName: "[DEMO] Admin Escritório B",
    client: {
      name: "[DEMO] Cliente Consultoria B Ltda",
      doc: "22233344000183",
      email: "cliente@demob.legaliza.local",
    },
    company: {
      cnpj: "44455566000183",
      legalName: "[DEMO] Studio Fit Academia LTDA",
      tradeName: "Studio Fit",
      legalNature: "Sociedade Empresária Limitada",
      partners: [
        { name: "[DEMO] Sócio B1", cpf: "33344455001", qualification: "Sócio Administrador", pct: 100, administrator: true },
      ],
      activities: [
        { cnae: "9313-1/00", description: "Atividades de condicionamento físico", isPrimary: true },
      ],
      address: { cep: "01310100", street: "Avenida Paulista", number: "500", neighborhood: "Bela Vista", city: "São Paulo", state: "SP" },
    },
    process: { state: "SP", municipality: "São Paulo" },
  },
];

const DEMO_WORKFLOW_STEPS = [
  { name: "Triagem", estimatedDays: 1 },
  { name: "Documentos", estimatedDays: 2, requiresDocument: true },
  { name: "Viabilidade", estimatedDays: 3 },
  { name: "Registro", estimatedDays: 5, requiresProtocol: true },
  { name: "Conclusão", estimatedDays: 1 },
];

const DEMO_AGENCIES = [
  { name: "Receita Federal", sphere: "FEDERAL" as const },
  { name: "REDESIM", sphere: "FEDERAL" as const },
  { name: "JUCEMG", sphere: "ESTADUAL" as const, state: "MG" },
  { name: "SEF/MG", sphere: "ESTADUAL" as const, state: "MG" },
  { name: "Prefeitura", sphere: "MUNICIPAL" as const },
  { name: "Licenciamento", sphere: "MUNICIPAL" as const },
];

const INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

// Insere direto em auth.users/auth.identities via SQL (a Admin API do Supabase
// ignora app_metadata custom nesta stack — descoberta documentada no Terceirizei
// OS). email_change/email_change_token_new precisam ser '' e não NULL, senão o
// GoTrue quebra o login com um erro genérico de scan de coluna.
async function ensureAuthUser(email: string, name: string): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;

  const id = randomUUID();

  await prisma.$executeRawUnsafe(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
     values ($1::uuid, $2::uuid, 'authenticated', 'authenticated', $3, crypt($4, gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, now(), now())`,
    INSTANCE_ID,
    id,
    email,
    DEMO_PASSWORD
  );

  await prisma.$executeRawUnsafe(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2::uuid, jsonb_build_object('sub', $1, 'email', $3, 'email_verified', true), 'email', now(), now(), now())`,
    id,
    id,
    email
  );

  return id;
}

async function main() {
  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({ where: { name }, update: {}, create: { name } })
    )
  );
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r]));
  console.log(`Papéis seedados: ${roles.map((r) => r.name).join(", ")}`);

  const superAdminId = await ensureAuthUser("superadmin@legaliza.demo", "[DEMO] Super Admin");
  await prisma.user.upsert({
    where: { email: "superadmin@legaliza.demo" },
    update: {},
    create: {
      id: superAdminId,
      tenantId: null,
      roleId: roleByName.SUPER_ADMIN.id,
      name: "[DEMO] Super Admin",
      email: "superadmin@legaliza.demo",
    },
  });

  for (const demo of DEMO_TENANTS) {
    const tenant =
      (await prisma.tenant.findFirst({ where: { name: demo.name } })) ??
      (await prisma.tenant.create({
        data: { name: demo.name, legalName: demo.legalName, document: demo.document, email: demo.email },
      }));

    const adminId = await ensureAuthUser(demo.adminEmail, demo.adminName);
    await prisma.user.upsert({
      where: { email: demo.adminEmail },
      update: {},
      create: {
        id: adminId,
        tenantId: tenant.id,
        roleId: roleByName.TENANT_ADMIN.id,
        name: demo.adminName,
        email: demo.adminEmail,
      },
    });

    const client =
      (await prisma.client.findFirst({ where: { tenantId: tenant.id, doc: demo.client.doc } })) ??
      (await prisma.client.create({
        data: {
          tenantId: tenant.id,
          name: demo.client.name,
          type: "PJ",
          doc: demo.client.doc,
          email: demo.client.email,
          status: "ativo",
        },
      }));

    const existingCompany = await prisma.company.findFirst({ where: { tenantId: tenant.id, cnpj: demo.company.cnpj } });
    if (!existingCompany) {
      const company = await prisma.company.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          cnpj: demo.company.cnpj,
          legalName: demo.company.legalName,
          tradeName: demo.company.tradeName,
          legalNature: demo.company.legalNature,
          status: "ativa",
        },
      });

      await prisma.partner.createMany({
        data: demo.company.partners.map((p) => ({
          companyId: company.id,
          name: p.name,
          cpf: p.cpf,
          qualification: p.qualification,
          participationPercentage: p.pct,
          administrator: p.administrator,
        })),
      });

      await prisma.companyActivity.createMany({
        data: demo.company.activities.map((a) => ({
          companyId: company.id,
          cnae: a.cnae,
          description: a.description,
          isPrimary: a.isPrimary,
        })),
      });

      await prisma.companyAddress.create({
        data: { companyId: company.id, ...demo.company.address },
      });
    }

    const workflowName = "[DEMO] Abertura de Empresa — Padrão";
    let workflow = await prisma.workflow.findFirst({ where: { tenantId: tenant.id, name: workflowName } });
    if (!workflow) {
      workflow = await prisma.workflow.create({
        data: { tenantId: tenant.id, name: workflowName, processType: "OPENING" },
      });
      await prisma.workflowStep.createMany({
        data: DEMO_WORKFLOW_STEPS.map((s, index) => ({
          workflowId: workflow!.id,
          name: s.name,
          order: index + 1,
          estimatedDays: s.estimatedDays,
          requiresDocument: s.requiresDocument ?? false,
          requiresProtocol: s.requiresProtocol ?? false,
        })),
      });
    }

    const existingRule = await prisma.rule.findFirst({ where: { tenantId: tenant.id, workflowId: workflow.id } });
    if (!existingRule) {
      await prisma.rule.create({
        data: {
          tenantId: tenant.id,
          name: "[DEMO] Abertura — regra padrão",
          processType: "OPENING",
          workflowId: workflow.id,
          priority: 0,
        },
      });
    }

    let process = await prisma.process.findFirst({ where: { tenantId: tenant.id, clientId: client.id, type: "OPENING" } });
    if (!process) {
      const startedAt = new Date();
      process = await prisma.process.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          workflowId: workflow.id,
          type: "OPENING",
          state: demo.process.state,
          municipality: demo.process.municipality,
          startedAt,
        },
      });

      const steps = await prisma.workflowStep.findMany({ where: { workflowId: workflow.id }, orderBy: { order: "asc" } });
      let cursor = startedAt;
      await prisma.processStep.createMany({
        data: steps.map((step, index) => {
          if (step.estimatedDays) cursor = new Date(cursor.getTime() + step.estimatedDays * 24 * 60 * 60 * 1000);
          return {
            processId: process!.id,
            workflowStepId: step.id,
            name: step.name,
            order: step.order,
            status: index === 0 ? "READY" : "PENDING",
            dueDate: step.estimatedDays ? cursor : null,
          };
        }),
      });
    }

    // Backfill de checklist pra processos criados antes da Fase 4 existir.
    const existingChecklist = await prisma.checklistItem.findFirst({ where: { processId: process.id } });
    if (!existingChecklist) {
      const stepsNeedingChecklist = await prisma.workflowStep.findMany({
        where: { workflowId: workflow.id, OR: [{ requiresDocument: true }, { requiresProtocol: true }] },
        orderBy: { order: "asc" },
      });
      const items: { processId: string; label: string; required: boolean }[] = [];
      for (const step of stepsNeedingChecklist) {
        if (step.requiresDocument) items.push({ processId: process.id, label: `Documento: ${step.name}`, required: true });
        if (step.requiresProtocol) items.push({ processId: process.id, label: `Protocolo: ${step.name}`, required: true });
      }
      if (items.length > 0) await prisma.checklistItem.createMany({ data: items });
    }

    console.log(`Tenant demo: ${tenant.name} (${tenant.id}) — admin: ${demo.adminEmail}`);
  }

  const existingAgencies = await prisma.governmentAgency.count();
  if (existingAgencies === 0) {
    await prisma.governmentAgency.createMany({ data: DEMO_AGENCIES });
    console.log(`Catálogo de órgãos seedado: ${DEMO_AGENCIES.map((a) => a.name).join(", ")}`);
  }

  console.log(`\nLogin de demonstração (todos): senha "${DEMO_PASSWORD}"`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
