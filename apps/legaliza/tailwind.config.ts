import type { Config } from "tailwindcss";

// Paleta neutra provisória do LEGALIZA.AI (mesmo mecanismo de tema claro/escuro
// via variáveis CSS já validado no Terceirizei OS — cores semânticas em
// globals.css, redefinidas dentro de `.dark`, sem precisar de `dark:` em toda classe).
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#0F2A43",
          teal: "#0E7C86",
          gold: "#C79A3C",
        },
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        surface: "rgb(var(--color-surface) / <alpha-value>)",
        "surface-alt": "rgb(var(--color-surface-alt) / <alpha-value>)",
        border: {
          DEFAULT: "rgb(var(--color-border) / <alpha-value>)",
          strong: "rgb(var(--color-border-strong) / <alpha-value>)",
        },
        ink: "rgb(var(--color-ink) / <alpha-value>)",
        muted: {
          DEFAULT: "rgb(var(--color-muted) / <alpha-value>)",
          soft: "rgb(var(--color-muted-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          soft: "rgb(var(--color-accent-soft) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
