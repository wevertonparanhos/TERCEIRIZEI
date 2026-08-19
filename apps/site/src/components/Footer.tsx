"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { MessageCircle, Instagram, Phone, MapPin, Mail, ArrowUpRight } from "lucide-react";
import { WHATSAPP_URL, PHONE, EMAIL, INSTAGRAM_URL, CNPJ } from "@/lib/utils";

const navLinks = [
  { label: "Início", href: "#inicio" },
  { label: "Sobre", href: "#sobre" },
  { label: "Serviços", href: "#servicos" },
  { label: "Como Funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
  { label: "Contato", href: "#contato" },
];

const serviceLinks = [
  "BPO de Legalização",
  "BPO de Gestão",
  "BPO de Licitações",
  "Consultoria Empresarial",
  "Abertura de Empresa",
  "Alvarás e Licenças",
  "Regularização Fiscal",
  "Treinamentos Corporativos",
];

const handleScroll = (href: string) => {
  const id = href.replace("#", "");
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
};

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative bg-[#0F1629] border-t border-[#1B2558]/30 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[200px] rounded-full bg-blue-900/10 blur-[80px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main footer */}
        <div className="py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="relative h-10 w-36 mb-4">
              <Image
                src="/images/logo.jpg"
                alt="Terceirizei"
                fill
                className="object-contain object-left"
              />
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Terceirizamos processos para sua empresa crescer com eficiência.
              Soluções em legalização, gestão estratégica e BPO empresarial.
            </p>

            {/* Social */}
            <div className="flex gap-3">
              <motion.a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-[#25D366]/10 border border-[#25D366]/20 flex items-center justify-center text-[#25D366] hover:bg-[#25D366]/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <MessageCircle size={16} />
              </motion.a>
              <motion.a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 hover:bg-pink-500/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Instagram size={16} />
              </motion.a>
              <motion.a
                href={`tel:+5531983546696`}
                className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Phone size={16} />
              </motion.a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Navegação</h4>
            <ul className="space-y-2">
              {navLinks.map((link) => (
                <li key={link.href}>
                  <button
                    onClick={() => handleScroll(link.href)}
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-blue-400 transition-all duration-200" />
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Serviços</h4>
            <ul className="space-y-2">
              {serviceLinks.map((service) => (
                <li key={service}>
                  <a
                    href={WHATSAPP_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-1 group"
                  >
                    <span className="w-0 group-hover:w-3 h-px bg-orange-400 transition-all duration-200" />
                    {service}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Contato</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href={WHATSAPP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 group"
                >
                  <MessageCircle size={15} className="text-[#25D366] mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">{PHONE}</span>
                </a>
              </li>
              <li>
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2.5 group"
                >
                  <Instagram size={15} className="text-pink-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400 group-hover:text-white transition-colors">@terceirizeibpo</span>
                </a>
              </li>
              <li>
                <div className="flex items-start gap-2.5">
                  <MapPin size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-400">Atendimento em todo o Brasil (100% remoto)</span>
                </div>
              </li>
              <li>
                <div className="flex items-start gap-2.5">
                  <ArrowUpRight size={15} className="text-gray-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-500">CNPJ: {CNPJ}</span>
                </div>
              </li>
            </ul>

            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 py-2.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/25 text-[#25D366] text-sm font-semibold rounded-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle size={14} />
              Falar no WhatsApp
            </motion.a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
          <p>
            © {currentYear} Terceirizei Consultoria e Gestão Empresarial LTDA. Todos os direitos reservados.
          </p>
          <p>CNPJ {CNPJ} · Atendemos todo o Brasil</p>
        </div>
      </div>
    </footer>
  );
}
