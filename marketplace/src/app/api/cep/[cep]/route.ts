import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { db } from "@/server/db";

type ViaCep = { logradouro?: string; bairro?: string; localidade?: string; uf?: string; erro?: boolean | string };

/**
 * Consulta de CEP (ViaCEP, serviço público). Só para usuários logados — evita
 * uso da rota como proxy aberto. Também informa se a cidade é atendida.
 */
export async function GET(_: Request, { params }: { params: Promise<{ cep: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Faça login." }, { status: 401 });

  const cep = (await params).cep.replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) return NextResponse.json({ error: "CEP inválido." }, { status: 400 });

  let data: ViaCep;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 * 60 * 24 * 30 },
    });
    if (!res.ok) throw new Error(String(res.status));
    data = (await res.json()) as ViaCep;
  } catch {
    return NextResponse.json({ error: "Não foi possível consultar o CEP agora. Preencha manualmente." }, { status: 502 });
  }
  if (data.erro) return NextResponse.json({ error: "CEP não encontrado." }, { status: 404 });

  const served = data.localidade && data.uf
    ? !!(await db.city.findFirst({ where: { active: true, state: data.uf, name: { equals: data.localidade, mode: "insensitive" } } }))
    : false;

  return NextResponse.json({
    street: data.logradouro ?? "",
    neighborhood: data.bairro ?? "",
    city: data.localidade ?? "",
    state: data.uf ?? "",
    served,
  });
}
