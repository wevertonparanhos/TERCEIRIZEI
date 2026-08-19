"use client";

import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Shield, TrendingUp, Users, Award, Gift, Building2, Trash2 } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

const floatingCards = [
  { icon: Shield, label: "Legalização Segura", color: "from-[#14528D] to-[#1B2558]" },
  { icon: TrendingUp, label: "Gestão Estratégica", color: "from-[#EA7E12] to-[#F5A23C]" },
  { icon: Users, label: "BPO Completo", color: "from-[#3194BE] to-[#14528D]" },
  { icon: Award, label: "+6.500 Processos/Ano", color: "from-[#1B2558] to-[#14528D]" },
];

const stats = [
  { value: "+6.500", label: "Processos/Ano" },
  { value: "+200", label: "Consultorias" },
  { value: "+50", label: "Profissionais" },
  { value: "100%", label: "Brasil" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1] } },
};

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative min-h-screen flex items-center overflow-hidden bg-white mesh-bg grid-pattern"
    >
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[#3194BE]/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#EA7E12]/6 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#14528D]/5 blur-[160px]" />

        {/* Geometric shapes */}
        <motion.div
          className="absolute top-20 right-[10%] w-20 h-20 border border-[#14528D]/15 rounded-2xl"
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute bottom-40 right-[20%] w-12 h-12 border border-[#EA7E12]/20 rounded-xl"
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute top-1/3 left-[5%] w-8 h-8 bg-[#14528D]/8 rounded-lg"
          animate={{ y: [-10, 10, -10] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #14528D 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div variants={itemVariants}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#14528D]/8 border border-[#14528D]/20 text-sm font-semibold text-[#14528D] mb-6">
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
                Atendemos todo o Brasil · CNPJ 50.821.759/0001-03
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-6 text-[#1B2558]"
            >
              Terceirizamos{" "}
              <span className="shimmer-text">processos</span>{" "}
              para sua empresa{" "}
              <span className="gradient-text-orange">crescer</span>{" "}
              com eficiência.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Soluções inteligentes em{" "}
              <span className="text-[#14528D] font-semibold">legalização empresarial</span>,{" "}
              <span className="text-[#EA7E12] font-semibold">gestão estratégica</span>,{" "}
              <span className="text-[#3194BE] font-semibold">BPO financeiro</span> e
              terceirização operacional. Mais de 6.500 processos realizados por ano.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-12"
            >
              <motion.a
                href="#contato"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group relative flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#14528D] to-[#1B2558] hover:from-[#1E6BAD] hover:to-[#243070] text-white font-bold rounded-2xl transition-all duration-300 overflow-hidden btn-glow shadow-lg"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <span className="relative z-10">Solicitar Consultoria</span>
                <ArrowRight size={18} className="relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.a>

              <motion.a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-center gap-2 px-8 py-4 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 hover:border-[#25D366]/70 text-[#16a34a] font-bold rounded-2xl transition-all duration-300"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <MessageCircle size={18} />
                Falar no WhatsApp
              </motion.a>
            </motion.div>

            {/* Free trial offer highlight */}
            <motion.div variants={itemVariants} className="mb-8">
              <a
                href="#planos"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById("planos")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group flex items-center gap-3 w-full rounded-2xl border-2 border-[#EA7E12]/40 bg-gradient-to-r from-[#EA7E12]/6 to-[#F5A23C]/4 hover:border-[#EA7E12]/70 hover:from-[#EA7E12]/10 hover:to-[#F5A23C]/8 transition-all duration-300 p-4 cursor-pointer"
              >
                {/* Icon */}
                <div className="w-10 h-10 rounded-xl bg-[#EA7E12] flex items-center justify-center flex-shrink-0 shadow-md group-hover:scale-105 transition-transform">
                  <Gift size={18} className="text-white" />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-black text-[#EA7E12] uppercase tracking-wider">Faça o teste conosco — Grátis</span>
                    <span className="hidden sm:inline-flex w-1.5 h-1.5 rounded-full bg-[#EA7E12] animate-pulse" />
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Building2 size={11} className="text-[#EA7E12]" />
                      Abertura de CNPJ MEI/ME/EPP
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-600">
                      <Trash2 size={11} className="text-[#EA7E12]" />
                      Baixa de CNPJ MEI/ME/EPP
                    </span>
                  </div>
                </div>
                {/* Arrow */}
                <ArrowRight size={16} className="text-[#EA7E12] flex-shrink-0 group-hover:translate-x-1 transition-transform" />
              </a>
            </motion.div>

            {/* Stats Row */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-4 gap-4 pt-8 border-t border-gray-200"
            >
              {stats.map((stat) => (
                <div key={stat.label} className="text-center lg:text-left">
                  <div className="text-2xl font-black text-[#1B2558]">{stat.value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Floating Cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative hidden lg:block"
          >
            <div className="relative mx-auto w-full max-w-md">
              {/* Main dashboard mockup */}
              <motion.div
                className="bg-white rounded-3xl p-6 shadow-2xl border border-gray-100"
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">Dashboard</div>
                    <div className="text-lg font-bold text-[#1B2558]">Gestão Empresarial</div>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-[#14528D]/10 flex items-center justify-center">
                    <TrendingUp size={20} className="text-[#14528D]" />
                  </div>
                </div>

                {/* Progress bars */}
                <div className="space-y-3 mb-5">
                  {[
                    { label: "Processos Concluídos", value: 92, color: "bg-[#14528D]" },
                    { label: "Compliance Regulatório", value: 98, color: "bg-green-500" },
                    { label: "Redução de Custos", value: 35, color: "bg-[#EA7E12]" },
                    { label: "Satisfação dos Clientes", value: 99, color: "bg-[#3194BE]" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{item.label}</span>
                        <span className="font-semibold text-[#1B2558]">{item.value}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full ${item.color} rounded-full`}
                          initial={{ width: 0 }}
                          animate={{ width: `${item.value}%` }}
                          transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom stats */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                  {[
                    { value: "6.5K+", label: "Processos" },
                    { value: "200+", label: "Consultorias" },
                    { value: "100%", label: "Legal" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-base font-bold text-[#1B2558]">{s.value}</div>
                      <div className="text-[10px] text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Floating service cards */}
              {floatingCards.map((card, i) => {
                const Icon = card.icon;
                const positions = [
                  { top: "-40px", left: "-50px" },
                  { top: "-40px", right: "-50px" },
                  { bottom: "60px", left: "-70px" },
                  { bottom: "60px", right: "-70px" },
                ];
                const delays = [0, 1, 2, 3];
                return (
                  <motion.div
                    key={card.label}
                    className="absolute bg-white rounded-2xl p-3 flex items-center gap-2.5 shadow-lg border border-gray-100 min-w-[155px]"
                    style={positions[i]}
                    animate={{ y: [0, -8, 0] }}
                    transition={{
                      duration: 4 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: delays[i] * 0.8,
                    }}
                  >
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={14} className="text-white" />
                    </div>
                    <span className="text-xs font-semibold text-[#1B2558] whitespace-nowrap">{card.label}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-xs uppercase tracking-widest">Scroll</span>
        <div className="w-5 h-9 rounded-full border border-gray-300 flex items-start justify-center pt-1.5">
          <motion.div
            className="w-1 h-2 rounded-full bg-[#14528D]"
            animate={{ y: [0, 12, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        </div>
      </motion.div>
    </section>
  );
}
