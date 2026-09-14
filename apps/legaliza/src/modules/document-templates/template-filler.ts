// Lógica pura de montagem das variáveis do template — sem I/O (Prisma,
// storage), só transformação de dados já carregados. Separado da Server
// Action de geração pelo mesmo motivo da Fase 8 (motor de workflow): lógica
// de formatação é fácil de acertar errado silenciosamente, então fica melhor
// testada isolada.

const PROCESS_TYPE_LABELS: Record<string, string> = {
  OPENING: "Abertura",
  AMENDMENT: "Alteração",
  TRANSFORMATION: "Transformação",
  CLOSURE: "Baixa",
};

function formatDoc(value: string | null | undefined): string {
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return String(value);
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export type TemplateClientInput = { name: string; doc: string; email: string };
export type TemplateCompanyInput = {
  legalName: string;
  tradeName: string | null;
  cnpj: string | null;
  legalNature: string | null;
  capital: string | number | null;
} | null;
export type TemplatePartnerInput = { name: string; cpf: string; qualification: string } | null;
export type TemplateAddressInput = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
} | null;
export type TemplateProcessInput = { type: string; state: string; municipality: string };

export function buildTemplateData(input: {
  client: TemplateClientInput;
  company: TemplateCompanyInput;
  partner: TemplatePartnerInput;
  address: TemplateAddressInput;
  process: TemplateProcessInput;
}): Record<string, string> {
  const { client, company, partner, address, process } = input;

  return {
    cliente_nome: client.name,
    cliente_doc: formatDoc(client.doc),
    cliente_email: client.email,

    empresa_razaoSocial: company?.legalName ?? "",
    empresa_nomeFantasia: company?.tradeName ?? "",
    empresa_cnpj: formatDoc(company?.cnpj),
    empresa_naturezaJuridica: company?.legalNature ?? "",
    empresa_capitalSocial: formatCurrency(company?.capital ?? null),

    endereco_logradouro: address?.street ?? "",
    endereco_numero: address?.number ?? "",
    endereco_bairro: address?.neighborhood ?? "",
    endereco_cidade: address?.city ?? "",
    endereco_uf: address?.state ?? "",
    endereco_cep: address?.cep ?? "",

    socio_nome: partner?.name ?? "",
    socio_cpf: formatDoc(partner?.cpf),
    socio_qualificacao: partner?.qualification ?? "",

    processo_tipo: PROCESS_TYPE_LABELS[process.type] ?? process.type,
    processo_uf: process.state,
    processo_municipio: process.municipality,

    data_hoje: new Date().toLocaleDateString("pt-BR"),
  };
}
