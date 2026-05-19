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
          blue: {
            DEFAULT: '#2563eb',
            hover: '#1d4ed8',
            support: '#1e3a8a',
            light: '#dbeafe',
          },
          bg: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
          text: {
            main: '#0f172a',
            sec: '#64748b',
          },
          green: {
            DEFAULT: '#10b981',
            hover: '#059669',
          },
          danger: '#ef4444',
          warning: '#f59e0b',
          info: '#3b82f6',
        }
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
    },
  },
  plugins: [],
};
export default config;
