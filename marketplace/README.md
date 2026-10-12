# Marketplace de serviços residenciais

Plataforma que conecta clientes a profissionais autônomos (limpeza, reparos,
pintura e mais), com **preço claro antes da contratação** e **pagamento
antecipado pela plataforma**. Nome comercial provisório: **Lar Pronto**
(configurável em `NEXT_PUBLIC_BRAND_NAME`).

Projeto independente dentro do repositório TERCEIRIZEI (não usa os workspaces
do monorepo).

## Stack

| Camada | Tecnologia |
| --- | --- |
| App | Next.js 15 (App Router, Server Actions), React 19, TypeScript estrito |
| UI | Tailwind CSS v4 (tokens em `src/app/globals.css`), componentes próprios acessíveis, lucide-react |
| Validação | Zod 4 (toda entrada é validada no servidor) |
| Banco | PostgreSQL (Supabase) + Prisma 6 |
| Auth | Supabase Auth (e-mail/senha, confirmação de e-mail, recuperação de senha) |
| Testes | Vitest (domínio). Playwright entra na Fase 5 |

## Estrutura

```
marketplace/
├─ prisma/
│  ├─ schema.prisma          # modelo de dados (fonte da verdade)
│  └─ sql/                   # migrações versionadas, aplicadas em ordem
│     ├─ 001_schema.sql      # gerado do schema (npm run db:sql)
│     ├─ 002_security.sql    # auth trigger, CHECKs, anti-sobreposição, imutabilidade, RLS
│     ├─ 003_seed_catalog.sql# 12 categorias, serviços, pacotes, adicionais, configurações
│     ├─ 004_hardening.sql   # ajustes do Security Advisor
│     ├─ 005_provider_pricing.sql # preço definido pelo profissional + comissão acrescida
│     ├─ 006_reviews.sql     # avaliações (critérios, tags, resposta, moderação, média por gatilho)
│     └─ dev/                # SÓ DEV: seed_demo.sql (profissionais) e seed_demo_reviews.sql (avaliações) fictícios
├─ scripts/promote-admin.ts  # cria o primeiro administrador com segurança
└─ src/
   ├─ domain/                # regras de negócio PURAS e testadas (sem framework)
   │  ├─ money.ts            # centavos inteiros, bps, arredondamento exato
   │  ├─ pricing.ts          # motor de preço (comissão, descontos, taxas, repasse)
   │  ├─ commission.ts       # resolução campanha > serviço > categoria > global
   │  ├─ booking-state.ts    # máquina de estados do pedido + regra de liberação de contato
   │  └─ permissions.ts      # RBAC (cliente, profissional, suporte, admin)
   ├─ server/                # acesso a dados e autorização (server-only)
   ├─ components/            # UI
   └─ app/                   # rotas: (site) público, conta/, profissional/, admin/
```

## Regra de preço (decisão do negócio)

O **profissional define o próprio preço** para cada pacote, adicional ou
unidade (m², hora). A plataforma **acrescenta a comissão** (padrão 20%,
configurável global e por categoria):

> Profissional cobra R$ 200,00 → cliente paga **R$ 240,00** → profissional
> recebe R$ 200,00 → plataforma retém R$ 40,00.

O modo "comissão embutida" (`pricing.commissionMode = INCLUDED`) também existe
e está testado. Taxas do meio de pagamento são contabilizadas separadamente e o
administrador define quem as suporta.

## Avaliações (estilo Airbnb/Uber)

- Nota geral 1–5 obrigatória; notas por critério opcionais (pontualidade, qualidade, comunicação, cuidado com o imóvel, custo-benefício).
- Elogios rápidos para notas 4–5 e "o que pode melhorar" para 1–3; nota 1–2 exige comentário.
- Perfil público em `/profissionais/[id]`: média (ou "Novo" com menos de 3 avaliações), distribuição por estrela, médias por critério, elogios mais citados e lista com resposta do profissional.
- Só o cliente de um pedido **concluído** avalia, uma vez, em até 14 dias. Nota e comentário são imutáveis; o profissional responde uma vez; admin/suporte moderam (ocultar/sinalizar) com auditoria. O banco garante essas regras e recalcula a média do profissional.
- Nome do avaliador exibido minimizado ("Maria L.").

## Rodando localmente

```bash
cd marketplace
npm install
cp .env.example .env.local   # preencha (veja abaixo)
npm run dev                  # http://localhost:3004
```

Variáveis obrigatórias (`.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase → Project Settings → API.
- `DATABASE_URL` (Transaction pooler, porta 6543, `?pgbouncer=true&connection_limit=1`) e `DIRECT_URL` (Session pooler, 5432): Supabase → Project Settings → Database → Connection string.

No painel do Supabase (Authentication → URL Configuration), configure:

- **Site URL**: `http://localhost:3004` (em produção, o domínio real)
- **Redirect URLs**: `http://localhost:3004/auth/callback`

### Banco de dados

Aplique os arquivos de `prisma/sql/` **em ordem** (SQL Editor do Supabase ou
`psql`). Depois de mudar `schema.prisma`, gere o SQL de referência com
`npm run db:sql` e escreva a migração incremental seguinte (`006_...sql`).

### Primeiro administrador (sem senha fixa)

1. Cadastre-se normalmente em `/cadastro` e confirme o e-mail.
2. Rode `npm run admin:promote -- seu@email.com`.
3. Novos admins/suporte são promovidos pelo painel (`/admin/usuarios`), com auditoria.

## Comandos

| Comando | O que faz |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento (porta 3004) |
| `npm test` | testes do domínio (Vitest) |
| `npm run typecheck` | verificação de tipos |
| `npm run lint` | ESLint |
| `npm run build` | build de produção |
| `npm run db:sql` | SQL completo gerado do `schema.prisma` |
| `npm run admin:promote -- email` | promove usuário a administrador |

## Segurança implementada (Fase 1)

- Papel do usuário vem **do banco**, nunca do navegador. O cadastro só aceita
  CUSTOMER ou PROVIDER (gatilho no banco); ADMIN/SUPORTE só por script/painel.
- Toda Server Action valida com Zod e checa permissão (`requirePermission`).
  Recursos "próprios" (perfil, preços) são resolvidos pela sessão, nunca por id do formulário.
- RLS ligada em todas as tabelas: a chave pública do navegador só lê o catálogo publicado.
- PostgreSQL impede: reservas sobrepostas do mesmo profissional (exclusion
  constraint), alteração de preço/comissão de pedido confirmado (gatilho),
  totais inconsistentes (CHECK), edição/remoção de auditoria e histórico.
- Comissões nunca são editadas: a regra antiga é encerrada e uma nova criada (histórico).
- Ações administrativas gravam auditoria **na mesma transação** da mudança.
- Logout só por POST; redirecionamentos só para caminhos internos; cabeçalhos de segurança.

## Roadmap

- [x] **Fase 1 — Fundação**: banco, migrações, auth, RBAC, catálogo, preços dos profissionais, motor de preço, máquina de estados, painel admin.
- [ ] **Fase 2 — Marketplace**: busca por região, endereços, disponibilidade/agenda, escolha de profissional, criação do pedido com reserva temporária.
- [ ] **Fase 3 — Pagamentos**: adaptador de provedor (avaliar Mercado Pago/Asaas com split), adaptador SIMULADO para dev, webhooks idempotentes, reembolsos, repasses.
- [ ] **Fase 4 — Operação**: liberação de contato, notificações, avaliações, suporte, documentos, relatórios.
- [ ] **Fase 5 — Lançamento**: Playwright (18 cenários do briefing), monitoramento, backups, checklist jurídico, deploy.

## Pendências conhecidas

- Termos de uso, privacidade e política de cancelamento são **minutas** e exigem revisão jurídica.
- Taxas do provedor de pagamento estão em 0 até haver contrato (`payments.estimatedFee`).
- E-mail transacional usa o SMTP padrão do Supabase (limite baixo de envios/hora): configurar SMTP próprio antes de produção.
