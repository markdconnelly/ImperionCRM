import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        panel: "var(--panel)",
        "panel-2": "var(--panel-2)",
        border: "var(--border)",
        text: "var(--text)",
        dim: "var(--dim)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
        green: "var(--green)",
        amber: "var(--amber)",
        red: "var(--red)",
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "system-ui"],
        sans: ["var(--font-body)", "ui-sans-serif", "system-ui"],
      },
    },
  },
  plugins: [],
};

export default config;
