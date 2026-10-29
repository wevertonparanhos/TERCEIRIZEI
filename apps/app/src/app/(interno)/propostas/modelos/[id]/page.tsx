import { notFound, redirect } from "next/navigation";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { parseContent } from "@/modules/proposals/content";
import { ProposalEditor } from "@/modules/proposals/proposal-editor";

export default async function ModeloPropostaPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!["ADMIN", "GESTOR"].includes(user.role)) redirect("/propostas");

  const template = await prisma.proposalTemplate.findFirst({ where: { id: params.id, tenantId: user.tenantId } });
  if (!template) notFound();

  const blocks = await prisma.proposalBlock.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, body: true },
  });

  return (
    <ProposalEditor
      mode="template"
      id={template.id}
      initialName={template.name}
      initialContent={parseContent(template.data, template.name)}
      clients={[]}
      initialBlocks={blocks}
    />
  );
}
