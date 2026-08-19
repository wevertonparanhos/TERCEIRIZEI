"use client";

import { motion } from "framer-motion";
import {
  Target, Eye, Heart, Zap, Shield, Users, TrendingDown, Star,
} from "lucide-react";

const values = [
  { icon: Zap, label: "Agilidade", desc: "Processos rápidos e eficientes", color: "text-yellow-600", bg: "bg-yellow-50 border border-yellow-200" },
  { icon: Shield, label: "Segurança", desc: "Conformidade total com a lei", color: "text-[#14528D]", bg: "bg-[#14528D]/8 border border-[#14528D]/20" },
  { icon: Star, label: "Eficiência", desc: "Máximo resultado com mínimo esforço", color: "text-[#EA7E12]", bg: "bg-[#EA7E12]/8 border border-[#EA7E12]/20" },
  { icon: TrendingDown, label: "Redução de Custos", desc: "Otimização financeira garantida", color: "text-green-600", bg: "bg-green-50 border border-green-200" },
  { icon: Users, label: "Atendimento Humanizado", desc: "Relação próxima e personalizada", color: "text-[#3194BE]", bg: "bg-[#3194BE]/8 border border-[#3194BE]/20" },
  { icon: Target, label: "Gestão Inteligente", desc: "Estratégias baseadas em dados", color: "text-[#1B2558]", bg: "bg-[#1B2558]/6 border border-[#1B2558]/15" },
];

const pillars = [
  {
    icon: Target,
    title: "Missão",
    text: "Auxiliar empreendedores, profissionais e contabilidades a descomplicarem os processos burocráticos, garantindo que empresas sejam criadas, regularizadas e operem dentro da legalidade com segurança e eficiência.",
    color: "from-[#14528D] to-[#1B2558]",
  },
  {
    icon: Eye,
    title: "Visão",
    text: "Ser a referência nacional em terceirização de processos empresariais, reconhecida pela excelência, agilidade e comprometimento com o sucesso de nossos clientes em todo o Brasil.",
    color: "from-[#EA7E12] to-[#F5A23C]",
  },
  {
    icon: Heart,
    title: "Valores",
    text: "Ética, transparência, eficiência, inovação e comprometimento com os resultados dos nossos clientes. Acreditamos que empresas organizadas crescem mais e com menos riscos.",
    color: "from-[#3194BE] to-[#14528D]",
  },
];

const containerV = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const itemV = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function About() {
  return (
    <section id="sobre" className="section-padding relative overflow-hidden bg-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-[#3194BE]/6 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[#EA7E12]/5 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#14528D]/8 border border-[#14528D]/20 text-[#14528D] mb-4">
            Quem somos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            A empresa que cuida da{" "}
            <span className="gradient-text">burocracia</span>{" "}
            para você crescer
          </h2>
          <p className="text-gray-500 text-lg max-w-3xl mx-auto leading-relaxed">
            Fundada por Weverton Paranhos, especialista em legalização empresarial com MBA
            em Recuperação de Empresas pela PUC Minas e consultor estratégico do SEBRAE.
          </p>
        </motion.div>

        {/* CEO & Company Story */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center mb-20">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            {/* CEO Card */}
            <div className="bg-white rounded-2xl p-5 mb-6 flex items-center gap-4 border border-[#14528D]/15 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#14528D] to-[#1B2558] flex items-center justify-center text-white text-xl font-black flex-shrink-0">
                WP
              </div>
              <div>
                <div className="font-bold text-[#1B2558]">Weverton Paranhos</div>
                <div className="text-sm text-[#14528D] font-semibold">CEO & Fundador</div>
                <div className="text-xs text-gray-400 mt-0.5">Bacharel em Direito · MBA PUC Minas · Consultor SEBRAE</div>
              </div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-5">
              A <strong className="text-[#1B2558]">TERCEIRIZEI</strong> foi criada com a missão de auxiliar empreendedores,
              profissionais e contabilidades a descomplicarem os processos burocráticos, garantindo que empresas
              sejam criadas, regularizadas e operem dentro da legalidade com segurança e eficiência.
            </p>

            <p className="text-gray-500 leading-relaxed mb-5">
              Atuamos estrategicamente para que empresários possam focar no crescimento de seus negócios,
              enquanto cuidamos de toda a parte burocrática e gerencial, reduzindo riscos e otimizando processos.
            </p>

            <p className="text-gray-500 leading-relaxed mb-6">
              Nossa expertise em legalização inclui abertura, alteração e encerramento de CNPJs, obtenção de
              alvarás e licenças, regularização fiscal e tributária, planejamento empresarial, estruturação
              societária, definição de CNAEs, enquadramento tributário, compliance regulatório e muito mais.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                "Especialista em Legalização",
                "Consultor SEBRAE",
                "MBA PUC Minas",
                "+6.500 processos/ano",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#14528D] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right - Pillars */}
          <motion.div
            variants={containerV}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="space-y-4"
          >
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <motion.div key={pillar.title} variants={itemV} className="bg-white rounded-2xl p-5 card-lift border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${pillar.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1B2558] mb-1.5">{pillar.title}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{pillar.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        {/* Values Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <h3 className="text-2xl font-bold text-[#1B2558]">Nossos Diferenciais</h3>
        </motion.div>

        <motion.div
          variants={containerV}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <motion.div
                key={value.label}
                variants={itemV}
                className="bg-white rounded-2xl p-4 text-center card-lift shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-10 h-10 rounded-xl ${value.bg} flex items-center justify-center mx-auto mb-3`}>
                  <Icon size={18} className={value.color} />
                </div>
                <div className="text-sm font-bold text-[#1B2558] mb-1">{value.label}</div>
                <div className="text-xs text-gray-400">{value.desc}</div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
