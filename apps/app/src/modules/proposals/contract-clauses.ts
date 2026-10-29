export type Clause = { key: string; title: string; body: string; mandatory: boolean };

/** Variáveis preenchidas automaticamente nas cláusulas ({{nome}}). */
export type ClauseVars = {
  diaVencimento: number;
  multa: number;
  juros: number;
  aviso: number;
  termMonths: number | null;
  foro: string;
};

/**
 * Cláusulas padrão do contrato de prestação de serviços. As obrigatórias podem ter o texto ajustado
 * por proposta, mas nunca removidas (o servidor reinsere as que faltarem). Modelo-base: revisão jurídica
 * recomendada antes de uso em larga escala.
 */
export const DEFAULT_CLAUSES: Clause[] = [
  {
    key: "objeto",
    title: "DO OBJETO",
    mandatory: true,
    body: "O presente contrato tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, dos serviços de consultoria, gestão e terceirização de rotinas empresariais (BPO) relacionados na tabela de serviços e valores desta proposta, executados sob demanda, conforme solicitados pela CONTRATANTE.",
  },
  {
    key: "solicitacao",
    title: "DA SOLICITAÇÃO E DA EXECUÇÃO DOS SERVIÇOS",
    mandatory: true,
    body: "Os serviços serão executados mediante solicitação da CONTRATANTE, feita pelos canais oficiais da CONTRATADA (portal do cliente ou meios de comunicação por ela indicados). Cada solicitação aceita constitui uma demanda e será cobrada pelo valor constante da tabela de serviços vigente na data da solicitação. Serviços não previstos na tabela poderão ser prestados mediante orçamento prévio e aprovação da CONTRATANTE.",
  },
  {
    key: "pagamento",
    title: "DOS PREÇOS E DA FORMA DE PAGAMENTO",
    mandatory: true,
    body: "Pelos serviços solicitados, a CONTRATANTE pagará à CONTRATADA os valores unitários constantes da tabela de serviços e valores desta proposta, não havendo valor global ou mensalidade mínima, salvo os serviços expressamente indicados como mensais.\n\n§ 1º As demandas solicitadas em cada mês serão consolidadas no Relatório do Cliente, que a CONTRATADA enviará à CONTRATANTE até o último dia útil do mês de referência.\n\n§ 2º O pagamento deverá ser efetuado até o {{diaVencimento}}º dia útil do mês seguinte ao de referência, por PIX, boleto ou transferência bancária, conforme os dados informados no relatório.\n\n§ 3º Eventuais divergências deverão ser comunicadas por escrito em até 3 (três) dias úteis do recebimento do relatório; a parte não contestada deverá ser paga no vencimento.\n\n§ 4º Taxas, tributos, emolumentos e custas de órgãos públicos, cartórios e juntas comerciais não estão incluídos nos valores da tabela e correrão por conta da CONTRATANTE, mediante repasse ou pagamento direto.",
  },
  {
    key: "atraso",
    title: "DO ATRASO NO PAGAMENTO",
    mandatory: true,
    body: "O atraso no pagamento sujeitará a CONTRATANTE a multa de {{multa}}% sobre o valor em atraso, juros de mora de {{juros}}% ao mês, calculados pro rata die, e correção monetária pelo IPCA. Persistindo o atraso por mais de 30 (trinta) dias, a CONTRATADA poderá suspender a execução de novas demandas até a regularização, sem prejuízo da cobrança dos valores devidos.",
  },
  {
    key: "obrigacoes-contratada",
    title: "DAS OBRIGAÇÕES DA CONTRATADA",
    mandatory: true,
    body: "A CONTRATADA obriga-se a executar os serviços com diligência e zelo técnico, observando a legislação aplicável; informar à CONTRATANTE o andamento das demandas e eventuais exigências ou impedimentos; e manter sigilo sobre as informações a que tiver acesso em razão deste contrato.",
  },
  {
    key: "obrigacoes-contratante",
    title: "DAS OBRIGAÇÕES DA CONTRATANTE",
    mandatory: true,
    body: "A CONTRATANTE obriga-se a fornecer, de forma tempestiva, os documentos e as informações necessários à execução dos serviços, respondendo pela sua veracidade e integridade; atender às exigências de órgãos públicos e da CONTRATADA dentro dos prazos; efetuar os pagamentos nas datas ajustadas; e indicar um responsável para contato e aprovação das demandas.",
  },
  {
    key: "responsabilidade",
    title: "DA RESPONSABILIDADE E DOS PRAZOS",
    mandatory: true,
    body: "Os serviços constituem obrigação de meio, e não de resultado. Os prazos informados são estimativas e dependem da entrega tempestiva de documentos pela CONTRATANTE e do tempo de análise de órgãos públicos e de terceiros, sobre os quais a CONTRATADA não tem controle. A CONTRATADA não responde por atrasos, exigências ou indeferimentos decorrentes de documentos ou informações incorretos ou incompletos, nem por decisões de órgãos públicos. Eventual responsabilidade da CONTRATADA limita-se aos danos diretos comprovados e ao valor recebido pela demanda que os originou.",
  },
  {
    key: "lgpd",
    title: "DA CONFIDENCIALIDADE E DA PROTEÇÃO DE DADOS",
    mandatory: true,
    body: "As partes manterão sigilo sobre as informações confidenciais a que tiverem acesso, durante a vigência do contrato e por 5 (cinco) anos após o seu término. A CONTRATADA tratará os dados pessoais fornecidos pela CONTRATANTE exclusivamente para a execução dos serviços, em conformidade com a Lei nº 13.709/2018 (LGPD), adotando medidas técnicas e administrativas de segurança, e a CONTRATANTE declara possuir base legal para o compartilhamento desses dados.",
  },
  {
    key: "vigencia",
    title: "DA VIGÊNCIA",
    mandatory: true,
    body: "{{vigencia}}",
  },
  {
    key: "rescisao",
    title: "DA RESCISÃO",
    mandatory: true,
    body: "Qualquer das partes poderá rescindir este contrato, sem ônus, mediante aviso prévio por escrito de {{aviso}} dias. O contrato poderá ser rescindido de imediato, por notificação escrita, em caso de descumprimento de obrigação não sanado em até 10 (dez) dias. Na rescisão, serão devidos os valores das demandas solicitadas e iniciadas até a data de encerramento, proporcionalmente ao trabalho executado, e a CONTRATADA entregará à CONTRATANTE os documentos e arquivos de titularidade desta.",
  },
  {
    key: "natureza",
    title: "DA NATUREZA DA RELAÇÃO",
    mandatory: true,
    body: "Este contrato não cria vínculo empregatício, societário, de representação ou de mandato entre as partes, que atuam com independência e autonomia técnica, sendo cada uma responsável por seus empregados, tributos e encargos.",
  },
  {
    key: "aceite",
    title: "DA ACEITAÇÃO DIGITAL E DA VALIDADE",
    mandatory: true,
    body: "As partes reconhecem como válida a formalização deste contrato por meio eletrônico, nos termos da Medida Provisória nº 2.200-2/2001 e da Lei nº 14.063/2020. O aceite realizado pela CONTRATANTE no portal da CONTRATADA, com registro de data, hora, identificação do usuário e endereço IP, equivale à assinatura e confirma o conhecimento e a concordância com todas as cláusulas. Este documento somente produz efeitos após a confirmação digital e dentro do prazo de validade da proposta.",
  },
  {
    key: "foro",
    title: "DO FORO",
    mandatory: true,
    body: "Fica eleito o foro da comarca de {{foro}} para dirimir quaisquer controvérsias decorrentes deste contrato, com renúncia a qualquer outro, por mais privilegiado que seja.",
  },
];

const DEFAULT_BY_KEY = new Map(DEFAULT_CLAUSES.map((c) => [c.key, c]));

export function defaultClauses(): Clause[] {
  return DEFAULT_CLAUSES.map((c) => ({ ...c }));
}

/**
 * Garante as cláusulas obrigatórias: mantém o texto editado de cada uma (ou restaura o padrão se ficou
 * em branco), recoloca as que foram removidas e põe as cláusulas adicionais do usuário no fim.
 */
export function ensureMandatoryClauses(clauses: Clause[]): Clause[] {
  const byKey = new Map(clauses.map((c) => [c.key, c]));
  const mandatory = DEFAULT_CLAUSES.map((d) => {
    const edited = byKey.get(d.key);
    return { key: d.key, title: d.title, mandatory: true, body: edited && edited.body.trim() ? edited.body : d.body };
  });
  const custom = clauses
    .filter((c) => !DEFAULT_BY_KEY.has(c.key) && c.title.trim() && c.body.trim())
    .map((c) => ({ key: c.key, title: c.title.trim(), body: c.body, mandatory: false }));
  return [...mandatory, ...custom];
}

export function vigenciaText(termMonths: number | null): string {
  return termMonths
    ? `O presente contrato vigorará pelo prazo de ${termMonths} ${termMonths === 1 ? "mês" : "meses"}, contado do aceite digital da CONTRATANTE, renovando-se automaticamente por períodos iguais e sucessivos, salvo manifestação contrária de qualquer das partes com a antecedência prevista na cláusula de rescisão.`
    : "O presente contrato vigorará por prazo indeterminado, contado do aceite digital da CONTRATANTE, podendo ser rescindido nos termos da cláusula de rescisão.";
}

export function fillClause(body: string, vars: ClauseVars): string {
  const values: Record<string, string> = {
    diaVencimento: String(vars.diaVencimento),
    multa: String(vars.multa).replace(".", ","),
    juros: String(vars.juros).replace(".", ","),
    aviso: String(vars.aviso),
    vigencia: vigenciaText(vars.termMonths),
    foro: vars.foro,
  };
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => values[key] ?? match);
}

export function ordinal(n: number): string {
  return `${n}ª`;
}
