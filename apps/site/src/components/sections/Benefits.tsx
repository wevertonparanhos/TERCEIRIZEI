"use client";

import { motion } from "framer-motion";
import { Clock, ShieldCheck, TrendingUp, Scale, Users2, Layers } from "lucide-react";

const benefits = [
  {
    icon: Clock,
    title: "Liberação de Tempo e Recursos",
    description:
      "Delegar os processos de legalização e gestão permite que seu escritório foque nas atividades principais, aumentando a produtividade e eficiência. Economize horas preciosas toda semana.",
    highlight: "Até 15h semanais economizadas",
    color: "from-[#14528D] to-[#1B2558]",
    textColor: "text-[#14528D]",
    bg: "bg-[#14528D]/5",
    border: "border-[#14528D]/15",
  },
  {
    icon: ShieldCheck,
    title: "Redução de Riscos Jurídicos",
    description:
      "Com nossa assessoria, você minimiza a exposição a penalidades e problemas jurídicos, garantindo que todos os processos estejam em total conformidade com a legislação vigente.",
    highlight: "100% em conformidade legal",
    color: "from-[#EA7E12] to-[#C96A08]",
    textColor: "text-[#EA7E12]",
    bg: "bg-[#EA7E12]/5",
    border: "border-[#EA7E12]/15",
  },
  {
    icon: TrendingUp,
    title: "Aumento de Eficiência e Credibilidade",
    description:
      "Processos otimizados e seguros não só aceleram a entrega dos serviços, mas também fortalecem a reputação da sua empresa no mercado, atraindo e fidelizando mais clientes.",
    highlight: "Reputação e credibilidade elevadas",
    color: "from-emerald-500 to-emerald-700",
    textColor: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  {
    icon: Scale,
    title: "Escalabilidade Empresarial",
    description:
      "Com processos estruturados e a burocracia sob controle, sua empresa ganha a base necessária para crescer com velocidade e segurança, sem gargalos operacionais.",
    highlight: "Crescimento sem limitações",
    color: "from-[#3194BE] to-[#14528D]",
    textColor: "text-[#3194BE]",
    bg: "bg-[#3194BE]/5",
    border: "border-[#3194BE]/15",
  },
  {
    icon: Users2,
    title: "Atendimento Especializado",
    description:
      "Cada empresa recebe atenção personalizada de especialistas com anos de experiência em legalização, gestão e consultoria. Seu negócio tem características únicas e merece soluções únicas.",
    highlight: "Atendimento 100% personalizado",
    color: "from-[#F5A23C] to-[#EA7E12]",
    textColor: "text-[#F5A23C]",
    bg: "bg-[#F5A23C]/5",
    border: "border-[#F5A23C]/15",
  },
  {
    icon: Layers,
    title: "Estratégia Personalizada",
    description:
      "Desenvolvemos estratégias alinhadas ao seu segmento, porte e objetivos. Não usamos soluções genéricas — cada plano é construído especificamente para a realidade do seu negócio.",
    highlight: "Plano estratégico sob medida",
    color: "from-[#1B2558] to-[#14528D]",
    textColor: "text-[#1B2558]",
    bg: "bg-[#1B2558]/5",
    border: "border-[#1B2558]/12",
  },
];

export default function Benefits() {
  return (
    <section id="beneficios" className="section-padding relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#14528D]/5 blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] rounded-full bg-[#EA7E12]/5 blur-[120px]" />
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
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-emerald-50 border border-emerald-200 text-emerald-600 mb-4">
            Por que nos escolher
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            Benefícios que{" "}
            <span className="gradient-text">transformam</span>{" "}
            sua empresa
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Mais do que um prestador de serviços, somos um parceiro estratégico comprometido
            com o crescimento sustentável do seu negócio.
          </p>
        </motion.div>

        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`group relative bg-white rounded-2xl p-6 border ${benefit.border} hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.color} opacity-0 group-hover:opacity-[0.03] transition-opacity`} />

                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${benefit.color} flex items-center justify-center mb-4 shadow-md`}>
                  <Icon size={22} className="text-white" />
                </div>

                <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${benefit.bg} border ${benefit.border} ${benefit.textColor} mb-3`}>
                  {benefit.highlight}
                </span>

                <h3 className="text-base font-bold text-[#1B2558] mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{benefit.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom banner */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mt-16 relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#1B2558] via-[#14528D] to-[#1B2558] p-8 text-center"
        >
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute -top-20 -right-20 w-60 h-60 rounded-full bg-[#3194BE]/20 blur-[60px]" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full bg-[#EA7E12]/10 blur-[60px]" />
          <div className="relative">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-2">
              Atendemos todo o Brasil
            </h3>
            <p className="text-blue-200 mb-6 max-w-xl mx-auto">
              De Norte a Sul, a Terceirizei está presente onde sua empresa precisa.
              100% remoto, sem fronteiras, com total segurança e eficiência.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Abertura de empresa", "Regularização fiscal", "Alvarás e licenças", "Gestão estratégica", "BPO financeiro"].map((tag) => (
                <span key={tag} className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm text-white font-medium">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
