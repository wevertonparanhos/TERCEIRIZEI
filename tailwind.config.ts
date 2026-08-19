import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1B2558",
          50: "#EEF1FF",
          100: "#D9DFFF",
          200: "#B3BFFF",
          300: "#8A9AEA",
          400: "#5D72D4",
          500: "#3454BF",
          600: "#1E3FA8",
          700: "#163090",
          800: "#14528D",
          900: "#1B2558",
          950: "#0D1535",
        },
        accent: {
          DEFAULT: "#EA7E12",
          orange: "#EA7E12",
          gold: "#F5A23C",
          cyan: "#3194BE",
          blue: "#14528D",
        },
        dark: {
          DEFAULT: "#FFFFFF",
          card: "#F8FAFC",
          secondary: "#F1F5F9",
          border: "rgba(0,0,0,0.06)",
        },
      },
      fontFamily: {
        sans: ["Montserrat", "Inter", "system-ui", "sans-serif"],
        display: ["Montserrat", "Inter", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-gradient": "linear-gradient(135deg, #FFFFFF 0%, #F0F6FF 50%, #FFF8F0 100%)",
        "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,1) 100%)",
        "blue-gradient": "linear-gradient(135deg, #14528D 0%, #3194BE 100%)",
        "orange-gradient": "linear-gradient(135deg, #EA7E12 0%, #F5A23C 100%)",
        "brand-gradient": "linear-gradient(135deg, #14528D 0%, #3194BE 50%, #EA7E12 100%)",
        "shine": "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.4) 50%, transparent 60%)",
      },
      animation: {
        "float": "float 6s ease-in-out infinite",
        "float-slow": "float 8s ease-in-out infinite",
        "pulse-slow": "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "shimmer": "shimmer 2.5s linear infinite",
        "spin-slow": "spin 20s linear infinite",
        "counter": "counter 2s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      boxShadow: {
        "glow-blue": "0 0 40px rgba(20,82,141,0.35)",
        "glow-orange": "0 0 40px rgba(234,126,18,0.35)",
        "glow-cyan": "0 0 40px rgba(49,148,190,0.3)",
        "card": "0 4px 24px rgba(0,0,0,0.4)",
        "card-hover": "0 8px 48px rgba(27,37,88,0.5)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;
