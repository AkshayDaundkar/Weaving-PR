import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundColor: {
        primary: "var(--bg-primary)",
        card: "var(--bg-card)",
      },
      textColor: {
        primary: "var(--text-primary)",
        muted: "var(--text-muted)",
      },
      borderColor: {
        DEFAULT: "var(--border-default)",
      },
      colors: {
        accent: "var(--accent)",
        "posthog-orange": "var(--posthog-orange)",
      },
    },
  },
  plugins: [],
};

export default config;
