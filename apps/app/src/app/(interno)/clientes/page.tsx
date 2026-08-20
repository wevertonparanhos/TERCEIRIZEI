import Link from "next/link";
import { prisma } from "@terceirizei/db";
import { getCurrentUser } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  const q = searchParams.q?.trim();
  const status = searchParams.status;
  const canWrite = user.role === "ADMIN" || user.role === "GESTOR";

  const clients = await prisma.client.findMany({
    where: {
      tenantId: user.tenantId,
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { fantasyName: { contains: q, mode: "insensitive" } },
              { doc: { contains: q.replace(/\D/g, "") } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { owner: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clientes</h1>
          <p className="text-sm text-muted">{clients.length} cliente(s) cadastrado(s)</p>
        </div>
        {canWrite && (
          <Link href="/clientes/novo">
            <Button>+ Novo Cliente</Button>
          </Link>
        )}
      </div>

      <form className="mt-6 flex gap-3" method="get">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome, documento ou e-mail..."
          className="max-w-sm"
        />
        <Select name="status" defaultValue={status ?? ""} className="max-w-[160px]">
          <option value="">Todos os status</option>
          <option value="ativo">Ativo</option>
          <option value="inativo">Inativo</option>
        </Select>
        <Button type="submit" variant="outline">
          Filtrar
        </Button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Documento</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Responsável</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-soft">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            )}
            {clients.map((client) => (
              <tr key={client.id} className="border-b border-border last:border-0 hover:bg-surface-alt">
                <td className="px-4 py-3">
                  <Link href={`/clientes/${client.id}`} className="font-medium text-ink hover:underline">
                    {client.name}
                  </Link>
                  {client.fantasyName && <p className="text-xs text-muted-soft">{client.fantasyName}</p>}
                </td>
                <td className="px-4 py-3 text-muted">{formatDoc(client.doc)}</td>
                <td className="px-4 py-3 text-muted">{client.type === "PF" ? "Pessoa Física" : "Pessoa Jurídica"}</td>
                <td className="px-4 py-3 text-muted">{client.owner?.name ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={client.status === "ativo" ? "success" : "neutral"}>
                    {client.status === "ativo" ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDoc(doc: string) {
  if (doc.length === 11) return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (doc.length === 14) return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc;
}
