import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens CoachDeskmx (referencian variables CSS de globals.css)
        hielo: "var(--hielo)",
        tinta: "var(--tinta)",
        filo: "var(--filo)",
        profundo: "var(--profundo)",
        alerta: "var(--alerta)",
        logro: "var(--logro)",
      },
      fontFamily: {
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        body: ["var(--font-inter-tight)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
