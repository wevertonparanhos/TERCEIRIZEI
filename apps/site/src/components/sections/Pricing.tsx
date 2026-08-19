"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, MessageCircle, Star, TrendingDown, Users, Gift, Building2, Trash2, ArrowRight } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

type PricingTab = "legalizacao" | "gestao" | "licitacoes";

const tabs: { id: PricingTab; label: string }[] = [
  { id: "legalizacao", label: "BPO de Legalização" },
  { id: "gestao", label: "BPO de Gestão" },
  { id: "licitacoes", label: "BPO de Licitações" },
];

const legalizacaoPlans = [
  {
    name: "Essencial",
    price: "1.620",
    period: "/mês",
    description: "Ideal para escritórios com baixo volume de processos",
    highlight: false,
    features: [
      { text: "Até 7 processos por mês", ok: true },
      { text: "Abertura ME/EPP – Junta Comercial", ok: true },
      { text: "Alteração ME/EPP – Junta Comercial", ok: true },
      { text: "Baixa ME/EPP – Junta Comercial", ok: true },
      { text: "Alvarás Funcionamento e Sanitário", ok: true },
      { text: "DBEs", ok: true },
      { text: "Comunicação direta com cliente", ok: false },
      { text: "Acompanhamento de processos", ok: false },
    ],
  },
  {
    name: "Performance",
    price: "2.899,90",
    period: "/mês",
    description: "Perfeito para escritórios em crescimento",
    highlight: true,
    badge: "Mais Popular",
    features: [
      { text: "Até 10 processos por mês", ok: true },
      { text: "Abertura – Junta/Cartório/OAB", ok: true },
      { text: "Alteração – Junta/Cartório/OAB", ok: true },
      { text: "Baixa – Junta/Cartório/OAB", ok: true },
      { text: "Alvarás Funcionamento e Sanitário", ok: true },
      { text: "Atualização de cadastros", ok: true },
      { text: "Emissão de Certidões", ok: true },
      { text: "Comunicação direta com cliente", ok: true },
      { text: "Solicitação de documentos", ok: true },
      { text: "Acompanhamento de processos", ok: true },
    ],
  },
  {
    name: "Enterprise",
    price: "4.499,90",
    period: "/mês",
    description: "Para grandes escritórios sem limites",
    highlight: false,
    badge: "Ilimitado",
    features: [
      { text: "Processos ILIMITADOS", ok: true },
      { text: "Comunicação direta completa", ok: true },
      { text: "Atendimento prioritário", ok: true },
      { text: "Gestão total dos processos", ok: true },
      { text: "Contratos empresariais inclusos", ok: true },
      { text: "Assessoria estratégica inclusa", ok: true },
      { text: "Todos os tipos de processos", ok: true },
      { text: "Suporte dedicado", ok: true },
    ],
  },
];

const avulsoItems = [
  { service: "Abertura ME/EPP – Junta Comercial", price: "R$ 249,90" },
  { service: "Abertura/Cartório/OAB", price: "R$ 449,90" },
  { service: "Abertura Outros modelos/S.A/Terceiro Setor", price: "R$ 599,90" },
  { service: "Alteração ME/EPP – Junta Comercial", price: "R$ 349,90" },
  { service: "Alteração DEMAIS/Cartório/OAB", price: "R$ 549,90" },
  { service: "Alteração Holding/S.A/Terceiro Setor", price: "R$ 699,90" },
  { service: "Baixa CNPJ – Junta Comercial", price: "R$ 249,90" },
  { service: "Baixa CNPJ – Cartório/OAB", price: "R$ 449,90" },
  { service: "Baixa outros modelos/S.A/Terceiro Setor", price: "R$ 499,90" },
  { service: "Alvará de Funcionamento e Sanitário", price: "R$ 200,00" },
  { service: "Cadastros e atualizações", price: "R$ 150,00" },
  { service: "Regularização de Débitos", price: "R$ 499,90" },
  { service: "Emissão de Certidões Negativas", price: "R$ 30,00 cada" },
  { service: "Somente DBEs e Viabilidades", price: "R$ 149,90" },
  { service: "Contratos Empresariais", price: "R$ 799,90" },
  { service: "Assessoramento e Treinamento", price: "R$ 1.499,90 h/a" },
];

export default function Pricing() {
  const [activeTab, setActiveTab] = useState<PricingTab>("legalizacao");
  const [showAvulso, setShowAvulso] = useState(true);

  const msgConsulting = (_plan: string) => WHATSAPP_URL;

  return (
    <section id="planos" className="section-padding relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-[400px] h-[400px] rounded-full bg-[#14528D]/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/3 w-[300px] h-[300px] rounded-full bg-[#EA7E12]/5 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#14528D]/8 border border-[#14528D]/20 text-[#14528D] mb-4">
            Planos e Valores
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            Investimento{" "}
            <span className="gradient-text-orange">transparente</span>{" "}
            e acessível
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Escolha o plano ideal para o seu negócio. Todos os planos incluem atendimento
            especializado e suporte durante todo o processo.
          </p>
        </motion.div>

        {/* Cost comparison banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative mb-10 rounded-2xl overflow-hidden border border-[#14528D]/20 bg-gradient-to-r from-[#14528D]/5 via-white to-[#EA7E12]/5"
        >
          <div className="flex flex-col sm:flex-row items-center gap-5 p-5 sm:p-6">
            {/* Icon block */}
            <div className="flex-shrink-0 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#14528D] to-[#1B2558] flex items-center justify-center shadow-md">
                <TrendingDown size={22} className="text-white" />
              </div>
            </div>
            {/* Text */}
            <div className="flex-1 text-center sm:text-left">
              <p className="text-sm font-black text-[#1B2558] mb-1">
                Assinar um plano custa <span className="text-[#14528D]">menos do que contratar um funcionário.</span>
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                Com a Terceirizei, sua empresa tem uma equipe especializada em legalização e gestão por uma fração do custo de um colaborador CLT — sem encargos trabalhistas, FGTS, férias ou 13º salário. Reduza despesas com folha de pagamento e aumente a eficiência operacional.
              </p>
            </div>
            {/* Badge */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 bg-white border border-green-200 rounded-xl px-4 py-2.5 shadow-sm">
                <Users size={15} className="text-green-600 flex-shrink-0" />
                <div>
                  <div className="text-xs font-black text-green-700 whitespace-nowrap">Sem encargos</div>
                  <div className="text-[10px] text-green-600 whitespace-nowrap">CLT, FGTS, férias, 13º</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? "bg-[#14528D] text-white shadow-lg shadow-[#14528D]/25"
                  : "bg-white text-gray-500 hover:text-[#1B2558] hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* BPO de Legalização */}
          {activeTab === "legalizacao" && (
            <motion.div
              key="legalizacao"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              {/* Toggle Mensal/Avulso */}
              <div className="flex justify-center mb-8">
                <div className="bg-white rounded-xl p-1 flex gap-1 border border-gray-200 shadow-sm">
                  <button
                    onClick={() => setShowAvulso(true)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      showAvulso ? "bg-[#14528D] text-white shadow-sm" : "text-gray-500 hover:text-[#1B2558]"
                    }`}
                  >
                    Avulso
                  </button>
                  <button
                    onClick={() => setShowAvulso(false)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                      !showAvulso ? "bg-[#14528D] text-white shadow-sm" : "text-gray-500 hover:text-[#1B2558]"
                    }`}
                  >
                    Planos Mensais
                  </button>
                </div>
              </div>

              {!showAvulso ? (
                <div className="grid md:grid-cols-3 gap-6 mb-4">
                  {legalizacaoPlans.map((plan, i) => (
                    <motion.div
                      key={plan.name}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={`relative rounded-2xl p-6 flex flex-col ${
                        plan.highlight
                          ? "bg-gradient-to-br from-[#14528D]/8 to-[#1B2558]/5 border-2 border-[#14528D]/30 shadow-xl shadow-[#14528D]/10"
                          : "bg-white border border-gray-200 shadow-sm"
                      }`}
                    >
                      {plan.badge && (
                        <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold border ${
                          plan.highlight
                            ? "bg-[#14528D] text-white border-[#3194BE]/60"
                            : "bg-white text-yellow-600 border-yellow-400/50"
                        }`}>
                          {plan.badge === "Mais Popular" && <Star size={10} className="inline mr-1" />}
                          {plan.badge}
                        </div>
                      )}

                      <div className="mb-5">
                        <h3 className="text-lg font-black text-[#1B2558] mb-1">{plan.name}</h3>
                        <p className="text-xs text-gray-500">{plan.description}</p>
                      </div>

                      <div className="mb-6">
                        <div className="flex items-end gap-1">
                          <span className="text-xs text-gray-500 mb-1">R$</span>
                          <span className="text-4xl font-black text-[#1B2558]">{plan.price}</span>
                          <span className="text-sm text-gray-500 mb-1">{plan.period}</span>
                        </div>
                      </div>

                      <ul className="space-y-2.5 mb-6 flex-1">
                        {plan.features.map((f) => (
                          <li key={f.text} className="flex items-start gap-2.5">
                            {f.ok ? (
                              <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <X size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={`text-xs ${f.ok ? "text-gray-700" : "text-gray-400"}`}>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <motion.a
                        href={msgConsulting(`Plano ${plan.name} – BPO de Legalização`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                          plan.highlight
                            ? "bg-[#14528D] hover:bg-[#1E6BAD] text-white shadow-lg btn-glow"
                            : "bg-white border border-gray-200 text-[#14528D] hover:bg-gray-50 hover:border-[#14528D]/30"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <MessageCircle size={15} />
                        Contratar Plano
                      </motion.a>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
                >
                  <div className="grid grid-cols-2 bg-[#1B2558]/5 p-4 border-b border-gray-200">
                    <span className="text-sm font-bold text-[#1B2558]">Serviço</span>
                    <span className="text-sm font-bold text-[#1B2558] text-right">Valor Avulso</span>
                  </div>
                  {avulsoItems.map((item, i) => (
                    <div
                      key={item.service}
                      className={`grid grid-cols-2 p-3.5 items-center ${
                        i % 2 === 0 ? "bg-gray-50/50" : "bg-white"
                      } hover:bg-[#14528D]/5 transition-colors border-b border-gray-100`}
                    >
                      <span className="text-sm text-gray-600 pr-4">{item.service}</span>
                      <span className="text-sm font-bold text-[#14528D] text-right">{item.price}</span>
                    </div>
                  ))}
                  <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
                    <p className="text-xs text-gray-500">* Não inclusos taxas, deslocamento e despachante quando necessários.</p>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {/* BPO de Gestão */}
          {activeTab === "gestao" && (
            <motion.div
              key="gestao"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-2xl mx-auto"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative rounded-2xl bg-white border-2 border-[#EA7E12]/25 shadow-xl p-8"
              >
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold bg-[#EA7E12] text-white">
                  Essencial – Gestão Administrativa
                </div>

                <div className="text-center mb-8">
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-sm text-gray-500 mb-1">R$</span>
                    <span className="text-5xl font-black text-[#1B2558]">1.620</span>
                    <span className="text-lg text-gray-500 mb-1">/mês</span>
                  </div>
                  <p className="text-gray-500 text-sm">Gestão administrativa completa para profissionais e empresas</p>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  {[
                    "Atendimento via WhatsApp ao cliente",
                    "Controle de Contas",
                    "Gestão de Atendimentos",
                    "Emissão de Notas Fiscais",
                    "Controle de Fluxo de Caixa",
                    "Reuniões Mensais de acompanhamento",
                    "Apoio na precificação de serviços",
                    "Estruturação de serviços",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <Check size={14} className="text-[#EA7E12] mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-8 pt-6 border-t border-gray-200">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-[#1B2558]">R$ 528,00</div>
                    <div className="text-xs text-gray-500">Alterações e Atualizações no CNPJ</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
                    <div className="text-lg font-black text-[#1B2558]">R$ 849,00</div>
                    <div className="text-xs text-gray-500">Implantação de Sistemas</div>
                  </div>
                </div>

                <motion.a
                  href={msgConsulting("Essencial – BPO de Gestão")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-4 rounded-xl bg-[#EA7E12] hover:bg-[#C96A08] text-white font-bold text-sm transition-colors shadow-xl w-full"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <MessageCircle size={16} />
                  Contratar BPO de Gestão
                </motion.a>
              </motion.div>
            </motion.div>
          )}

          {/* BPO de Licitações */}
          {activeTab === "licitacoes" && (
            <motion.div
              key="licitacoes"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="max-w-3xl mx-auto"
            >
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Mensal */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="relative rounded-2xl bg-white border-2 border-[#3194BE]/30 shadow-xl p-6 flex flex-col"
                >
                  <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full text-xs font-bold bg-[#3194BE] text-white">
                    Mensal
                  </div>
                  <div className="mb-5 mt-2">
                    <div className="text-3xl font-black text-[#1B2558] mb-0.5">R$ 999,90</div>
                    <div className="text-sm text-gray-500">/mês + taxa de sucesso</div>
                    <div className="mt-2 text-xs text-[#3194BE] font-semibold">+ 10% do valor da 1ª parcela do contrato efetivado</div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {[
                      "Busca de licitações ao perfil da empresa",
                      "Auxílio na preparação dos documentos",
                      "Participação nos lances e envio de propostas",
                      "Acompanhamento até a conclusão do processo",
                      "Suporte especializado",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check size={14} className="text-[#3194BE] mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.a
                    href={msgConsulting("Mensal – BPO de Licitações")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#3194BE] hover:bg-[#14528D] text-white font-bold text-sm transition-colors shadow-lg"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MessageCircle size={15} />
                    Contratar Mensal
                  </motion.a>
                </motion.div>

                {/* Avulso */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative rounded-2xl bg-white border border-gray-200 shadow-sm p-6 flex flex-col"
                >
                  <div className="absolute -top-3.5 left-6 px-3 py-1 rounded-full text-xs font-bold bg-white border border-gray-200 text-gray-600 shadow-sm">
                    Avulso por processo
                  </div>
                  <div className="mb-5 mt-2">
                    <div className="text-3xl font-black text-[#1B2558] mb-0.5">R$ 499,90</div>
                    <div className="text-sm text-gray-500">/processo + taxa de sucesso</div>
                    <div className="mt-2 text-xs text-[#14528D] font-semibold">+ 10% do valor da 1ª parcela do contrato efetivado</div>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {[
                      "Consultoria avulsa por licitação",
                      "Análise do edital",
                      "Preparação documental",
                      "Suporte durante o processo",
                      "Sem mensalidade",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2.5">
                        <Check size={14} className="text-[#14528D] mt-0.5 flex-shrink-0" />
                        <span className="text-xs text-gray-700">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <motion.a
                    href={msgConsulting("Avulso – BPO de Licitações")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-gray-200 text-[#14528D] font-bold text-sm hover:bg-gray-50 hover:border-[#14528D]/30 transition-all"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <MessageCircle size={15} />
                    Contratar Avulso
                  </motion.a>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-xs text-gray-400 mt-8"
        >
          * Não estão inclusos nos valores: taxas, deslocamento e despachante quando necessários.
          Atendemos todo o Brasil.
        </motion.p>

        {/* Free trial section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#1B2558] via-[#14528D] to-[#3194BE]" />
          <div className="absolute inset-0 grid-pattern opacity-10" />
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-[#EA7E12]/15 blur-[60px]" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/5 blur-[60px]" />

          <div className="relative p-8 sm:p-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-[#EA7E12] flex items-center justify-center shadow-lg flex-shrink-0">
                <Gift size={26} className="text-white" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-[#EA7E12]/20 border border-[#EA7E12]/40 rounded-full px-3 py-1 mb-2">
                  <span className="w-2 h-2 rounded-full bg-[#EA7E12] animate-pulse" />
                  <span className="text-xs font-bold text-[#F5A23C] uppercase tracking-wider">Oferta exclusiva</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                  Faça o teste conosco{" "}
                  <span className="text-[#F5A23C]">gratuito</span>
                </h3>
                <p className="text-blue-200 text-sm mt-1">
                  Experimente nossa qualidade sem pagar nada. Sem compromisso.
                </p>
              </div>
            </div>

            {/* Services */}
            <div className="mb-8">
              <p className="text-xs font-bold text-blue-300 uppercase tracking-widest mb-4">
                Serviços que se habilitam:
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="flex items-start gap-3 bg-white/10 border border-white/15 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EA7E12]/25 border border-[#EA7E12]/40 flex items-center justify-center flex-shrink-0">
                    <Building2 size={18} className="text-[#F5A23C]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">Abertura de CNPJ</div>
                    <div className="text-xs text-blue-200">MEI, ME ou EPP na Junta Comercial</div>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <span className="text-[10px] font-black text-[#F5A23C] bg-[#EA7E12]/20 border border-[#EA7E12]/40 rounded-full px-2 py-0.5">GRÁTIS</span>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-white/10 border border-white/15 rounded-2xl p-4">
                  <div className="w-10 h-10 rounded-xl bg-[#EA7E12]/25 border border-[#EA7E12]/40 flex items-center justify-center flex-shrink-0">
                    <Trash2 size={18} className="text-[#F5A23C]" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white mb-0.5">Baixa de CNPJ</div>
                    <div className="text-xs text-blue-200">MEI, ME ou EPP na Junta Comercial</div>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <span className="text-[10px] font-black text-[#F5A23C] bg-[#EA7E12]/20 border border-[#EA7E12]/40 rounded-full px-2 py-0.5">GRÁTIS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <motion.a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 bg-[#EA7E12] hover:bg-[#F5A23C] text-white font-black rounded-2xl transition-all shadow-xl text-sm"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <MessageCircle size={17} />
                Quero testar gratuitamente
                <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
              </motion.a>
              <p className="text-xs text-blue-300 text-center sm:text-left">
                Sujeito a disponibilidade · Taxas governamentais não inclusas
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
