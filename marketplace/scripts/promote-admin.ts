/**
 * Procedimento seguro para criar o PRIMEIRO administrador (sem senha fixa):
 *
 *   1. A pessoa se cadastra normalmente pelo site (/cadastro) e confirma o e-mail.
 *   2. Quem tem acesso ao banco executa:  npm run admin:promote -- email@dominio.com
 *
 * Depois disso, novos admins/suporte são promovidos pelo próprio painel
 * (/admin/usuarios), com registro na auditoria.
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@")) {
  console.error("Uso: npm run admin:promote -- email@dominio.com");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`Nenhum usuário com o e-mail ${email}. Cadastre-se primeiro pelo site.`);
  if (user.role === "ADMIN") {
    console.log(`${email} já é administrador.`);
    return;
  }

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { role: "ADMIN", status: "ACTIVE" } }),
    db.auditLog.create({
      data: {
        actorId: null,
        action: "user.promote_admin",
        entityType: "user",
        entityId: user.id,
        description: `Usuário ${email} promovido a ADMIN via script (era ${user.role})`,
      },
    }),
  ]);
  console.log(`✔ ${email} agora é administrador. Entre em /entrar e acesse /admin.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
