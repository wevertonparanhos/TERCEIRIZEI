"use client";

import { motion } from "framer-motion";
import { Search, ClipboardList, Rocket, BarChart2, TrendingUp } from "lucide-react";

const steps = [
  {
    step: "01",
    icon: Search,
    title: "Diagnóstico",
    description:
      "Realizamos uma análise completa da situação atual da sua empresa: processos, documentação, regularidade fiscal, estrutura societária e oportunidades de melhoria.",
    color: "from-[#14528D] to-[#1B2558]",
    glowColor: "rgba(20,82,141,0.2)",
  },
  {
    step: "02",
    icon: ClipboardList,
    title: "Planejamento",
    description:
      "Desenvolvemos um plano estratégico personalizado com cronograma, prioridades e metas claras, alinhado aos objetivos e necessidades do seu negócio.",
    color: "from-[#EA7E12] to-[#C96A08]",
    glowColor: "rgba(234,126,18,0.2)",
  },
  {
    step: "03",
    icon: Rocket,
    title: "Execução",
    description:
      "Nossa equipe especializada executa todos os processos com agilidade e precisão, cuidando de toda a burocracia enquanto você foca no seu negócio.",
    color: "from-[#3194BE] to-[#14528D]",
    glowColor: "rgba(49,148,190,0.2)",
  },
  {
    step: "04",
    icon: BarChart2,
    title: "Acompanhamento",
    description:
      "Monitoramos continuamente cada processo, enviando atualizações regulares e garantindo que tudo esteja em conformidade com a legislação vigente.",
    color: "from-[#F5A23C] to-[#EA7E12]",
    glowColor: "rgba(245,162,60,0.2)",
  },
  {
    step: "05",
    icon: TrendingUp,
    title: "Crescimento",
    description:
      "Com a burocracia resolvida, sua empresa opera com mais eficiência, credibilidade e segurança jurídica, criando as bases sólidas para o crescimento sustentável.",
    color: "from-emerald-500 to-emerald-700",
    glowColor: "rgba(16,185,129,0.2)",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="section-padding relative overflow-hidden bg-white">
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#3194BE]/8 border border-[#3194BE]/20 text-[#3194BE] mb-4">
            Como Funciona
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            Do diagnóstico ao{" "}
            <span className="gradient-text">crescimento</span>{" "}
            em 5 etapas
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Nosso processo é simples, transparente e eficiente. Acompanhamos cada etapa
            para garantir os melhores resultados para o seu negócio.
          </p>
        </motion.div>

        {/* Timeline - Desktop */}
        <div className="hidden lg:block">
          <div className="relative">
            <div className="absolute top-[52px] left-[10%] right-[10%] h-px bg-gradient-to-r from-[#14528D]/30 via-[#3194BE]/30 to-emerald-400/30" />
            <div className="grid grid-cols-5 gap-6">
              {steps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.step}
                    initial={{ opacity: 0, y: 40 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: i * 0.15 }}
                    className="flex flex-col items-center text-center"
                  >
                    <motion.div
                      className={`relative w-[104px] h-[104px] rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-xl flex-shrink-0 z-10`}
                      style={{ boxShadow: `0 8px 32px ${step.glowColor}` }}
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon size={32} className="text-white" />
                      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-sm">
                        <span className="text-[10px] font-black text-[#1B2558]">{step.step}</span>
                      </div>
                    </motion.div>

                    <h3 className="text-base font-bold text-[#1B2558] mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Timeline - Mobile */}
        <div className="lg:hidden space-y-4">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center flex-shrink-0 shadow-md`}
                  >
                    <Icon size={20} className="text-white" />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-gradient-to-b from-gray-300 to-transparent mt-2 min-h-[32px]" />
                  )}
                </div>

                <div className="pb-6 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      Etapa {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#1B2558] mb-1.5">{step.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 bg-[#1B2558] rounded-2xl p-6 text-center"
        >
          <p className="text-white/90 text-lg">
            <span className="text-white font-bold">Simples assim.</span>{" "}
            Você foca no que é essencial para o seu negócio.{" "}
            <span className="text-[#3194BE] font-semibold">Nós cuidamos do resto.</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
