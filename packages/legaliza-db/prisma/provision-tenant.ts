// Provisiona um tenant REAL (não [DEMO]) — o TENANT_ADMIN entra com uma senha
// gerada aleatoriamente (impressa uma única vez no terminal) e os workflows
// padrão já seedados (Abertura genérica, Abertura MG, Alteração, Baixa,
// Transformação MEI→LTDA MG), pra já poder abrir processos de verdade. Não
// cria nenhum Client/Company/Process fake — o tenant nasce vazio.
//
// Uso: npx tsx prisma/provision-tenant.ts --name "Nome do Escritório" \
//   --adminName "Nome do Admin" --adminEmail admin@escritorio.com \
//   [--legalName "Razão Social LTDA"] [--document "00000000000000"] [--email contato@escritorio.com]
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient, RoleName } from "../generated/client";
import {
  OPENING_WORKFLOW_STEPS,
  MG_OPENING_WORKFLOW_STEPS,
  AMENDMENT_WORKFLOW_STEPS,
  CLOSURE_WORKFLOW_STEPS,
  TRANSFORMATION_MEI_LTDA_MG_WORKFLOW_STEPS,
  type WorkflowStepTemplate,
} from "./workflow-templates";

const prisma = new PrismaClient();
const INSTANCE_ID = "00000000-0000-0000-0000-000000000000";

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      args[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

function generatePassword(): string {
  // 16 bytes aleatórios em base64url — string longa e imprevisível, sem
  // depender de gerador "amigável" (isso não é senha pra decorar, é pra
  // trocar no primeiro acesso — ainda não existe tela de troca de senha,
  // ver aviso impresso no fim do script).
  return randomBytes(16).toString("base64url");
}

// Mesmo padrão de ensureAuthUser do seed.ts, mas com senha própria (nunca a
// senha compartilhada de demo) e retornando se criou de fato ou já existia
// (pra só imprimir a senha quando ela é realmente nova).
async function ensureRealAuthUser(
  email: string,
  password: string
): Promise<{ id: string; created: boolean }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { id: existing.id, created: false };

  const id = randomUUID();

  await prisma.$executeRawUnsafe(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
     values ($1::uuid, $2::uuid, 'authenticated', 'authenticated', $3, crypt($4, gen_salt('bf')), now(), '', '', '', '', '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, now(), now())`,
    INSTANCE_ID,
    id,
    email,
    password
  );

  await prisma.$executeRawUnsafe(
    `insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
     values ($1, $2::uuid, jsonb_build_object('sub', $1, 'email', $3, 'email_verified', true), 'email', now(), now(), now())`,
    id,
    id,
    email
  );

  return { id, created: true };
}

async function ensureWorkflow(
  tenantId: string,
  name: string,
  processType: "OPENING" | "AMENDMENT" | "TRANSFORMATION" | "CLOSURE",
  steps: WorkflowStepTemplate[],
  rule: { name: string; state?: string; legalNature?: string }
) {
  let workflow = await prisma.workflow.findFirst({ where: { tenantId, name } });
  if (!workflow) {
    workflow = await prisma.workflow.create({
      data: { tenantId, name, processType, state: rule.state ?? null },
    });
    await prisma.workflowStep.createMany({
      data: steps.map((s, index) => ({
        workflowId: workflow!.id,
        name: s.name,
        order: index + 1,
        estimatedDays: s.estimatedDays,
        agencyName: s.agencyName ?? null,
        requiresDocument: s.requiresDocument ?? false,
        requiresProtocol: s.requiresProtocol ?? false,
      })),
    });
  }

  const existingRule = await prisma.rule.findFirst({ where: { tenantId, workflowId: workflow.id } });
  if (!existingRule) {
    await prisma.rule.create({
      data: {
        tenantId,
        name: rule.name,
        processType,
        state: rule.state ?? null,
        legalNature: rule.legalNature ?? null,
        workflowId: workflow.id,
        priority: 0,
      },
    });
  }

  return workflow;
}

async function main() {
  const args = parseArgs();
  const name = args.name;
  const adminName = args.adminName;
  const adminEmail = args.adminEmail;
  if (!name || !adminName || !adminEmail) {
    throw new Error(
      "Uso: tsx prisma/provision-tenant.ts --name \"Nome do Escritório\" --adminName \"Nome do Admin\" --adminEmail admin@escritorio.com [--legalName ...] [--document ...] [--email ...]"
    );
  }

  const roles = await Promise.all(
    Object.values(RoleName).map((roleName) =>
      prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName } })
    )
  );
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r]));

  const tenant =
    (await prisma.tenant.findFirst({ where: { name } })) ??
    (await prisma.tenant.create({
      data: {
        name,
        legalName: args.legalName ?? null,
        document: args.document ?? null,
        email: args.email ?? adminEmail,
      },
    }));

  const password = generatePassword();
  const { id: adminId, created } = await ensureRealAuthUser(adminEmail, password);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      id: adminId,
      tenantId: tenant.id,
      roleId: roleByName.TENANT_ADMIN.id,
      name: adminName,
      email: adminEmail,
    },
  });

  await ensureWorkflow(tenant.id, "Abertura de Empresa — Padrão", "OPENING", OPENING_WORKFLOW_STEPS, {
    name: "Abertura — regra padrão",
  });
  await ensureWorkflow(tenant.id, "Abertura de Empresa — MG", "OPENING", MG_OPENING_WORKFLOW_STEPS, {
    name: "Abertura — MG",
    state: "MG",
  });
  await ensureWorkflow(tenant.id, "Alteração Contratual — Padrão", "AMENDMENT", AMENDMENT_WORKFLOW_STEPS, {
    name: "Alteração — regra padrão",
  });
  await ensureWorkflow(tenant.id, "Baixa de Empresa — Padrão", "CLOSURE", CLOSURE_WORKFLOW_STEPS, {
    name: "Baixa — regra padrão",
  });
  await ensureWorkflow(
    tenant.id,
    "Transformação MEI → LTDA — MG",
    "TRANSFORMATION",
    TRANSFORMATION_MEI_LTDA_MG_WORKFLOW_STEPS,
    { name: "Transformação MEI → LTDA — MG", state: "MG", legalNature: "MEI" }
  );

  console.log(`\nTenant: ${tenant.name} (${tenant.id})`);
  console.log(`Admin: ${adminName} <${adminEmail}>`);
  if (created) {
    console.log(`Senha temporária (só aparece agora, copie já): ${password}`);
    console.log(
      "Aviso: ainda não existe tela de troca de senha no LEGALIZA.AI — trocar depois exige rodar um UPDATE direto no banco."
    );
  } else {
    console.log("Usuário já existia — senha não foi alterada.");
  }
  console.log("Workflows seedados: Abertura (padrão + MG), Alteração, Baixa, Transformação MEI→LTDA (MG).");
  console.log("Nenhum cliente/empresa/processo de exemplo foi criado — o tenant começa vazio.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
