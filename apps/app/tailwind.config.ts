import type { Config } from "tailwindcss";

// Paleta oficial da marca Terceirizei (mesmos tons do site institucional em apps/site).
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
      },
      fontFamily: {
        sans: ["Montserrat", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
