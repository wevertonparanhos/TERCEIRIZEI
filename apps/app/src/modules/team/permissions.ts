/** Permissões de cada papel, no mesmo formato da tela de Permissões do FreelaPRO.
 *
 * ATENÇÃO: este catálogo descreve o que o sistema já faz hoje — cada linha foi
 * conferida contra as checagens de papel do código (menus e ações). O acesso é por
 * PAPEL (não por pessoa); quando uma regra mudar no código, ajuste aqui também. */

export type StaffRole = "ADMIN" | "GESTOR" | "OPERACIONAL" | "FINANCEIRO";

export const STAFF_ROLES: StaffRole[] = ["ADMIN", "GESTOR", "OPERACIONAL", "FINANCEIRO"];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERACIONAL: "Operacional",
  FINANCEIRO: "Financeiro",
};

export const ROLE_DESCRIPTIONS: Record<StaffRole, string> = {
  ADMIN: "Acesso total, incluindo equipe e papéis.",
  GESTOR: "Gerencia clientes, tarefas, propostas e financeiro; não mexe na equipe.",
  OPERACIONAL: "Trabalha nas tarefas em que é responsável; sem financeiro nem propostas.",
  FINANCEIRO: "Vê tarefas e o financeiro; não edita tarefas nem clientes.",
};

type Level = boolean | "limitado";

export type PermissionRow = {
  label: string;
  hint?: string;
  roles: Record<StaffRole, Level>;
};

export const PERMISSION_GROUPS: { title: string; rows: PermissionRow[] }[] = [
  {
    title: "Tarefas e Área de Trabalho",
    rows: [
      {
        label: "Acessar a Área de Trabalho",
        hint: "Operacional vê apenas as tarefas em que é responsável.",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: "limitado", FINANCEIRO: true },
      },
      {
        label: "Criar tarefas e gerenciar áreas/etapas",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
      {
        label: "Editar tarefas (dados, checklist, impedimentos, informações)",
        hint: "Operacional edita só as tarefas em que é responsável.",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: "limitado", FINANCEIRO: false },
      },
      {
        label: "Gerenciar categorias",
        hint: "Criar e trocar a categoria de uma tarefa.",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: false },
      },
      {
        label: "Tarefas recorrentes (ver)",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: false },
      },
      {
        label: "Tarefas recorrentes (criar e gerenciar)",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
    ],
  },
  {
    title: "Clientes",
    rows: [
      { label: "Ver clientes", roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: true } },
      {
        label: "Cadastrar e editar clientes",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
      {
        label: "Gerenciar portal do cliente",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
      {
        label: "Relatório mensal do cliente",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: true },
      },
    ],
  },
  {
    title: "Financeiro e propostas",
    rows: [
      {
        label: "Acessar dados financeiros",
        hint: "Menu Financeiro e valores no Dashboard.",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: true },
      },
      {
        label: "Ver propostas",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: true },
      },
      {
        label: "Criar, editar e excluir propostas",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
    ],
  },
  {
    title: "Geral",
    rows: [
      { label: "Acessar o calendário", roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: true } },
      { label: "Usar o chat com clientes", roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: false } },
      {
        label: "Licenças e certidões (ver)",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: true, FINANCEIRO: true },
      },
      {
        label: "Licenças e certidões (gerenciar)",
        roles: { ADMIN: true, GESTOR: true, OPERACIONAL: false, FINANCEIRO: false },
      },
      {
        label: "Gerenciar equipe, papéis e acessos",
        roles: { ADMIN: true, GESTOR: false, OPERACIONAL: false, FINANCEIRO: false },
      },
    ],
  },
];
