"use client";

import { motion } from "framer-motion";
import { MessageCircle, ArrowRight, Clock } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

export default function CTASection() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1B2558] via-[#0D1F6A] to-[#14528D]" />
      <div className="absolute inset-0 grid-pattern opacity-20" />

      {/* Decorative orbs */}
      <div className="absolute -top-40 -left-40 w-80 h-80 rounded-full bg-blue-500/20 blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full bg-orange-500/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[200px] rounded-full bg-blue-600/10 blur-[80px] pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          {/* Urgency badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-300 text-sm font-medium mb-8">
            <Clock size={14} className="animate-pulse" />
            Atendimento disponível — Resposta em até 2 horas
          </div>

          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 leading-[1.1]">
            Transforme sua{" "}
            <br className="hidden sm:block" />
            operação empresarial com a{" "}
            <span className="shimmer-text">TERCEIRIZEI</span>
          </h2>

          <p className="text-blue-200 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Pare de perder tempo com burocracia. Mais de 200 empresas já estão
            crescendo com mais eficiência, segurança jurídica e foco no que realmente importa.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center justify-center gap-2.5 px-10 py-5 bg-[#25D366] hover:bg-[#22C55E] text-white font-black text-lg rounded-2xl transition-all shadow-2xl overflow-hidden"
              whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(37,211,102,0.4)" }}
              whileTap={{ scale: 0.96 }}
            >
              <MessageCircle size={22} />
              Falar no WhatsApp
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.a>

            <motion.a
              href="#contato"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group flex items-center justify-center gap-2.5 px-10 py-5 border-2 border-white/20 hover:border-white/40 text-white font-bold text-lg rounded-2xl transition-all hover:bg-white/5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Solicitar Proposta
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </motion.a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-blue-200">
            {[
              "✓ Atendemos todo o Brasil",
              "✓ +6.500 processos/ano",
              "✓ Resposta rápida garantida",
              "✓ CNPJ 50.821.759/0001-03",
            ].map((item) => (
              <span key={item} className="opacity-80">{item}</span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
