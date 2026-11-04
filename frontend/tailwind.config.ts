import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#07090E",
        foreground: "#F8FAFC",
        cyber: {
          bg: "#07090E",
          card: "#0D121F",
          cardHover: "#131A2D",
          surface: "#101626",
          border: "#1E293B",
          borderBright: "#334155",
        },
        cyan: {
          DEFAULT: "#00F0FF",
          50: "#E6FDFF",
          100: "#B8F9FF",
          200: "#8AF5FF",
          300: "#5CF1FF",
          400: "#2EEDFF",
          500: "#00F0FF",
          600: "#00C0CC",
          700: "#009099",
          800: "#006066",
          900: "#003033",
        },
        magenta: {
          DEFAULT: "#FF0055",
          50: "#FFE6EE",
          100: "#FFB8CE",
          200: "#FF8AAD",
          300: "#FF5C8D",
          400: "#FF2E6C",
          500: "#FF0055",
          600: "#CC0044",
          700: "#990033",
          800: "#660022",
          900: "#330011",
        },
        amber: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
        },
        p1: "#00F0FF",
        p2: "#FF0055",
      },
      boxShadow: {
        "cyan-glow": "0 0 20px rgba(0, 240, 255, 0.35)",
        "cyan-glow-lg": "0 0 35px rgba(0, 240, 255, 0.55)",
        "magenta-glow": "0 0 20px rgba(255, 0, 85, 0.35)",
        "magenta-glow-lg": "0 0 35px rgba(255, 0, 85, 0.55)",
        "amber-glow": "0 0 20px rgba(245, 158, 11, 0.35)",
        "glass-edge": "inset 0 1px 1px 0 rgba(255, 255, 255, 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "cyber-grid":
          "linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
        "glow-magenta": "glowMagenta 2s ease-in-out infinite alternate",
      },
      keyframes: {
        glowCyan: {
          "0%": { boxShadow: "0 0 10px rgba(0, 240, 255, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(0, 240, 255, 0.6)" },
        },
        glowMagenta: {
          "0%": { boxShadow: "0 0 10px rgba(255, 0, 85, 0.2)" },
          "100%": { boxShadow: "0 0 25px rgba(255, 0, 85, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
