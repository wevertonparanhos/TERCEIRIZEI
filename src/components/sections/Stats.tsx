"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const stats = [
  {
    value: 6500,
    suffix: "+",
    label: "Processos de legalização",
    sublabel: "realizados por ano",
    colorHex: "#3194BE",
    bgHex: "rgba(49,148,190,0.08)",
    borderHex: "rgba(49,148,190,0.20)",
  },
  {
    value: 200,
    suffix: "+",
    label: "Consultorias estratégicas",
    sublabel: "para empresas por ano",
    colorHex: "#EA7E12",
    bgHex: "rgba(234,126,18,0.08)",
    borderHex: "rgba(234,126,18,0.20)",
  },
  {
    value: 50,
    suffix: "+",
    label: "Profissionais liberais",
    sublabel: "com gestão terceirizada",
    colorHex: "#14528D",
    bgHex: "rgba(20,82,141,0.10)",
    borderHex: "rgba(20,82,141,0.22)",
  },
  {
    value: 100,
    suffix: "%",
    label: "Atendimento nacional",
    sublabel: "em todo o Brasil",
    colorHex: "#F5A23C",
    bgHex: "rgba(245,162,60,0.08)",
    borderHex: "rgba(245,162,60,0.20)",
  },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const stepValue = value / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += stepValue;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, value]);

  return (
    <span ref={ref}>
      {count.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

export default function Stats() {
  return (
    <section className="relative py-16 overflow-hidden bg-gray-50">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#14528D]/3 to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative overflow-hidden rounded-2xl p-5 lg:p-6 text-center card-lift bg-white shadow-sm"
              style={{
                border: `1px solid ${stat.borderHex}`,
                background: `linear-gradient(135deg, #ffffff, ${stat.bgHex})`,
              }}
            >
              <div className="text-3xl lg:text-4xl font-black mb-1" style={{ color: stat.colorHex }}>
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm font-semibold text-[#1B2558] mb-0.5">{stat.label}</div>
              <div className="text-xs text-gray-400">{stat.sublabel}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
