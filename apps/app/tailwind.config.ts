import type { Config } from "tailwindcss";

// Paleta oficial da marca Terceirizei (mesmos tons do site institucional em apps/site)
// para o modo claro. As cores semânticas (bg/surface/border/ink/muted/accent) vêm de
// variáveis CSS em globals.css, redefinidas dentro de `.dark` — permite tema claro/escuro
// sem precisar de `dark:` em cada classe utilitária.
const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#1B2558",
          blue: "#14528D",
          orange: "#EA7E12",
          cyan: "#3194BE",
          gold: "#F5A23C",
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
        sans: ["Montserrat", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
