"use client";

import { motion } from "framer-motion";
import {
  FileText, BarChart3, Settings, DollarSign, Users, BookOpen,
  GitBranch, Target, ArrowRight, Gavel, Building2,
} from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

const services = [
  {
    icon: FileText,
    title: "BPO de Legalização",
    subtitle: "Terceirização completa",
    description:
      "Abertura, alteração e encerramento de CNPJs, alvarás, licenças, regularização fiscal e tributária. Processos ágeis com segurança jurídica.",
    benefits: ["Abertura de empresa", "Alvarás e licenças", "Regularização fiscal", "Certidões negativas"],
    gradient: "from-[#14528D] to-[#1B2558]",
    glow: "group-hover:shadow-[#14528D]/20",
    badge: "Mais Popular",
    badgeColor: "bg-[#14528D]/10 text-[#14528D] border-[#14528D]/25",
  },
  {
    icon: BarChart3,
    title: "BPO de Gestão",
    subtitle: "Gestão administrativa",
    description:
      "Atendimento ao cliente, controle de contas, gestão de atendimentos, emissão de notas fiscais, fluxo de caixa e reuniões mensais de acompanhamento.",
    benefits: ["Emissão de NF", "Fluxo de caixa", "Controle de contas", "Reuniões mensais"],
    gradient: "from-[#EA7E12] to-[#C96A08]",
    glow: "group-hover:shadow-[#EA7E12]/20",
  },
  {
    icon: Gavel,
    title: "BPO de Licitações",
    subtitle: "Participação em licitações",
    description:
      "Busca de licitações alinhadas ao perfil da empresa, auxílio na documentação, participação nos lances e acompanhamento até a conclusão.",
    benefits: ["Busca de licitações", "Preparação documental", "Participação em lances", "Taxa de sucesso"],
    gradient: "from-[#3194BE] to-[#14528D]",
    glow: "group-hover:shadow-[#3194BE]/20",
  },
  {
    icon: Building2,
    title: "Consultoria Empresarial",
    subtitle: "Diagnóstico e estratégia",
    description:
      "Análise completa do negócio, estruturação societária, definição de CNAEs, enquadramento tributário e compliance regulatório.",
    benefits: ["Estrutura societária", "Enquadramento tributário", "Compliance", "Planejamento"],
    gradient: "from-[#1B2558] to-[#14528D]",
    glow: "group-hover:shadow-[#1B2558]/20",
  },
  {
    icon: Target,
    title: "Gestão Estratégica",
    subtitle: "Crescimento planejado",
    description:
      "Otimização de processos internos, planejamento estratégico e consultoria para empresários focarem no crescimento do negócio.",
    benefits: ["Otimização de processos", "Planejamento estratégico", "Metas e KPIs", "Gestão de resultados"],
    gradient: "from-emerald-600 to-emerald-800",
    glow: "group-hover:shadow-emerald-500/20",
  },
  {
    icon: BookOpen,
    title: "Treinamentos Corporativos",
    subtitle: "Capacitação profissional",
    description:
      "Assessoramento e treinamentos especializados para equipes e gestores sobre legalização, processos e boas práticas empresariais.",
    benefits: ["Treinamentos in company", "Material didático", "Certificados", "Assessoramento"],
    gradient: "from-yellow-600 to-yellow-900",
    glow: "group-hover:shadow-yellow-500/20",
  },
  {
    icon: GitBranch,
    title: "Estruturação de Processos",
    subtitle: "Organização operacional",
    description:
      "Mapeamento e estruturação dos processos internos da empresa, criando fluxos eficientes e escaláveis para o crescimento sustentável.",
    benefits: ["Mapeamento de processos", "Fluxogramas", "Manuais operacionais", "Padronização"],
    gradient: "from-red-500 to-red-700",
    glow: "group-hover:shadow-red-500/20",
  },
  {
    icon: DollarSign,
    title: "Planejamento Empresarial",
    subtitle: "Visão de futuro",
    description:
      "Apoio na precificação e estruturação de serviços, planejamento financeiro e operacional para maximizar a lucratividade.",
    benefits: ["Precificação estratégica", "Planejamento financeiro", "Metas de crescimento", "Dashboard gerencial"],
    gradient: "from-[#F5A23C] to-[#EA7E12]",
    glow: "group-hover:shadow-indigo-500/20",
  },
];

const containerV = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardV = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export default function Services() {
  return (
    <section id="servicos" className="section-padding relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[400px] h-[400px] rounded-full bg-[#3194BE]/6 blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[350px] h-[350px] rounded-full bg-[#EA7E12]/5 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#EA7E12]/8 border border-[#EA7E12]/20 text-[#EA7E12] mb-4">
            Nossos Serviços
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            Soluções completas para{" "}
            <span className="gradient-text-orange">cada necessidade</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Oferecemos um ecossistema completo de serviços para sua empresa operar com
            eficiência, segurança jurídica e foco no crescimento.
          </p>
        </motion.div>

        {/* Services Grid */}
        <motion.div
          variants={containerV}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
        >
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.title}
                variants={cardV}
                className={`group relative bg-white rounded-2xl p-5 border border-gray-200 hover:border-gray-300 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-2 hover:shadow-xl ${service.glow}`}
              >
                {/* Badge */}
                {service.badge && (
                  <span className={`absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded-full border ${service.badgeColor}`}>
                    {service.badge}
                  </span>
                )}

                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

                {/* Icon */}
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${service.gradient} flex items-center justify-center mb-4`}>
                  <Icon size={22} className="text-white" />
                </div>

                {/* Content */}
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">{service.subtitle}</div>
                <h3 className="text-base font-bold text-[#1B2558] mb-2">{service.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{service.description}</p>

                {/* Benefits */}
                <ul className="space-y-1.5 mb-4">
                  {service.benefits.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="w-1 h-1 rounded-full bg-[#14528D] flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#14528D] hover:text-[#3194BE] transition-colors group/link"
                >
                  Saiba mais
                  <ArrowRight size={12} className="group-hover/link:translate-x-1 transition-transform" />
                </a>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 mb-4">Não encontrou o que precisa? Fale conosco!</p>
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#14528D] to-[#1B2558] hover:from-[#1E6BAD] hover:to-[#243070] text-white font-bold rounded-2xl transition-all duration-300 shadow-xl btn-glow"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Solicitar Consultoria Personalizada
            <ArrowRight size={18} />
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
