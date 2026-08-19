import { createClient } from "@supabase/supabase-js";
import { PrismaClient, RoleName } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_TENANT_NAME = "Terceirizei — DADOS DE DEMONSTRAÇÃO";
const DEMO_ADMIN_EMAIL = "admin@demo.terceirizei.local";
const DEMO_ADMIN_PASSWORD = "TrocarNoPrimeiroAcesso!123";

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: DEMO_TENANT_NAME,
    },
  });

  const roles = await Promise.all(
    Object.values(RoleName).map((name) =>
      prisma.role.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log(`Tenant de demonstração: ${tenant.name} (${tenant.id})`);
  console.log(`Papéis seedados: ${roles.map((r) => r.name).join(", ")}`);

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      "\nSUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não definidos — pulando criação do usuário ADMIN de demonstração.\n" +
        "Defina essas variáveis em packages/db/.env e rode `npm run db:seed` novamente para criar o login de teste."
    );
    return;
  }

  const admin = roles.find((r) => r.name === RoleName.ADMIN)!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: DEMO_ADMIN_EMAIL,
    password: DEMO_ADMIN_PASSWORD,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id, role_id: admin.id },
    user_metadata: { name: "Administrador (demo)" },
  });

  if (error) {
    if (error.message.includes("already been registered")) {
      console.log(`\nUsuário de demonstração já existe: ${DEMO_ADMIN_EMAIL}`);
    } else {
      throw error;
    }
  } else {
    console.log(
      `\nDADOS DE DEMONSTRAÇÃO — login de teste criado:\n  e-mail: ${DEMO_ADMIN_EMAIL}\n  senha: ${DEMO_ADMIN_PASSWORD}\n  (o trigger on_auth_user_created cria o perfil em public.users automaticamente)`
    );
  }

  void data;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
