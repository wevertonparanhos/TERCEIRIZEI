"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { WHATSAPP_URL } from "@/lib/utils";

export default function WhatsAppButton() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {/* Tooltip/bubble */}
      <AnimatePresence>
        {showTooltip && !dismissed && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative bg-white border border-gray-200 rounded-2xl p-4 shadow-xl max-w-xs"
          >
            <button
              onClick={() => setDismissed(true)}
              className="absolute top-2 right-2 w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X size={10} />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span className="text-xs font-bold text-[#1B2558]">Terceirizei está online</span>
            </div>
            <p className="text-xs text-gray-500 pr-4">
              Olá! Posso ajudar com legalização empresarial, BPO de gestão ou consultoria?
            </p>
            <motion.a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-1.5 w-full py-2 bg-[#25D366] text-white text-xs font-bold rounded-xl hover:bg-[#22C55E] transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle size={12} />
              Iniciar conversa
            </motion.a>
            {/* Arrow */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-gray-200 rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main button */}
      <motion.a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        onHoverStart={() => setShowTooltip(true)}
        onHoverEnd={() => setShowTooltip(false)}
        className="relative w-14 h-14 rounded-full bg-[#25D366] shadow-2xl flex items-center justify-center cursor-pointer"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{
          scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
        }}
        style={{ boxShadow: "0 0 0 0 rgba(37,211,102,0.4)" }}
      >
        {/* Pulse rings */}
        <motion.span
          className="absolute inset-0 rounded-full bg-[#25D366]/30"
          animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.span
          className="absolute inset-0 rounded-full bg-[#25D366]/20"
          animate={{ scale: [1, 2.4], opacity: [0.4, 0] }}
          transition={{ duration: 2, delay: 0.4, repeat: Infinity, ease: "easeOut" }}
        />
        <MessageCircle size={26} className="text-white relative z-10" />
      </motion.a>
    </div>
  );
}
