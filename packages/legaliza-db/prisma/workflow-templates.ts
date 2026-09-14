// Etapas reais dos workflows padrão do LEGALIZA.AI — extraído de seed.ts pra
// ser reaproveitado tanto no seed de demonstração quanto no provisionamento
// de um tenant real (provision-tenant.ts), sem duplicar a mesma lista duas
// vezes. Cada array vira 1 Workflow + N WorkflowStep quando seedado.
export type WorkflowStepTemplate = {
  name: string;
  estimatedDays: number;
  requiresDocument?: boolean;
  requiresProtocol?: boolean;
  agencyName?: string;
};

export const OPENING_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  { name: "Triagem", estimatedDays: 1 },
  { name: "Documentos", estimatedDays: 2, requiresDocument: true },
  { name: "Viabilidade", estimatedDays: 3 },
  { name: "Registro", estimatedDays: 5, requiresProtocol: true },
  { name: "Conclusão", estimatedDays: 1 },
];

// 17 etapas reais da seção 25 do briefing (Abertura de Empresa — MG). As 3
// marcadas "quando aplicável" no briefing (Inscrição Estadual, Licenciamento,
// Alvará) entram sempre — sem base oficial de qual CNAE exige o quê em MG
// (princípio 65), o operador cancela manualmente a ProcessStep quando não
// se aplicar a um processo específico.
export const MG_OPENING_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  { name: "Triagem", estimatedDays: 1 },
  { name: "Dados", estimatedDays: 1 },
  { name: "Documentos", estimatedDays: 2, requiresDocument: true },
  { name: "Viabilidade", estimatedDays: 2 },
  { name: "Análise da Viabilidade", estimatedDays: 1 },
  { name: "Coleta/DBE", estimatedDays: 3 },
  { name: "Ato Constitutivo", estimatedDays: 2, requiresDocument: true },
  { name: "Assinatura", estimatedDays: 1 },
  { name: "Registro na Junta", estimatedDays: 5, requiresProtocol: true },
  { name: "Análise", estimatedDays: 3 },
  { name: "CNPJ", estimatedDays: 3, requiresProtocol: true },
  { name: "Inscrição Municipal", estimatedDays: 3, requiresProtocol: true },
  { name: "Inscrição Estadual", estimatedDays: 3, requiresProtocol: true },
  { name: "Licenciamento", estimatedDays: 5, requiresProtocol: true },
  { name: "Alvará", estimatedDays: 5, requiresProtocol: true },
  { name: "Conferência", estimatedDays: 1 },
  { name: "Conclusão", estimatedDays: 1 },
];

export const AMENDMENT_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  { name: "Triagem", estimatedDays: 1 },
  { name: "Documentos", estimatedDays: 2, requiresDocument: true },
  { name: "Elaboração da Alteração", estimatedDays: 2, requiresDocument: true },
  { name: "Assinatura", estimatedDays: 1 },
  { name: "Registro na Junta", estimatedDays: 5, requiresProtocol: true },
  { name: "Averbação", estimatedDays: 3, requiresProtocol: true },
  { name: "Conclusão", estimatedDays: 1 },
];

export const CLOSURE_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  { name: "Solicitação", estimatedDays: 1 },
  { name: "Consulta de Débitos", estimatedDays: 3 },
  { name: "Documentos", estimatedDays: 2, requiresDocument: true },
  { name: "Distrato/Ato de Encerramento", estimatedDays: 2, requiresDocument: true },
  { name: "Baixa Federal", estimatedDays: 5, requiresProtocol: true },
  { name: "Baixa Estadual", estimatedDays: 5, requiresProtocol: true },
  { name: "Baixa Municipal", estimatedDays: 5, requiresProtocol: true },
  { name: "Conclusão", estimatedDays: 1 },
];

// 19 etapas reais do processo de Transformação MEI → LTDA em MG (Fase 14) —
// ver seed.ts pro histórico da decisão de escopo (Diagnóstico automático e
// geração de conteúdo jurídico ficaram de fora, Princípio 65).
export const TRANSFORMATION_MEI_LTDA_MG_WORKFLOW_STEPS: WorkflowStepTemplate[] = [
  { name: "Triagem", estimatedDays: 1 },
  { name: "Diagnóstico do MEI (CNPJ ativo, SIMEI ativo, CNAE compatível)", estimatedDays: 1 },
  { name: "Definição da Nova LTDA (nome, capital, CNAEs, objeto social, sócios, administrador, ME/EPP)", estimatedDays: 2 },
  { name: "Viabilidade JUCEMG (Eventos 220 e 225)", estimatedDays: 2, requiresProtocol: true, agencyName: "JUCEMG" },
  { name: "DBE / REDESIM", estimatedDays: 1, requiresDocument: true, agencyName: "REDESIM" },
  { name: "Desenquadramento do SIMEI", estimatedDays: 1, requiresProtocol: true, agencyName: "Receita Federal" },
  { name: "Módulo Integrador (Ato 002 / Evento 046)", estimatedDays: 1, agencyName: "REDESIM" },
  { name: "Elaboração do Ato de Transformação", estimatedDays: 2, requiresDocument: true },
  { name: "Assinatura", estimatedDays: 1, requiresDocument: true },
  { name: "DAE", estimatedDays: 1, requiresDocument: true },
  { name: "Registro Digital JUCEMG", estimatedDays: 1, requiresProtocol: true, agencyName: "JUCEMG" },
  { name: "Análise JUCEMG", estimatedDays: 5, requiresProtocol: true, agencyName: "JUCEMG" },
  { name: "Cumprimento de Exigência (se houver)", estimatedDays: 3, requiresDocument: true },
  { name: "Pós-Registro — Receita Federal (CNPJ, natureza, CNAEs, QSA)", estimatedDays: 2, requiresProtocol: true, agencyName: "Receita Federal" },
  { name: "Pós-Registro — Simples Nacional", estimatedDays: 1, requiresProtocol: true, agencyName: "Receita Federal" },
  { name: "Pós-Registro — Prefeitura (inscrição, alvará, NFS-e)", estimatedDays: 3, requiresProtocol: true, agencyName: "Prefeitura" },
  { name: "Pós-Registro — SEFAZ/MG (se aplicável)", estimatedDays: 3, requiresProtocol: true, agencyName: "SEF/MG" },
  { name: "Pós-Registro — Licenciamentos específicos (se aplicável)", estimatedDays: 5, requiresProtocol: true, agencyName: "Licenciamento" },
  { name: "Encerramento", estimatedDays: 1 },
];

// portalUrl só pros órgãos reais e específicos (dado público verificável, não
// procedimento inventado — princípio 65). "Prefeitura"/"Licenciamento" são
// nomes genéricos sem órgão específico, ficam sem portalUrl.
export const GOVERNMENT_AGENCIES = [
  { name: "Receita Federal", sphere: "FEDERAL" as const, portalUrl: "https://www.gov.br/receitafederal" },
  { name: "REDESIM", sphere: "FEDERAL" as const, portalUrl: "https://www.redesim.gov.br" },
  { name: "JUCEMG", sphere: "ESTADUAL" as const, state: "MG", portalUrl: "https://jucemg.mg.gov.br" },
  { name: "SEF/MG", sphere: "ESTADUAL" as const, state: "MG", portalUrl: "https://cdt.fazenda.mg.gov.br/cdt-emitida" },
  { name: "Prefeitura", sphere: "MUNICIPAL" as const },
  { name: "Licenciamento", sphere: "MUNICIPAL" as const },
  { name: "Prefeitura de Belo Horizonte", sphere: "MUNICIPAL" as const, portalUrl: "https://cnd.pbh.gov.br/CNDOnline/" },
  { name: "Justiça do Trabalho (CNDT)", sphere: "FEDERAL" as const, portalUrl: "https://cndt-certidao.tst.jus.br/gerarCertidao" },
  { name: "Caixa Econômica Federal (FGTS)", sphere: "FEDERAL" as const, portalUrl: "https://consulta-crf.caixa.gov.br/consultacrf/pages/consultaEmpregador.jsf" },
  {
    name: "TJMG (Falência e Concordata)",
    sphere: "ESTADUAL" as const,
    state: "MG",
    portalUrl: "https://rupe.tjmg.jus.br/rupe/justica/publico/certidoes/criarSolicitacaoCertidao.rupe?solicitacaoPublica=true",
  },
];
