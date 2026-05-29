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
          "text-sec": "#64748b",
          "text-muted": "#94a3b8",
          primary: "#1e40af",
          secondary: "#6366f1",
          blue: "#1e40af",
          "blue-hover": "#1d4ed8",
          "blue-support": "#111827",
          green: "#10b981",
          "green-hover": "#059669",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444",
          red: "#ef4444",
          accent: "#6366f1",
          card: "#ffffff",
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
