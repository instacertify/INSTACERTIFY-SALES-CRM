import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#0A4A6C",
          orange: "#EB7D2D",
          grey: "#5F5E6B",
          ink: "#12233A",
          soft: "#F3F7FA",
          line: "#D7E2EA",
        },
        app: {
          wash: "#EEF4F8",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        panel: "0 10px 30px rgba(18, 35, 58, 0.08)",
        soft: "0 6px 16px rgba(10, 74, 108, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
