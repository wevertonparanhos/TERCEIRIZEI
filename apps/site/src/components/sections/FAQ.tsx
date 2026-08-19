"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { WHATSAPP_URL } from "@/lib/utils";

const faqs = [
  {
    q: "Quanto tempo leva para abrir uma empresa?",
    a: "O prazo varia de acordo com o tipo de empresa e município. Em média, uma ME/EPP pela Junta Comercial leva de 3 a 7 dias úteis após envio de toda a documentação. Empresas que exigem registro em cartório podem levar até 15 dias úteis. Mantemos você informado durante todo o processo.",
  },
  {
    q: "A Terceirizei atende empresas de todo o Brasil?",
    a: "Sim! Atendemos 100% remotamente em todo o Brasil. Já realizamos mais de 6.500 processos em dezenas de estados. Nossa operação é totalmente digital, segura e eficiente, sem necessidade de deslocamento.",
  },
  {
    q: "Os valores incluem as taxas governamentais?",
    a: "Não. Os valores da nossa tabela cobrem nossos honorários profissionais. Taxas governamentais, emolumentos cartoriais, despesas de despachante e deslocamentos (quando necessários) são cobrados separadamente e informados previamente no orçamento.",
  },
  {
    q: "Como funciona o Plano de BPO de Legalização?",
    a: "Nos planos mensais (Bronze, Prata e Ouro) você tem um pacote de processos mensais com atendimento especializado. O plano Ouro oferece processos ilimitados, ideal para escritórios contábeis e de advocacia com alto volume. Você escolhe o plano ideal e nossa equipe cuida de tudo.",
  },
  {
    q: "É possível regularizar uma empresa com débitos?",
    a: "Sim! Oferecemos serviço de regularização de débitos que inclui análise da situação fiscal, negociação e regularização junto aos órgãos competentes. Esse serviço tem valor avulso de R$ 499,90 e pode ser contratado junto com outros serviços.",
  },
  {
    q: "O que é BPO e por que terceirizar?",
    a: "BPO (Business Process Outsourcing) é a terceirização de processos específicos para especialistas. Ao terceirizar sua legalização e gestão, você ganha: economiza tempo (até 15h/semana), reduz riscos jurídicos, tem acesso a especialistas sem contratar funcionários, e pode focar 100% no crescimento do seu negócio.",
  },
  {
    q: "Como funciona o BPO de Licitações?",
    a: "Buscamos licitações alinhadas ao perfil da sua empresa, auxiliamos na preparação dos documentos, participamos dos lances e acompanhamos todo o processo até a conclusão. A remuneração inclui um valor mensal (R$ 999,90) mais 10% do valor da primeira parcela do contrato efetivado — modelo que alinha nossos interesses ao sucesso da sua empresa.",
  },
  {
    q: "Quais documentos são necessários para abrir uma empresa?",
    a: "Os documentos básicos incluem: RG/CPF/CNH dos sócios, comprovante de residência, endereço do estabelecimento e atividades pretendidas. Nossa equipe vai orientar você sobre os documentos específicos para cada tipo de empresa e segmento de atuação.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="section-padding relative overflow-hidden bg-gray-50">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-[#14528D]/5 blur-[140px]" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#3194BE]/8 border border-[#3194BE]/20 text-[#3194BE] mb-4">
            Dúvidas Frequentes
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-[#1B2558] mb-4">
            Perguntas{" "}
            <span className="gradient-text">frequentes</span>
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Tire suas principais dúvidas sobre nossos serviços. Não encontrou o que procura?
            Fale diretamente com nossa equipe.
          </p>
        </motion.div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                openIndex === i
                  ? "border-[#14528D]/30 bg-[#14528D]/5"
                  : "border-gray-200 bg-white hover:border-gray-300 shadow-sm"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 p-5 text-left"
              >
                <span className={`text-sm font-semibold transition-colors ${
                  openIndex === i ? "text-[#1B2558]" : "text-gray-700"
                }`}>
                  {faq.q}
                </span>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                  openIndex === i ? "bg-[#14528D]" : "bg-gray-100"
                }`}>
                  {openIndex === i ? (
                    <Minus size={12} className="text-white" />
                  ) : (
                    <Plus size={12} className="text-gray-500" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 pt-0">
                      <div className="h-px bg-[#14528D]/15 mb-4" />
                      <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-center mt-10"
        >
          <p className="text-gray-500 mb-4">
            Ainda tem dúvidas? Nossa equipe está pronta para te atender.
          </p>
          <motion.a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border border-[#25D366]/40 text-[#16a34a] font-semibold rounded-xl hover:bg-green-50 hover:border-[#25D366]/60 transition-all text-sm shadow-sm"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Falar com especialista no WhatsApp
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
