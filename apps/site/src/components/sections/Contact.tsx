"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Instagram, Mail, MapPin, Send, CheckCircle } from "lucide-react";
import { WHATSAPP_URL, PHONE, EMAIL, INSTAGRAM_URL, CNPJ } from "@/lib/utils";

const contactInfo = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "(31) 98354-6696",
    href: WHATSAPP_URL,
    color: "text-green-600",
    bg: "bg-green-50 border border-green-200",
  },
  {
    icon: Phone,
    label: "Telefone",
    value: "(31) 98354-6696",
    href: `tel:+5531983546696`,
    color: "text-[#14528D]",
    bg: "bg-[#14528D]/8 border border-[#14528D]/20",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@terceirizeibpo",
    href: INSTAGRAM_URL,
    color: "text-pink-500",
    bg: "bg-pink-50 border border-pink-200",
  },
  {
    icon: MapPin,
    label: "Atendimento",
    value: "Todo o Brasil (100% remoto)",
    href: "#",
    color: "text-[#EA7E12]",
    bg: "bg-[#EA7E12]/8 border border-[#EA7E12]/20",
  },
];

type FormData = {
  name: string;
  email: string;
  phone: string;
  company: string;
  service: string;
  message: string;
};

const services = [
  "BPO de Legalização",
  "BPO de Gestão",
  "BPO de Licitações",
  "Consultoria Empresarial",
  "Abertura de Empresa",
  "Regularização Fiscal",
  "Treinamento Corporativo",
  "Outro",
];

export default function Contact() {
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
    company: "",
    service: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    window.open(WHATSAPP_URL, "_blank");
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <section id="contato" className="section-padding relative overflow-hidden bg-white">
      <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-[400px] h-[400px] rounded-full bg-[#14528D]/4 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] rounded-full bg-[#EA7E12]/4 blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest bg-[#14528D]/8 border border-[#14528D]/20 text-[#14528D] mb-4">
            Entre em Contato
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#1B2558] mb-4">
            Vamos transformar{" "}
            <span className="gradient-text">sua empresa</span>{" "}
            juntos
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Entre em contato agora e descubra como podemos ajudar o seu negócio a crescer
            com mais eficiência, segurança e menos burocracia.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-5 gap-10">
          {/* Left - Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-2 space-y-5"
          >
            <div>
              <h3 className="text-xl font-bold text-[#1B2558] mb-1">Fale conosco</h3>
              <p className="text-gray-500 text-sm">
                Respondemos em menos de 2 horas em dias úteis.
              </p>
            </div>

            {contactInfo.map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  target={item.href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300 transition-all hover:-translate-y-0.5 group"
                >
                  <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={item.color} />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{item.label}</div>
                    <div className="text-sm font-semibold text-[#1B2558] group-hover:text-[#14528D] transition-colors">{item.value}</div>
                  </div>
                </a>
              );
            })}

            {/* CNPJ */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="text-xs text-gray-400 mb-1">CNPJ</div>
              <div className="text-sm font-semibold text-[#1B2558]">{CNPJ}</div>
              <div className="text-xs text-gray-400 mt-0.5">Terceirizei Consultoria e Gestão Empresarial LTDA</div>
            </div>

            {/* Quick CTA */}
            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-4 bg-[#25D366] hover:bg-[#22C55E] text-white font-bold rounded-2xl transition-all shadow-xl"
              whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(37,211,102,0.3)" }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle size={20} />
              Falar no WhatsApp agora
            </motion.a>
          </motion.div>

          {/* Right - Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-3"
          >
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-[#1B2558] mb-6">Solicitar Consultoria Gratuita</h3>

              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <CheckCircle size={48} className="text-green-500 mb-4" />
                  <h4 className="text-xl font-bold text-[#1B2558] mb-2">Mensagem enviada!</h4>
                  <p className="text-gray-500">Você será redirecionado para o WhatsApp. Entraremos em contato em breve.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Nome completo *</label>
                      <input
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        required
                        placeholder="Seu nome"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] placeholder-gray-400 focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Telefone/WhatsApp *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        required
                        placeholder="(00) 00000-0000"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] placeholder-gray-400 focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">E-mail</label>
                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="seu@email.com"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] placeholder-gray-400 focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5 font-medium">Empresa</label>
                      <input
                        type="text"
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        placeholder="Nome da empresa"
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] placeholder-gray-400 focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Serviço de interesse *</label>
                    <select
                      name="service"
                      value={form.service}
                      onChange={handleChange}
                      required
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all appearance-none"
                    >
                      <option value="" disabled className="bg-white text-gray-400">Selecione um serviço</option>
                      {services.map((s) => (
                        <option key={s} value={s} className="bg-white text-[#1B2558]">{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5 font-medium">Mensagem</label>
                    <textarea
                      name="message"
                      value={form.message}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Descreva sua necessidade..."
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-[#1B2558] placeholder-gray-400 focus:outline-none focus:border-[#14528D]/60 focus:bg-white transition-all resize-none"
                    />
                  </div>

                  <motion.button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-[#14528D] to-[#1B2558] hover:from-[#1E6BAD] hover:to-[#243070] text-white font-bold rounded-xl transition-all shadow-xl btn-glow"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Send size={16} />
                    Enviar via WhatsApp
                  </motion.button>

                  <p className="text-center text-xs text-gray-400">
                    Ao enviar, você concorda em receber contato da Terceirizei.
                  </p>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
