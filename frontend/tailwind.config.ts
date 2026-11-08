import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          card: "var(--bg-card)",
          hover: "var(--bg-hover)"
        },
        gold: {
          DEFAULT: "var(--accent-gold)",
          muted: "var(--accent-gold-muted)",
          bright: "#E6CB88"
        },
        ivory: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)"
        },
        border: {
          subtle: "var(--border-subtle)"
        },
        status: {
          success: "#3BAA83",
          error: "#E36D70",
          warning: "#E2A03F",
          info: "#4D88E5"
        }
      },
      fontFamily: {
        heading: ["var(--font-manrope)", "Manrope", "system-ui", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "monospace"]
      },
      boxShadow: {
        legal: "0 12px 32px -8px rgba(0, 0, 0, 0.45)",
        gold: "0 0 0 1px rgba(214, 182, 109, 0.35), 0 8px 24px -4px rgba(214, 182, 109, 0.14)"
      }
    }
  },
  plugins: []
};

export default config;
