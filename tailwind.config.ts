import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#fafbfd",
          border: "#eceef2",
          "text-main": "#0f172a",
          "text-muted": "#64748b",
          primary: "#3b82f6",
          secondary: "#6366f1",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
        }
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      }
    },
  },
  plugins: [],
};
export default config;
