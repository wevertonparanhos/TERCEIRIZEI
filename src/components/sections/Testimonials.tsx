"use client";

import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Carlos Eduardo Mendes",
    role: "Sócio",
    company: "Mendes & Associados Contabilidade",
    text: "A Terceirizei transformou completamente nossa operação. Antes perdíamos dias em burocracia. Hoje entregamos mais valor para nossos clientes enquanto eles cuidam de tudo.",
    rating: 5,
    initials: "CM",
    color: "from-[#14528D] to-[#1B2558]",
  },
  {
    name: "Ana Paula Ribeiro",
    role: "Diretora",
    company: "Ribeiro Gestão Empresarial",
    text: "Excelente profissionalismo e agilidade. Abertura de empresa que levava semanas passou a ser feita em dias. O Weverton é extremamente competente e atencioso.",
    rating: 5,
    initials: "AR",
    color: "from-[#EA7E12] to-[#C96A08]",
  },
  {
    name: "Marcos Vinicius Santos",
    role: "CEO",
    company: "Santos Holding Ltda",
    text: "Contratei o plano Ouro e foi o melhor investimento que fiz. Processos ilimitados, assessoria estratégica inclusa e comunicação direta com meus clientes. Recomendo demais!",
    rating: 5,
    initials: "MS",
    color: "from-[#1B2558] to-[#14528D]",
  },
  {
    name: "Fernanda Lima",
    role: "Advogada Empresarial",
    company: "Lima & Ferreira Advocacia",
    text: "A terceirização dos processos de legalização foi um divisor de águas no meu escritório. Aumentei minha carteira de clientes sem aumentar custos operacionais. Resultados incríveis.",
    rating: 5,
    initials: "FL",
    color: "from-[#3194BE] to-[#14528D]",
  },
  {
    name: "Roberto Almeida",
    role: "Contador",
    company: "Almeida Contabilidade Digital",
    text: "Parceria incrível! A Terceirizei atende nossos clientes com a mesma qualidade que teríamos internamente. Zero estresse com burocracia, 100% de foco no crescimento.",
    rating: 5,
    initials: "RA",
    color: "from-emerald-500 to-emerald-700",
  },
  {
    name: "Juliana Carvalho",
    role: "Empresária",
    company: "JC Comércio e Serviços",
    text: "Precisava regularizar minha empresa rapidamente e a Terceirizei resolveu tudo em tempo recorde. Atendimento humanizado, transparência total e resultado garantido.",
    rating: 5,
    initials: "JC",
    color: "from-[#F5A23C] to-[#EA7E12]",
  },
];

export default function Testimonials() {
  return (
    <section id="depoimentos" className="section-padding relative overflow-hidden bg-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[400px] h-[400px] rounded-full bg-[#14528D]/4 blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] rounded-full bg-[#EA7E12]/4 blur-[100px]" />
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
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-yellow-50 border border-yellow-200 text-yellow-600 mb-4">
            Depoimentos
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            O que nossos{" "}
            <span className="gradient-text">clientes dizem</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Mais de 200 empresas e profissionais transformaram sua operação com a Terceirizei.
            Veja o que eles têm a dizer.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group"
            >
              {/* Quote icon */}
              <Quote
                size={40}
                className="absolute top-4 right-4 text-gray-100 group-hover:text-gray-200 transition-colors"
              />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={13} className="text-yellow-400 fill-yellow-400" />
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-gray-600 leading-relaxed mb-5 relative z-10">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white text-xs font-black flex-shrink-0`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="text-sm font-bold text-[#1B2558]">{t.name}</div>
                  <div className="text-xs text-gray-400">
                    {t.role} · {t.company}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Overall rating */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-4 bg-white rounded-2xl px-8 py-4 border border-yellow-200 shadow-sm">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={18} className="text-yellow-400 fill-yellow-400" />
              ))}
            </div>
            <div className="text-[#1B2558]">
              <span className="text-2xl font-black">5.0</span>
              <span className="text-gray-400 text-sm ml-2">· Avaliação média dos clientes</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
