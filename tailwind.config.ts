import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#0A4A6C",
          "teal-deep": "#07384F",
          orange: "#EB7D2D",
          "orange-deep": "#D66A1C",
          ink: "#12233A",
          grey: "#5F5E6B",
          soft: "#F3F7FA",
          line: "#D7E2EA",
          ok: "#0F7A4A",
          danger: "#B42318",
        },
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
        display: ["var(--font-fraunces)", "Fraunces", "Georgia", "serif"],
      },
      boxShadow: {
        panel: "0 18px 50px rgba(10, 74, 108, 0.08)",
        soft: "0 10px 30px rgba(18, 35, 58, 0.06)",
      },
      borderRadius: {
        panel: "1.15rem",
      },
      backgroundImage: {
        "app-wash":
          "radial-gradient(circle at 0% 0%, rgba(235,125,45,0.12), transparent 34%), radial-gradient(circle at 100% 0%, rgba(10,74,108,0.14), transparent 40%), linear-gradient(180deg, #eef4f8 0%, #f7fafc 48%, #ffffff 100%)",
        "hero-teal":
          "linear-gradient(135deg, #07384F 0%, #0A4A6C 45%, #1a6a8f 100%)",
      },
    },
  },
  plugins: [],
} satisfies Config;
