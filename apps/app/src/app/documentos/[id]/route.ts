import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Baixa o arquivo server-side em vez de gerar URL assinada: o endpoint de
// signed URL do Storage rejeita a service_role key no formato sb_secret_...
// deste projeto ("Invalid Compact JWS"), mas o endpoint de download aceita
// normalmente — e checar a sessão aqui a cada request é, na prática, mais
// seguro que uma URL assinada com prazo de expiração.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const document = await prisma.document.findFirst({
    where: { id: params.id, tenantId: user.tenantId },
    include: { versions: true },
  });
  if (!document) return new NextResponse("Documento não encontrado.", { status: 404 });
  if (user.role === "CLIENTE" && document.clientId !== user.clientId) {
    return new NextResponse("Sem acesso.", { status: 403 });
  }

  const versionParam = request.nextUrl.searchParams.get("v");
  const targetVersion = versionParam ? Number(versionParam) : document.currentVersion;
  const version = document.versions.find((v) => v.version === targetVersion);
  if (!version) return new NextResponse("Versão não encontrada.", { status: 404 });

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.storage.from("documents").download(version.storagePath);
  if (error || !data) return new NextResponse("Não foi possível baixar o arquivo.", { status: 502 });

  return new NextResponse(await data.arrayBuffer(), {
    headers: {
      "Content-Type": version.mimeType,
      "Content-Disposition": `attachment; filename="${version.fileName}"`,
    },
  });
}
